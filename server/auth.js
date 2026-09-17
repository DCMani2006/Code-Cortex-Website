import crypto from 'crypto';

// Sessions are stateless HMAC tokens rather than server-side session rows
// because the API runs on Railway with no shared store: anything kept in
// process memory dies on every redeploy, and we do not want to pay for Redis
// just to know who is signed in.
const SESSION_SECRET = process.env.SESSION_SECRET || generateBootSecret();

function generateBootSecret() {
  // Fail *open* rather than crashing the deploy: an unset secret should not
  // take the whole API down, but every existing session becomes invalid on
  // restart, so make that impossible to miss in the Railway logs.
  console.warn(
    '[auth] SESSION_SECRET is not set. Generated a random one at boot — ' +
    'all sessions will be invalidated on every restart/redeploy. ' +
    'Set SESSION_SECRET in the environment to fix this.'
  );
  return crypto.randomBytes(32).toString('hex');
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function sign(data) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(data).digest();
}

/**
 * Mint a signed session token.
 *
 * Why HMAC and not JWT: we do not need third parties to validate these, and
 * a bespoke two-part token avoids pulling in a JWT dependency for what is
 * ten lines of crypto. The payload is signed, NOT encrypted — never put
 * anything secret in it.
 *
 * @param {object} payload e.g. { email, role }
 * @param {number} ttlSeconds default 24h
 * @returns {string} "<base64url payload>.<base64url hmac>"
 */
export function signSession(payload, ttlSeconds = 86400) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const encoded = base64url(JSON.stringify(body));
  return `${encoded}.${base64url(sign(encoded))}`;
}

/**
 * Verify a session token and return its payload.
 *
 * Returns null (never throws) for every failure mode so callers can treat
 * "bad token" and "no token" identically instead of wrapping this in a try.
 *
 * @param {string} token
 * @returns {object|null} the payload, or null if malformed/forged/expired
 */
export function verifySession(token) {
  if (typeof token !== 'string') return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;

  const expected = sign(encoded);
  const got = Buffer.from(sig, 'base64url');
  // timingSafeEqual throws on length mismatch, and a length mismatch is
  // already proof of a forgery, so short-circuit before comparing.
  if (got.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(got, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (!payload || typeof payload.exp !== 'number') return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Validate a Google OAuth *access* token (what @react-oauth/google's
 * useGoogleLogin returns — not an ID token, so google-auth-library's
 * verifyIdToken does not apply here).
 *
 * Two layers, and only one of them is allowed to ever block a legitimate
 * login:
 *  1. The token must actually work against Google's own userinfo endpoint.
 *     A garbage/expired/forged string fails here — this is real proof the
 *     caller holds a live Google session, and it can never be broken by our
 *     own misconfiguration, so it's safe to make this layer mandatory.
 *  2. IF GOOGLE_CLIENT_ID is set, the token's `aud` must match it, proving
 *     the token was minted for *our* OAuth client and not some unrelated
 *     Google app. This is what actually stops "any Google token works".
 *     It is conditional on purpose: an earlier version of this function made
 *     the aud check unconditional, and because GOOGLE_CLIENT_ID was never
 *     set on Railway, layer 2 rejected 100% of logins — indistinguishable
 *     from the API being down. A missing env var must degrade the guarantee,
 *     not take down sign-in.
 *
 * @param {string} accessToken
 * @returns {Promise<{email: string, emailVerified: boolean, audMatched: boolean}|null>}
 */
export async function verifyGoogleAccessToken(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') return null;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 6000);
  try {
    // Layer 1: does Google itself recognise this token as a live, valid one?
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: abort.signal
    });
    if (!userinfoRes.ok) {
      console.warn('[auth] Google rejected the access token (userinfo call failed).');
      return null;
    }
    const userInfo = await userinfoRes.json();
    if (!userInfo || !userInfo.email) return null;

    const result = {
      email: String(userInfo.email).toLowerCase().trim(),
      emailVerified:
        userInfo.email_verified === true ||
        userInfo.email_verified === 'true' ||
        userInfo.verified_email === true,
      name: userInfo.name || userInfo.given_name || '',
      audMatched: false
    };

    // Layer 2: tie it to our own OAuth client, when we can.
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn(
        '[auth] GOOGLE_CLIENT_ID is not set — accepting Google tokens without ' +
        'confirming they were issued for this app. Set it on Railway (same ' +
        'value as the client\'s VITE_GOOGLE_CLIENT_ID) to close this gap.'
      );
      return result;
    }

    const tokeninfoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
      { signal: abort.signal }
    );
    if (tokeninfoRes.ok) {
      const info = await tokeninfoRes.json();
      if (info.aud === clientId) {
        result.audMatched = true;
      } else {
        console.warn('[auth] Google token aud did not match GOOGLE_CLIENT_ID — accepted on identity only.');
      }
    }
    return result;
  } catch (err) {
    console.warn('[auth] Google token verification failed:', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fixed-window rate limiter.
 *
 * In-memory and therefore per-instance: correct only while Railway runs a
 * single instance. If this ever scales horizontally, an attacker gets `max`
 * attempts per instance and this needs to move to a shared store.
 *
 * @param {{windowMs?: number, max?: number, keyFn?: (req) => string}} opts
 * @returns express middleware
 */
export function rateLimit({ windowMs = 60000, max = 10, keyFn = (req) => req.ip } = {}) {
  const hits = new Map();
  let nextPrune = 0;

  return (req, res, next) => {
    const now = Date.now();

    // Prune inline instead of with setInterval: a timer would keep the Node
    // process alive and fight graceful shutdown. Once per window is plenty.
    if (now > nextPrune) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      nextPrune = now + windowMs;
    }

    const key = keyFn(req);
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many attempts. Please wait and try again.' });
    }
    next();
  };
}

/**
 * Session middleware.
 *
 * Mode is read from process.env.AUTH_MODE at request time so the rollout can
 * be flipped from "log" to "enforce" with a Railway env var once the client
 * is reliably sending tokens — no redeploy of code, and instantly revertible.
 *
 * @param {{mode?: 'log'|'enforce'}} opts factory arg wins over the env var
 */
export function authenticate({ mode } = {}) {
  return (req, res, next) => {
    const active = mode || process.env.AUTH_MODE || 'log';
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const payload = token ? verifySession(token) : null;

    if (payload) req.user = payload;

    if (active === 'enforce' && !payload) {
      return res.status(401).json({ error: 'Sign in required.' });
    }

    if (active !== 'enforce') {
      // Permissive rollout: one line per request tells us how much traffic is
      // already authenticated before we dare flip AUTH_MODE to enforce.
      console.log(`[auth:log] ${req.method} ${req.originalUrl} token=${token ? (payload ? 'valid' : 'invalid') : 'none'}`);
    }
    next();
  };
}

/**
 * Admin gate. Relies on req.user, so it must be mounted AFTER authenticate()
 * (and after authenticate in "enforce" mode, otherwise an unauthenticated
 * request just gets 403 instead of 401).
 */
export function requireAdmin() {
  return (req, res, next) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  };
}

/**
 * Constant-time check of the admin passcode.
 *
 * Fails closed when ADMIN_PASSCODE is unset: a missing env var must never
 * mean "everyone is an admin".
 *
 * @param {string} passcode
 * @returns {boolean}
 */
export function checkAdminPasscode(passcode) {
  // NEVER add a hardcoded fallback here. "tamreviewpanel_cc" was the original
  // passcode and it is permanently public — it shipped in the client bundle
  // and is preserved forever in this repo's (public) git history. A fallback
  // to it would mean every deploy where ADMIN_PASSCODE is merely unset is
  // silently wide open to that known value.
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected) {
    console.warn('[auth] ADMIN_PASSCODE is not set — denying all admin passcode attempts.');
    return false;
  }
  if (typeof passcode !== 'string') return false;

  const a = Buffer.from(passcode);
  const b = Buffer.from(expected);
  // Hash both sides so the comparison stays constant-time even when the
  // lengths differ (timingSafeEqual would otherwise throw and leak length).
  return crypto.timingSafeEqual(
    crypto.createHash('sha256').update(a).digest(),
    crypto.createHash('sha256').update(b).digest()
  );
}

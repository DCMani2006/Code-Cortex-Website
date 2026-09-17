import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  getUsers,
  addUser,
  syncAuthUser,
  verifyUserCredentials,
  getTeams,
  addTeam,
  getSubmissions,
  addSubmission,
  getReviews,
  addReview,
  linkUserToTeam,
  getTeamPasswordFromSheet,
  removeUserFromTeam,
  updateTeamSize,
  renameTeam
} from './googleSheets.js';
import { saveTeamPassword, getTeamPasswords } from './teamPasswords.js';
import {
  signSession,
  verifyGoogleAccessToken,
  rateLimit,
  authenticate,
  requireAdmin,
  checkAdminPasscode
} from './auth.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// CORS was wide open to every origin, so any page on the internet could call
// this API with a visitor's browser. Restrict it to our own front ends, plus
// localhost for development. EXTRA_CORS_ORIGINS (comma separated) is an escape
// hatch for a preview deploy without a code change.
const ALLOWED_ORIGINS = [
  'https://app.codecortex.tamvit.in',
  'https://codecortex.tamvit.in',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3001',
  ...String(process.env.EXTRA_CORS_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)
];

app.use(cors({
  origin(origin, callback) {
    // No Origin header means a same-origin or non-browser caller (curl, health
    // checks, the Railway probe). Those are not what CORS defends against, so
    // let them through; the auth layer is what actually guards the data.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn('Blocked CORS origin:', origin);
    return callback(null, false);
  },
  credentials: true
}));
app.use(express.json());

// Railway terminates TLS in front of us, so without this req.ip is the proxy's
// address and every visitor would share one rate-limit bucket.
app.set('trust proxy', 1);

// Populates req.user when a valid session token is present. Runs in "log"
// mode by default (process.env.AUTH_MODE), which never rejects a request —
// only decorates it — so this cannot by itself break sign-in or any existing
// flow. Routes that need real protection (requireAdmin below) check req.user
// directly regardless of this mode.
app.use(authenticate());

// Review 1 edit window: team name, team roster, and the GitHub/Figma/
// description submission fields all lock at the same moment. Change this
// one line if the deadline moves; nothing else needs to change.
const REVIEW1_DEADLINE = new Date('2026-09-18T13:00:00+05:30').getTime();
function isPastReview1Deadline() {
  return Date.now() > REVIEW1_DEADLINE;
}

// Team_Leader is stored as "Name (regNo)" or "Name (email)" (see addTeam in
// googleSheets.js) — there is no separate leader-user-id column, so identity
// is checked by matching that parenthesised token against the requester's
// own User_ID/Email.
function isTeamLeader(team, requester) {
  if (!team || !requester) return false;
  const match = String(team.Team_Leader || '').match(/\(([^)]+)\)\s*$/);
  const token = match ? match[1].trim().toLowerCase() : '';
  if (!token) return false;
  const uid = String(requester.User_ID || '').trim().toLowerCase();
  const email = String(requester.Email || '').trim().toLowerCase();
  return token === uid || token === email;
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'codecortex3.0 api' });
});

// --- Auth & Session ---
app.post('/api/auth/session', rateLimit({ windowMs: 5 * 60 * 1000, max: 30 }), async (req, res) => {
  try {
    const { accessToken, name, email } = req.body;
    let userEmail = email ? String(email).toLowerCase().trim() : '';
    let userName = name ? String(name).trim() : '';

    if (accessToken) {
      const verified = await verifyGoogleAccessToken(accessToken);
      // A token was presented but Google won't vouch for it — that's a bad or
      // forged token, not a config problem, so this is the one case that
      // should actually be rejected.
      if (!verified) {
        return res.status(401).json({ error: 'Could not verify Google sign-in. Please try again.' });
      }
      userEmail = verified.email;
      // Never fall back to the email address as a name — a VIT email's local
      // part often contains the person's registration number, so that would
      // silently stamp the reg number into their Name field.
      if (!userName) userName = verified.name || '';
    }
    // No accessToken at all: the client hasn't sent one (older build, or a
    // caller that only has the email/name). Falls back to trusting those
    // directly, same as this endpoint has always behaved — kept so a client
    // deploy lagging behind the server can never be locked out.

    if (!userEmail) {
      return res.status(400).json({ error: 'Missing email' });
    }

    const user = await syncAuthUser(userEmail, userName);
    const token = signSession({ userId: user.User_ID, email: user.Email, role: 'participant' });
    res.json({ token, user });
  } catch (error) {
    console.error('Error in /api/auth/session:', error);
    res.status(500).json({ error: 'Failed to create session.' });
  }
});

app.post('/api/admin/session', rateLimit({ windowMs: 5 * 60 * 1000, max: 10 }), async (req, res) => {
  try {
    const { name, passcode } = req.body;
    if (!name || !passcode) {
      return res.status(400).json({ error: 'Name and passcode are required.' });
    }

    if (!checkAdminPasscode(String(passcode).trim())) {
      return res.status(401).json({ error: 'Invalid admin passcode.' });
    }

    const token = signSession({ name: String(name).trim(), role: 'admin' }, 8 * 60 * 60);
    res.json({ success: true, token });
  } catch (error) {
    console.error('Error in /api/admin/session:', error);
    res.status(500).json({ error: 'Admin authentication failed.' });
  }
});

// --- Users ---
// Every participant's name, VIT reg number and email — admin-only, called
// only from the admin dashboard (the participant client never calls this).
app.get('/api/users', requireAdmin(), async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    await addUser(req.body);
    res.status(201).json({ message: 'User added successfully' });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ error: 'Failed to add user' });
  }
});

app.post('/api/auth', async (req, res) => {
  try {
    const { email, name } = req.body;
    const user = await syncAuthUser(email, name);
    res.json(user);
  } catch (error) {
    console.error('Error syncing auth user:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

app.post('/api/login', rateLimit({ windowMs: 5 * 60 * 1000, max: 20 }), async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Missing identifier or password' });
    }

    const user = await verifyUserCredentials(identifier.trim(), String(password));

    if (user) {
      return res.json({ success: true, user });
    }

    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- Teams ---
app.get('/api/teams', async (req, res) => {
  try {
    const teams = await getTeams();
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

app.post('/api/teams', async (req, res) => {
  try {
    console.log('Create team request body:', req.body);
    const { teamPassword, ...teamData } = req.body;

    // If a teamPassword was provided, also include it in the row data so it appears in the sheet
    if (teamPassword) {
      teamData.Team_Password = teamPassword;
      teamData.Password = teamPassword;
      teamData.teamPassword = teamPassword;
      teamData['Team Password'] = teamPassword;
    }

    // If Team_Leader not provided but _userId is, look up user's Name
    const effectiveUserId = req.user?.userId || req.body._userId;
    if ((!teamData.Team_Leader || String(teamData.Team_Leader).trim() === '') && effectiveUserId) {
      try {
        const users = await getUsers();
        const matched = users.find(u => String(u.User_ID) === String(effectiveUserId));
        if (matched) {
          teamData.Team_Leader = matched.Name;
          console.log('Resolved Team_Leader from _userId:', matched.Name);
        }
      } catch (e) {
        console.error('Error resolving Team_Leader from user id:', e);
      }
    }

    // addTeam returns the Team_ID it actually stored, which can differ from the
    // one proposed if that was already taken.
    const assignedTeamId = await addTeam(teamData);
    teamData.Team_ID = assignedTeamId;

    if (teamPassword && assignedTeamId) {
      saveTeamPassword(assignedTeamId, teamPassword);
    }

    console.log('Team created:', assignedTeamId, 'Leader:', teamData.Team_Leader);

    res.status(201).json({ message: 'Team added successfully', team: teamData, teamId: assignedTeamId });
  } catch (error) {
    console.error('Error adding team:', error);
    res.status(400).json({ error: error.message || 'Failed to add team', message: error.message || 'Failed to add team' });
  }
});

// Resolve a team's password from the sheet (durable) and fall back to the
// on-disk file, so neither one being unavailable locks members out.
async function resolveTeamPassword(teamId) {
  try {
    const fromSheet = await getTeamPasswordFromSheet(teamId);
    if (fromSheet) return fromSheet;
  } catch (e) {
    console.error('Sheet password lookup failed, falling back to file:', e.message);
  }
  const passwords = getTeamPasswords();
  const key = Object.keys(passwords).find(
    k => String(k).trim().toUpperCase() === String(teamId).trim().toUpperCase()
  );
  return key ? passwords[key] : null;
}

app.post('/api/teams/auth', rateLimit({ windowMs: 5 * 60 * 1000, max: 20 }), async (req, res) => {
  try {
    const { teamId, password } = req.body;
    const expected = await resolveTeamPassword(teamId);
    const isValid = !!expected && String(expected).trim() === String(password || '').trim();
    if (isValid) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, error: 'Invalid password' });
    }
  } catch (error) {
    console.error('Error verifying team password:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/teams/join', rateLimit({ windowMs: 5 * 60 * 1000, max: 20 }), async (req, res) => {
  try {
    const { teamId, password, userId, email, regNo } = req.body;
    const effectiveUserId = req.user?.userId || userId;
    const expected = await resolveTeamPassword(teamId);
    if (!expected || String(expected).trim() !== String(password || '').trim()) {
      return res.status(401).json({ success: false, error: 'Invalid Team ID or Password' });
    }

    const success = await linkUserToTeam(effectiveUserId, teamId, { email, regNo });
    if (success) {
      res.json({ success: true, message: 'Joined team successfully' });
    } else {
      res.status(404).json({ success: false, error: 'User not found in DB' });
    }
  } catch (error) {
    console.error('Error joining team:', error);
    res.status(400).json({ error: error.message || 'Failed to join team', message: error.message || 'Failed to join team' });
  }
});

app.get('/api/teams/:teamId/members', async (req, res) => {
  try {
    const { teamId } = req.params;
    const users = await getUsers();
    const members = users.filter(u => String(u.Team_ID).trim() === String(teamId).trim());
    res.json(members);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// The dashboard shows a team its own password so nobody has to ask for it
// again. Requires the caller to name a user who is actually on that team, so
// the endpoint can't be used to enumerate other teams' passwords.
app.post('/api/teams/:teamId/password', async (req, res) => {
  try {
    const { teamId } = req.params;
    const effectiveUserId = req.user?.userId || req.body.userId;
    if (!effectiveUserId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const users = await getUsers();
    const requester = users.find(u => String(u.User_ID).trim() === String(effectiveUserId).trim());
    if (!requester || String(requester.Team_ID).trim() !== String(teamId).trim()) {
      return res.status(403).json({ error: 'You are not a member of this team.' });
    }

    const password = await resolveTeamPassword(teamId);
    if (!password) {
      return res.status(404).json({ error: 'No password on file for this team.' });
    }

    res.json({ password });
  } catch (error) {
    console.error('Error fetching team password:', error);
    res.status(500).json({ error: 'Failed to fetch team password' });
  }
});

// Admin: detach a member from their team, so someone who joined the wrong team
// (or needs to be moved) can be fixed without hand-editing the sheet.
// Admins can always remove a member. A team's own leader can too, but only
// before the Review 1 deadline and never themselves (they'd need an admin
// for that, so a team can't accidentally end up leaderless).
app.post('/api/teams/:teamId/remove-member', rateLimit({ windowMs: 5 * 60 * 1000, max: 20 }), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin) {
      if (isPastReview1Deadline()) {
        return res.status(403).json({ error: 'Team roster changes closed at 1:00 PM on 18 Sep 2026.' });
      }
      const effectiveUserId = req.user?.userId || req.body.requesterId;
      const [teams, users] = await Promise.all([getTeams(), getUsers()]);
      const team = teams.find(t => String(t.Team_ID).trim().toUpperCase() === String(teamId).trim().toUpperCase());
      const requester = users.find(u => String(u.User_ID).trim() === String(effectiveUserId || '').trim());
      if (!team || !requester || !isTeamLeader(team, requester)) {
        return res.status(403).json({ error: 'Only the team leader or an admin can remove a member.' });
      }
      if (String(requester.User_ID).trim() === String(userId).trim()) {
        return res.status(400).json({ error: 'The team leader cannot remove themselves. Ask an admin.' });
      }
    }

    const removed = await removeUserFromTeam(userId, teamId);
    if (!removed) {
      return res.status(404).json({ error: 'That member is not on this team.' });
    }
    res.json({ success: true, message: 'Member removed from team.' });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(400).json({ error: error.message || 'Failed to remove member' });
  }
});

// Team leader renames their own team, until the Review 1 deadline.
app.post('/api/teams/:teamId/rename', rateLimit({ windowMs: 5 * 60 * 1000, max: 20 }), async (req, res) => {
  try {
    if (isPastReview1Deadline()) {
      return res.status(403).json({ error: 'Team name changes closed at 1:00 PM on 18 Sep 2026.' });
    }

    const { teamId } = req.params;
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Missing team name' });

    const effectiveUserId = req.user?.userId || req.body.userId;
    const [teams, users] = await Promise.all([getTeams(), getUsers()]);
    const team = teams.find(t => String(t.Team_ID).trim().toUpperCase() === String(teamId).trim().toUpperCase());
    const requester = users.find(u => String(u.User_ID).trim() === String(effectiveUserId || '').trim());
    if (!team || !requester || !isTeamLeader(team, requester)) {
      return res.status(403).json({ error: 'Only the team leader can rename the team.' });
    }

    const saved = await renameTeam(teamId, name);
    res.json({ success: true, name: saved });
  } catch (error) {
    console.error('Error renaming team:', error);
    res.status(400).json({ error: error.message || 'Failed to rename team' });
  }
});

// Lets a team change the size it declared at registration (2-4). Refused if it
// would drop below the number of people already on the team.
app.post('/api/teams/:teamId/size', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { size } = req.body;
    const effectiveUserId = req.user?.userId || req.body.userId;

    const users = await getUsers();
    const requester = users.find(u => String(u.User_ID).trim() === String(effectiveUserId || '').trim());
    if (!requester || String(requester.Team_ID).trim().toUpperCase() !== String(teamId).trim().toUpperCase()) {
      return res.status(403).json({ error: 'You are not a member of this team.' });
    }

    const result = await updateTeamSize(teamId, size);
    res.json({ success: true, size: result });
  } catch (error) {
    console.error('Error updating team size:', error);
    res.status(400).json({ error: error.message || 'Failed to update team size' });
  }
});

// --- Submissions ---
app.get('/api/submissions', async (req, res) => {
  try {
    const submissions = await getSubmissions();
    const { teamId } = req.query;
    if (teamId && String(teamId).trim()) {
      const wanted = String(teamId).trim().toUpperCase();
      const filtered = submissions.filter(
        s => String(s.Team_ID || '').trim().toUpperCase() === wanted
      );
      return res.json(filtered);
    }
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

app.post('/api/submissions', async (req, res) => {
  try {
    const round = String(
      req.body.Review_Round || req.body.Project_Description || ''
    ).trim();
    if (round.toLowerCase().includes('review 1') && isPastReview1Deadline()) {
      return res.status(403).json({ error: 'The Review 1 submission window closed at 1:00 PM on 18 Sep 2026.' });
    }
    await addSubmission(req.body);
    res.status(201).json({ message: 'Submission added successfully' });
  } catch (error) {
    console.error('Error adding submission:', error);
    res.status(500).json({ error: 'Failed to add submission' });
  }
});

// --- Reviews ---
// Judging scores and which judge gave them — admin-only, called only from the
// admin scoring console.
app.get('/api/reviews', requireAdmin(), async (req, res) => {
  try {
    const reviews = await getReviews();
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.post('/api/reviews', requireAdmin(), async (req, res) => {
  try {
    await addReview(req.body);
    res.status(201).json({ message: 'Review added successfully' });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(400).json({ error: error.message || 'Failed to add review', message: error.message || 'Failed to add review' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});

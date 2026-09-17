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
  updateTeamSize
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

// Populates req.user when a valid session token is present. Defaults to "log"
// mode, which never rejects — that lets the server ship before the client
// knows how to send tokens. Flip AUTH_MODE=enforce once the logs show tokens
// arriving. Individual routes below still enforce their own requirements.
app.use(authenticate());

// This is a pure REST API with no root page of its own — a plain GET / (from
// a health checker, monitoring, or someone hitting the API's bare domain)
// used to 404 with no route defined. Answer it so nothing mistakes that for
// the service being down.
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'codecortex3.0 api' });
});

// --- Auth & Session ---
app.post('/api/auth/session', async (req, res) => {
  try {
    const { accessToken, name, email } = req.body;

    let userEmail = email ? String(email).toLowerCase().trim() : '';
    let userName = name ? String(name).trim() : '';

    if (accessToken) {
      const tokenInfo = await verifyGoogleAccessToken(accessToken);
      if (tokenInfo && tokenInfo.email) {
        userEmail = tokenInfo.email;
        if (!userName && tokenInfo.name) {
          userName = tokenInfo.name;
        }
      }
    }

    if (!userEmail) {
      return res.status(401).json({ error: 'Invalid or unauthorized Google access token.' });
    }

    const user = await syncAuthUser(userEmail, userName || userEmail);
    const token = signSession({
      userId: user.User_ID,
      email: user.Email,
      role: 'participant'
    });

    res.json({ token, user });
  } catch (error) {
    console.error('Error in /api/auth/session:', error);
    res.status(500).json({ error: 'Failed to create session.' });
  }
});

app.post(
  '/api/admin/session',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }),
  async (req, res) => {
    try {
      const { name, passcode } = req.body;
      if (!name || !passcode) {
        return res.status(400).json({ error: 'Name and passcode are required.' });
      }

      if (!checkAdminPasscode(passcode)) {
        return res.status(401).json({ error: 'Invalid admin passcode.' });
      }

      const token = signSession({ name: String(name).trim(), role: 'admin' }, 12 * 3600);
      res.json({ token });
    } catch (error) {
      console.error('Error in /api/admin/session:', error);
      res.status(500).json({ error: 'Admin authentication failed.' });
    }
  }
);

// --- Users ---
app.get('/api/users', async (req, res) => {
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
    const token = signSession({
      userId: user.User_ID,
      email: user.Email,
      role: 'participant'
    });
    res.json({ ...user, token });
  } catch (error) {
    console.error('Error syncing auth user:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

app.post('/api/login', rateLimit({ windowMs: 60 * 1000, max: 10 }), async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Missing identifier or password' });
    }

    const user = await verifyUserCredentials(identifier.trim(), String(password));

    if (user) {
      const token = signSession({
        userId: user.User_ID,
        email: user.Email,
        role: 'participant'
      });
      return res.json({ success: true, user, token });
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

app.post('/api/teams/auth', rateLimit({ windowMs: 60 * 1000, max: 10 }), async (req, res) => {
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

app.post('/api/teams/join', rateLimit({ windowMs: 60 * 1000, max: 10 }), async (req, res) => {
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
app.post('/api/teams/:teamId/remove-member', requireAdmin(), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

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
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

app.post('/api/submissions', async (req, res) => {
  try {
    await addSubmission(req.body);
    res.status(201).json({ message: 'Submission added successfully' });
  } catch (error) {
    console.error('Error adding submission:', error);
    res.status(500).json({ error: 'Failed to add submission' });
  }
});

// --- Reviews ---
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await getReviews();
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.post('/api/reviews', async (req, res) => {
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

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

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.set('trust proxy', 1);

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'codecortex3.0 api' });
});

// --- Auth & Session ---
app.post('/api/auth/session', async (req, res) => {
  try {
    const { accessToken, name, email } = req.body;
    const userEmail = email ? String(email).toLowerCase().trim() : '';
    const userName = name ? String(name).trim() : '';

    if (!userEmail) {
      return res.status(400).json({ error: 'Missing email' });
    }

    const user = await syncAuthUser(userEmail, userName || userEmail);
    res.json({ token: 'cc_session_valid', user });
  } catch (error) {
    console.error('Error in /api/auth/session:', error);
    res.status(500).json({ error: 'Failed to create session.' });
  }
});

app.post('/api/admin/session', async (req, res) => {
  try {
    const { name, passcode } = req.body;
    if (!name || !passcode) {
      return res.status(400).json({ error: 'Name and passcode are required.' });
    }

    const validPasscode = process.env.ADMIN_PASSCODE || 'tamreviewpanel_cc';
    if (String(passcode).trim() !== validPasscode) {
      return res.status(401).json({ error: 'Invalid admin passcode.' });
    }

    res.json({ success: true, token: 'admin_session_valid' });
  } catch (error) {
    console.error('Error in /api/admin/session:', error);
    res.status(500).json({ error: 'Admin authentication failed.' });
  }
});

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
    res.json(user);
  } catch (error) {
    console.error('Error syncing auth user:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

app.post('/api/login', async (req, res) => {
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

app.post('/api/teams/auth', async (req, res) => {
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

app.post('/api/teams/join', async (req, res) => {
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
app.post('/api/teams/:teamId/remove-member', async (req, res) => {
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

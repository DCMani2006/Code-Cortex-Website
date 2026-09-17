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
  linkUserToTeam
} from './googleSheets.js';
import { saveTeamPassword, verifyTeamPassword, getTeamPasswords } from './teamPasswords.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// This is a pure REST API with no root page of its own — a plain GET / (from
// a health checker, monitoring, or someone hitting the API's bare domain)
// used to 404 with no route defined. Answer it so nothing mistakes that for
// the service being down.
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'codecortex3.0 api' });
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
    if ((!teamData.Team_Leader || String(teamData.Team_Leader).trim() === '') && req.body._userId) {
      try {
        const users = await getUsers();
        const matched = users.find(u => String(u.User_ID) === String(req.body._userId));
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

app.post('/api/teams/auth', (req, res) => {
  try {
    const { teamId, password } = req.body;
    const isValid = verifyTeamPassword(teamId, password);
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
    const { teamId, password, userId } = req.body;
    if (!verifyTeamPassword(teamId, password)) {
      return res.status(401).json({ success: false, error: 'Invalid Team ID or Password' });
    }
    
    const success = await linkUserToTeam(userId, teamId);
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
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const users = await getUsers();
    const requester = users.find(u => String(u.User_ID).trim() === String(userId).trim());
    if (!requester || String(requester.Team_ID).trim() !== String(teamId).trim()) {
      return res.status(403).json({ error: 'You are not a member of this team.' });
    }

    const password = getTeamPasswords()[teamId];
    if (!password) {
      return res.status(404).json({ error: 'No password on file for this team.' });
    }

    res.json({ password });
  } catch (error) {
    console.error('Error fetching team password:', error);
    res.status(500).json({ error: 'Failed to fetch team password' });
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

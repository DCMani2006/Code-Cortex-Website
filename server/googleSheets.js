import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const credentialsPath = path.resolve(__dirname, 'credentials.json');

let doc;

// Every read here is a full-sheet scan against the Google Sheets API, and
// Google's default quota (~60 read requests/min per identity, and this
// service account is the *one* identity behind every visitor's request) gets
// exhausted fast once more than a handful of people load a dashboard at the
// same time. A short-TTL cache on the hot list-reads absorbs concurrent
// polling; writes below invalidate the relevant key immediately so nobody
// sees stale data right after creating/joining a team or submitting.
const READ_CACHE_TTL_MS = 12_000;
const readCache = new Map(); // key -> { data, expiresAt }
const inFlight = new Map(); // key -> Promise, so concurrent misses share one fetch

async function cachedRead(key, fetcher) {
  const hit = readCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data;

  // A burst of simultaneous requests (e.g. 300+ people opening their
  // dashboard in the same second) can all miss the cache before the first
  // fetch resolves. Without this, each of them would fire its own Sheets
  // read and blow through the quota in one go — share a single in-flight
  // fetch across all of them instead.
  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = fetcher()
    .then((data) => {
      readCache.set(key, { data, expiresAt: Date.now() + READ_CACHE_TTL_MS });
      return data;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

function invalidateCache(...keys) {
  keys.forEach((key) => readCache.delete(key));
}

export async function initGoogleSheets() {
  if (!doc) {
    // credentials.json is gitignored (it's a private key), so a deploy built
    // from git won't have the file — fall back to pasting the same JSON into
    // a GOOGLE_CREDENTIALS_JSON env var on whatever host runs this.
    let credentials;
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } else if (fs.existsSync(credentialsPath)) {
      credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    } else {
      throw new Error(`Google Sheets credentials not found. Provide GOOGLE_CREDENTIALS_JSON env var or place credentials.json in ${__dirname}`);
    }

    const jwt = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    if (!process.env.GOOGLE_SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID environment variable is missing. Please set it in server/.env');
    }

    doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, jwt);
  }
  await doc.loadInfo(); // loads document properties and worksheets

  const requiredSheets = [
    {
      title: 'Users',
      headerValues: ['User_ID', 'Name', 'Email', 'Role (Participant/Admin)', 'Team_ID', 'Password']
    },
    {
      title: 'Team',
      headerValues: ['Team_ID', 'Team_ Name', 'Track', 'Team_Leader', 'No. of Members', 'Password', 'Team_Type']
    },
    {
      title: 'Submissions',
      headerValues: ['Team_ID', 'Team_Name', 'Project_Description', 'GitHub Link', 'Figma Link', 'Submission Time']
    },
    {
      title: 'Reviews_Scores',
      headerValues: [
        'Team_ID',
        'Team_Name',
        'Admin_Name',
        'UI/UX (20)',
        'USP (10)',
        'Scalability/Feasibility (10)',
        'Implementation (10)',
        'Implementation (20)',
        'Progress (10)',
        'Progress (20)',
        'Architecture (10)',
        'Machine Learning (10)',
        'Dataset Utilisation (10)',
        'Tech Stack (10)',
        'Total_Score',
        'Review_Round'
      ]
    }
  ];

  for (const req of requiredSheets) {
    if (!doc.sheetsByTitle[req.title]) {
      try {
        await doc.addSheet({
          title: req.title,
          headerValues: req.headerValues
        });
      } catch (e) {
        console.error(`Failed to auto-create sheet ${req.title}:`, e);
      }
    }
  }

  return doc;
}

export async function getUsers() {
  return cachedRead('users', async () => {
    const document = await initGoogleSheets();
    const sheet = document.sheetsByTitle['Users'];
    if (!sheet) return [];
    const rows = await sheet.getRows();
    return rows.map(row => ({
      User_ID: row.get('User_ID'),
      Name: row.get('Name'),
      Email: row.get('Email'),
      'Role (Participant/Admin)': row.get('Role (Participant/Admin)'),
      Team_ID: row.get('Team_ID'),
    }));
  });
}

export async function addUser(data) {
  const document = await initGoogleSheets();
  const sheet = document.sheetsByTitle['Users'];
  await sheet.addRow(data);
  invalidateCache('users');
}

export async function syncAuthUser(email, name) {
  const document = await initGoogleSheets();
  const sheet = document.sheetsByTitle['Users'];
  if (!sheet) throw new Error('Users sheet not found');
  
  const rows = await sheet.getRows();
  // Case/whitespace-insensitive: Google hands back one canonical spelling, but
  // anything typed by hand may differ in case, and an exact compare would then
  // mint a second Users row for a person who already has one.
  const wantedEmail = String(email || '').trim().toLowerCase();
  let userRow = rows.find(
    r => String(r.get('Email') || '').trim().toLowerCase() === wantedEmail
  );
  
  if (userRow) {
    return {
      User_ID: userRow.get('User_ID'),
      Name: userRow.get('Name'),
      Email: userRow.get('Email'),
      'Role (Participant/Admin)': userRow.get('Role (Participant/Admin)'),
      Team_ID: userRow.get('Team_ID'),
    };
  } else {
    // Prefer a VIT-format reg number embedded in the Google display name
    // (e.g. "Jane Doe 21BCE1234") so internal users get a recognizable ID;
    // fall back to the "U-####" convention the client already checks for
    // (via `User_ID.startsWith("U-")`) when deciding whether to trust this
    // ID or replace it with the one typed at registration.
    const regNoMatch = String(name || '').match(/\b(\d{2}[a-zA-Z]{3}\d{4,5})\b/i);
    const userId = regNoMatch
      ? regNoMatch[1].toUpperCase()
      : 'U-' + Math.floor(1000 + Math.random() * 9000);
    const newUser = {
      User_ID: userId,
      Name: name,
      Email: email,
      'Role (Participant/Admin)': 'Participant',
      // Empty, not the string 'null' — that string is truthy in JS and would
      // make every brand-new user look like they already belong to a team.
      Team_ID: ''
    };
    await sheet.addRow(newUser);
    invalidateCache('users');
    return newUser;
  }
}

export async function verifyUserCredentials(identifier, password) {
  const document = await initGoogleSheets();
  const sheet = document.sheetsByTitle['Users'];
  if (!sheet) throw new Error('Users sheet not found');

  const rows = await sheet.getRows();

  const idRaw = String(identifier || '').trim();
  const idLower = idRaw.toLowerCase();
  const pwdRaw = String(password || '').trim();

  // NEW: try multiple possible header names for the password column
  const passwordCandidates = ['Password', 'password', 'Passcode', 'Team_Password'];

  const match = rows.find(r => {
    const id = String(r.get('User_ID') || '').trim();
    const email = String(r.get('Email') || '').trim().toLowerCase();
    const name = String(r.get('Name') || '').trim();

    // NEW: check each candidate column, use the first one that has a value
    let pwd = '';
    for (const col of passwordCandidates) {
      const val = r.get(col);
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        pwd = String(val).trim();
        break;
      }
    }

    const identifierMatches = (
      (id && id === idRaw) ||
      (name && name === idRaw) ||
      (email && email === idLower) ||
      (id && id.toLowerCase() === idLower)
    );

    return identifierMatches && pwd === pwdRaw;
  });

  if (!match) return null;

  return {
    User_ID: match.get('User_ID'),
    Name: match.get('Name'),
    Email: match.get('Email'),
    'Role (Participant/Admin)': match.get('Role (Participant/Admin)'),
    Team_ID: match.get('Team_ID'),
  };
}

export async function getTeams() {
  return cachedRead('teams', async () => {
    const document = await initGoogleSheets();
    const sheet = document.sheetsByTitle['Team']; // As per instructions, "Team" not "Teams"
    if (!sheet) return [];
    const rows = await sheet.getRows();

    // Count actual members per team from Users sheet
    const usersSheet = document.sheetsByTitle['Users'];
    const memberCounts = {};
    if (usersSheet) {
      try {
        const userRows = await usersSheet.getRows();
        for (const u of userRows) {
          const tid = normaliseTeamId(u.get('Team_ID'));
          if (tid) {
            memberCounts[tid] = (memberCounts[tid] || 0) + 1;
          }
        }
      } catch (e) {
        console.error('Error counting team members:', e);
      }
    }

    return rows.map(row => {
      const tid = normaliseTeamId(row.get('Team_ID'));
      const count = memberCounts[tid] !== undefined ? String(memberCounts[tid]) : String(row.get('No. of Members') || '1');
      return {
        Team_ID: row.get('Team_ID'),
        'Team_ Name': row.get('Team_ Name'), // Exact spacing
        Track: row.get('Track'),
        Team_Leader: row.get('Team_Leader'),
        'No. of Members': count,
        Team_Type: row.get('Team_Type'),
      };
    });
  });
}

// "No. of Members" on the Team sheet is the team size the leader DECLARED at
// registration (2-4) — it is not a running tally. The real roster is the set of
// Users rows carrying this Team_ID, so membership is counted from there. That
// keeps the two from drifting: the old code incremented the declared number on
// every join, so a 2-person team showed 3 after its one member joined.
// The Team sheet carries the password too (addTeam writes it). That makes the
// sheet the durable source of truth: teamPasswords.json lives on the server's
// disk, so a redeploy without a mounted volume would otherwise lose every
// password and lock every member out of joining.
export async function getTeamPasswordFromSheet(teamId) {
  const document = await initGoogleSheets();
  const sheet = document.sheetsByTitle['Team'];
  if (!sheet) return null;
  const rows = await sheet.getRows();
  const wanted = normaliseTeamId(teamId);
  const row = rows.find(r => normaliseTeamId(r.get('Team_ID')) === wanted);
  if (!row) return null;
  for (const col of ['Password', 'Team_Password', 'teamPassword', 'Team Password']) {
    const val = row.get(col);
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return null;
}

function normaliseTeamId(value) {
  return String(value || '').trim().toUpperCase();
}

export async function linkUserToTeam(userId, teamId, options = {}) {
  const { email = '', regNo = '' } = options;
  const document = await initGoogleSheets();
  const usersSheet = document.sheetsByTitle['Users'];
  if (!usersSheet) throw new Error("Users sheet not found");

  const rows = await usersSheet.getRows();
  // Team IDs are matched case-insensitively — someone typing "cc-1586" is
  // naming the same team as "CC-1586" and shouldn't be told the ID is wrong.
  const wantedTeamId = normaliseTeamId(teamId);
  const wantedEmail = String(email || '').trim().toLowerCase();
  const wantedRegNo = String(regNo || '').trim().toUpperCase();

  // Resolve the person by User_ID first, then by email. The email fallback
  // matters: a VIT account whose Google display name has no registration
  // number gets a placeholder "U-1234" User_ID, so the reg number typed at
  // registration/join won't match any row — but the email always will.
  let userRow = rows.find(r => String(r.get('User_ID') || '').trim() === String(userId).trim());
  if (!userRow && wantedEmail) {
    userRow = rows.find(
      r => String(r.get('Email') || '').trim().toLowerCase() === wantedEmail
    );
  }

  if (!userRow) {
    console.log(`User ${userId} not found (email fallback: ${wantedEmail || 'none'})`);
    return false;
  }

  const existingTeamId = normaliseTeamId(userRow.get('Team_ID'));

  if (existingTeamId && existingTeamId === wantedTeamId) {
    // Already on this team — re-joining is a no-op rather than an error, so a
    // double-submit or a refresh can't add the same person twice.
    console.log(`User ${userId} is already on team ${wantedTeamId}; nothing to do`);
    return true;
  }
  if (existingTeamId) {
    throw new Error("You are already a member of a team and cannot create or join another team.");
  }

  // Capacity: count the rows already carrying this Team_ID (maximum 4 members)
  const teamSheet = document.sheetsByTitle['Team'];
  let teamRow = null;
  if (teamSheet) {
    const teamRows = await teamSheet.getRows();
    teamRow = teamRows.find(r => normaliseTeamId(r.get('Team_ID')) === wantedTeamId);
    if (!teamRow) {
      throw new Error("That team no longer exists.");
    }
    const current = rows.filter(r => normaliseTeamId(r.get('Team_ID')) === wantedTeamId).length;
    if (current >= 4) {
      throw new Error(`This team is already full (maximum 4 members).`);
    }
  }

  // Capture the registration number if we have one and this row is still on a
  // placeholder ID, so joiners aren't left as "U-1234" forever. Skipped if some
  // other row already owns that reg number.
  const currentUserId = String(userRow.get('User_ID') || '').trim();
  if (wantedRegNo && currentUserId.toUpperCase() !== wantedRegNo) {
    const takenByOther = rows.some(
      r => r !== userRow && String(r.get('User_ID') || '').trim().toUpperCase() === wantedRegNo
    );
    if (takenByOther) {
      throw new Error(`Registration number ${wantedRegNo} is already registered to someone else.`);
    }
    if (!currentUserId || currentUserId.startsWith('U-')) {
      userRow.assign({ User_ID: wantedRegNo });
    }
  }

  userRow.assign({ Team_ID: wantedTeamId });
  await userRow.save();
  console.log(`Saved Team_ID to ${wantedTeamId} for ${userId}`);

  if (teamRow) {
    try {
      const updatedCount = rows.filter(r => normaliseTeamId(r.get('Team_ID')) === wantedTeamId).length + 1;
      teamRow.assign({ 'No. of Members': String(updatedCount) });
      await teamRow.save();
    } catch (e) {
      console.error('Error updating team size in sheet:', e);
    }
  }

  invalidateCache('users', 'teams');

  return true;
}

// Detaches a member from a team (admin fix-up). Clears their Team_ID so they
// are free to join the right team; their Users row and details are kept.
export async function removeUserFromTeam(userId, teamId) {
  const document = await initGoogleSheets();
  const usersSheet = document.sheetsByTitle['Users'];
  if (!usersSheet) throw new Error('Users sheet not found');

  const rows = await usersSheet.getRows();
  const wantedTeamId = normaliseTeamId(teamId);
  const row = rows.find(
    r =>
      String(r.get('User_ID') || '').trim() === String(userId).trim() &&
      normaliseTeamId(r.get('Team_ID')) === wantedTeamId
  );
  if (!row) return false;

  row.assign({ Team_ID: '' });
  await row.save();

  const teamSheet = document.sheetsByTitle['Team'];
  if (teamSheet) {
    try {
      const teamRows = await teamSheet.getRows();
      const teamRow = teamRows.find(r => normaliseTeamId(r.get('Team_ID')) === wantedTeamId);
      if (teamRow) {
        const remaining = rows.filter(
          r => r !== row && normaliseTeamId(r.get('Team_ID')) === wantedTeamId
        ).length;
        teamRow.assign({ 'No. of Members': String(remaining) });
        await teamRow.save();
      }
    } catch (e) {
      console.error('Error updating team size in sheet on remove:', e);
    }
  }

  invalidateCache('users', 'teams');
  console.log(`Removed ${userId} from team ${wantedTeamId}`);
  return true;
}

// Changes the size a team declared at registration. Refused if it would drop
// below the number of people already on the team.
export async function updateTeamSize(teamId, size) {
  const requested = Number(size);
  if (!Number.isInteger(requested) || requested < 2 || requested > 4) {
    throw new Error('Team size must be a whole number between 2 and 4.');
  }

  const document = await initGoogleSheets();
  const teamSheet = document.sheetsByTitle['Team'];
  const usersSheet = document.sheetsByTitle['Users'];
  if (!teamSheet || !usersSheet) throw new Error('Sheets not found');

  const wantedTeamId = normaliseTeamId(teamId);
  const teamRows = await teamSheet.getRows();
  const teamRow = teamRows.find(r => normaliseTeamId(r.get('Team_ID')) === wantedTeamId);
  if (!teamRow) throw new Error('Team not found.');

  const userRows = await usersSheet.getRows();
  const current = userRows.filter(r => normaliseTeamId(r.get('Team_ID')) === wantedTeamId).length;
  if (requested < current) {
    throw new Error(`Your team already has ${current} members, so the size can't be set below ${current}.`);
  }

  teamRow.assign({ 'No. of Members': String(requested) });
  await teamRow.save();
  invalidateCache('teams');
  return requested;
}

export async function addTeam(data) {
  const document = await initGoogleSheets();
  const usersSheet = document.sheetsByTitle['Users'];
  
  // Extract explicit _userId if provided
  const userId = data._userId;
  const userEmail = String(data._userEmail || '').trim().toLowerCase();
  delete data._userId;
  delete data._userEmail;

  // --- STRICT MEMBERSHIP VALIDATION ---
  if (usersSheet) {
    const existingUserRows = await usersSheet.getRows();

    // 1. Check logged-in user creating the team
    if (userId) {
      const loggedUserRow = existingUserRows.find(r => r.get('User_ID') === userId);
      if (loggedUserRow) {
        const existingTeamId = String(loggedUserRow.get('Team_ID') || '').trim();
        if (existingTeamId) {
          throw new Error("You are already a member of a team and cannot create or join another team.");
        }
      }
    }

    // 1b. Also check by email, independent of User_ID — a client-side bug
    // or stale identity resolution can hand us a *new* User_ID for someone
    // who already has an account (and a team) under the same email; this
    // catches that case even when the User_ID check above doesn't.
    if (userEmail) {
      const existingEmailRow = existingUserRows.find(
        r => String(r.get('Email') || '').trim().toLowerCase() === userEmail
      );
      if (existingEmailRow) {
        const existingTeamId = String(existingEmailRow.get('Team_ID') || '').trim();
        if (existingTeamId) {
          throw new Error("You are already a member of a team and cannot create or join another team.");
        }
      }
    }

    // 2. Extract leader reg no from Team_Leader string if present
    const leaderMatch = String(data.Team_Leader || '').match(/\b(\d{2}[a-zA-Z]{3}\d{4,5})\b/);
    const incomingRegNos = new Set();
    const incomingEmails = new Set();

    if (leaderMatch) {
      incomingRegNos.add(leaderMatch[1].toUpperCase());
    }

    // 3. Validate against existing database records
    for (const r of existingUserRows) {
      const dbRegNo = String(r.get('User_ID') || '').trim().toUpperCase();
      const dbEmail = String(r.get('Email') || '').trim().toLowerCase();
      const dbTeamId = String(r.get('Team_ID') || '').trim();

      if (dbRegNo && incomingRegNos.has(dbRegNo) && dbTeamId) {
        throw new Error(`Registration Number ${dbRegNo} is already a member of a team and cannot create or join another team.`);
      }
      if (dbEmail && incomingEmails.has(dbEmail) && dbTeamId) {
        throw new Error(`Email ${dbEmail} is already a member of a team and cannot create or join another team.`);
      }
    }
  }

  const sheet = document.sheetsByTitle['Team'];

  const rowData = { ...data };

  if (sheet) {
    const existingTeamRows = await sheet.getRows();
    const newTeamName = String(data['Team_ Name'] || data.Team_Name || data.Team_Name_ || data['Team Name'] || '').trim().toLowerCase();
    
    if (newTeamName) {
      for (const row of existingTeamRows) {
        const dbTeamName = String(row.get('Team_ Name') || row.get('Team_Name') || row.get('Team Name') || '').trim().toLowerCase();
        if (dbTeamName === newTeamName) {
          throw new Error("Team Name already exists. Please choose a different name.");
        }
      }
    }

    // The client proposes a Team_ID ("CC-" + 4 random digits), but that's only
    // 9000 values — across a hackathon's worth of teams a repeat is likely, and
    // a repeat is nasty: joiners would land on whichever team matched first and
    // the two teams' passwords would overwrite each other. Take the proposed ID
    // only if it's free, otherwise mint the next free one and hand it back so
    // the caller shows the team the ID actually stored.
    const takenIds = new Set(
      existingTeamRows.map(r => String(r.get('Team_ID') || '').trim().toUpperCase())
    );
    let candidate = String(rowData.Team_ID || '').trim();
    if (!candidate || takenIds.has(candidate.toUpperCase())) {
      const prefix = candidate.includes('-') ? candidate.split('-')[0] : 'CC';
      let next = null;
      for (let attempt = 0; attempt < 200; attempt++) {
        const tryId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
        if (!takenIds.has(tryId.toUpperCase())) {
          next = tryId;
          break;
        }
      }
      if (!next) throw new Error('Could not allocate a free Team ID. Please try again.');
      console.log(`Team_ID ${candidate} was taken; assigned ${next} instead`);
      candidate = next;
    }
    rowData.Team_ID = candidate;
  }
  const teamPassword = rowData.Team_Password || rowData.Password || rowData.teamPassword || rowData['Team Password'];
  if (teamPassword) {
    rowData.Password = teamPassword;
    rowData.Team_Password = teamPassword;
    rowData.teamPassword = teamPassword;
    rowData['Team Password'] = teamPassword;
  }

  if (!rowData.Team_Leader && rowData['Team Leader']) {
    rowData.Team_Leader = rowData['Team Leader'];
  }

  // Ensure exact sheet headers exist so Google Sheet stores the values under the expected columns.
  try {
    await sheet.loadHeaderRow();
    const headers = sheet.headerValues.map(h => String(h).trim());
    const headerMap = new Set(headers);
    const newHeaders = [...headers];

    const ensureColumn = (targetHeader, fallbackCandidates = []) => {
      if (headerMap.has(targetHeader)) return;
      if (fallbackCandidates.some(h => headerMap.has(h))) return;
      newHeaders.push(targetHeader);
      headerMap.add(targetHeader);
    };

    ensureColumn('Password', ['Team_Password', 'teamPassword', 'Team Password']);
    ensureColumn('Team_Leader', ['Team Leader', 'Leader Name']);
    ensureColumn('Track');
    ensureColumn('Team_Type');

    if (newHeaders.length > headers.length) {
      await sheet.setHeaderRow(newHeaders);
    }
  } catch (e) {
    console.error('Warning: could not load/set header row for Team sheet', e);
  }

  await sheet.addRow(rowData);
  invalidateCache('teams');

  // Update the user's Team_ID if they are logged in and just created this team
  if (userId) {
    try {
      // Pass the email so the leader's row still resolves when their Google
      // display name carried no registration number (placeholder "U-" id), and
      // the reg number so it gets recorded against them.
      const leaderRegNo = /^\d{2}[a-zA-Z]{3}\d{4,5}$/.test(String(userId).trim())
        ? String(userId).trim().toUpperCase()
        : '';
      await linkUserToTeam(userId, rowData.Team_ID, { email: userEmail, regNo: leaderRegNo });
      console.log(`Successfully linked User ${userId} to Team ${rowData.Team_ID}`);
    } catch (e) {
      console.error(`Failed to link user ${userId}:`, e);
      throw new Error(
        'Team was created but we could not attach you to it. Please contact the organisers before registering again.'
      );
    }
  }

  return rowData.Team_ID;

}


const getRowValue = (row, candidates) => {
  for (const key of candidates) {
    const value = row.get(key);
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
};

export async function getSubmissions() {
  return cachedRead('submissions', async () => {
    const document = await initGoogleSheets();
    const sheet = document.sheetsByTitle['Submissions'];
    if (!sheet) return [];
    const rows = await sheet.getRows();

    return rows.map(row => {
      const teamId = getRowValue(row, ['Team_ID', 'Team ID', 'TeamId', 'teamId']);
      const teamName = getRowValue(row, ['Team_Name', 'Team_ Name', 'Team Name', 'Team_Name ', 'Team Name ']);
      const projectDescription = getRowValue(row, ['Project_Description', 'Project Description', 'Project Description ']);
      const githubLink = getRowValue(row, ['GitHub Link', 'GitHub', 'GitHub Link ']);
      const figmaLink = getRowValue(row, ['Figma Link', 'Figma', 'Figma Link ']);
      const datasetLink = getRowValue(row, ['Public Dataset Link', 'Dataset Link', 'Dataset', 'Public_Dataset_Link']);
      const submissionTime = getRowValue(row, ['Submission Time', 'Submission Time ', 'Submitted At', 'Submission_Time']);

      return {
        Team_ID: teamId,
        'Team_Name ': teamName,
        Project_Description: projectDescription,
        'GitHub Link': githubLink,
        'Figma Link': figmaLink,
        'Dataset Link': datasetLink,
        'Public Dataset Link': datasetLink,
        'Submission Time': submissionTime,
      };
    });
  });
}

export async function addSubmission(data) {
  const document = await initGoogleSheets();

  // Look up actual team name from Team sheet using Team_ID
  const teamSheet = document.sheetsByTitle['Team'];
  let actualTeamName = data['Team_Name '] || data.Team_Name || data['Team Name'];
  if (teamSheet) {
    const teamRows = await teamSheet.getRows();
    const matchedTeam = teamRows.find(row => {
      const teamId = getRowValue(row, ['Team_ID', 'Team ID', 'TeamId']);
      return teamId === String(data.Team_ID || '').trim();
    });
    if (matchedTeam) {
      actualTeamName = getRowValue(matchedTeam, ['Team_ Name', 'Team Name', 'Team_Name']);
    }
  }

  const sheet = document.sheetsByTitle['Submissions'];
  if (!sheet) throw new Error('Submissions sheet not found');
  await sheet.loadHeaderRow();
  const headers = sheet.headerValues || [];
  const teamNameHeader = headers.find(h => ['Team_Name', 'Team_ Name', 'Team Name'].includes(String(h).trim())) || 'Team_Name';

  // Ensure dataset column header exists if missing
  const headerSet = new Set(headers.map(h => String(h).trim()));
  const newHeaders = [...headers];
  if (!headerSet.has('Public Dataset Link') && !headerSet.has('Dataset Link')) {
    newHeaders.push('Public Dataset Link');
  }
  if (newHeaders.length > headers.length) {
    try {
      await sheet.setHeaderRow(newHeaders);
    } catch (e) {
      console.error('Error adding header to Submissions sheet:', e);
    }
  }

  const datasetLink = data['Public Dataset Link'] || data['Dataset Link'] || '';

  const rowData = {
    Team_ID: data.Team_ID,
    [teamNameHeader]: actualTeamName,
    Project_Description: data.Project_Description,
    'GitHub Link': data['GitHub Link'] || '',
    'Figma Link': data['Figma Link'] || '',
    'Public Dataset Link': datasetLink,
    'Dataset Link': datasetLink,
    'Submission Time': data['Submission Time'] || new Date().toLocaleString()
  };

  const rows = await sheet.getRows();
  const existingRow = rows.find(r => {
    const tid = getRowValue(r, ['Team_ID', 'Team ID', 'TeamId', 'teamId']);
    return normaliseTeamId(tid) === normaliseTeamId(data.Team_ID);
  });

  if (existingRow) {
    existingRow.assign(rowData);
    await existingRow.save();
    console.log(`Updated submission in place for team ${data.Team_ID}`);
  } else {
    await sheet.addRow(rowData);
    console.log(`Added new submission for team ${data.Team_ID}`);
  }

  invalidateCache('submissions');
}

export async function getReviews() {
  return cachedRead('reviews', async () => {
    const document = await initGoogleSheets();
    const sheet = document.sheetsByTitle['Reviews_Scores'];
    if (!sheet) return [];
    const rows = await sheet.getRows();
    return rows.map(row => ({
      Team_ID: row.get('Team_ID') || '',
      Team_Name: row.get('Team_Name') || '',
      Admin_Name: row.get('Admin_Name') || '',
      'UI/UX (20)': row.get('UI/UX (20)') ?? row.get('Design (20)') ?? '',
      'USP (10)': row.get('USP (10)') ?? row.get('USP (20)') ?? '',
      'Scalability/Feasibility (10)': row.get('Scalability/Feasibility (10)') ?? row.get('Scalability (10)') ?? '',
      'Implementation (10)': row.get('Implementation (10)') ?? '',
      'Implementation (20)': row.get('Implementation (20)') ?? '',
      'Progress (10)': row.get('Progress (10)') ?? '',
      'Progress (20)': row.get('Progress (20)') ?? '',
      'Architecture (10)': row.get('Architecture (10)') ?? '',
      'Machine Learning (10)': row.get('Machine Learning (10)') ?? '',
      'Dataset Utilisation (10)': row.get('Dataset Utilisation (10)') ?? '',
      'Tech Stack (10)': row.get('Tech Stack (10)') ?? row.get('Tech (30)') ?? '',
      'Approach (20)': row.get('Approach (20)') ?? '',
      'Scalability (10)': row.get('Scalability (10)') ?? '',
      'Design (20)': row.get('Design (20)') ?? '',
      'Tech (30)': row.get('Tech (30)') ?? '',
      'USP (20)': row.get('USP (20)') ?? '',
      Total_Score: row.get('Total_Score') || '',
      Review_Round: row.get('Review_Round') || '',
    }));
  });
}

export async function addReview(data) {
  const document = await initGoogleSheets();
  
  // Look up actual team name from Team sheet using Team_ID
  const teamSheet = document.sheetsByTitle['Team'];
  let actualTeamName = data.Team_Name;
  if (teamSheet) {
    const teamRows = await teamSheet.getRows();
    const matchedTeam = teamRows.find(row => {
      const teamId = getRowValue(row, ['Team_ID', 'Team ID', 'TeamId']);
      return teamId === String(data.Team_ID || '').trim();
    });
    if (matchedTeam) actualTeamName = getRowValue(matchedTeam, ['Team_ Name', 'Team Name', 'Team_Name']);
  }
  
  const sheet = document.sheetsByTitle['Reviews_Scores'];

  // Ensure all rubric columns exist in header — addRow silently drops any key
  // that isn't already a header.
  try {
    await sheet.loadHeaderRow();
    const headers = sheet.headerValues.map(h => String(h).trim());
    const requiredScoreHeaders = [
      'UI/UX (20)',
      'USP (10)',
      'Scalability/Feasibility (10)',
      'Implementation (10)',
      'Implementation (20)',
      'Progress (10)',
      'Progress (20)',
      'Architecture (10)',
      'Machine Learning (10)',
      'Dataset Utilisation (10)',
      'Tech Stack (10)',
      'Total_Score',
      'Review_Round'
    ];
    const missingHeaders = requiredScoreHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      await sheet.setHeaderRow([...headers, ...missingHeaders]);
    }
  } catch (e) {
    console.error('Warning: could not load/set header row for Reviews_Scores sheet', e);
  }

  const rowData = {
    ...data,
    Team_Name: actualTeamName,
    Review_Round: data.Review_Round || 'Review 1'
  };

  // Upsert: a re-scored (Team_ID, Review_Round) updates the existing row
  // instead of appending a duplicate. Prefer an explicit Review_Round match;
  // only treat a blank Review_Round as legacy "Review 1" data if nothing
  // explicitly tagged "Review 1" exists yet, so the two never collide.
  const existingRows = await sheet.getRows();
  const targetTeamId = String(rowData.Team_ID || '').trim();
  const targetRound = String(rowData.Review_Round || '').trim();
  const matchesTeam = row => String(row.get('Team_ID') || '').trim() === targetTeamId;

  let existingRow = existingRows.find(
    row => matchesTeam(row) && String(row.get('Review_Round') || '').trim() === targetRound
  );
  if (!existingRow && targetRound === 'Review 1') {
    existingRow = existingRows.find(row => matchesTeam(row) && !String(row.get('Review_Round') || '').trim());
  }

  if (existingRow) {
    // Whoever scored this (team, round) first owns it — this is the
    // authoritative check; the client also disables the form for other
    // reviewers, but that's just UX, not enforcement.
    const existingOwner = String(existingRow.get('Admin_Name') || '').trim();
    const incomingOwner = String(rowData.Admin_Name || '').trim();
    if (existingOwner && incomingOwner && existingOwner !== incomingOwner) {
      throw new Error(`${targetRound} for this team was already scored by ${existingOwner}. Only they can edit it.`);
    }
    existingRow.assign(rowData);
    await existingRow.save();
  } else {
    await sheet.addRow(rowData);
  }
  invalidateCache('reviews');
}

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';

let doc;

export async function initGoogleSheets() {
  if (!doc) {
    const credentialsPath = './credentials.json';
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));

    const jwt = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, jwt);
  }
  await doc.loadInfo(); // loads document properties and worksheets
  return doc;
}

export async function getUsers() {
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
}

export async function addUser(data) {
  const document = await initGoogleSheets();
  const sheet = document.sheetsByTitle['Users'];
  await sheet.addRow(data);
}

import crypto from 'crypto';

export async function syncAuthUser(email, name) {
  const document = await initGoogleSheets();
  const sheet = document.sheetsByTitle['Users'];
  if (!sheet) throw new Error('Users sheet not found');
  
  const rows = await sheet.getRows();
  let userRow = rows.find(r => r.get('Email') === email);
  
  if (userRow) {
    return {
      User_ID: userRow.get('User_ID'),
      Name: userRow.get('Name'),
      Email: userRow.get('Email'),
      'Role (Participant/Admin)': userRow.get('Role (Participant/Admin)'),
      Team_ID: userRow.get('Team_ID'),
    };
  } else {
    const userId = crypto.randomUUID();
    const newUser = {
      User_ID: userId,
      Name: name,
      Email: email,
      'Role (Participant/Admin)': 'Participant',
      Team_ID: 'null'
    };
    await sheet.addRow(newUser);
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
  const document = await initGoogleSheets();
  const sheet = document.sheetsByTitle['Team']; // As per instructions, "Team" not "Teams"
  if (!sheet) return [];
  const rows = await sheet.getRows();
  return rows.map(row => ({
    Team_ID: row.get('Team_ID'),
    'Team_ Name': row.get('Team_ Name'), // Exact spacing
    Track: row.get('Track'),
    Team_Leader: row.get('Team_Leader'),
    'No. of Members': row.get('No. of Members'),
  }));
}

export async function linkUserToTeam(userId, teamId) {
  const document = await initGoogleSheets();
  const usersSheet = document.sheetsByTitle['Users'];
  if (!usersSheet) throw new Error("Users sheet not found");

  const rows = await usersSheet.getRows();
  const userRow = rows.find(r => r.get('User_ID') === userId);
  
  console.log(`linkUserToTeam: userId=${userId}, teamId=${teamId}`);
  if (userRow) {
    const existingTeamId = String(userRow.get('Team_ID') || '').trim();
    if (existingTeamId && existingTeamId !== String(teamId).trim()) {
      throw new Error("You are already a member of a team and cannot create or join another team.");
    }
    
    console.log(`Found userRow for ${userId}. Current Team_ID: ${existingTeamId}`);
    userRow.assign({ Team_ID: teamId });
    await userRow.save();
    console.log(`Saved Team_ID to ${teamId} for ${userId}`);
    
    // Also increment No. of Members in the Team sheet!
    const teamSheet = document.sheetsByTitle['Team'];
    if (teamSheet) {
      const teamRows = await teamSheet.getRows();
      const teamRow = teamRows.find(r => String(r.get('Team_ID')).trim() === String(teamId).trim());
      if (teamRow) {
        let currentMembers = Number(teamRow.get('No. of Members')) || 0;
        teamRow.assign({ 'No. of Members': String(currentMembers + 1) });
        await teamRow.save();
        console.log(`Updated No. of Members for team ${teamId} to ${currentMembers + 1}`);
      }
    }
    
    return true;
  }
  console.log(`User ${userId} not found`);
  return false;
}

export async function addTeam(data, additionalMembers = []) {
  const document = await initGoogleSheets();
  const usersSheet = document.sheetsByTitle['Users'];
  
  // Extract explicit _userId if provided
  const userId = data._userId;
  delete data._userId;

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

    // 2. Extract leader reg no from Team_Leader string if present
    const leaderMatch = String(data.Team_Leader || '').match(/\b(\d{2}[a-zA-Z]{3}\d{4,5})\b/);
    const incomingRegNos = new Set();
    const incomingEmails = new Set();

    if (leaderMatch) {
      incomingRegNos.add(leaderMatch[1].toUpperCase());
    }

    // 3. Collect additional members details
    if (additionalMembers && additionalMembers.length > 0) {
      for (const m of additionalMembers) {
        const reg = String(m.regNo || '').trim().toUpperCase();
        const email = String(m.email || '').trim().toLowerCase();
        
        if (reg) {
          if (incomingRegNos.has(reg)) {
            throw new Error(`Duplicate Registration Number ${reg} in member submission.`);
          }
          incomingRegNos.add(reg);
        }
        if (email) {
          if (incomingEmails.has(email)) {
            throw new Error(`Duplicate Email ${email} in member submission.`);
          }
          incomingEmails.add(email);
        }
      }
    }

    // 4. Validate against existing database records
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
  }

  const rowData = { ...data };
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

    if (newHeaders.length > headers.length) {
      await sheet.setHeaderRow(newHeaders);
    }
  } catch (e) {
    console.error('Warning: could not load/set header row for Team sheet', e);
  }

  await sheet.addRow(rowData);

  // Update the user's Team_ID if they are logged in and just created this team
  if (userId) {
    try {
      await linkUserToTeam(userId, rowData.Team_ID);
      console.log(`Successfully linked User ${userId} to Team ${rowData.Team_ID}`);
    } catch (e) {
      console.error(`Failed to link user ${userId}:`, e);
    }
  }

  if (additionalMembers && additionalMembers.length > 0) {
    if (usersSheet) {
      for (const m of additionalMembers) {
        try {
          await usersSheet.addRow({
            'User_ID': String(m.regNo).toUpperCase(),
            'Name': m.name,
            'Email': m.email,
            'Role (Participant/Admin)': 'Participant',
            'Team_ID': rowData.Team_ID
          });
          console.log(`Successfully added additional member ${m.regNo} to Team ${rowData.Team_ID}`);
        } catch (e) {
          console.error(`Failed to add additional member ${m.regNo}:`, e);
        }
      }
    }
  }
}

export async function addMemberToTeam(teamId, memberData) {
  const document = await initGoogleSheets();
  
  const teamSheet = document.sheetsByTitle['Team'];
  const teamRows = await teamSheet.getRows();
  const teamRow = teamRows.find(r => String(r.get('Team_ID')).trim() === String(teamId).trim());
  if (!teamRow) {
    throw new Error('Team not found');
  }

  const usersSheet = document.sheetsByTitle['Users'];
  const userRows = await usersSheet.getRows();

  // Check team size limit
  const currentMembers = userRows.filter(u => String(u.get('Team_ID')).trim() === String(teamId).trim());
  if (currentMembers.length >= 4) {
    throw new Error('Team is already full (maximum 4 members).');
  }

  // Check if Reg No already exists globally
  const regNo = String(memberData.regNo).toUpperCase();
  const existingUser = userRows.find(u => String(u.get('User_ID')).trim().toUpperCase() === regNo);
  if (existingUser) {
    throw new Error(`Registration Number ${regNo} is already registered.`);
  }

  await usersSheet.addRow({
    'User_ID': regNo,
    'Name': memberData.name,
    'Email': memberData.email,
    'Role (Participant/Admin)': 'Participant',
    'Team_ID': teamId
  });

  // Update Team member count (if it exists)
  try {
    teamRow.set('No. of Members', String(currentMembers.length + 1));
    await teamRow.save();
  } catch (e) {
    console.error("Could not update team member count:", e);
  }

  return { success: true };
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
    const submissionTime = getRowValue(row, ['Submission Time', 'Submission Time ', 'Submitted At', 'Submission_Time']);

    return {
      Team_ID: teamId,
      'Team_Name ': teamName,
      Project_Description: projectDescription,
      'GitHub Link': githubLink,
      'Figma Link': figmaLink,
      'Submission Time': submissionTime,
    };
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
  await sheet.loadHeaderRow();
  const headers = sheet.headerValues || [];
  const teamNameHeader = headers.find(h => ['Team_Name', 'Team_ Name', 'Team Name'].includes(String(h).trim())) || 'Team_Name';

  const rowData = {
    Team_ID: data.Team_ID,
    [teamNameHeader]: actualTeamName,
    Project_Description: data.Project_Description,
    'GitHub Link': data['GitHub Link'],
    'Figma Link': data['Figma Link'],
    'Submission Time': data['Submission Time']
  };

  await sheet.addRow(rowData);
}

export async function getReviews() {
  const document = await initGoogleSheets();
  const sheet = document.sheetsByTitle['Reviews_Scores'];
  if (!sheet) return [];
  const rows = await sheet.getRows();
  return rows.map(row => ({
    Team_ID: row.get('Team_ID'),
    Team_Name: row.get('Team_Name'),
    Admin_Name: row.get('Admin_Name'),
    'Approach (20)': row.get('Approach (20)'),
    'Scalability (10)': row.get('Scalability (10)'),
    'Design (20)': row.get('Design (20)'),
    'Tech (30)': row.get('Tech (30)'),
    'USP (20)': row.get('USP (20)'),
    Total_Score: row.get('Total_Score'),
  }));
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
  
  const rowData = {
    ...data,
    Team_Name: actualTeamName,
    Review_Round: data.Review_Round || 'Review 1'
  };
  
  await sheet.addRow(rowData);
}

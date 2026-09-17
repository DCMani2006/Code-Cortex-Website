import type {
  User,
  Team,
  Submission,
  ReviewScore
} from '../types/database';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

const SESSION_KEY = 'cc_session';

export const setSessionToken = (token: string | null): void => {
  try {
    if (token) {
      localStorage.setItem(SESSION_KEY, token);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // ignore
  }
};

export const getSessionToken = (): string | null => {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
};

export const clearSession = (): void => setSessionToken(null);

export interface SessionPayload {
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  exp?: number;
}

export const getSessionPayload = (): SessionPayload | null => {
  const token = getSessionToken();
  if (!token) return null;
  try {
    const [payloadPart] = token.split('.');
    if (!payloadPart) return null;
    const json = atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

// =====================================================
// USERS
// =====================================================

export const getUsers = async (): Promise<User[]> => {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'GET',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  const users = await response.json();
  return Array.isArray(users) ? users : [];
};

export const addUser = async (
  user: User,
  password: string
): Promise<void> => {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      User_ID: user.User_ID,
      Name: user.Name,
      Email: user.Email,
      'Role (Participant/Admin)': user['Role (Participant/Admin)'] || 'Participant',
      Team_ID: user.Team_ID || '',
      Password: password
    })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Failed to add user');
  }
};

// =====================================================
// AUTHENTICATION
// =====================================================

export const syncUserByEmail = async (
  email: string,
  name: string
): Promise<User> => {
  const response = await fetch(`${API_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), name: name.trim() })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Failed to sync user');
  }

  const user = await response.json();
  return {
    User_ID: String(user.User_ID ?? ''),
    Name: String(user.Name ?? ''),
    Email: String(user.Email ?? ''),
    'Role (Participant/Admin)': String(user['Role (Participant/Admin)'] ?? 'Participant'),
    Team_ID: String(user.Team_ID ?? '')
  };
};

export const startSession = async (
  _googleAccessToken?: string,
  name?: string,
  email?: string
): Promise<{ token: string; user: User }> => {
  const user = await syncUserByEmail(email || '', name || '');
  return { token: 'cc_session_valid', user };
};

export const startAdminSession = async (
  name: string,
  passcode: string
): Promise<string> => {
  const response = await fetch(`${API_BASE}/admin/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, passcode })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || 'Invalid passcode!');
  }

  return 'admin_session_valid';
};

export const syncAuth = async (
  identifier: string,
  password: string
): Promise<User> => {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: identifier.trim(), password })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Invalid credentials');
  }

  const data = await response.json();

  if (!data.success || !data.user) {
    throw new Error(data.message || 'Invalid credentials');
  }

  return {
    User_ID: String(data.user.User_ID ?? ''),
    Name: String(data.user.Name ?? ''),
    Email: String(data.user.Email ?? ''),
    'Role (Participant/Admin)': String(data.user['Role (Participant/Admin)'] ?? 'Participant'),
    Team_ID: String(data.user.Team_ID ?? '')
  };
};

// =====================================================
// TEAMS
// =====================================================

type RawTeam = Record<string, unknown>;

const mapTeam = (team: RawTeam): Team => ({
  Team_ID: String(team?.Team_ID ?? team?.teamId ?? ''),
  'Team_ Name': String(team?.['Team_ Name'] ?? team?.teamName ?? ''),
  Track: String(team?.Track ?? team?.track ?? ''),
  Team_Leader: String(team?.Team_Leader ?? team?.teamLeader ?? ''),
  'No. of Members': String(team?.['No. of Members'] ?? team?.numberOfMembers ?? ''),
  Team_Type: String(team?.Team_Type ?? team?.teamType ?? '')
});

export const getTeamMembers = async (teamId: string): Promise<User[]> => {
  const response = await fetch(`${API_BASE}/teams/${teamId}/members`, {
    method: 'GET',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch team members');
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const getTeams = async (): Promise<Team[]> => {
  const response = await fetch(`${API_BASE}/teams`, {
    method: 'GET',
    cache: 'no-store'
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Failed to fetch teams');
  }

  const teamsFromServer = await response.json();

  if (!Array.isArray(teamsFromServer)) return [];

  return (teamsFromServer as RawTeam[]).map(mapTeam);
};

export const addTeam = async (
  team: Team,
  password: string,
  userId: string,
  userEmail?: string
): Promise<string> => {
  const response = await fetch(`${API_BASE}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Team_ID: team.Team_ID,
      'Team_ Name': team['Team_ Name'],
      Track: team.Track,
      Team_Leader: team.Team_Leader,
      'No. of Members': team['No. of Members'],
      Team_Type: team.Team_Type,
      teamPassword: password,
      _userId: userId,
      _userEmail: userEmail
    })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Failed to create team');
  }

  const data = await response.json().catch(() => null);
  return String(data?.teamId || data?.team?.Team_ID || team.Team_ID);
};

export const getTeamPassword = async (
  teamId: string,
  userId: string
): Promise<string> => {
  const response = await fetch(`${API_BASE}/teams/${teamId}/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Failed to fetch team password');
  }

  const data = await response.json();
  return String(data?.password ?? '');
};

// =====================================================
// TEAM AUTHENTICATION
// =====================================================

export const joinTeam = async (
  teamId: string,
  password: string,
  userId: string,
  identity: { email?: string; regNo?: string } = {}
): Promise<boolean> => {
  const response = await fetch(`${API_BASE}/teams/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      teamId: teamId.trim().toUpperCase(),
      password: String(password ?? '').trim(),
      userId,
      email: identity.email,
      regNo: identity.regNo
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Invalid Team ID or Password.');
  }

  return data?.success === true;
};

export const updateTeamSize = async (
  teamId: string,
  size: number,
  userId: string
): Promise<number> => {
  const response = await fetch(`${API_BASE}/teams/${teamId}/size`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ size, userId })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || 'Failed to update team size');
  }
  return Number(data?.size ?? size);
};

export const removeTeamMember = async (
  teamId: string,
  userId: string
): Promise<void> => {
  const response = await fetch(`${API_BASE}/teams/${teamId}/remove-member`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Failed to remove member');
  }
};

export const authTeam = async (
  teamId: string,
  password: string
): Promise<boolean> => {
  const response = await fetch(`${API_BASE}/teams/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teamId: teamId.trim().toUpperCase(),
      password: String(password ?? '').trim()
    })
  });

  const data = await response.json().catch(() => null);

  if (response.status === 401) {
    throw new Error('Invalid credentials');
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Unable to login');
  }

  if (data?.success !== true) {
    throw new Error(data?.message || 'Invalid credentials');
  }

  return true;
};

// =====================================================
// SUBMISSIONS
// =====================================================

type RawSubmission = Record<string, unknown>;

const mapSubmission = (submission: RawSubmission): Submission => ({
  Team_ID: String(submission?.Team_ID ?? ''),
  'Team_Name ': String(submission?.['Team_Name '] ?? ''),
  Project_Description: String(
    submission?.Project_Description ?? ''
  ),
  'GitHub Link': String(
    submission?.['GitHub Link'] ?? ''
  ),
  'Figma Link': String(
    submission?.['Figma Link'] ?? ''
  ),
  'Dataset Link': String(
    submission?.['Dataset Link'] ?? submission?.['Public Dataset Link'] ?? ''
  ),
  'Public Dataset Link': String(
    submission?.['Public Dataset Link'] ?? submission?.['Dataset Link'] ?? ''
  ),
  'Submission Time': String(
    submission?.['Submission Time'] ?? ''
  )
});

export const getSubmissions = async (
  teamId?: string
): Promise<Submission[]> => {
  const url = teamId?.trim()
    ? `${API_BASE}/submissions?teamId=${encodeURIComponent(teamId.trim())}`
    : `${API_BASE}/submissions`;

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store'
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Failed to fetch submissions');
  }

  const submissions = await response.json().catch(() => []);
  return Array.isArray(submissions) ? (submissions as RawSubmission[]).map(mapSubmission) : [];
};

export const addSubmission = async (
  submission: Submission
): Promise<void> => {
  const response = await fetch(`${API_BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Team_ID: submission.Team_ID,
      'Team_Name ': submission['Team_Name '],
      Project_Description: submission.Project_Description,
      'GitHub Link': submission['GitHub Link'],
      'Figma Link': submission['Figma Link'],
      'Dataset Link': submission['Dataset Link'] || submission['Public Dataset Link'] || '',
      'Public Dataset Link': submission['Public Dataset Link'] || submission['Dataset Link'] || '',
      'Submission Time': submission['Submission Time']
    })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Failed to add submission');
  }
};

// =====================================================
// REVIEWS / SCORES
// =====================================================

type RawReview = Record<string, unknown>;

const mapReview = (review: RawReview): ReviewScore => ({
  Team_ID: String(review?.Team_ID ?? ''),
  Team_Name: String(review?.Team_Name ?? ''),
  Admin_Name: String(review?.Admin_Name ?? ''),
  'UI/UX (20)': String(review?.['UI/UX (20)'] ?? review?.['Design (20)'] ?? ''),
  'USP (10)': String(review?.['USP (10)'] ?? review?.['USP (20)'] ?? ''),
  'Scalability/Feasibility (10)': String(review?.['Scalability/Feasibility (10)'] ?? review?.['Scalability (10)'] ?? ''),
  'Implementation (10)': String(review?.['Implementation (10)'] ?? ''),
  'Implementation (20)': String(review?.['Implementation (20)'] ?? ''),
  'Progress (10)': String(review?.['Progress (10)'] ?? ''),
  'Progress (20)': String(review?.['Progress (20)'] ?? ''),
  'Architecture (10)': String(review?.['Architecture (10)'] ?? ''),
  'Machine Learning (10)': String(review?.['Machine Learning (10)'] ?? ''),
  'Dataset Utilisation (10)': String(review?.['Dataset Utilisation (10)'] ?? ''),
  'Tech Stack (10)': String(review?.['Tech Stack (10)'] ?? review?.['Tech (30)'] ?? ''),
  // Legacy fallbacks
  'Approach (20)': String(review?.['Approach (20)'] ?? ''),
  'Scalability (10)': String(review?.['Scalability (10)'] ?? ''),
  'Design (20)': String(review?.['Design (20)'] ?? ''),
  'Tech (30)': String(review?.['Tech (30)'] ?? ''),
  'USP (20)': String(review?.['USP (20)'] ?? ''),
  Total_Score: String(review?.Total_Score ?? ''),
  Review_Round: String(review?.Review_Round ?? '')
});

export const getReviews = async (
  teamId?: string
): Promise<ReviewScore[]> => {
  const url = teamId?.trim()
    ? `${API_BASE}/reviews?teamId=${encodeURIComponent(teamId.trim())}`
    : `${API_BASE}/reviews`;

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store'
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Failed to fetch reviews');
  }

  const reviews = await response.json().catch(() => []);
  return Array.isArray(reviews) ? reviews.map(mapReview) : [];
};

export const addReview = async (
  review: ReviewScore
): Promise<void> => {
  const response = await fetch(`${API_BASE}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Team_ID: review.Team_ID,
      Team_Name: review.Team_Name,
      Admin_Name: review.Admin_Name,
      'UI/UX (20)': review['UI/UX (20)'] ?? '',
      'USP (10)': review['USP (10)'] ?? '',
      'Scalability/Feasibility (10)': review['Scalability/Feasibility (10)'] ?? '',
      'Implementation (10)': review['Implementation (10)'] ?? '',
      'Implementation (20)': review['Implementation (20)'] ?? '',
      'Progress (10)': review['Progress (10)'] ?? '',
      'Progress (20)': review['Progress (20)'] ?? '',
      'Architecture (10)': review['Architecture (10)'] ?? '',
      'Machine Learning (10)': review['Machine Learning (10)'] ?? '',
      'Dataset Utilisation (10)': review['Dataset Utilisation (10)'] ?? '',
      'Tech Stack (10)': review['Tech Stack (10)'] ?? '',
      'Approach (20)': review['Approach (20)'],
      'Scalability (10)': review['Scalability (10)'],
      'Design (20)': review['Design (20)'],
      'Tech (30)': review['Tech (30)'],
      'USP (20)': review['USP (20)'],
      Total_Score: review.Total_Score,
      Review_Round: review.Review_Round
    })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Failed to add review');
  }
};
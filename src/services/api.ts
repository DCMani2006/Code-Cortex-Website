import type {
  User,
  Team,
  Submission,
  ReviewScore
} from '../types/database';

const API_BASE = 'http://localhost:3001/api';
const API_URL =
  'https://script.google.com/macros/s/AKfycbxtuXfdmg6q7E0oI8ZMibAGcCsHwHVlJFyDNLv8_4v2ra-OKcUxzowSnm5Aw3BVhqP48Q/exec';

type ApiResponse = {
  success?: boolean;
  message?: string;
  [key: string]: any;
};

// =====================================================
// HELPER
// =====================================================

const request = async (
  action: string,
  params: Record<string, string> = {}
): Promise<ApiResponse> => {
  const query = new URLSearchParams({
    action,
    ...params
  });

  const response = await fetch(`${API_URL}?${query.toString()}`, {
    method: 'GET',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const text = await response.text();

  let data: ApiResponse;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid response received from Google Apps Script.');
  }

  return data;
};

// =====================================================
// USERS
// =====================================================

const mapUser = (user: any): User => ({
  User_ID: String(user?.userId ?? ''),
  Name: String(user?.name ?? ''),
  Email: String(user?.email ?? ''),
  'Role (Participant/Admin)': String(user?.role ?? 'Participant'),
  Team_ID: String(user?.teamId ?? '')
});

export const getUsers = async (): Promise<User[]> => {
  const data = await request('getUsers');

  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch users');
  }

  return Array.isArray(data.users)
    ? data.users.map(mapUser)
    : [];
};

export const addUser = async (
  user: User,
  password: string
): Promise<void> => {
  const data = await request('addUser', {
    userId: user.User_ID,
    name: user.Name,
    email: user.Email,
    role: user['Role (Participant/Admin)'] || 'Participant',
    teamId: user.Team_ID || '',
    password
  });

  if (!data.success) {
    throw new Error(data.message || 'Failed to add user');
  }
};

// =====================================================
// AUTHENTICATION
// =====================================================

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

  // data.user already comes shaped like `User` from the Express backend
  // (User_ID, Name, Email, 'Role (Participant/Admin)', Team_ID) — don't
  // run it through mapUser, which expects Apps-Script camelCase fields.
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

const mapTeam = (team: any): Team => ({
  Team_ID: String(team?.teamId ?? ''),
  'Team_ Name': String(team?.teamName ?? ''),
  Track: String(team?.track ?? ''),
  Team_Leader: String(team?.teamLeader ?? ''),
  'No. of Members': String(team?.numberOfMembers ?? '')
});

export const getTeams = async (): Promise<Team[]> => {
  const response = await fetch(`${API_BASE}/teams`, { method: 'GET', cache: 'no-store' });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Failed to fetch teams');
  }

  const teamsFromServer = await response.json();

  if (!Array.isArray(teamsFromServer)) return [];

  return teamsFromServer.map((t: any) =>
    mapTeam({
      teamId: t.Team_ID,
      teamName: t['Team_ Name'],
      track: t.Track,
      teamLeader: t.Team_Leader,
      numberOfMembers: t['No. of Members']
    })
  );
};

export const addTeam = async (
  team: Team,
  password: string,
  userId: string
): Promise<void> => {
  const response = await fetch(`${API_BASE}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Team_ID: team.Team_ID,
      'Team_ Name': team['Team_ Name'],
      Track: team.Track,
      Team_Leader: team.Team_Leader,
      'No. of Members': team['No. of Members'],
      teamPassword: password,
      _userId: userId
    })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Failed to create team');
  }
  
};


// =====================================================
// TEAM AUTHENTICATION
// =====================================================
export const joinTeam = async (
  teamId: string,
  password: string,
  userId: string
): Promise<boolean> => {
  const response = await fetch(`${API_BASE}/teams/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      teamId: teamId.trim(),
      password,
      userId,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return false;
  }

  return data?.success === true;
};

  export const authTeam = async (
  teamId: string,
  password: string
): Promise<boolean> => {
  const response = await fetch(`${API_BASE}/teams/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teamId: teamId.trim(),
      password
    })
  });

  const data = await response.json().catch(() => null);

  // Wrong team ID or password
  if (response.status === 401) {
    throw new Error('Invalid credentials');
  }

  // Other server errors
  if (!response.ok) {
    throw new Error(data?.message || 'Unable to login');
  }

  // Login failed
  if (data?.success !== true) {
    throw new Error(data?.message || 'Invalid credentials');
  }

  return true;
};

// =====================================================
// SUBMISSIONS
// =====================================================

const mapSubmission = (submission: any): Submission => ({
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

  const response = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Failed to fetch submissions');
  }

  const submissions = await response.json().catch(() => []);
  return Array.isArray(submissions) ? submissions.map(mapSubmission) : [];
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

const mapReview = (review: any): ReviewScore => ({
  Team_ID: String(review?.teamId ?? ''),
  Team_Name: String(review?.teamName ?? ''),
  Admin_Name: String(review?.adminName ?? ''),
  'Approach (20)': String(review?.approach ?? ''),
  'Scalability (10)': String(review?.scalability ?? ''),
  'Design (20)': String(review?.design ?? ''),
  'Tech (30)': String(review?.tech ?? ''),
  'USP (20)': String(review?.usp ?? ''),
  Total_Score: String(review?.totalScore ?? '')
});

export const getReviews = async (
  teamId?: string
): Promise<ReviewScore[]> => {
  const url = teamId?.trim()
    ? `${API_BASE}/reviews?teamId=${encodeURIComponent(teamId.trim())}`
    : `${API_BASE}/reviews`;

  const response = await fetch(url, { method: 'GET', cache: 'no-store' });
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
      'Approach (20)': review['Approach (20)'],
      'Scalability (10)': review['Scalability (10)'],
      'Design (20)': review['Design (20)'],
      'Tech (30)': review['Tech (30)'],
      'USP (20)': review['USP (20)'],
      Total_Score: review.Total_Score
    })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Failed to add review');
  }
};
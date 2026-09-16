// Type definitions mapping exactly to the Google Sheets structure

export interface User {
  User_ID: string;
  Name: string;
  Email: string;
  'Role (Participant/Admin)': string;
  Team_ID: string;
}

export interface Team {
  Team_ID: string;
  'Team_ Name': string; // Exact spacing mapped from DB
  Track: string;
  Team_Leader: string;
  'No. of Members': string;
  Team_Type?: string; // "Internal" (VIT) or "External"
}

export interface Submission {
  Team_ID: string;
  'Team_Name ': string; // Exact spacing mapped from DB
  Project_Description: string;
  'GitHub Link': string;
  'Figma Link': string;
  'Submission Time': string;
}

export interface ReviewScore {
  Team_ID: string;
  Team_Name: string;
  Admin_Name: string;
  'Approach (20)': string;
  'Scalability (10)': string;
  'Design (20)': string;
  'Tech (30)': string;
  'USP (20)': string;
  Total_Score: string;
  Review_Round?: string;
}

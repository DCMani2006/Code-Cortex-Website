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
  'UI/UX (20)'?: string;
  'USP (10)'?: string;
  'Scalability/Feasibility (10)'?: string;
  'Implementation (10)'?: string;
  'Implementation (20)'?: string;
  'Progress (10)'?: string;
  'Progress (20)'?: string;
  'Architecture (10)'?: string;
  'Machine Learning (10)'?: string;
  'Dataset Utilisation (10)'?: string;
  'Tech Stack (10)'?: string;
  Total_Score: string;
  Review_Round?: string;
  // Legacy fields for backward compatibility
  'Approach (20)'?: string;
  'Scalability (10)'?: string;
  'Design (20)'?: string;
  'Tech (30)'?: string;
  'USP (20)'?: string;
}


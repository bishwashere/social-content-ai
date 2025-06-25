// /dashboard/types.ts
export interface Project {
  count: React.ReactNode;
  id: string | number;
  name: string;
  postDates?: { [key: string]: { date: string; url?: string }[] }; // Updated to include URL
}

export const SOCIAL_PLATFORMS = ["Facebook", "Instagram", "X", "TikTok", "Threads"];

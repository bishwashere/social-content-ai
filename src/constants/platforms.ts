/**
 * Centralized platform constants
 * All platform-related identifiers, icons, URLs, and configuration
 */

// Platform identifier type
export type PlatformId = 
  | "facebook"
  | "instagram"
  | "x"
  | "linkedin"
  | "threads"
  | "reddit"
  | "tiktok";

// Platform identifiers as constants
export const PLATFORM_IDS = {
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
  X: "x",
  LINKEDIN: "linkedin",
  THREADS: "threads",
  REDDIT: "reddit",
  TIKTOK: "tiktok",
} as const;

// All platform IDs as array
export const ALL_PLATFORM_IDS = Object.values(PLATFORM_IDS) as PlatformId[];

// Platform display labels
export const PLATFORM_LABELS: Record<PlatformId, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "Twitter",
  linkedin: "LinkedIn",
  threads: "Threads",
  reddit: "Reddit",
  tiktok: "TikTok",
};

// Platform icon paths (relative to public folder)
export const PLATFORM_ICONS: Record<PlatformId, string> = {
  x: "/x.svg",
  facebook: "/fb.svg",
  linkedin: "/linkedin.png",
  instagram: "/instagram.svg",
  threads: "/threads.svg",
  reddit: "/reddit.svg",
  tiktok: "/tiktok.svg",
};

// Platform character limits for posts
export const PLATFORM_CHARACTER_LIMITS: Record<PlatformId, number> = {
  facebook: 500,
  instagram: 500,
  x: 250,
  linkedin: 500,
  reddit: 1500,
  threads: 250,
  tiktok: 0,
};

// Platforms that support media uploads
export const PLATFORMS_WITH_MEDIA_SUPPORT: PlatformId[] = [
  "facebook",
  "linkedin",
  "x",
  "threads",
  "tiktok",
];

// Platforms that support scheduling
export const PLATFORMS_WITH_SCHEDULING: PlatformId[] = [
  "facebook",
  "linkedin",
  "x",
  "threads",
  "tiktok",
  "reddit",
];

// Platform profile URL patterns
export const PLATFORM_PROFILE_URLS: Record<PlatformId, string> = {
  facebook: "https://www.facebook.com/profile.php?id=",
  instagram: "https://www.instagram.com/",
  x: "https://twitter.com/",
  linkedin: "https://www.linkedin.com/company/",
  threads: "https://www.threads.net/@",
  reddit: "https://www.reddit.com/r/",
  tiktok: "https://www.tiktok.com/@",
};

// Social sharing URLs
export const SOCIAL_SHARE_URLS = {
  twitter: "https://twitter.com/intent/tweet?text=",
  linkedin: "https://www.linkedin.com/sharing/share-offsite/?url=",
  facebook: "https://www.facebook.com/sharer/sharer.php?u=",
} as const;

// Platform API base URLs
export const PLATFORM_API_URLS = {
  facebook: "https://graph.facebook.com/v23.0",
  twitter: "https://api.twitter.com",
  linkedin: "https://api.linkedin.com",
  threads: "https://graph.threads.net/v1.0",
  reddit: "https://oauth.reddit.com",
  tiktok: "https://open.tiktokapis.com/v2",
} as const;

// Platform data for UI components (combines key, label, icon)
export type PlatformData = {
  key: PlatformId;
  label: string;
  iconPath: string;
};

export const PLATFORM_DATA: PlatformData[] = ALL_PLATFORM_IDS.map((id) => ({
  key: id,
  label: PLATFORM_LABELS[id],
  iconPath: PLATFORM_ICONS[id],
}));

// Helper function to get platform data by key
export const getPlatformData = (key: PlatformId): PlatformData | undefined => {
  return PLATFORM_DATA.find((p) => p.key === key);
};

// Helper function to check if platform supports media
export const platformSupportsMedia = (key: PlatformId): boolean => {
  return PLATFORMS_WITH_MEDIA_SUPPORT.includes(key);
};

// Helper function to check if platform supports scheduling
export const platformSupportsScheduling = (key: PlatformId): boolean => {
  return PLATFORMS_WITH_SCHEDULING.includes(key);
};

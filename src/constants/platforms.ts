/**
 * Centralized platform constants
 * All platform-related identifiers, icons, URLs, and configuration
 * 
 * USAGE:
 * - Use PLATFORM_IDS.FACEBOOK, PLATFORM_IDS.X, etc. for individual platform string values
 * - Use ALL_PLATFORM_IDS for iterating over all platforms
 * - Use PLATFORM_LABELS[PLATFORM_IDS.FACEBOOK] for display names
 * - Use PLATFORM_ICONS[PLATFORM_IDS.FACEBOOK] for icon paths
 * - Use platformSupportsMedia(PLATFORM_IDS.FACEBOOK) for feature checks
 */

// =============================================================================
// CORE PLATFORM IDENTIFIERS (Single Source of Truth)
// =============================================================================

/**
 * Platform identifiers as constants
 * Use these for comparisons and as keys: PLATFORM_IDS.FACEBOOK, PLATFORM_IDS.X, etc.
 */
export const PLATFORM_IDS = {
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
  X: "x",
  LINKEDIN: "linkedin",
  THREADS: "threads",
  REDDIT: "reddit",
  TIKTOK: "tiktok",
} as const;

/**
 * Type derived from PLATFORM_IDS values
 * Use this type for function parameters and variables
 */
export type PlatformId = (typeof PLATFORM_IDS)[keyof typeof PLATFORM_IDS];

/**
 * All platform IDs as an array (for iteration)
 * Use when you need to loop over all platforms
 */
export const ALL_PLATFORM_IDS: PlatformId[] = Object.values(PLATFORM_IDS);

// =============================================================================
// PLATFORM DISPLAY DATA
// =============================================================================

/**
 * Platform display labels (human-readable names)
 * Usage: PLATFORM_LABELS[PLATFORM_IDS.FACEBOOK] => "Facebook"
 */
export const PLATFORM_LABELS: Record<PlatformId, string> = {
  [PLATFORM_IDS.FACEBOOK]: "Facebook",
  [PLATFORM_IDS.INSTAGRAM]: "Instagram",
  [PLATFORM_IDS.X]: "Twitter",
  [PLATFORM_IDS.LINKEDIN]: "LinkedIn",
  [PLATFORM_IDS.THREADS]: "Threads",
  [PLATFORM_IDS.REDDIT]: "Reddit",
  [PLATFORM_IDS.TIKTOK]: "TikTok",
};

/**
 * Platform icon paths (relative to public folder)
 * Usage: PLATFORM_ICONS[PLATFORM_IDS.FACEBOOK] => "/fb.svg"
 */
export const PLATFORM_ICONS: Record<PlatformId, string> = {
  [PLATFORM_IDS.X]: "/x.svg",
  [PLATFORM_IDS.FACEBOOK]: "/fb.svg",
  [PLATFORM_IDS.LINKEDIN]: "/linkedin.png",
  [PLATFORM_IDS.INSTAGRAM]: "/instagram.svg",
  [PLATFORM_IDS.THREADS]: "/threads.svg",
  [PLATFORM_IDS.REDDIT]: "/reddit.svg",
  [PLATFORM_IDS.TIKTOK]: "/tiktok.svg",
};

// =============================================================================
// PLATFORM CONFIGURATION
// =============================================================================

/**
 * Platform character limits for posts
 * Usage: PLATFORM_CHARACTER_LIMITS[PLATFORM_IDS.X] => 250
 */
export const PLATFORM_CHARACTER_LIMITS: Record<PlatformId, number> = {
  [PLATFORM_IDS.FACEBOOK]: 500,
  [PLATFORM_IDS.INSTAGRAM]: 500,
  [PLATFORM_IDS.X]: 250,
  [PLATFORM_IDS.LINKEDIN]: 500,
  [PLATFORM_IDS.REDDIT]: 1500,
  [PLATFORM_IDS.THREADS]: 250,
  [PLATFORM_IDS.TIKTOK]: 0,
};

// =============================================================================
// PLATFORM FEATURE SUPPORT
// =============================================================================

/**
 * Platforms that support media uploads (images/videos)
 * Use platformSupportsMedia() helper for checking
 */
export const PLATFORMS_WITH_MEDIA_SUPPORT: readonly PlatformId[] = [
  PLATFORM_IDS.FACEBOOK,
  PLATFORM_IDS.INSTAGRAM,
  PLATFORM_IDS.LINKEDIN,
  PLATFORM_IDS.X,
  PLATFORM_IDS.THREADS,
  PLATFORM_IDS.REDDIT,
  PLATFORM_IDS.TIKTOK,
] as const;

/**
 * Platforms that support scheduling
 * Use platformSupportsScheduling() helper for checking
 */
export const PLATFORMS_WITH_SCHEDULING: readonly PlatformId[] = [
  PLATFORM_IDS.FACEBOOK,
  PLATFORM_IDS.INSTAGRAM,
  PLATFORM_IDS.LINKEDIN,
  PLATFORM_IDS.X,
  PLATFORM_IDS.THREADS,
  PLATFORM_IDS.TIKTOK,
  PLATFORM_IDS.REDDIT,
] as const;

// =============================================================================
// PLATFORM URLS
// =============================================================================

/**
 * Platform profile URL patterns
 * Usage: PLATFORM_PROFILE_URLS[PLATFORM_IDS.FACEBOOK] + userId
 */
export const PLATFORM_PROFILE_URLS: Record<PlatformId, string> = {
  [PLATFORM_IDS.FACEBOOK]: "https://www.facebook.com/profile.php?id=",
  [PLATFORM_IDS.INSTAGRAM]: "https://www.instagram.com/",
  [PLATFORM_IDS.X]: "https://twitter.com/",
  [PLATFORM_IDS.LINKEDIN]: "https://www.linkedin.com/company/",
  [PLATFORM_IDS.THREADS]: "https://www.threads.net/@",
  [PLATFORM_IDS.REDDIT]: "https://www.reddit.com/r/",
  [PLATFORM_IDS.TIKTOK]: "https://www.tiktok.com/@",
};

/**
 * Social sharing URLs (for share buttons)
 * Note: Uses "twitter" key for legacy API compatibility
 */
export const SOCIAL_SHARE_URLS = {
  twitter: "https://twitter.com/intent/tweet?text=",
  linkedin: "https://www.linkedin.com/sharing/share-offsite/?url=",
  facebook: "https://www.facebook.com/sharer/sharer.php?u=",
} as const;

/**
 * Platform API base URLs
 * Note: Uses "twitter" key for legacy API compatibility
 */
export const PLATFORM_API_URLS = {
  [PLATFORM_IDS.FACEBOOK]: "https://graph.facebook.com/v23.0",
  twitter: "https://api.twitter.com",
  [PLATFORM_IDS.LINKEDIN]: "https://api.linkedin.com",
  [PLATFORM_IDS.THREADS]: "https://graph.threads.net/v1.0",
  [PLATFORM_IDS.REDDIT]: "https://oauth.reddit.com",
  [PLATFORM_IDS.TIKTOK]: "https://open.tiktokapis.com/v2",
} as const;

// =============================================================================
// UI COMPONENT DATA
// =============================================================================

/**
 * Platform data structure for UI components
 */
export type PlatformData = {
  key: PlatformId;
  label: string;
  iconPath: string;
};

/**
 * Pre-built platform data array for UI components
 * Use when rendering lists of platforms with icons and labels
 */
export const PLATFORM_DATA: PlatformData[] = ALL_PLATFORM_IDS.map((id) => ({
  key: id,
  label: PLATFORM_LABELS[id],
  iconPath: PLATFORM_ICONS[id],
}));

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get platform data by key
 * @param key - Platform identifier (e.g., PLATFORM_IDS.FACEBOOK)
 * @returns PlatformData object or undefined
 */
export const getPlatformData = (key: PlatformId): PlatformData | undefined => {
  return PLATFORM_DATA.find((p) => p.key === key);
};

/**
 * Check if platform supports media uploads
 * @param key - Platform identifier (e.g., PLATFORM_IDS.FACEBOOK)
 * @returns boolean
 */
export const platformSupportsMedia = (key: PlatformId): boolean => {
  return PLATFORMS_WITH_MEDIA_SUPPORT.includes(key);
};

/**
 * Check if platform supports scheduling
 * @param key - Platform identifier (e.g., PLATFORM_IDS.FACEBOOK)
 * @returns boolean
 */
export const platformSupportsScheduling = (key: PlatformId): boolean => {
  return PLATFORMS_WITH_SCHEDULING.includes(key);
};

/**
 * Get platform label (display name)
 * @param key - Platform identifier (e.g., PLATFORM_IDS.FACEBOOK)
 * @returns Display name string (e.g., "Facebook")
 */
export const getPlatformLabel = (key: PlatformId): string => {
  return PLATFORM_LABELS[key];
};

/**
 * Get platform icon path
 * @param key - Platform identifier (e.g., PLATFORM_IDS.FACEBOOK)
 * @returns Icon path string (e.g., "/fb.svg")
 */
export const getPlatformIcon = (key: PlatformId): string => {
  return PLATFORM_ICONS[key];
};

/**
 * Centralized timeout and timing constants
 * All delay, interval, and timing values used throughout the application
 */

// Time unit helpers (in milliseconds)
export const TIME_MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// UI feedback delays
export const UI_DELAYS = {
  /** Short delay for quick UI feedback (1 second) */
  SHORT: 1000,
  /** Medium delay for loading states (2 seconds) */
  MEDIUM: 2000,
  /** Long delay for complex operations (5 seconds) */
  LONG: 5000,
  /** Toast notification duration (3 seconds) */
  TOAST: 3000,
  /** Animation delay (300ms) */
  ANIMATION: 300,
  /** Debounce delay for input (500ms) */
  DEBOUNCE: 500,
} as const;

// API timeouts
export const API_TIMEOUTS = {
  /** Default API request timeout (10 seconds) */
  DEFAULT: 10000,
  /** Long-running API request timeout (30 seconds) */
  LONG: 30000,
  /** AI generation timeout (60 seconds) */
  AI_GENERATION: 60000,
  /** File upload timeout (120 seconds) */
  FILE_UPLOAD: 120000,
} as const;

// React Query stale times
export const STALE_TIMES = {
  /** Short stale time (30 seconds) */
  SHORT: 30000,
  /** Medium stale time (1 minute) */
  MEDIUM: 60000,
  /** Long stale time (5 minutes) */
  LONG: 5 * 60 * 1000,
  /** Very long stale time (10 minutes) */
  VERY_LONG: 10 * 60 * 1000,
  /** User settings stale time (5 minutes) */
  USER_SETTINGS: 5 * 60 * 1000,
  /** Achievements stale time (5 minutes) */
  ACHIEVEMENTS: 5 * 60 * 1000,
} as const;

// React Query refetch intervals
export const REFETCH_INTERVALS = {
  /** Fast polling (10 seconds) */
  FAST: 10000,
  /** Medium polling (30 seconds) */
  MEDIUM: 30000,
  /** Slow polling (1 minute) */
  SLOW: 60000,
  /** Pending tasks polling (1 minute) */
  PENDING_TASKS: 60000,
  /** Recent activity polling (1 minute) */
  RECENT_ACTIVITY: 60000,
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  /** Default retry count */
  DEFAULT_COUNT: 3,
  /** Default retry delay (1 second) */
  DEFAULT_DELAY: 1000,
  /** Maximum retry delay (30 seconds) */
  MAX_DELAY: 30000,
} as const;

// Demo/Tour timing
export const DEMO_TIMING = {
  /** Step delay in demos (5 seconds) */
  STEP_DELAY: 5000,
  /** Auto-advance delay (3 seconds) */
  AUTO_ADVANCE: 3000,
  /** Highlight duration (2 seconds) */
  HIGHLIGHT: 2000,
} as const;

// Token refresh timing
export const TOKEN_TIMING = {
  /** Refresh buffer before expiry (5 minutes) */
  REFRESH_BUFFER: 5 * 60 * 1000,
} as const;

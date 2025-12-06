/**
 * Safe logger utility that only logs in development.
 * Defaults to production mode (no logging) if environment detection fails.
 * Never throws errors - logging failures should never break the application.
 */

let isDevelopment: boolean = false;

// Safely detect environment with error handling
try {
  // Check if process.env exists and has NODE_ENV
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "development") {
    isDevelopment = true;
  }
} catch (error) {
  // Any error in environment detection defaults to production (no logging)
  isDevelopment = false;
}

export const logger = {
  /**
   * Logs messages only in development.
   * Silently fails if logging itself causes errors.
   */
  log: (...args: any[]) => {
    try {
      if (isDevelopment) {
        console.log(...args);
      }
    } catch (error) {
      // Silently fail - logging should never break the app
    }
  },

  /**
   * Logs warnings only in development.
   * Silently fails if logging itself causes errors.
   */
  warn: (...args: any[]) => {
    try {
      if (isDevelopment) {
        console.warn(...args);
      }
    } catch (error) {
      // Silently fail - logging should never break the app
    }
  },

  /**
   * Logs errors only in development.
   * Silently fails if logging itself causes errors.
   */
  error: (...args: any[]) => {
    try {
      if (isDevelopment) {
        console.error(...args);
      }
    } catch (error) {
      // Silently fail - logging should never break the app
    }
  },
};


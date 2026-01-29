/**
 * Centralized date utility functions
 * Shared date conversion and formatting logic
 */

/**
 * Safely convert any date value to a Date object
 * Handles: Date objects, ISO strings, MongoDB date formats
 * Returns current date if conversion fails
 */
export const safeDate = (dateValue: unknown): Date => {
  if (!dateValue) return new Date();
  
  // Already a valid Date
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? new Date() : dateValue;
  }
  
  // ISO string or other string format
  if (typeof dateValue === "string") {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  
  // MongoDB date format { $date: "..." }
  if (
    typeof dateValue === "object" &&
    dateValue !== null &&
    "$date" in dateValue
  ) {
    const mongoDate = dateValue as { $date: string };
    const parsed = new Date(mongoDate.$date);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  
  // MongoDB timestamp format { $timestamp: number }
  if (
    typeof dateValue === "object" &&
    dateValue !== null &&
    "$timestamp" in dateValue
  ) {
    const mongoTimestamp = dateValue as { $timestamp: number };
    const parsed = new Date(mongoTimestamp.$timestamp * 1000);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  
  return new Date();
};

/**
 * Convert any date value to ISO string
 * Returns null if conversion fails
 */
export const toISOString = (dateValue: unknown): string | null => {
  if (!dateValue) return null;
  
  // Already a valid Date
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue.toISOString();
  }
  
  // ISO string or other string format
  if (typeof dateValue === "string") {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  
  // MongoDB date format { $date: "..." }
  if (
    typeof dateValue === "object" &&
    dateValue !== null &&
    "$date" in dateValue
  ) {
    const mongoDate = dateValue as { $date: string };
    const parsed = new Date(mongoDate.$date);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  
  // MongoDB timestamp format { $timestamp: number }
  if (
    typeof dateValue === "object" &&
    dateValue !== null &&
    "$timestamp" in dateValue
  ) {
    const mongoTimestamp = dateValue as { $timestamp: number };
    const parsed = new Date(mongoTimestamp.$timestamp * 1000);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  
  return null;
};

/**
 * Convert local time to UTC Date
 * Handles timezone conversion for scheduling
 */
export const convertLocalTimeToUTC = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timezone: string
): Date => {
  // If already UTC, just create the date directly
  if (timezone === "UTC") {
    return new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  }

  // Create a date string in the target timezone format
  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

  // Get the offset for the target timezone at this specific date/time
  const localDate = new Date(dateStr);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(localDate);
  const tzPart = parts.find((p) => p.type === "timeZoneName");
  const offsetStr = tzPart?.value || "+00:00";

  // Parse offset like "GMT+5:30" or "GMT-8" or "+05:30"
  let offsetMinutes = 0;
  const match = offsetStr.match(/([+-])(\d{1,2}):?(\d{2})?/);
  if (match) {
    const sign = match[1] === "-" ? -1 : 1;
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3] || "0", 10);
    offsetMinutes = sign * (hours * 60 + minutes);
  }

  // The UTC time is the local time minus the timezone offset
  const utcTime = new Date(
    Date.UTC(year, month, day, hour, minute, 0, 0) - offsetMinutes * 60 * 1000
  );

  return utcTime;
};

/**
 * Check if a date is in the past
 */
export const isDateInPast = (date: Date): boolean => {
  return date.getTime() < Date.now();
};

/**
 * Get date components from a Date object (using UTC)
 */
export const getUTCDateComponents = (date: Date) => ({
  year: date.getUTCFullYear(),
  month: date.getUTCMonth(),
  day: date.getUTCDate(),
  hour: date.getUTCHours(),
  minute: date.getUTCMinutes(),
});

/**
 * Add days to a date (using UTC to avoid timezone issues)
 */
export const addDaysUTC = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

/**
 * Calculate target date for campaign scheduling
 * startDate + (day - 1) days
 */
export const calculateCampaignDate = (
  startDate: Date,
  dayNumber: number
): Date => {
  const { year, month, day } = getUTCDateComponents(startDate);
  return new Date(Date.UTC(year, month, day + (dayNumber - 1), 0, 0, 0, 0));
};

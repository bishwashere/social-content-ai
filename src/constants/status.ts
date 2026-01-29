/**
 * Centralized status constants
 * All status values used throughout the application
 */

// Post status values
export const POST_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SUCCESS: "success",
  POSTED: "posted",
  FAILED: "failed",
  SCHEDULED: "scheduled",
  ERROR: "error",
} as const;

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];

// Campaign status values
export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  COMPLETED: "completed",
  PAUSED: "paused",
} as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUS)[keyof typeof CAMPAIGN_STATUS];

// Chat generation status values
export const CHAT_STATUS = {
  PENDING: "PENDING",
  GENERATED: "GENERATED",
  SCHEDULED: "SCHEDULED",
  POSTED: "POSTED",
  FAILED: "FAILED",
} as const;

export type ChatStatus = (typeof CHAT_STATUS)[keyof typeof CHAT_STATUS];

// Blog post status values
export const BLOG_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  GENERATED: "generated",
  PUBLISHED: "published",
  FAILED: "failed",
} as const;

export type BlogStatus = (typeof BLOG_STATUS)[keyof typeof BLOG_STATUS];

// Calendar event types
export const EVENT_TYPE = {
  TRACKING: "tracking",
  SCHEDULED: "scheduled",
  PLANNED: "planned",
} as const;

export type EventType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];

// Status colors for UI display
export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-blue-500",
  processing: "bg-yellow-500",
  success: "bg-green-500",
  posted: "bg-green-500",
  failed: "bg-red-500",
  error: "bg-red-500",
  scheduled: "bg-purple-500",
  draft: "bg-gray-500",
  active: "bg-blue-500",
  completed: "bg-green-500",
  paused: "bg-yellow-500",
};

// Helper to get status color
export const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status.toLowerCase()] || "bg-gray-500";
};

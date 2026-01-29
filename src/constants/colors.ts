/**
 * Centralized color constants
 * All color values used throughout the application
 */

// Chart colors for analytics and graphs
export const CHART_COLORS = {
  // Primary metrics
  posts: "#3B82F6",        // Blue
  impressions: "#8B5CF6",  // Purple
  likes: "#22C55E",        // Green
  comments: "#F97316",     // Orange
  engagement: "#EC4899",   // Pink
  followers: "#14B8A6",    // Teal
  
  // Secondary colors
  primary: "#3B82F6",      // Blue
  secondary: "#6B7280",    // Gray
  success: "#22C55E",      // Green
  warning: "#F59E0B",      // Yellow/Amber
  error: "#EF4444",        // Red
  info: "#8B5CF6",         // Purple
} as const;

// Folder/category colors for UI
export const FOLDER_COLORS = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#6366F1", // Indigo
] as const;

// Platform-specific brand colors
export const PLATFORM_BRAND_COLORS = {
  facebook: "#1877F2",
  instagram: "#E4405F",
  x: "#000000",
  twitter: "#1DA1F2",
  linkedin: "#0A66C2",
  threads: "#000000",
  reddit: "#FF4500",
  tiktok: "#000000",
} as const;

// Email template colors
export const EMAIL_COLORS = {
  background: "#f3f4f6",
  cardBackground: "#ffffff",
  primary: "#2563eb",
  textPrimary: "#1f2937",
  textSecondary: "#4b5563",
  textMuted: "#6b7280",
  border: "#e5e7eb",
} as const;

// Graph/Chart line colors (for multi-line charts)
export const GRAPH_LINE_COLORS = [
  "#3B82F6", // Blue
  "#22C55E", // Green
  "#F97316", // Orange
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#F59E0B", // Yellow
  "#EF4444", // Red
] as const;

// Status indicator colors
export const STATUS_INDICATOR_COLORS = {
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  neutral: "#6B7280",
} as const;

// Helper to get folder color by index
export const getFolderColor = (index: number): string => {
  return FOLDER_COLORS[index % FOLDER_COLORS.length];
};

// Helper to get graph line color by index
export const getGraphLineColor = (index: number): string => {
  return GRAPH_LINE_COLORS[index % GRAPH_LINE_COLORS.length];
};

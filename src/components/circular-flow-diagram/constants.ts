/**
 * Constants for the circular flow diagram.
 */

export const STEPS = [
  { step: 2, angle: 270, badge: "AI does this" as const, badgeSide: "right" as const, lines: ["NextPost AI generates", "your campaign"] }, // Top
  { step: 3, angle: 0, badge: "AI does this" as const, badgeSide: "right" as const, lines: ["Plans, schedules,", "and posts content"] }, // Right
  { step: 4, angle: 90, badge: "AI does this" as const, badgeSide: "right" as const, lines: ["Analyzes performance"] }, // Bottom
  { step: 5, angle: 180, badge: "AI does this" as const, badgeSide: "left" as const, lines: ["Makes changes", "to the campaign"] }, // Left
];

export const COLORS = {
  primary: "#7c3aed",
  primaryLight: "#a78bfa",
  neutralDark: "#64748b",
  cyan: "#06b6d4",
  badgeYou: "#3b82f6",
  badgeYouBg: "rgba(59, 130, 246, 0.2)",
  badgeAi: "#22c55e",
  badgeAiBg: "rgba(34, 197, 94, 0.2)",
} as const;

export type AchievementTier = {
  min: number;
  max: number;
  id: string;
  label: string;
};

export const ACHIEVEMENT_TIERS = {
  projectsWithCampaigns: [
    { min: 1, max: 2, id: "campaign_seed", label: "Campaign Seed" },
    { min: 3, max: 5, id: "campaign_builder", label: "Campaign Builder" },
    { min: 6, max: 9, id: "campaign_driver", label: "Campaign Driver" },
    { min: 10, max: 14, id: "campaign_strategist", label: "Campaign Strategist" },
    { min: 15, max: Infinity, id: "campaign_architect", label: "Campaign Architect" },
  ],
  projectsWithScheduledPosts: [
    { min: 1, max: 2, id: "consistency_seed", label: "Consistency Starter" },
    { min: 3, max: 5, id: "consistency_builder", label: "Consistency Builder" },
    { min: 6, max: 9, id: "consistency_driver", label: "Consistency Driver" },
    { min: 10, max: 14, id: "consistency_pro", label: "Consistency Pro" },
    { min: 15, max: Infinity, id: "consistency_master", label: "Consistency Master" },
  ],
  projectsWithVideos: [
    { min: 1, max: 2, id: "video_first_cut", label: "First Cut" },
    { min: 3, max: 5, id: "video_creator", label: "Content Creator" },
    { min: 6, max: 9, id: "video_storyteller", label: "Storyteller" },
    { min: 10, max: 14, id: "video_producer", label: "Video Producer" },
    { min: 15, max: Infinity, id: "video_director", label: "Content Director" },
  ],
  projectsWithTracking: [
    { min: 1, max: 2, id: "insight_beginner", label: "Insight Beginner" },
    { min: 3, max: 5, id: "insight_explorer", label: "Insight Explorer" },
    { min: 6, max: 9, id: "insight_mapper", label: "Insight Mapper" },
    { min: 10, max: 14, id: "insight_analyst", label: "Insight Analyst" },
    { min: 15, max: Infinity, id: "insight_visionary", label: "Insight Visionary" },
  ],
} as const;

export function getAchievementTier(
  type: keyof typeof ACHIEVEMENT_TIERS,
  count: number
): { current: AchievementTier | null; next: AchievementTier | null } {
  const tiers = ACHIEVEMENT_TIERS[type];
  if (!tiers) return { current: null, next: null };

  const current = tiers.find((t) => count >= t.min && count <= t.max) || null;
  const next = tiers.find((t) => count < t.min) || null;

  return { current, next };
}

export function getAchievementTierIndex(
  type: keyof typeof ACHIEVEMENT_TIERS,
  count: number
): number {
  const tiers = ACHIEVEMENT_TIERS[type];
  if (!tiers) return 0;

  const currentIndex = tiers.findIndex((t) => count >= t.min && count <= t.max);
  // If no tier found, return 0 (not started yet)
  return currentIndex >= 0 ? currentIndex + 1 : 0;
}


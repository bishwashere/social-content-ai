"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetAchievements } from "@/backend-apis/achievements/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Calendar, Send, Video, BarChart3 } from "lucide-react";
import { getAchievementTier, getAchievementTierIndex, AchievementTier, ACHIEVEMENT_TIERS } from "./achievementTiers";

const LEVEL_DESCRIPTIONS: Record<string, Record<number, string>> = {
  projectsWithCampaigns: {
    1: "You've started experimenting with campaigns.",
    2: "You're using campaigns regularly for a few projects.",
    3: "Campaigns are a core part of how you plan content.",
    4: "Most projects use campaigns with clear goals and plans.",
    5: "You run many campaigns in parallel and refine them over time.",
  },
  projectsWithScheduledPosts: {
    1: "You've scheduled your first posts.",
    2: "You're scheduling posts for several projects.",
    3: "Most projects have scheduled content in advance.",
    4: "You keep a steady posting rhythm across projects.",
    5: "Your calendar is consistently full, far ahead of today.",
  },
  projectsWithVideos: {
    1: "You've created at least one video.",
    2: "You use videos for a few projects.",
    3: "Videos are part of how you tell your product's story.",
    4: "You publish video content regularly.",
    5: "You rely on video as a key channel across projects.",
  },
  projectsWithTracking: {
    1: "You've turned on tracking for at least one project.",
    2: "You're tracking results for a few projects.",
    3: "You regularly track what's working across projects.",
    4: "You compare performance and adjust based on data.",
    5: "You use insights to shape long-term strategy and experiments.",
  },
};

const CATEGORY_TITLES: Record<string, string> = {
  projectsWithCampaigns: "Campaign Levels",
  projectsWithScheduledPosts: "Consistency Levels",
  projectsWithVideos: "Video Levels",
  projectsWithTracking: "Tracking Levels",
};
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";

interface AchievementItemProps {
  icon: React.ComponentType<{ className?: string }>;
  text: (count: number) => string;
  count: number;
  type: "projectsWithCampaigns" | "projectsWithScheduledPosts" | "projectsWithVideos" | "projectsWithTracking";
  current: AchievementTier | null;
  next: AchievementTier | null;
  currentTierIndex: number;
  ctaText: string;
  onCtaClick: (type: string) => void;
  onTierLabelClick: (type: string) => void;
}

function AchievementItem({ icon: Icon, text, count, type, current, next, currentTierIndex, ctaText, onCtaClick, onTierLabelClick }: AchievementItemProps) {
  const [animatedDots, setAnimatedDots] = useState<number[]>([]);
  
  // Calculate progress toward next tier
  const nextTierMin = next?.min || 0;
  const progressCount = Math.min(count, nextTierMin);
  const totalDots = nextTierMin > 0 ? nextTierMin : 10; // Use next tier min as total, or 10 as default
  
  useEffect(() => {
    if (!next || nextTierMin === 0) {
      setAnimatedDots([]);
      return;
    }
    
    // Animate dots filling from left to right
    setAnimatedDots([]);
    
    const timeouts: NodeJS.Timeout[] = [];
    for (let i = 0; i < progressCount; i++) {
      const timeout = setTimeout(() => {
        setAnimatedDots(prev => [...prev, i + 1]);
      }, i * 50); // 50ms delay between each dot
      timeouts.push(timeout);
    }
    
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [progressCount, nextTierMin, next]);
  
  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-lg border border-green-100"
      style={{ backgroundColor: "#f3f9f5" }}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-green-700 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {current && (
            <button
              onClick={() => onTierLabelClick(type)}
              className="text-sm font-semibold text-green-900 mb-1 hover:text-green-700 hover:underline cursor-pointer text-left"
            >
              {current.label}
            </button>
          )}
          {/* Progress toward next tier */}
          {next && (
            <div className="text-green-700 text-xs mb-1">
              <span className="font-medium">Next: {next.label}</span>
              <div className="flex items-center gap-1 mt-0.5">
                {Array.from({ length: totalDots }).map((_, dotIndex) => {
                  const dotNumber = dotIndex + 1;
                  const isFilled = dotNumber <= progressCount;
                  const isAnimated = animatedDots.includes(dotNumber);
                  
                  return (
                    <span
                      key={dotIndex}
                      className={`w-1 h-1 rounded-full transition-opacity duration-300 ${
                        isFilled
                          ? `bg-green-600 ${isAnimated ? "opacity-100" : "opacity-0"}`
                          : "border border-green-600 bg-transparent opacity-100"
                      }`}
                    />
                  );
                })}
                <span className="ml-2 opacity-60">
                  {progressCount}/{totalDots}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      {ctaText && (
        <button
          onClick={() => onCtaClick(type)}
          className="text-xs text-primary hover:underline ml-7 text-left mt-1"
        >
          {ctaText} →
        </button>
      )}
    </div>
  );
}

export function AchievementsPanel() {
  const router = useRouter();
  const { data: achievements, isLoading, error } = useGetAchievements();
  const projects = useGetAllProjects();
  const [openDialogType, setOpenDialogType] = useState<string | null>(null);

  const handleCtaClick = (type: string) => {
    const firstProjectId = projects.data?.[0]?.id;
    
    switch (type) {
      case "projectsWithCampaigns":
        if (firstProjectId) {
          router.push(`/project/${firstProjectId}?tab=campaign`);
        } else {
          router.push("/project");
        }
        break;
      case "projectsWithScheduledPosts":
        if (firstProjectId) {
          router.push(`/project/${firstProjectId}?tab=scheduled`);
        } else {
          router.push("/project");
        }
        break;
      case "projectsWithVideos":
        router.push("/project/my-videos");
        break;
      case "projectsWithTracking":
        if (firstProjectId) {
          router.push(`/project/${firstProjectId}?tab=analytics`);
        } else {
          router.push("/project/analytics");
        }
        break;
    }
  };

  const getCtaText = (type: string): string => {
    switch (type) {
      case "projectsWithCampaigns":
        return "Create a campaign";
      case "projectsWithScheduledPosts":
        return "Schedule posts";
      case "projectsWithVideos":
        return "Make a video";
      case "projectsWithTracking":
        return "Open tracking";
      default:
        return "";
    }
  };

  const getLevelsForType = (type: string) => {
    const tiers = ACHIEVEMENT_TIERS[type as keyof typeof ACHIEVEMENT_TIERS];
    if (!tiers) return [];
    return tiers.map((tier, index) => ({
      level: index + 1,
      label: tier.label,
      description: LEVEL_DESCRIPTIONS[type]?.[index + 1] || "",
    }));
  };

  if (isLoading) {
    return (
      <Card className="w-full bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-700" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-green-700" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load achievements
          </p>
        </CardContent>
      </Card>
    );
  }

  const achievementItems = [
    {
      icon: Calendar,
      text: (count: number) => `${count} ${count === 1 ? 'project has' : 'projects have'} campaigns`,
      count: achievements?.projectsWithCampaigns || 0,
      type: "projectsWithCampaigns" as const,
    },
    {
      icon: Send,
      text: (count: number) => `${count} ${count === 1 ? 'project has' : 'projects have'} scheduled posts`,
      count: achievements?.projectsWithScheduledPosts || 0,
      type: "projectsWithScheduledPosts" as const,
    },
    {
      icon: Video,
      text: (count: number) => `${count} ${count === 1 ? 'project has' : 'projects have'} videos`,
      count: achievements?.projectsWithVideos || 0,
      type: "projectsWithVideos" as const,
    },
    {
      icon: BarChart3,
      text: (count: number) => `${count} ${count === 1 ? 'project has' : 'projects have'} tracking`,
      count: achievements?.projectsWithTracking || 0,
      type: "projectsWithTracking" as const,
    },
  ].filter(item => item.count > 0);

  return (
    <Card className="w-full bg-green-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Trophy className="h-5 w-5 text-green-700" />
          Achievements
        </CardTitle>
        <p className="text-xs text-green-700 mt-1">
          Milestones across all your projects.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {achievementItems.length === 0 ? (
          <p className="text-sm text-green-700 text-center py-4">
            No achievements yet
          </p>
        ) : (
          achievementItems.map((item, index) => {
            const { current, next } = getAchievementTier(item.type, item.count);
            const currentTierIndex = getAchievementTierIndex(item.type, item.count);
            const ctaText = getCtaText(item.type);
            
            return (
              <AchievementItem
                key={index}
                icon={item.icon}
                text={item.text}
                count={item.count}
                type={item.type}
                current={current}
                next={next}
                currentTierIndex={currentTierIndex}
                ctaText={ctaText}
                onCtaClick={handleCtaClick}
                onTierLabelClick={setOpenDialogType}
              />
            );
          })
        )}
      </CardContent>

      {/* Levels Dialog */}
      {openDialogType && (
        <Dialog open={!!openDialogType} onOpenChange={(open) => !open && setOpenDialogType(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogClose />
            <DialogHeader>
              <DialogTitle>{CATEGORY_TITLES[openDialogType] || "Achievement Levels"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {(() => {
                // Calculate current tier index for the open dialog type
                let currentTierIndex = 0;
                if (openDialogType && achievements) {
                  const type = openDialogType as keyof typeof achievements;
                  const count = achievements[type] || 0;
                  currentTierIndex = getAchievementTierIndex(type, count);
                }
                
                return getLevelsForType(openDialogType).map((level) => {
                  const isCurrentTier = level.level === currentTierIndex;
                  return (
                    <div 
                      key={level.level} 
                      className={`space-y-1 p-3 rounded-lg border ${
                        isCurrentTier 
                          ? "bg-green-50 border-green-200" 
                          : "border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold text-sm ${
                          isCurrentTier ? "text-green-900" : ""
                        }`}>
                          Level {level.level} — {level.label}
                        </h3>
                        {isCurrentTier && (
                          <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {level.description}
                      </p>
                    </div>
                  );
                });
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}



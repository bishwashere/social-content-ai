"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetAchievements } from "@/backend-apis/achievements/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Calendar, Send, Video, BarChart3 } from "lucide-react";

export function AchievementsPanel() {
  const { data: achievements, isLoading, error } = useGetAchievements();

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
    },
    {
      icon: Send,
      text: (count: number) => `${count} ${count === 1 ? 'project has' : 'projects have'} scheduled posts`,
      count: achievements?.projectsWithScheduledPosts || 0,
    },
    {
      icon: Video,
      text: (count: number) => `${count} ${count === 1 ? 'project has' : 'projects have'} videos`,
      count: achievements?.projectsWithVideos || 0,
    },
    {
      icon: BarChart3,
      text: (count: number) => `${count} ${count === 1 ? 'project has' : 'projects have'} tracking`,
      count: achievements?.projectsWithTracking || 0,
    },
  ].filter(item => item.count > 0);

  return (
    <Card className="w-full bg-green-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <Trophy className="h-5 w-5 text-green-700" />
          Achievements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {achievementItems.length === 0 ? (
          <p className="text-sm text-green-700 text-center py-4">
            No achievements yet
          </p>
        ) : (
          achievementItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/60 border border-green-100"
              >
                <Icon className="h-4 w-4 text-green-700 flex-shrink-0" />
                <span className="text-sm font-medium text-green-900">
                  {item.text(item.count)}
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}


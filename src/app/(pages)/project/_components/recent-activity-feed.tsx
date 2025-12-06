"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetRecentActivity, ActivityItem } from "@/backend-apis/recent-activity/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, format, differenceInDays, startOfToday } from "date-fns";

function getMomentumSummary(activities: ActivityItem[]): string | null {
  if (!activities?.length) return null;

  const today = startOfToday();
  const daysWithActivity = new Set<string>();
  let latest: Date | null = null;

  for (const a of activities) {
    const d = new Date(a.timestamp);
    // Consider only last 7 days
    const daysDiff = differenceInDays(today, d);
    if (daysDiff >= 0 && daysDiff <= 6) {
      daysWithActivity.add(format(d, "yyyy-MM-dd"));
    }
    if (!latest || d > latest) latest = d;
  }

  if (!latest) return null;

  const activeDays = daysWithActivity.size;
  const daysAgo = differenceInDays(today, latest);

  // Generate summary based on activity
  if (daysAgo === 0) return "You were active today — keep going.";
  if (daysAgo === 1) return "You were active yesterday — stay in the flow.";
  return `Active ${activeDays} of last 7 days. Last activity ${daysAgo} days ago.`;
}

function getStreakDot(activities: ActivityItem[]): string {
  if (!activities?.length) return "⚪";

  const today = startOfToday();
  let latest: Date | null = null;

  for (const a of activities) {
    const d = new Date(a.timestamp);
    if (!latest || d > latest) latest = d;
  }

  if (!latest) return "⚪";

  const daysAgo = differenceInDays(today, latest);

  // 🟢 = Active today
  if (daysAgo === 0) return "🟢";
  // 🟡 = Active last 3 days
  if (daysAgo <= 3) return "🟡";
  // ⚪ = No recent activity
  return "⚪";
}

export function RecentActivityFeed() {
  const router = useRouter();
  const { data: activities = [], isLoading, error } = useGetRecentActivity();
  
  const momentumSummary = getMomentumSummary(activities);
  const streakDot = getStreakDot(activities);

  const handleActivityClick = (activity: typeof activities[0]) => {
    switch (activity.type) {
      case "posted":
      case "scheduled_missed":
        if (activity.projectId) {
          router.push(`/project/${activity.projectId}?tab=scheduled`);
        }
        break;
      case "draft_ready":
        if (activity.projectId && activity.campaignId) {
          router.push(`/project/${activity.projectId}?tab=campaign`);
        }
        break;
      case "video_completed":
        if (activity.projectId) {
          router.push(`/project/${activity.projectId}`);
        }
        break;
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Recent Activity Feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Recent Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            {error instanceof Error ? error.message : "Unable to load activity"}
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Recent Activity Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>No recent activity</CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{streakDot}</span>
          Recent Activity Feed
        </CardTitle>
        {momentumSummary && (
          <CardDescription className="text-xs mt-1">
            {momentumSummary}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-0">
        {activities.slice(0, 8).map((activity, index) => {
          // Format time without "about" prefix
          const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { 
            addSuffix: true,
            includeSeconds: false
          }).replace(/^about /i, '');
          
          const isLast = index === Math.min(activities.length, 8) - 1;
          
          return (
            <div
              key={index}
              onClick={() => handleActivityClick(activity)}
              className={`flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border ${!isLast ? 'border-b border-neutral-100' : ''}`}
            >
              <span className="text-2xl flex-shrink-0">{activity.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {activity.message}
                </p>
                {activity.projectName && !activity.message.includes("Project:") && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.projectName} • {timeAgo}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}


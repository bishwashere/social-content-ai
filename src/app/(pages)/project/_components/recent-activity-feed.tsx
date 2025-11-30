"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetRecentActivity } from "@/backend-apis/recent-activity/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export function RecentActivityFeed() {
  const router = useRouter();
  const { data: activities = [], isLoading, error } = useGetRecentActivity();

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
        <CardTitle>Recent Activity Feed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.slice(0, 8).map((activity, index) => {
          // Format time without "about" prefix
          const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { 
            addSuffix: true,
            includeSeconds: false
          }).replace(/^about /i, '');
          
          return (
            <div
              key={index}
              onClick={() => handleActivityClick(activity)}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border"
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


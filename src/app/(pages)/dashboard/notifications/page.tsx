"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { Bell, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetRecentActivityInfinite, ActivityItem } from "@/backend-apis/recent-activity/hooks";

function getActivityRoute(activity: ActivityItem): string | null {
  switch (activity.type) {
    case "posted":
    case "post_performing":
    case "scheduled_missed":
    case "post_failed":
    case "post_scheduled":
      return activity.projectId ? `/project/${activity.projectId}?tab=scheduled` : null;
    case "draft_ready":
      return activity.projectId && activity.campaignId
        ? `/project/${activity.projectId}?tab=campaign`
        : null;
    case "video_completed":
      return activity.projectId ? `/project/${activity.projectId}` : null;
    case "collaborator_joined":
    case "project_created":
    case "pulse_improved":
      return activity.projectId ? `/project/${activity.projectId}` : null;
    case "campaign_created":
      return activity.projectId && activity.campaignId
        ? `/project/${activity.projectId}?tab=campaign`
        : activity.projectId ? `/project/${activity.projectId}` : null;
    case "social_connected":
      return "/dashboard/settings";
    case "subscription_expiring":
      return "/dashboard/billing";
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetRecentActivityInfinite();

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-8 w-8 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-violet-500" />
            <h1 className="text-xl font-semibold">Notifications</h1>
          </div>
          {total > 0 && (
            <span className="ml-auto text-sm text-muted-foreground">
              {allItems.length} of {total}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-4">
                  <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5 py-0.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Could not load notifications
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {error instanceof Error ? error.message : "Please try again later"}
              </p>
            </div>
          ) : allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">All caught up</p>
              <p className="text-xs text-muted-foreground mt-1">No notifications yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {allItems.map((activity, index) => {
                const date = new Date(activity.timestamp);
                const timeAgo = formatDistanceToNow(date, {
                  addSuffix: true,
                  includeSeconds: false,
                }).replace(/^about /i, "");
                const fullDate = format(date, "MMM d, yyyy 'at' h:mm a");
                const route = getActivityRoute(activity);

                return (
                  <li
                    key={`${activity.type}-${activity.projectId}-${index}`}
                    onClick={() => route && router.push(route)}
                    className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                      route ? "cursor-pointer hover:bg-muted/40" : "cursor-default"
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{activity.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">{activity.message}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {activity.projectName && (
                          <>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {activity.projectName}
                            </span>
                            <span className="text-xs text-muted-foreground">·</span>
                          </>
                        )}
                        <span className="text-xs text-muted-foreground" title={fullDate}>
                          {timeAgo}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Load More */}
        {hasNextPage && (
          <div className="flex justify-center mt-5">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="gap-2"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        )}

        {!isLoading && !hasNextPage && allItems.length > 0 && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            All {total} notifications loaded
          </p>
        )}

      </div>
    </div>
  );
}

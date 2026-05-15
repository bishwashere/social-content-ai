"use client";

import * as React from "react";
import { Bell, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetRecentActivity, ActivityItem } from "@/backend-apis/recent-activity/hooks";

// ── Stable per-notification key ───────────────────────────────────────────────
function notifKey(activity: ActivityItem): string {
  return `${activity.type}|${activity.projectId ?? ""}|${activity.timestamp}`;
}

// ── localStorage-backed read state ────────────────────────────────────────────
const LS_READ_KEYS   = "nextpostai_notif_read";
const LS_CLEARED_AT  = "nextpostai_notif_cleared_at";

function loadReadKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_READ_KEYS);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function loadClearedAt(): number {
  try {
    return parseInt(localStorage.getItem(LS_CLEARED_AT) ?? "0", 10);
  } catch {
    return 0;
  }
}

function useReadState(activities: ActivityItem[]) {
  const [readKeys, setReadKeys] = React.useState<Set<string>>(() =>
    typeof window === "undefined" ? new Set() : loadReadKeys()
  );
  const [clearedAt, setClearedAt] = React.useState<number>(() =>
    typeof window === "undefined" ? 0 : loadClearedAt()
  );

  const isRead = React.useCallback(
    (activity: ActivityItem): boolean => {
      if (new Date(activity.timestamp).getTime() <= clearedAt) return true;
      return readKeys.has(notifKey(activity));
    },
    [readKeys, clearedAt]
  );

  const markRead = React.useCallback((activity: ActivityItem) => {
    setReadKeys((prev) => {
      const next = new Set(prev);
      next.add(notifKey(activity));
      try { localStorage.setItem(LS_READ_KEYS, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const clearAll = React.useCallback(() => {
    const now = Date.now();
    setClearedAt(now);
    try { localStorage.setItem(LS_CLEARED_AT, String(now)); } catch {}
    // Also wipe the individual keys to keep storage small
    setReadKeys(new Set());
    try { localStorage.removeItem(LS_READ_KEYS); } catch {}
  }, []);

  const unreadCount = React.useMemo(
    () => activities.filter((a) => !isRead(a)).length,
    [activities, isRead]
  );

  return { isRead, markRead, clearAll, unreadCount };
}

// ── Route resolver ────────────────────────────────────────────────────────────
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

// ── Component ─────────────────────────────────────────────────────────────────
export function NotificationDrawer() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { data: activities = [], isLoading } = useGetRecentActivity();
  const { isRead, markRead, clearAll, unreadCount } = useReadState(activities);

  const handleActivityClick = (activity: ActivityItem) => {
    markRead(activity);
    const route = getActivityRoute(activity);
    if (route) {
      setOpen(false);
      router.push(route);
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearAll();
  };

  const handleExpandClick = () => {
    setOpen(false);
    router.push("/dashboard/notifications");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-full"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-violet-500" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] p-0 rounded-xl shadow-lg border overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs font-medium bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 rounded-full px-1.5 py-0.5 leading-none">
                {unreadCount} unread
              </span>
            )}
          </div>
          {activities.length > 0 && unreadCount > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[420px] overflow-y-auto">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3.5">
                  <Skeleton className="h-7 w-7 rounded-full flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5 py-0.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2.5">
                <Bell className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">All caught up</p>
              <p className="text-xs text-muted-foreground mt-0.5">No recent activity</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {activities.map((activity, index) => {
                const read = isRead(activity);
                const isClickable = !!getActivityRoute(activity);
                const timeAgo = formatDistanceToNow(new Date(activity.timestamp), {
                  addSuffix: true,
                  includeSeconds: false,
                }).replace(/^about /i, "");

                return (
                  <li
                    key={`${activity.type}-${activity.projectId}-${index}`}
                    onClick={() => handleActivityClick(activity)}
                    className={[
                      "flex items-start gap-3 px-4 py-3.5 transition-colors relative",
                      isClickable ? "cursor-pointer hover:bg-muted/50" : "cursor-default",
                      !read
                        ? "bg-violet-50/60 dark:bg-violet-950/20"
                        : "",
                    ].join(" ")}
                  >
                    {/* Unread indicator stripe */}
                    {!read && (
                      <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-violet-500 rounded-r" />
                    )}

                    <span className="text-lg flex-shrink-0 leading-none mt-0.5">{activity.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!read ? "font-medium" : ""}`}>
                        {activity.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.projectName ? `${activity.projectName} · ` : ""}{timeAgo}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!read && (
                      <span className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full bg-violet-500" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2.5 bg-muted/30">
          <button
            onClick={handleExpandClick}
            className="flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
          >
            <ArrowUpRight className="h-3 w-3" />
            Expand — view all notifications
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

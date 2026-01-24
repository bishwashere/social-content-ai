"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, isToday, isTomorrow, addDays } from "date-fns";
import { 
  ArrowRight, 
  Calendar, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight,
  ChevronUp,
  Clock, 
  Folder,
  Lightbulb,
  Sparkles,
  Zap,
  CheckCircle,
  AlertCircle,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { useTodayItems, TimelineItem, TimelineProject } from "@/hooks/useTodayItems";
import { useSession } from "@/backend-apis/auth/hooks";
import { useGetAllScheduledPosts, useGetAllProjects } from "@/backend-apis/projects/hooks";
import { ProjectCreationSuggestions } from "@/components/project-creation-suggestions";
import { NewsTrendingSection } from "./news-trending";
import { useQuery } from "@tanstack/react-query";

type TodayTimelineViewProps = {
  showGetStartedGuide?: boolean;
};

export function TodayTimelineView({ showGetStartedGuide = false }: TodayTimelineViewProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { items, groupedItems, isLoading, isEmpty, hasUrgentItems } = useTodayItems();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [hasUnlinkedPages, setHasUnlinkedPages] = useState(false);
  const scheduledPosts = useGetAllScheduledPosts();
  const projects = useGetAllProjects();

  // Check if GetStartedGuide should be shown (same logic as GetStartedGuide component)
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ["connected-accounts", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return { hasProviders: false, providers: [] };

      const response = await fetch(`/api/check-oauth-providers?userId=${session.user.id}`, {
        cache: 'no-store',
      });
      const result = await response.json();
      const data = result.data || result;
      return {
        hasProviders: data.hasProviders || false,
        providers: data.providers || []
      };
    },
    enabled: !!session?.user?.id && showGetStartedGuide,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Check if user has scheduled or published posts
  const hasScheduledOrPublished = useMemo(() => {
    // Check if there are any scheduled posts (covers both scheduled and published posts)
    return (scheduledPosts.data || []).length > 0;
  }, [scheduledPosts.data]);

  // Check if user has campaigns
  const hasCampaigns = useMemo(() => {
    if (!projects.data) return false;
    return projects.data.some((project) => {
      return (project.campaignPlanners || []).length > 0;
    });
  }, [projects.data]);

  // Don't overwhelm brand-new users with alerts immediately after they create their first project.
  const isWithinFirstProjectHour = useMemo(() => {
    if (!projects.data || projects.data.length === 0) return false;

    const createdTimes = projects.data
      .map((p: any) => {
        const raw = p?.createdAt ?? p?.created_at ?? p?.created;
        const d = raw ? new Date(raw) : null;
        return d && !Number.isNaN(d.getTime()) ? d.getTime() : null;
      })
      .filter((t: number | null): t is number => typeof t === "number");

    if (createdTimes.length === 0) return false;

    const firstCreatedAt = Math.min(...createdTimes);
    return Date.now() - firstCreatedAt < 60 * 60 * 1000;
  }, [projects.data]);

  // Determine if GetStartedGuide is actually showing
  const isGetStartedGuideVisible = useMemo(() => {
    if (!showGetStartedGuide) return false;
    if (projects.isLoading || accountsLoading) return false;
    if (!projects.data) return false;

    const hasNoSocials = !accountsData?.hasProviders;
    const hasNoPosts = !hasScheduledOrPublished;
    const hasNoCampaigns = !hasCampaigns;

    return hasNoSocials || hasNoPosts || hasNoCampaigns;
  }, [showGetStartedGuide, projects.isLoading, projects.data, accountsLoading, accountsData, hasScheduledOrPublished, hasCampaigns]);
  
  // Define today at component level so it's accessible in JSX
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);
  
  // Calculate scheduled posts and campaigns for today and tomorrow
  const calendarDetails = useMemo(() => {
    const tomorrow = addDays(today, 1);
    
    // Get scheduled posts for today with details (exclude webhook posts - they're internal triggers)
    const todayPosts = scheduledPosts.data?.filter((post: any) => {
      const postDate = new Date(post.date);
      postDate.setHours(0, 0, 0, 0);
      // Exclude webhook posts - they're internal triggers, not standalone events
      return postDate.getTime() === today.getTime() && post.platform !== "webhook";
    }).map((post: any) => ({
      type: 'scheduled',
      projectName: post.project?.name || 'Unknown Project',
      campaignName: post.meta?.campaignName || null,
      day: post.meta?.day || null,
      platform: post.platform,
      scheduledTime: post.date ? new Date(post.date) : null,
      status: post.status || 'pending',
      postId: post.id,
      // Create a unique key for deduplication
      key: `scheduled-${post.id}`,
    })) || [];
    
    // Get scheduled posts for tomorrow with details (exclude webhook posts - they're internal triggers)
    const tomorrowPosts = scheduledPosts.data?.filter((post: any) => {
      const postDate = new Date(post.date);
      postDate.setHours(0, 0, 0, 0);
      // Exclude webhook posts - they're internal triggers, not standalone events
      return postDate.getTime() === tomorrow.getTime() && post.platform !== "webhook";
    }).map((post: any) => ({
      type: 'scheduled',
      projectName: post.project?.name || 'Unknown Project',
      campaignName: post.meta?.campaignName || null,
      day: post.meta?.day || null,
      platform: post.platform,
      scheduledTime: post.date ? new Date(post.date) : null,
      // Create a unique key for deduplication
      key: `scheduled-${post.id}`,
    })) || [];
    
    // Get campaign planner content for today (only if not already scheduled)
    const todayCampaignItems: Array<{
      type: string;
      projectName: string;
      campaignName: string;
      day: number;
      key: string;
      scheduledTime: Date | null;
      platforms: string[];
    }> = [];
    
    // Create a set of scheduled campaign keys to avoid duplicates
    const todayScheduledCampaignKeys = new Set(
      todayPosts
        .filter(p => p.campaignName && p.day)
        .map(p => `campaign-${p.projectName}-${p.campaignName}-${p.day}`)
    );
    
    projects.data?.forEach((project) => {
      (project.campaignPlanners || []).forEach((planner: any) => {
        if (!planner.startDate) return;
        const startDate = new Date(planner.startDate);
        startDate.setHours(0, 0, 0, 0);
        const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        const todayChat = (planner.chats || []).find((chat: any) => chat.day === daysSinceStart + 1);
        if (todayChat) {
          const campaignKey = `campaign-${project.name}-${planner.name || 'Campaign'}-${todayChat.day}`;
          // Only add if not already scheduled as a post
          if (!todayScheduledCampaignKeys.has(campaignKey)) {
            // Calculate scheduled time from autoPostTime if available
            let scheduledTime: Date | null = null;
            if (planner.autoPostTime && planner.autoPostEnabled) {
              try {
                const [hours, minutes] = planner.autoPostTime.split(":").map(Number);
                const targetDate = new Date(today);
                targetDate.setHours(hours, minutes, 0, 0);
                scheduledTime = targetDate;
              } catch (e) {
                // Invalid time format
              }
            }
            
            // Get platforms from autoPostPlatforms or fallback to platforms
            const platforms = planner.autoPostPlatforms && planner.autoPostPlatforms.length > 0
              ? planner.autoPostPlatforms
              : (planner.platforms || []);
            
            todayCampaignItems.push({
              type: 'campaign',
              projectName: project.name,
              campaignName: planner.name || 'Campaign',
              day: todayChat.day,
              key: campaignKey,
              scheduledTime,
              platforms,
            });
          }
        }
      });
    });
    
    // Get campaign planner content for tomorrow (only if not already scheduled)
    const tomorrowCampaignItems: Array<{
      type: string;
      projectName: string;
      campaignName: string;
      day: number;
      key: string;
      scheduledTime: Date | null;
      platforms: string[];
    }> = [];
    
    // Create a set of scheduled campaign keys to avoid duplicates
    const tomorrowScheduledCampaignKeys = new Set(
      tomorrowPosts
        .filter(p => p.campaignName && p.day)
        .map(p => `campaign-${p.projectName}-${p.campaignName}-${p.day}`)
    );
    
    projects.data?.forEach((project) => {
      (project.campaignPlanners || []).forEach((planner: any) => {
        if (!planner.startDate) return;
        const startDate = new Date(planner.startDate);
        startDate.setHours(0, 0, 0, 0);
        const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        const tomorrowChat = (planner.chats || []).find((chat: any) => chat.day === daysSinceStart + 2);
        if (tomorrowChat) {
          const campaignKey = `campaign-${project.name}-${planner.name || 'Campaign'}-${tomorrowChat.day}`;
          // Only add if not already scheduled as a post
          if (!tomorrowScheduledCampaignKeys.has(campaignKey)) {
            // Calculate scheduled time from autoPostTime if available
            let scheduledTime: Date | null = null;
            if (planner.autoPostTime && planner.autoPostEnabled) {
              try {
                const [hours, minutes] = planner.autoPostTime.split(":").map(Number);
                const targetDate = new Date(tomorrow);
                targetDate.setHours(hours, minutes, 0, 0);
                scheduledTime = targetDate;
              } catch (e) {
                // Invalid time format
              }
            }
            
            // Get platforms from autoPostPlatforms or fallback to platforms
            const platforms = planner.autoPostPlatforms && planner.autoPostPlatforms.length > 0
              ? planner.autoPostPlatforms
              : (planner.platforms || []);
            
            tomorrowCampaignItems.push({
              type: 'campaign',
              projectName: project.name,
              campaignName: planner.name || 'Campaign',
              day: tomorrowChat.day,
              key: campaignKey,
              scheduledTime,
              platforms,
            });
          }
        }
      });
    });
    
    // Deduplicate items by key (in case same post appears multiple times)
    const deduplicatedToday = Array.from(
      new Map([...todayPosts, ...todayCampaignItems].map(item => [item.key, item])).values()
    );
    
    const deduplicatedTomorrow = Array.from(
      new Map([...tomorrowPosts, ...tomorrowCampaignItems].map(item => [item.key, item])).values()
    );
    
    // Get scheduled times for today - extract from the already filtered todayPosts
    const todayScheduledTimes: string[] = [];
    if (scheduledPosts.data) {
      scheduledPosts.data.forEach((post: any) => {
        if (!post.date || post.platform === "webhook") return;
        try {
          const postDate = new Date(post.date);
          // Compare dates by year, month, and day only (ignore time)
          const postYear = postDate.getFullYear();
          const postMonth = postDate.getMonth();
          const postDay = postDate.getDate();
          const todayYear = today.getFullYear();
          const todayMonth = today.getMonth();
          const todayDay = today.getDate();
          
          if (postYear === todayYear && postMonth === todayMonth && postDay === todayDay) {
            const timeStr = format(postDate, "h:mm a");
            if (!todayScheduledTimes.includes(timeStr)) {
              todayScheduledTimes.push(timeStr);
            }
          }
        } catch (e) {
          // Skip invalid dates
        }
      });
      todayScheduledTimes.sort();
    }
    
    // Get scheduled times for tomorrow
    const tomorrowScheduledTimes: string[] = [];
    if (scheduledPosts.data) {
      scheduledPosts.data.forEach((post: any) => {
        if (!post.date || post.platform === "webhook") return;
        try {
          const postDate = new Date(post.date);
          // Compare dates by year, month, and day only (ignore time)
          const postYear = postDate.getFullYear();
          const postMonth = postDate.getMonth();
          const postDay = postDate.getDate();
          const tomorrowYear = tomorrow.getFullYear();
          const tomorrowMonth = tomorrow.getMonth();
          const tomorrowDay = tomorrow.getDate();
          
          if (postYear === tomorrowYear && postMonth === tomorrowMonth && postDay === tomorrowDay) {
            const timeStr = format(postDate, "h:mm a");
            if (!tomorrowScheduledTimes.includes(timeStr)) {
              tomorrowScheduledTimes.push(timeStr);
            }
          }
        } catch (e) {
          // Skip invalid dates
        }
      });
      tomorrowScheduledTimes.sort();
    }
    
    return { 
      todayItems: deduplicatedToday,
      tomorrowItems: deduplicatedTomorrow,
      todayScheduledTimes,
      tomorrowScheduledTimes
    };
  }, [scheduledPosts.data, projects.data, today]);
  
  // Extract trending projects (50+ recent impressions from last 3 days)
  const trendingProjects = useMemo(() => {
    const trending: Array<{
      projectId: string;
      projectName: string;
      href: string;
      recentImpressions: number;
      totalImpressions: number;
      campaignCount: number;
      publishedPostsCount: number;
    }> = [];
    const seenProjectIds = new Set<string>();
    
    // Look through all action items (both grouped and individual) for projects with stats
    groupedItems.action.forEach(item => {
      // Check grouped items
      if (item.isGrouped && item.projects) {
        item.projects.forEach(project => {
          // Skip if we've already seen this project
          if (seenProjectIds.has(project.projectId)) {
            return;
          }
          
          console.log(`🔍 Checking grouped project: ${project.projectName}`, {
            hasStats: !!project.stats,
            recentImpressions: project.stats?.recentImpressions,
            totalImpressions: project.stats?.totalImpressions,
            threshold: 50
          });
          
          if (project.stats && project.stats.recentImpressions >= 50) {
            console.log(`✅ Adding to trending: ${project.projectName} with ${project.stats.recentImpressions} recent impressions`);
            seenProjectIds.add(project.projectId);
            trending.push({
              projectId: project.projectId,
              projectName: project.projectName,
              href: project.href,
              recentImpressions: project.stats.recentImpressions,
              totalImpressions: project.stats.totalImpressions,
              campaignCount: project.stats.campaignCount,
              publishedPostsCount: project.stats.publishedPostsCount,
            });
          }
        });
      } else if (!item.isGrouped && item.projectId) {
        // Check individual items - they might have stats if they were added with stats
        // Individual items don't have a projects array, but we can check the item itself
        // Note: Individual items currently don't carry stats, but we check in case they do in the future
        if (item.stats && item.stats.recentImpressions !== undefined && item.stats.recentImpressions >= 50 && !seenProjectIds.has(item.projectId)) {
          console.log(`✅ Adding individual item to trending: ${item.projectName} with ${item.stats.recentImpressions} recent impressions`);
          seenProjectIds.add(item.projectId);
          trending.push({
            projectId: item.projectId,
            projectName: item.projectName || "Unknown",
            href: item.action?.href || `/project/${item.projectId}?tab=campaign`,
            recentImpressions: item.stats.recentImpressions,
            totalImpressions: item.stats.totalImpressions || 0,
            campaignCount: item.stats.campaignCount || 0,
            publishedPostsCount: item.stats.publishedPostsCount || 0,
          });
        }
      }
    });
    
    console.log(`📊 Total trending projects found: ${trending.length}`, trending);
    
    // Sort by recent impressions (highest first)
    return trending.sort((a, b) => b.recentImpressions - a.recentImpressions);
  }, [groupedItems.action]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  // Action buttons component - always show these useful actions
  const ActionButtons = () => (
    <div className="flex flex-wrap gap-3">
      <Button asChild className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0">
        <Link href="/project/video-maker">
          <Sparkles className="w-4 h-4 mr-2" />
          Create Video
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/project/wall">
          Get Inspired
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/project/content-planner">
          <Calendar className="w-4 h-4 mr-2" />
          View Content Planner
        </Link>
      </Button>
    </div>
  );

  // If no items at all, show empty state with actions
  // BUT don't show "You're all caught up" if GetStartedGuide is visible
  if (isEmpty && !isGetStartedGuideVisible) {
    return (
      <div className="space-y-6">
        <Card className="border-dashed border-2 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">You&apos;re all caught up! 🎉</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              No pending tasks for today. Great job staying on top of your content!
            </p>
            <ActionButtons />
          </CardContent>
        </Card>
      </div>
    );
  }

  // If GetStartedGuide is visible and there are no items, show just the action buttons
  if (isEmpty && isGetStartedGuideVisible) {
    return (
      <div className="space-y-6">
        <div>
          <ActionButtons />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        {/* Left column: primary work */}
        <div className="space-y-6">
          {/* Trending Projects - Show projects with strong recent performance */}
          {trendingProjects.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                Trending Projects
              </h2>
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-teal-950/30">
                <CardContent className="px-4">
                  <div className="space-y-2">
                    {trendingProjects.map((project) => (
                      <div
                        key={project.projectId}
                        className="flex items-start justify-between gap-4 p-2 rounded-md hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer"
                        onClick={() => router.push(project.href)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">🔥</span>
                            <h3 className="font-semibold text-base truncate">{project.projectName}</h3>
                          </div>
                          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                            {project.recentImpressions.toLocaleString()} impressions in the last 3 days
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {project.campaignCount} {project.campaignCount === 1 ? 'campaign' : 'campaigns'} • {project.publishedPostsCount} published {project.publishedPostsCount === 1 ? 'post' : 'posts'} • {project.totalImpressions.toLocaleString()} total impressions
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Urgent Items - Always show prominently */}
          {groupedItems.urgent.length > 0 && (
            <div className="space-y-3">
              {groupedItems.urgent.map((item) => (
                <TimelineCard key={item.id} item={item} variant="urgent" />
              ))}
            </div>
          )}

          {/* Action Items - Primary tasks for today */}
          {(groupedItems.action.length > 0 || hasUnlinkedPages || isWithinFirstProjectHour) && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Action Required
              </h2>
              {isWithinFirstProjectHour ? (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-10">
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                    Alerts and reminders will appear here
                  </p>
                </div>
              ) : (
                <>
                  {/* Project Creation Suggestions */}
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
                    <ProjectCreationSuggestions onHasPagesChange={setHasUnlinkedPages} />
                  </div>
                  {/* Existing Action Items */}
                  {groupedItems.action.length > 0 && (
                    <>
                      {hasUnlinkedPages && groupedItems.action.length > 0 && (
                        <div className="border-t border-slate-200 dark:border-slate-700 my-3" />
                      )}
                      {groupedItems.action.slice(0, 5).map((item) => (
                        <TimelineCard key={item.id} item={item} variant="action" />
                      ))}
                      {groupedItems.action.length > 5 && (
                        <Button variant="ghost" size="sm" className="w-full">
                          Show {groupedItems.action.length - 5} more
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          <NewsTrendingSection />
        </div>

        {/* Right column: sidebar (collapsed by default) */}
        {(groupedItems.suggestions.length > 0 || groupedItems.activity.length > 0) && (
          <aside className="space-y-6 lg:sticky lg:top-6 self-start">
            {/* Suggestions - Collapsible */}
            {groupedItems.suggestions.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="flex items-center gap-2 text-lg font-semibold w-full text-left hover:text-primary transition-colors"
                >
                  {showSuggestions ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  <Lightbulb className="w-5 h-5 text-blue-500" />
                  Stay Ahead
                  <Badge variant="secondary" className="ml-2">{groupedItems.suggestions.length}</Badge>
                </button>
                {showSuggestions && (
                  <div className="space-y-2 pl-7">
                    {groupedItems.suggestions.map((item) => (
                      <TimelineCard key={item.id} item={item} variant="suggestion" compact />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recent Activity - Collapsible */}
            {groupedItems.activity.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowActivity(!showActivity)}
                  className="flex items-center gap-2 text-lg font-semibold w-full text-left hover:text-primary transition-colors"
                >
                  {showActivity ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  <Clock className="w-5 h-5 text-slate-500" />
                  Recent Activity
                  <Badge variant="secondary" className="ml-2">{groupedItems.activity.length}</Badge>
                </button>
                {showActivity && (
                  <div className="space-y-2 pl-7">
                    {groupedItems.activity.map((item) => (
                      <TimelineCard key={item.id} item={item} variant="activity" compact />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Calendar - Today and Tomorrow */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Calendar className="w-5 h-5 text-slate-500" />
                Calendar
              </div>
              <Card className="border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Today */}
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                            {format(new Date(), "d")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">Today</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {format(new Date(), "EEEE, MMMM d")}
                          </p>
                        </div>
                      </div>
                      {calendarDetails.todayItems.length > 0 ? (
                        <div className="space-y-2 mt-3">
                          {calendarDetails.todayItems.map((item, index) => (
                            <div key={index} className="text-xs p-2 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                              <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
                                {(() => {
                                  // Check if time has passed and get status for indicator
                                  const now = new Date();
                                  let itemTimeDate: Date | null = null;
                                  let postStatus: string | null = null;
                                  
                                  if ('scheduledTime' in item && item.scheduledTime) {
                                    itemTimeDate = new Date(item.scheduledTime);
                                    // Check if status is already in the item
                                    if ('status' in item && item.status) {
                                      postStatus = item.status as string;
                                    }
                                  } else if (item.type === 'scheduled' && scheduledPosts.data) {
                                    const matchingPost = scheduledPosts.data.find((post: any) => {
                                      const postDate = new Date(post.date);
                                      const postYear = postDate.getFullYear();
                                      const postMonth = postDate.getMonth();
                                      const postDay = postDate.getDate();
                                      const todayYear = today.getFullYear();
                                      const todayMonth = today.getMonth();
                                      const todayDay = today.getDate();
                                      return post.project?.name === item.projectName &&
                                        post.platform === ('platform' in item ? item.platform : null) &&
                                        postYear === todayYear && postMonth === todayMonth && postDay === todayDay &&
                                        post.platform !== "webhook";
                                    });
                                    if (matchingPost) {
                                      itemTimeDate = new Date(matchingPost.date);
                                      postStatus = matchingPost.status || 'pending';
                                    }
                                  } else if (item.type === 'campaign' && scheduledPosts.data) {
                                    // For campaign items, find scheduled posts for this campaign
                                    const campaignPosts = scheduledPosts.data.filter((post: any) => {
                                      const postDate = new Date(post.date);
                                      const postYear = postDate.getFullYear();
                                      const postMonth = postDate.getMonth();
                                      const postDay = postDate.getDate();
                                      const todayYear = today.getFullYear();
                                      const todayMonth = today.getMonth();
                                      const todayDay = today.getDate();
                                      const meta = post.meta as any;
                                      return post.project?.name === item.projectName &&
                                        meta?.campaignName === item.campaignName &&
                                        meta?.day === item.day &&
                                        postYear === todayYear && postMonth === todayMonth && postDay === todayDay &&
                                        post.platform !== "webhook";
                                    });
                                    if (campaignPosts.length > 0) {
                                      itemTimeDate = new Date(campaignPosts[0].date);
                                      const hasFailed = campaignPosts.some((p: any) => p.status === 'failed');
                                      const allSuccess = campaignPosts.every((p: any) => p.status === 'success');
                                      postStatus = hasFailed ? 'failed' : (allSuccess ? 'success' : 'pending');
                                    } else if (projects.data) {
                                      // No scheduled posts yet, check if auto-post is enabled
                                      const project = projects.data.find(p => p.name === item.projectName);
                                      if (project) {
                                        const planner = (project.campaignPlanners || []).find(
                                          (p: any) => (p.name || 'Campaign') === item.campaignName
                                        ) as any;
                                        if (planner?.autoPostTime && planner?.autoPostEnabled) {
                                          try {
                                            const [hours, minutes] = planner.autoPostTime.split(":").map(Number);
                                            const targetDate = new Date(today);
                                            targetDate.setHours(hours, minutes, 0, 0);
                                            itemTimeDate = targetDate;
                                            postStatus = 'pending';
                                          } catch (e) {
                                            // Invalid time format
                                          }
                                        }
                                      }
                                    }
                                  }
                                  
                                  // Show indicator if time has passed
                                  if (itemTimeDate && itemTimeDate.getTime() < now.getTime()) {
                                    if (postStatus === 'success') {
                                      return (
                                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                      );
                                    } else if (postStatus === 'failed') {
                                      return (
                                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                                      );
                                    } else {
                                      // Time passed but still pending/processing
                                      return (
                                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                      );
                                    }
                                  }
                                  return null;
                                })()}
                                <p className="font-medium text-slate-900 dark:text-slate-100 flex-shrink-0 truncate lg:max-w-none">{item.projectName}</p>
                                {(() => {
                                  // Get scheduled time for this specific item
                                  let itemTime: string | null = null;
                                  if ('scheduledTime' in item && item.scheduledTime) {
                                    itemTime = format(new Date(item.scheduledTime), "h:mm a");
                                  } else if (item.type === 'scheduled' && scheduledPosts.data) {
                                    // Find the scheduled post for this project/platform
                                    const matchingPost = scheduledPosts.data.find((post: any) => {
                                      const postDate = new Date(post.date);
                                      const postYear = postDate.getFullYear();
                                      const postMonth = postDate.getMonth();
                                      const postDay = postDate.getDate();
                                      const todayYear = today.getFullYear();
                                      const todayMonth = today.getMonth();
                                      const todayDay = today.getDate();
                                      return post.project?.name === item.projectName &&
                                        post.platform === ('platform' in item ? item.platform : null) &&
                                        postYear === todayYear && postMonth === todayMonth && postDay === todayDay &&
                                        post.platform !== "webhook";
                                    });
                                    if (matchingPost) {
                                      itemTime = format(new Date(matchingPost.date), "h:mm a");
                                    }
                                  } else if (item.type === 'campaign' && projects.data) {
                                    // For campaign items, look up the campaign planner's autoPostTime
                                    const project = projects.data.find(p => p.name === item.projectName);
                                    if (project) {
                                      const planner = (project.campaignPlanners || []).find(
                                        (p: any) => (p.name || 'Campaign') === item.campaignName
                                      ) as any;
                                      if (planner?.autoPostTime && planner?.autoPostEnabled) {
                                        try {
                                          const [hours, minutes] = planner.autoPostTime.split(":").map(Number);
                                          const targetDate = new Date(today);
                                          targetDate.setHours(hours, minutes, 0, 0);
                                          itemTime = format(targetDate, "h:mm a");
                                        } catch (e) {
                                          // Invalid time format
                                        }
                                      }
                                    }
                                  }
                                  return itemTime ? (
                                    <span className="text-violet-600 dark:text-violet-400 font-medium whitespace-nowrap flex-shrink-0">
                                      {itemTime}
                                    </span>
                                  ) : null;
                                })()}
                                {item.day && (
                                  <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap truncate lg:max-w-none">
                                    Day {item.day}
                                  </span>
                                )}
                                {(() => {
                                  // Show platform(s) - for scheduled posts it's a single platform, for campaigns it's an array
                                  if ('platform' in item && item.platform) {
                                    return (
                                      <span className="text-slate-400 dark:text-slate-500 whitespace-nowrap truncate lg:max-w-none">• {item.platform}</span>
                                    );
                                  } else if ('platforms' in item && Array.isArray(item.platforms) && item.platforms.length > 0) {
                                    return (
                                      <span className="text-slate-400 dark:text-slate-500 whitespace-nowrap truncate lg:max-w-none">
                                        • {item.platforms.join(", ")}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">No scheduled items</p>
                      )}
                    </div>
                    {/* Tomorrow */}
                    <div className="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                            {format(addDays(new Date(), 1), "d")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">Tomorrow</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {format(addDays(new Date(), 1), "EEEE, MMMM d")}
                          </p>
                        </div>
                      </div>
                      {calendarDetails.tomorrowItems.length > 0 ? (
                        <div className="space-y-2 mt-3">
                          {calendarDetails.tomorrowItems.map((item, index) => (
                            <div key={index} className="text-xs p-2 rounded-md bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                              <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
                                <p className="font-medium text-slate-900 dark:text-slate-100 flex-shrink-0 truncate lg:max-w-none">{item.projectName}</p>
                                {(() => {
                                  // Get scheduled time for this specific item
                                  let itemTime: string | null = null;
                                  const tomorrow = addDays(today, 1);
                                  if ('scheduledTime' in item && item.scheduledTime) {
                                    itemTime = format(new Date(item.scheduledTime), "h:mm a");
                                  } else if (item.type === 'scheduled' && scheduledPosts.data) {
                                    // Find the scheduled post for this project/platform
                                    const matchingPost = scheduledPosts.data.find((post: any) => {
                                      const postDate = new Date(post.date);
                                      const postYear = postDate.getFullYear();
                                      const postMonth = postDate.getMonth();
                                      const postDay = postDate.getDate();
                                      const tomorrowYear = tomorrow.getFullYear();
                                      const tomorrowMonth = tomorrow.getMonth();
                                      const tomorrowDay = tomorrow.getDate();
                                      return post.project?.name === item.projectName &&
                                        post.platform === ('platform' in item ? item.platform : null) &&
                                        postYear === tomorrowYear && postMonth === tomorrowMonth && postDay === tomorrowDay &&
                                        post.platform !== "webhook";
                                    });
                                    if (matchingPost) {
                                      itemTime = format(new Date(matchingPost.date), "h:mm a");
                                    }
                                  } else if (item.type === 'campaign' && projects.data) {
                                    // For campaign items, look up the campaign planner's autoPostTime
                                    const project = projects.data.find(p => p.name === item.projectName);
                                    if (project) {
                                      const planner = (project.campaignPlanners || []).find(
                                        (p: any) => (p.name || 'Campaign') === item.campaignName
                                      ) as any;
                                      if (planner?.autoPostTime && planner?.autoPostEnabled) {
                                        try {
                                          const [hours, minutes] = planner.autoPostTime.split(":").map(Number);
                                          const targetDate = new Date(tomorrow);
                                          targetDate.setHours(hours, minutes, 0, 0);
                                          itemTime = format(targetDate, "h:mm a");
                                        } catch (e) {
                                          // Invalid time format
                                        }
                                      }
                                    }
                                  }
                                  return itemTime ? (
                                    <span className="text-violet-600 dark:text-violet-400 font-medium whitespace-nowrap flex-shrink-0">
                                      {itemTime}
                                    </span>
                                  ) : null;
                                })()}
                                {item.day && (
                                  <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap truncate lg:max-w-none">
                                    Day {item.day}
                                  </span>
                                )}
                                {(() => {
                                  // Show platform(s) - for scheduled posts it's a single platform, for campaigns it's an array
                                  if ('platform' in item && item.platform) {
                                    return (
                                      <span className="text-slate-400 dark:text-slate-500 whitespace-nowrap truncate lg:max-w-none">• {item.platform}</span>
                                    );
                                  } else if ('platforms' in item && Array.isArray(item.platforms) && item.platforms.length > 0) {
                                    return (
                                      <span className="text-slate-400 dark:text-slate-500 whitespace-nowrap truncate lg:max-w-none">
                                        • {item.platforms.join(", ")}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">No scheduled items</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

interface TimelineCardProps {
  item: TimelineItem;
  variant: "urgent" | "action" | "suggestion" | "activity";
  compact?: boolean;
}

function TimelineCard({ item, variant, compact = false }: TimelineCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expansionLevel, setExpansionLevel] = useState<0 | 1 | 2>(0); // 0 = none, 1 = 3 projects, 2 = all

  // Initialize expansion level for inactive groups based on project count
  useEffect(() => {
    if (item.isGrouped && item.projects && item.title?.includes("inactive for 7+ days")) {
      const projectCount = item.projects.length;
      if (projectCount <= 3) {
        // 1-3 projects: show all by default (fully expanded)
        setExpansionLevel(2);
      } else {
        // More than 3 projects: show 3 by default
        setExpansionLevel(1);
      }
    }
  }, [item.isGrouped, item.projects, item.title]);

  const getVariantStyles = () => {
    switch (variant) {
      case "urgent":
        return "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50";
      case "action":
        return "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30";
      case "suggestion":
        return "border-blue-100 bg-blue-50/30 dark:border-blue-900/50 dark:bg-blue-950/20";
      case "activity":
        return "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50";
      default:
        return "";
    }
  };

  const handleAction = () => {
    if (item.action?.href) {
      router.push(item.action.href);
    } else if (item.projects && item.projects.length > 0) {
      // For grouped items, navigate to first project
      router.push(item.projects[0].href);
    }
  };

  // Grouped item with multiple projects
  if (item.isGrouped && item.projects && item.projects.length > 0) {
    const isInactiveGroup = item.title?.includes("inactive for 7+ days");
    // "Ready for a new campaign" should show 3 by default like other groups, not be collapsed
    const shouldBeCollapsed = isInactiveGroup;
    const hasMoreThanThree = item.projects.length > 3;
    
    // For inactive groups: 0 (default) -> 3 (first expand) -> all (second expand)
    // For other groups (including "Ready for a new campaign"): 3 (default) -> all (expand)
    let visibleProjects: typeof item.projects = [];
    let showExpandButton = false;
    let expandButtonText = "";
    
    if (shouldBeCollapsed) {
      if (expansionLevel === 0) {
        // Default: show 0 projects
        visibleProjects = [];
        showExpandButton = true;
        expandButtonText = ""; // Just show arrow, no text
      } else if (expansionLevel === 1) {
        // First expand: show 3 projects
        visibleProjects = item.projects.slice(0, 3);
        showExpandButton = hasMoreThanThree;
        expandButtonText = `Show ${item.projects.length - 3} more`;
      } else {
        // Fully expanded: show all
        visibleProjects = item.projects;
        showExpandButton = true;
        expandButtonText = "Show less";
      }
    } else {
      // For non-inactive groups (including "Ready for a new campaign"), show 3 by default
      visibleProjects = hasMoreThanThree && !isExpanded 
        ? item.projects.slice(0, 3) 
        : item.projects;
      showExpandButton = hasMoreThanThree;
      if (showExpandButton) {
        expandButtonText = isExpanded 
          ? "Show less"
          : `Show ${item.projects.length - 3} more`;
      }
    }
    
    const handleToggle = () => {
      if (shouldBeCollapsed) {
        if (expansionLevel === 0) {
          setExpansionLevel(1);
        } else if (expansionLevel === 1) {
          setExpansionLevel(2);
        } else {
          setExpansionLevel(0);
        }
      } else {
        setIsExpanded(!isExpanded);
      }
    };

    return (
      <CardContent 
        className={cn("p-4 transition-all hover:shadow-md rounded-lg border cursor-pointer", getVariantStyles())}
        onClick={handleToggle}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0 mt-0.5">{item.icon}</span>
          <div className="min-w-0 flex-1">
            <div className={cn(
              shouldBeCollapsed && expansionLevel === 0 ? "mb-0" : "mb-3"
            )}>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold">{item.title}</h3>
                <Badge variant="secondary" className="text-xs">
                  {item.projects.length} {item.projects.length === 1 ? 'project' : 'projects'}
                </Badge>
                {variant === "urgent" && (
                  <Badge variant="destructive" className="text-xs">Urgent</Badge>
                )}
              </div>
              {item.description && (
                <p className={cn(
                  "text-sm text-muted-foreground",
                  shouldBeCollapsed && expansionLevel === 0 ? "mb-0" : ""
                )}>{item.description}</p>
              )}
            </div>
            
            {/* Project list */}
            {visibleProjects.length > 0 && (
              <div className="space-y-2">
                {visibleProjects.map((project) => (
                  <ProjectRow 
                    key={project.projectId} 
                    project={project} 
                    variant={variant}
                  />
                ))}
              </div>
            )}
            
            {/* Show More/Less button */}
            {showExpandButton && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full text-xs pointer-events-none",
                  shouldBeCollapsed && expansionLevel === 0 ? "justify-center mt-0" : "mt-2"
                )}
              >
                {shouldBeCollapsed && expansionLevel === 2 ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show less
                  </>
                ) : shouldBeCollapsed && expansionLevel === 0 ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    {expandButtonText}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    );
  }

  // Compact single item (for suggestions/activity in collapsed state)
  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer",
          getVariantStyles()
        )}
        onClick={handleAction}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-lg flex-shrink-0">{item.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{item.title}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
            )}
          </div>
        </div>
        {item.action && (
          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </div>
    );
  }

  // Single item card - entire card is clickable
  return (
    <Card 
      className={cn(
        "transition-all hover:shadow-md cursor-pointer", 
        getVariantStyles()
      )}
      onClick={handleAction}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className="text-2xl flex-shrink-0 mt-0.5">{item.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{item.title}</h3>
                {variant === "urgent" && (
                  <Badge variant="destructive" className="text-xs">Urgent</Badge>
                )}
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
              )}
              {item.timestamp && (
                <p className="text-xs text-muted-foreground mt-1">
                  {format(item.timestamp, "h:mm a")}
                </p>
              )}
            </div>
          </div>
          {item.action && (
            <div 
              className={cn(
                "flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium",
                variant === "urgent" 
                  ? "bg-red-600 text-white" 
                  : "bg-primary text-primary-foreground"
              )}
            >
              {item.action.label}
              <ArrowRight className="w-4 h-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ProjectRowProps {
  project: TimelineProject;
  variant: "urgent" | "action" | "suggestion" | "activity";
}

function ProjectRow({ project, variant }: ProjectRowProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(project.href);
  };

  // Use dateLabel if available, otherwise fall back to day number
  const dayDisplay = project.dateLabel || (project.day ? `Day ${project.day}` : '');

  return (
    <div 
      className={cn(
        "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
        variant === "urgent" 
          ? "hover:bg-red-100 dark:hover:bg-red-900/50" 
          : variant === "action"
          ? "hover:bg-amber-100 dark:hover:bg-amber-900/50"
          : "hover:bg-gray-100 dark:hover:bg-gray-800"
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{project.projectName}</p>
          {project.campaignName && (
            <p className="text-xs text-muted-foreground truncate">
              {project.campaignName}
              {dayDisplay && ` • ${dayDisplay}`}
            </p>
          )}
          {project.stats && (
            <>
              <p className="text-xs text-gray-500 mt-0.5">
                {project.stats.campaignCount} {project.stats.campaignCount === 1 ? 'campaign' : 'campaigns'} • {project.stats.publishedPostsCount} published {project.stats.publishedPostsCount === 1 ? 'post' : 'posts'} • {project.stats.totalImpressions.toLocaleString()} impressions
              </p>
              {project.stats.recentImpressions >= 50 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  🔥 {project.projectName} got {project.stats.recentImpressions.toLocaleString()} impressions in the last 3 days
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {project.daysSinceLastPost !== null && project.daysSinceLastPost !== undefined && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {project.daysSinceLastPost === 0
              ? "Last post today"
              : project.daysSinceLastPost === 1
              ? "Last post yesterday"
              : `${project.daysSinceLastPost} days since last post`}
          </span>
        )}
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
}

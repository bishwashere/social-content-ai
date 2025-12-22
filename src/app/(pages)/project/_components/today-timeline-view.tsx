"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
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
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { useTodayItems, TimelineItem, TimelineProject } from "@/hooks/useTodayItems";
import { useFocus } from "@/providers/focus-provider";
import { useSession } from "@/backend-apis/auth/hooks";

function getGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  let timeGreeting = "Good morning";
  if (hour >= 12 && hour < 17) timeGreeting = "Good afternoon";
  else if (hour >= 17) timeGreeting = "Good evening";
  
  const firstName = name?.split(' ')[0];
  return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
}

export function TodayTimelineView() {
  const router = useRouter();
  const { data: session } = useSession();
  const { items, groupedItems, isLoading, isEmpty, hasUrgentItems } = useTodayItems();
  const { focusContext } = useFocus();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const greeting = getGreeting(session?.user?.name);
  
  // Extract trending projects (500+ recent impressions from last 3 days)
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
    
    // Look through all grouped items for projects with stats
    groupedItems.action.forEach(item => {
      if (item.isGrouped && item.projects) {
        item.projects.forEach(project => {
          if (project.stats && project.stats.recentImpressions >= 500) {
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
      }
    });
    
    // Sort by recent impressions (highest first)
    return trending.sort((a, b) => b.recentImpressions - a.recentImpressions);
  }, [groupedItems.action]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <header className="mb-2">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
            {greeting}
          </h1>
        </header>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  // If no items at all, show empty state with actions
  if (isEmpty) {
    return (
      <div className="space-y-6">
        <header className="mb-2">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
            {greeting}
          </h1>
        </header>
        
        <Card className="border-dashed border-2 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">You&apos;re all caught up! 🎉</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              No pending tasks for today. Great job staying on top of your content!
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
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
                <Link href="/project/dashboard">
                  <Calendar className="w-4 h-4 mr-2" />
                  View Calendar
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="mb-2">
        <p className="text-sm font-medium text-muted-foreground mb-1">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
          {greeting}
        </h1>
        {focusContext?.projectName && focusContext.type !== "empty" && (
          <p className="mt-2 text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Working on <span className="font-medium text-foreground">{focusContext.projectName}</span>
            {focusContext.campaignName && (
              <span className="text-muted-foreground">• {focusContext.campaignName}</span>
            )}
          </p>
        )}
      </header>

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
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {trendingProjects.map((project) => (
                      <div
                        key={project.projectId}
                        className="flex items-start justify-between gap-4 p-3 rounded-lg bg-white dark:bg-slate-900/50 hover:shadow-sm transition-all cursor-pointer border border-emerald-100 dark:border-emerald-900/50"
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
                        <ArrowRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Strike while the iron is hot — capitalize on this momentum with a new campaign
                  </p>
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
          {groupedItems.action.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Action Required
              </h2>
              {groupedItems.action.slice(0, 5).map((item) => (
                <TimelineCard key={item.id} item={item} variant="action" />
              ))}
              {groupedItems.action.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full">
                  Show {groupedItems.action.length - 5} more
                </Button>
              )}
            </div>
          )}
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
    const isReadyForNewCampaignGroup = item.title?.includes("Ready for a new campaign");
    const shouldBeCollapsed = isInactiveGroup || isReadyForNewCampaignGroup;
    const hasMoreThanThree = item.projects.length > 3;
    
    // For inactive groups and "Ready for a new campaign": 0 (default) -> 3 (first expand) -> all (second expand)
    // For other groups: 3 (default) -> all (expand)
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
      // For non-inactive groups, use original behavior
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
              {project.stats.recentImpressions >= 500 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  🔥 {project.projectName} got {project.stats.recentImpressions.toLocaleString()} impressions in the last 3 days
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </div>
  );
}

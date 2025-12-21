"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { 
  ArrowRight, 
  Calendar, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight,
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

export function TodayTimelineView() {
  const router = useRouter();
  const { items, groupedItems, isLoading, isEmpty, hasUrgentItems } = useTodayItems();
  const { focusContext } = useFocus();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Today</h1>
          <span className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")}
          </span>
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // If no items at all, show empty state with actions
  if (isEmpty) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Today</h1>
          <span className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")}
          </span>
        </div>
        
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Today</h1>
          {focusContext?.projectName && focusContext.type !== "empty" && (
            <p className="text-sm text-muted-foreground mt-1">
              Focused on: <span className="font-medium text-foreground">{focusContext.projectName}</span>
              {focusContext.campaignName && (
                <> • {focusContext.campaignName}</>
              )}
            </p>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d")}
        </span>
      </div>

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
    return (
      <Card className={cn("transition-all hover:shadow-md", getVariantStyles())}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0 mt-0.5">{item.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <h3 className="font-semibold">{item.title}</h3>
                <Badge variant="secondary" className="text-xs">
                  {item.projects.length} {item.projects.length === 1 ? 'project' : 'projects'}
                </Badge>
                {variant === "urgent" && (
                  <Badge variant="destructive" className="text-xs">Urgent</Badge>
                )}
              </div>
              
              {/* Project list */}
              <div className="space-y-2">
                {item.projects.map((project) => (
                  <ProjectRow 
                    key={project.projectId} 
                    project={project} 
                    variant={variant}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
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

  const handleClick = () => {
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
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </div>
  );
}

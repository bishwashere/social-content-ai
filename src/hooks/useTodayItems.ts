import { useMemo } from "react";
import { useGetYourToday, YourTodayTask, YourTodayProject } from "@/backend-apis/your-today/hooks";
import { useGetPendingTasks, PendingTask, PendingTaskProject } from "@/backend-apis/pending-tasks/hooks";
import { useGetRecentActivity, ActivityItem } from "@/backend-apis/recent-activity/hooks";
import { parseISO, format, addDays } from "date-fns";

export type TimelineItemType = 
  | "urgent" // Failed posts, errors
  | "action" // Needs user action now
  | "scheduled" // Upcoming scheduled post
  | "suggestion" // Stay ahead suggestions
  | "activity"; // Recent activity (completed)

// Individual project within a grouped item
export type TimelineProject = {
  projectId: string;
  projectName: string;
  campaignId?: string;
  campaignName?: string;
  day?: number;
  startDate?: string; // Campaign start date for calculating actual dates
  dateLabel?: string; // Formatted date label (e.g., "Dec 21")
  href: string;
  userRole?: string;
  stats?: {
    campaignCount: number;
    publishedPostsCount: number;
    totalImpressions: number;
    recentImpressions: number;
  };
};

// A timeline item that can contain multiple projects with the same action
export type TimelineItem = {
  id: string;
  type: TimelineItemType;
  priority: number; // Lower = higher priority (1 = most urgent)
  icon: string;
  title: string;
  description?: string;
  // Single project (for unique items like specific campaign days)
  projectId?: string;
  projectName?: string;
  campaignId?: string;
  campaignName?: string;
  day?: number;
  timestamp?: Date;
  action?: {
    label: string;
    href?: string;
  };
  userRole?: string;
  platform?: string;
  // Multiple projects (for grouped items like "ready for new campaign")
  projects?: TimelineProject[];
  isGrouped?: boolean;
  // Optional stats for trending items
  stats?: {
    recentImpressions?: number;
    totalImpressions?: number;
    campaignCount?: number;
    publishedPostsCount?: number;
  };
};

// Pattern detection for grouping similar actions
function getGroupKey(description: string | undefined, taskType: string): string | null {
  if (!description) {
    // If no description, group by task type for general campaign actions
    if (taskType === "campaigns" || taskType === "schedule_post") {
      return `${taskType}-general`;
    }
    return null;
  }
  
  // Don't group specific day items (they're unique, time-sensitive actions)
  if (description.includes("Day ") || description.includes("needs content")) {
    return null;
  }
  
  // Don't group items with specific dates mentioned
  if (/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+\b/.test(description)) {
    return null;
  }
  
  // Group "ready for a new campaign" items
  if (description.includes("ready for a new campaign") || description.includes("kickstart planning")) {
    return `${taskType}-new-campaign`;
  }
  
  // Group "no campaigns" items (first-time users)
  if (description.includes("has no campaigns")) {
    return `${taskType}-no-campaigns`;
  }
  
  // Group "ending soon" items together
  if (description.includes("ending soon") || description.includes("wrapping up")) {
    return `campaign_ending_soon-group`;
  }
  
  // Group "is doing well" items together (for trending projects)
  if (description.includes("is doing well")) {
    return `${taskType}-doing-well`;
  }
  
  // Group general campaign planning items (not tied to specific day/date)
  if (taskType === "campaigns" && !description.includes("Day ")) {
    return `campaigns-planning`;
  }
  
  // Group general schedule post items
  if (taskType === "schedule_post") {
    return `schedule_post-planning`;
  }
  
  return null;
}

function getGroupTitle(groupKey: string): string {
  if (groupKey.includes("new-campaign")) {
    return "Ready for a new campaign";
  }
  if (groupKey.includes("no-campaigns")) {
    return "No campaigns yet";
  }
  if (groupKey.includes("ending-soon")) {
    return "Campaigns ending soon";
  }
  if (groupKey.includes("doing-well")) {
    return "Projects doing well";
  }
  if (groupKey.includes("campaigns-planning")) {
    return "Plan campaigns";
  }
  if (groupKey.includes("schedule_post-planning")) {
    return "Schedule posts";
  }
  if (groupKey.includes("general")) {
    return "Plan this week";
  }
  return "Campaign actions";
}

// Helper to get dynamic action button text based on task type and context
function getActionButtonText(taskType: string, groupKey?: string | null): string {
  // For failed posts
  if (taskType === "failed_post") {
    return "Resume posting";
  }
  
  // For stuck blog news posts
  if (taskType === "stuck_blog_news") {
    return "Investigate";
  }
  
  // For campaigns ending soon
  if (taskType === "campaign_ending_soon") {
    return "Review";
  }
  
  // For campaign actions
  if (taskType === "campaigns") {
    // If it's a "no campaigns" group, it's their first time
    if (groupKey?.includes("no-campaigns")) {
      return "Create first post";
    }
    // Otherwise, they need to plan
    return "Plan this week";
  }
  
  // For schedule post actions
  if (taskType === "schedule_post") {
    return "Plan this week";
  }
  
  // Default
  return "Take action";
}

// Helper to calculate actual date label from campaign start date and day number
function getDateLabel(startDate: string | undefined, day: number | undefined): string | undefined {
  if (!startDate || !day) return undefined;
  try {
    const start = parseISO(startDate);
    const actualDate = addDays(start, day - 1); // day 1 is start date
    return format(actualDate, "MMM d"); // e.g., "Dec 21"
  } catch {
    return undefined;
  }
}

export function useTodayItems() {
  const { data: yourTodayTasks = [], isLoading: yourTodayLoading } = useGetYourToday();
  const { data: pendingTasks = [], isLoading: pendingLoading } = useGetPendingTasks();
  const { data: recentActivity = [], isLoading: activityLoading } = useGetRecentActivity();

  const isLoading = yourTodayLoading || pendingLoading || activityLoading;

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    const groupedMap = new Map<string, TimelineItem>();

    // Process YourToday tasks (urgent items and campaigns)
    yourTodayTasks.forEach((task) => {
      task.projects.forEach((project, index) => {
        // Include projects that need action OR have stats (for trending projects)
        // Stats indicate the project is active and may be trending
        if (!project.needsAction && task.type !== "failed_post" && !project.stats) {
          return;
        }

        const itemType: TimelineItemType = 
          task.type === "failed_post" ? "urgent" :
          task.type === "campaign_ending_soon" ? "urgent" :
          task.type === "stuck_blog_news" ? "urgent" :
          "action";

        const priority = 
          task.type === "failed_post" ? 1 :
          task.type === "stuck_blog_news" ? 1.5 : // High priority - stuck posts need attention
          task.type === "campaign_ending_soon" ? 2 :
          task.type === "campaigns" ? 3 :
          4;

        const groupKey = getGroupKey(project.description, task.type);
        const href = `/project/${project.projectId}?tab=campaign`;

        // If this can be grouped, add to group
        if (groupKey) {
          const dateLabel = getDateLabel(project.startDate, project.day);
          const existingGroup = groupedMap.get(groupKey);
          const isInactive7PlusDays = project.description?.includes("inactive for 7+ days") || false;
          
          if (existingGroup) {
            // Add to existing group
            existingGroup.projects?.push({
              projectId: project.projectId,
              projectName: project.projectName,
              campaignId: project.campaignId,
              campaignName: project.campaignName,
              day: project.day,
              startDate: project.startDate,
              dateLabel,
              href,
              userRole: project.userRole,
              stats: project.stats,
            });
            
            // Update title if this is an "inactive 7+ days" group
            if (isInactive7PlusDays && existingGroup.projects) {
              const projectCount = existingGroup.projects.length;
              const projectNames = existingGroup.projects.map(p => p.projectName).join(", ");
              existingGroup.title = `${projectCount} project${projectCount > 1 ? 's' : ''} inactive for 7+ days → Restart posting`;
              existingGroup.description = projectNames;
            }
          } else {
            // Create new group
            const groupTitle = isInactive7PlusDays 
              ? `1 project inactive for 7+ days → Restart posting`
              : getGroupTitle(groupKey);
            
            groupedMap.set(groupKey, {
              id: `group-${groupKey}`,
              type: itemType,
              priority,
              icon: task.icon,
              title: groupTitle,
              description: isInactive7PlusDays ? project.projectName : undefined,
              isGrouped: true,
              projects: [{
                projectId: project.projectId,
                projectName: project.projectName,
                campaignId: project.campaignId,
                campaignName: project.campaignName,
                day: project.day,
                startDate: project.startDate,
                dateLabel,
                href,
                userRole: project.userRole,
                stats: project.stats,
              }],
              action: {
                label: getActionButtonText(task.type, groupKey),
              },
            });
          }
        } else {
          // Individual item (specific campaign day, etc.)
          const itemTitle = project.description || task.title;
          
          // Calculate actual date label if start date is available
          const dateLabel = getDateLabel(project.startDate, project.day);
          const dayDisplay = dateLabel || (project.day ? `Day ${project.day}` : '');
          
          const itemDescription = project.campaignName 
            ? `${project.projectName} • ${project.campaignName}${dayDisplay ? ` • ${dayDisplay}` : ''}`
            : project.projectName;

          // For individual items, if they have stats, we should group them so they can appear in trending
          // Check if this project has stats and should be grouped for trending
          if (project.stats && project.stats.recentImpressions >= 50) {
            // Group projects with stats together so they can be found in trending
            const statsGroupKey = `${task.type}-trending`;
            const existingStatsGroup = groupedMap.get(statsGroupKey);
            
            if (existingStatsGroup) {
              // Add to existing stats group
              existingStatsGroup.projects?.push({
                projectId: project.projectId,
                projectName: project.projectName,
                campaignId: project.campaignId,
                campaignName: project.campaignName,
                day: project.day,
                startDate: project.startDate,
                dateLabel,
                href,
                userRole: project.userRole,
                stats: project.stats,
              });
            } else {
              // Create new stats group
              groupedMap.set(statsGroupKey, {
                id: `group-${statsGroupKey}`,
                type: itemType,
                priority,
                icon: task.icon,
                title: task.title,
                description: undefined,
                isGrouped: true,
                projects: [{
                  projectId: project.projectId,
                  projectName: project.projectName,
                  campaignId: project.campaignId,
                  campaignName: project.campaignName,
                  day: project.day,
                  startDate: project.startDate,
                  dateLabel,
                  href,
                  userRole: project.userRole,
                  stats: project.stats,
                }],
                action: {
                  label: getActionButtonText(task.type),
                },
              });
            }
          } else {
            // No stats or below threshold, add as individual item
            items.push({
              id: `today-${task.type}-${project.projectId}-${index}`,
              type: itemType,
              priority,
              icon: task.icon,
              title: itemTitle,
              description: itemDescription,
              projectId: project.projectId,
              projectName: project.projectName,
              campaignId: project.campaignId,
              campaignName: project.campaignName,
              day: project.day,
              userRole: project.userRole,
              action: {
                label: getActionButtonText(task.type),
                href,
              },
            });
          }
        }
      });
    });

    // Add grouped items to the list
    groupedMap.forEach((groupedItem) => {
      items.push(groupedItem);
    });

    // Process Pending Tasks (suggestions) - these are always grouped by task type
    const pendingGroupMap = new Map<string, TimelineItem>();
    
    pendingTasks.forEach((task) => {
      task.projects.forEach((project) => {
        const groupKey = `pending-${task.type}`;
        const href = getActionHref(task.action, project.projectId);
        
        const existingGroup = pendingGroupMap.get(groupKey);
        if (existingGroup) {
          existingGroup.projects?.push({
            projectId: project.projectId,
            projectName: project.projectName,
            campaignId: project.campaignId,
            campaignName: project.campaignName,
            href,
            userRole: project.userRole,
          });
        } else {
          pendingGroupMap.set(groupKey, {
            id: groupKey,
            type: "suggestion",
            priority: 10,
            icon: task.icon,
            title: task.title,
            isGrouped: true,
            projects: [{
              projectId: project.projectId,
              projectName: project.projectName,
              campaignId: project.campaignId,
              campaignName: project.campaignName,
              href,
              userRole: project.userRole,
            }],
            action: {
              label: getPendingActionButtonText(task.action),
            },
          });
        }
      });
    });

    // Add pending groups to items
    pendingGroupMap.forEach((groupedItem) => {
      items.push(groupedItem);
    });

    // Process Recent Activity (completed items) - not grouped
    recentActivity.slice(0, 5).forEach((activity, index) => {
      const timestamp = activity.timestamp ? parseISO(activity.timestamp) : undefined;
      
      items.push({
        id: `activity-${activity.type}-${activity.projectId}-${index}`,
        type: "activity",
        priority: 20,
        icon: activity.icon,
        title: activity.message,
        projectId: activity.projectId,
        projectName: activity.projectName,
        campaignId: activity.campaignId,
        day: activity.day,
        timestamp,
        platform: activity.platform,
      });
    });

    // Sort by priority (lower number = higher priority)
    items.sort((a, b) => a.priority - b.priority);

    return items;
  }, [yourTodayTasks, pendingTasks, recentActivity]);

  // Group items by type for easier rendering
  const groupedItems = useMemo(() => {
    return {
      urgent: timelineItems.filter(i => i.type === "urgent"),
      action: timelineItems.filter(i => i.type === "action"),
      scheduled: timelineItems.filter(i => i.type === "scheduled"),
      suggestions: timelineItems.filter(i => i.type === "suggestion"),
      activity: timelineItems.filter(i => i.type === "activity"),
    };
  }, [timelineItems]);

  // Get only actionable items (not activity/suggestions)
  const actionableItems = useMemo(() => {
    return timelineItems.filter(i => i.type === "urgent" || i.type === "action" || i.type === "scheduled");
  }, [timelineItems]);

  return {
    items: timelineItems,
    groupedItems,
    actionableItems,
    isLoading,
    hasUrgentItems: groupedItems.urgent.length > 0,
    hasActionItems: groupedItems.action.length > 0,
    isEmpty: timelineItems.length === 0,
  };
}

// Helper to get action button text for pending tasks
function getPendingActionButtonText(action: string): string {
  switch (action) {
    case "generate_weekly_plan":
      return "Plan this week";
    case "manage_campaign":
      return "Plan this week";
    case "create_mini_campaign":
      return "Create first post";
    case "assign_templates":
      return "Set up templates";
    default:
      return "Plan ahead";
  }
}

function getActionHref(action: string, projectId?: string): string {
  switch (action) {
    case "generate_weekly_plan":
    case "manage_campaign":
    case "create_mini_campaign":
      return projectId ? `/project/${projectId}?tab=campaign` : "/project";
    case "assign_templates":
      return "/project/templates";
    default:
      return projectId ? `/project/${projectId}` : "/project";
  }
}



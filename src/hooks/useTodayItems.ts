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
};

// Pattern detection for grouping similar actions
function getGroupKey(description: string | undefined, taskType: string): string | null {
  if (!description) return null;
  
  // Group "ready for a new campaign" items
  if (description.includes("ready for a new campaign") || description.includes("kickstart planning")) {
    return `${taskType}-new-campaign`;
  }
  
  // Group "no campaigns" items  
  if (description.includes("has no campaigns")) {
    return `${taskType}-no-campaigns`;
  }
  
  // Don't group specific day items (they're unique actions)
  if (description.includes("Day ") || description.includes("needs content")) {
    return null;
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
  return "Campaign actions";
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
        // Only include projects that need action
        if (!project.needsAction && task.type !== "failed_post") {
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
            });
          } else {
            // Create new group
            groupedMap.set(groupKey, {
              id: `group-${groupKey}`,
              type: itemType,
              priority,
              icon: task.icon,
              title: getGroupTitle(groupKey),
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
              }],
              action: {
                label: task.type === "failed_post" ? "Fix Now" : 
                       task.type === "stuck_blog_news" ? "Investigate" :
                       task.type === "campaign_ending_soon" ? "Review" :
                       "Take Action",
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
              label: task.type === "failed_post" ? "Fix Now" : 
                     task.type === "stuck_blog_news" ? "Investigate" :
                     task.type === "campaign_ending_soon" ? "Review" :
                     "Take Action",
              href,
            },
          });
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
              label: "Plan Ahead",
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



"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetYourToday, YourTodayTask } from "@/backend-apis/your-today/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { Achievements } from "@/backend-apis/achievements/hooks";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";

interface YourTodayPanelProps {
  achievements?: Achievements | null;
}

function buildGrowthTasksFromAchievements(
  achievements: Achievements | null | undefined,
  projects: { data?: Array<{ id: string }> | null } | null
): YourTodayTask[] {
  const items: YourTodayTask[] = [];
  const c = achievements?.projectsWithCampaigns ?? 0;
  const s = achievements?.projectsWithScheduledPosts ?? 0;
  const v = achievements?.projectsWithVideos ?? 0;

  const firstProjectId = projects?.data?.[0]?.id;

  if (c === 0) {
    items.push({
      type: "campaigns",
      icon: "🎯",
      title: "Start your first campaign",
      action: "manage_campaigns",
      projects: [
        {
          projectId: firstProjectId || "",
          projectName: "",
          description: "Create a campaign to unlock your first campaign achievement.",
          needsAction: true,
        },
      ],
    });
  }

  if (s === 0) {
    items.push({
      type: "schedule_post",
      icon: "🚀",
      title: "Schedule your first post",
      action: "schedule_post",
      projects: [
        {
          projectId: firstProjectId || "",
          projectName: "",
          description: "Stay consistent by scheduling at least one post for this week.",
          needsAction: true,
        },
      ],
    });
  }

  if (v === 0) {
    items.push({
      type: "campaigns",
      icon: "🎬",
      title: "Try your first video",
      action: "open_project_videos",
      projects: [
        {
          projectId: firstProjectId || "",
          projectName: "",
          description: "Experiment with a video post to boost engagement.",
          needsAction: true,
        },
      ],
    });
  }

  return items.slice(0, 3);
}

export function YourTodayPanel({ achievements }: YourTodayPanelProps) {
  const router = useRouter();
  const { data: tasks = [], isLoading, error } = useGetYourToday();
  const projects = useGetAllProjects();
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const hasInitializedExpansion = useRef(false);

  // Build growth tasks if no real tasks exist
  const growthTasks = useMemo(() => {
    if (tasks.length === 0 && achievements) {
      return buildGrowthTasksFromAchievements(achievements, projects);
    }
    return [];
  }, [tasks.length, achievements, projects]);

  // Prioritize: urgent tasks first, then growth suggestions, then informational states
  // Cap to maximum 3 items
  const tasksToRender = useMemo(() => {
    const allTasks = tasks.length > 0 ? tasks : growthTasks;
    // Sort by priority: urgent first (failed_post, campaign_ending_soon), then others
    const sorted = [...allTasks].sort((a, b) => {
      const priorityOrder: Record<string, number> = {
        failed_post: 1,
        campaign_ending_soon: 2,
        campaigns: 3,
        schedule_post: 4,
      };
      const aPriority = priorityOrder[a.type] || 5;
      const bPriority = priorityOrder[b.type] || 5;
      return aPriority - bPriority;
    });
    return sorted.slice(0, 3);
  }, [tasks, growthTasks]);

  // Auto-expand all tasks when there are 2 or fewer items (only on initial load or when count changes)
  useEffect(() => {
    const taskCount = tasksToRender.length;
    const taskTypesKey = tasksToRender.map(t => t.type).join(',');
    
    // Reset initialization if task count or types change significantly
    if (hasInitializedExpansion.current && (taskCount > 2 || taskCount === 0)) {
      hasInitializedExpansion.current = false;
    }
    
    // Auto-expand if 2 or fewer items and not yet initialized
    if (!hasInitializedExpansion.current && taskCount > 0 && taskCount <= 2) {
      const allTaskTypes = new Set<string>(tasksToRender.map(task => task.type));
      // Also include special campaign expansion keys
      tasksToRender.forEach(task => {
        if (task.type === "campaigns") {
          allTaskTypes.add("campaigns_no_campaigns");
        }
      });
      setExpandedTasks(allTaskTypes);
      hasInitializedExpansion.current = true;
    }
  }, [tasksToRender]);

  const getActionButtonText = (task: YourTodayTask, project?: typeof task.projects[0]): string => {
    // Check if this is the user's first time (based on achievements)
    const hasNoCampaigns = achievements?.projectsWithCampaigns === 0;
    const hasNoPosts = achievements?.projectsWithScheduledPosts === 0;
    
    switch (task.action) {
      case "view_failed_posts":
        return "Resume posting";
      case "manage_campaigns":
        // If user has never created a campaign, show "Create first post"
        if (hasNoCampaigns) {
          return "Create first post";
        }
        return "Plan this week";
      case "schedule_post":
        // If user has never scheduled, show "Create first post"
        if (hasNoPosts) {
          return "Create first post";
        }
        return "Plan this week";
      case "open_project_videos":
        return "Create video";
      default:
        return "Take action";
    }
  };

  const handleTaskAction = (task: YourTodayTask, project?: typeof task.projects[0]) => {
    const projectId = project?.projectId || task.projects[0]?.projectId;
    
    switch (task.action) {
      case "view_failed_posts":
        if (projectId) {
          router.push(`/project/${projectId}?tab=scheduled`);
        }
        break;
      case "manage_campaigns":
        if (projectId) {
          router.push(`/project/${projectId}?tab=campaign`);
        } else if (projects.data && projects.data.length > 0) {
          router.push(`/project/${projects.data[0].id}?tab=campaign`);
        } else {
          router.push("/project");
        }
        break;
      case "schedule_post":
        if (projectId) {
          router.push(`/project/${projectId}?tab=scheduled`);
        } else if (projects.data && projects.data.length > 0) {
          router.push(`/project/${projects.data[0].id}?tab=scheduled`);
        } else {
          router.push("/project");
        }
        break;
      case "open_project_videos":
        router.push("/project/my-videos");
        break;
    }
  };

  const toggleTaskExpansion = (taskType: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskType)) {
        newSet.delete(taskType);
      } else {
        newSet.add(taskType);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold mb-4">Your Today</h2>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold mb-4">Your Today</h2>
        <Card>
          <CardHeader>
            <CardTitle>Unable to load your today items</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "An error occurred"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (tasksToRender.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold mb-4">Your Today</h2>
        <Card>
          <CardHeader>
            <CardTitle>All caught up! 🎉</CardTitle>
            <CardDescription>
              You don&apos;t have any urgent tasks right now. Everything looks good!
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <h2 className="text-2xl font-bold mb-4">Your Today</h2>
      <div className="grid gap-4">
        {tasksToRender.map((task, index) => {
          const isExpanded = expandedTasks.has(task.type);
          const isSchedulePost = task.type === "schedule_post";
          const isCampaigns = task.type === "campaigns";
          
          // Split campaigns into projects without campaigns and projects with campaigns
          if (isCampaigns) {
            const projectsWithoutCampaigns = task.projects.filter(
              project => project.description?.includes("ready for a new campaign") || project.description?.includes("has no campaigns")
            );
            // Only show projects with campaigns that need action (exclude "all up to date" and "no active chats")
            const projectsWithCampaigns = task.projects.filter(
              project => 
                !project.description?.includes("ready for a new campaign") &&
                !project.description?.includes("has no campaigns") &&
                project.needsAction === true &&
                !project.description?.includes("all up to date") &&
                !project.description?.includes("no active chats")
            );
            
            const isNoCampaignsExpanded = expandedTasks.has("campaigns_no_campaigns");
            
            return (
              <div key={index} className="space-y-4">
                {/* Projects without campaigns - collapsed card */}
                {projectsWithoutCampaigns.length > 0 && (
                  <>
                    {!isNoCampaignsExpanded ? (
                      <div
                        onClick={() => toggleTaskExpansion("campaigns_no_campaigns")}
                        className="cursor-pointer rounded-lg border border-gray-200 p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{task.icon}</span>
                            <span className="text-base font-medium">
                              {projectsWithoutCampaigns.length} {projectsWithoutCampaigns.length === 1 ? 'project is' : 'projects are'} ready for a new campaign — kickstart planning
                            </span>
                          </div>
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        </div>
                      </div>
                    ) : (
                      <Card className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <span className="text-2xl">{task.icon}</span>
                            Campaigns ready to start
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {projectsWithoutCampaigns.map((project, projectIndex) => {
                            // Debug: Log project data
                            if (projectIndex === 0) {
                              console.log("🔍 Project data:", project);
                              console.log("🔍 Project stats:", project.stats);
                            }
                            
                            return (
                            <div key={projectIndex} className="flex items-center justify-between gap-4 pb-3 border-b last:border-0 last:pb-0">
                              <div className="flex-1 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  {project.needsAction === false && (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                  )}
                                  <CardDescription>
                                    {project.description?.replace(/^Project\s+"/, '"').replace(/\s+•\s+Project:/, '') || (project.projectName ? `"${project.projectName}"` : '')}
                                  </CardDescription>
                                </div>
                                {project.stats !== undefined ? (
                                  <>
                                    <div className="text-xs text-gray-500 ml-7">
                                      {project.stats.campaignCount} {project.stats.campaignCount === 1 ? 'campaign' : 'campaigns'} • {project.stats.publishedPostsCount} published {project.stats.publishedPostsCount === 1 ? 'post' : 'posts'} • {project.stats.totalImpressions.toLocaleString()} impressions
                                    </div>
                                    {project.stats.recentImpressions >= 50 && (
                                      <div className="text-xs text-emerald-600 dark:text-emerald-400 ml-7 mt-1 font-medium">
                                        🔥 {project.projectName} got {project.stats.recentImpressions.toLocaleString()} impressions in the last 3 days
                                      </div>
                                    )}
                                  </>
                                ) : null}
                              </div>
                              {project.needsAction !== false && (
                                <Button
                                  onClick={() => handleTaskAction(task, project)}
                                  variant="outline"
                                  size="sm"
                                  className="flex-shrink-0"
                                >
                                  {getActionButtonText(task, project)}
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            );
                          })}
                          <Button
                            onClick={() => toggleTaskExpansion("campaigns_no_campaigns")}
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2"
                          >
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Show Less
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
                
                {/* Projects with campaigns - regular card */}
                {projectsWithCampaigns.length > 0 && (
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <span className="text-2xl">{task.icon}</span>
                        {task.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {projectsWithCampaigns.map((project, projectIndex) => (
                        <div key={projectIndex} className="flex items-center justify-between gap-4 pb-3 border-b last:border-0 last:pb-0">
                          <div className="flex-1 flex items-center gap-2">
                            {project.needsAction === false && (
                              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                            )}
                            <CardDescription>
                              {project.description?.replace(/^Project\s+"/, '"').replace(/\s+•\s+Project:/, '') || (project.projectName ? `"${project.projectName}"` : '')}
                            </CardDescription>
                          </div>
                          {project.needsAction !== false && (
                            <Button
                              onClick={() => handleTaskAction(task, project)}
                              variant="outline"
                              size="sm"
                              className="flex-shrink-0"
                            >
                              {getActionButtonText(task, project)}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          }
          
          // For schedule_post, show special structure
          if (isSchedulePost) {
            const hasMoreThanTwo = task.projects.length > 2;
            const visibleProjects = hasMoreThanTwo && !isExpanded 
              ? task.projects.slice(0, 2) 
              : task.projects;

            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="text-2xl">{task.icon}</span>
                    Schedule posts for today
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Projects that can improve consistency:
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {visibleProjects.map((project, projectIndex) => {
                      const projectName = project.projectName || project.description?.match(/"([^"]+)"/)?.[1] || 'Unknown Project';
                      const projectId = project.projectId;
                      
                      return (
                        <Button
                          key={projectIndex}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (projectId) {
                              router.push(`/project/${projectId}?tab=scheduled`);
                            } else if (projects.data && projects.data.length > 0) {
                              router.push(`/project/${projects.data[0].id}?tab=scheduled`);
                            }
                          }}
                          className="whitespace-nowrap hover:bg-primary/5 hover:border-primary/20 transition-colors"
                        >
                          <span className="font-medium">{projectName}</span>
                          {/* Future: Add badges here for status like "• 0 scheduled", "• last scheduled 8 days ago", "• content ready" */}
                        </Button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Schedule posts to keep your momentum.
                  </p>
                  {hasMoreThanTwo && (
                    <Button
                      onClick={() => toggleTaskExpansion(task.type)}
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Show More
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          }

          // Show full card for other task types
          const hasMoreThanTwo = task.projects.length > 2;
          const visibleProjects = hasMoreThanTwo && !isExpanded 
            ? task.projects.slice(0, 2) 
            : task.projects;

          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="text-2xl">{task.icon}</span>
                  {task.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {visibleProjects.map((project, projectIndex) => (
                  <div key={projectIndex} className="flex items-center justify-between gap-4 pb-3 border-b last:border-0 last:pb-0">
                    <div className="flex-1 flex items-center gap-2">
                      {project.needsAction === false && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      )}
                      <CardDescription>
                        {project.description?.replace(/^Project\s+"/, '"').replace(/\s+•\s+Project:/, '') || (project.projectName ? `"${project.projectName}"` : '')}
                      </CardDescription>
                    </div>
                    {project.needsAction !== false && (
                      <Button
                        onClick={() => handleTaskAction(task, project)}
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0"
                      >
                        {getActionButtonText(task, project)}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {hasMoreThanTwo && (
                  <Button
                    onClick={() => toggleTaskExpansion(task.type)}
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show {task.projects.length - 2} More
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


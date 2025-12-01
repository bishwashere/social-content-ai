"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetYourToday } from "@/backend-apis/your-today/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

export function YourTodayPanel() {
  const router = useRouter();
  const { data: tasks = [], isLoading, error } = useGetYourToday();
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const handleTaskAction = (task: typeof tasks[0], project?: typeof task.projects[0]) => {
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
        }
        break;
      case "schedule_post":
        if (projectId) {
          router.push(`/project/${projectId}?tab=scheduled`);
        } else {
          router.push("/project");
        }
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

  if (tasks.length === 0) {
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
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold mb-4">Your Today</h2>
      <div className="grid gap-4">
        {tasks.map((task, index) => {
          const isExpanded = expandedTasks.has(task.type);
          const isSchedulePost = task.type === "schedule_post";
          const isCampaigns = task.type === "campaigns";
          
          // Split campaigns into projects without campaigns and projects with campaigns
          if (isCampaigns) {
            const projectsWithoutCampaigns = task.projects.filter(
              project => project.description?.includes("has no campaigns")
            );
            // Only show projects with campaigns that need action (exclude "all up to date" and "no active chats")
            const projectsWithCampaigns = task.projects.filter(
              project => 
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
                              {projectsWithoutCampaigns.length} {projectsWithoutCampaigns.length === 1 ? 'project does' : 'projects do'} not have campaigns
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
                            Campaigns
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {projectsWithoutCampaigns.map((project, projectIndex) => (
                            <div key={projectIndex} className="flex items-center justify-between gap-4 pb-3 border-b last:border-0 last:pb-0">
                              <div className="flex-1 flex items-center gap-2">
                                {project.needsAction === false && (
                                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                )}
                                <CardDescription>
                                  {project.description || `Project "${project.projectName}"`}
                                  {project.projectName && !project.description && ` • Project: ${project.projectName}`}
                                </CardDescription>
                              </div>
                              {project.needsAction !== false && (
                                <Button
                                  onClick={() => handleTaskAction(task, project)}
                                  variant="outline"
                                  size="sm"
                                  className="flex-shrink-0"
                                >
                                  Take Action
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            onClick={() => toggleTaskExpansion("campaigns_no_campaigns")}
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2"
                          >
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Collapse
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
                              {project.description || `Project "${project.projectName}"`}
                              {project.projectName && !project.description && ` • Project: ${project.projectName}`}
                            </CardDescription>
                          </div>
                          {project.needsAction !== false && (
                            <Button
                              onClick={() => handleTaskAction(task, project)}
                              variant="outline"
                              size="sm"
                              className="flex-shrink-0"
                            >
                              Take Action
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
          
          // For schedule_post, show collapsed single line if not expanded
          if (isSchedulePost && !isExpanded) {
            const projectCount = task.projects.length;
            return (
              <div
                key={index}
                onClick={() => toggleTaskExpansion(task.type)}
                className="cursor-pointer rounded-lg border border-gray-200 p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{task.icon}</span>
                    <span className="text-base font-medium">
                      {projectCount} {projectCount === 1 ? 'project does' : 'projects do'} not have anything scheduled
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
              </div>
            );
          }

          // Show full card for expanded schedule_post or other task types
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
                        {project.description || `Project "${project.projectName}"`}
                        {project.projectName && !project.description && ` • Project: ${project.projectName}`}
                      </CardDescription>
                    </div>
                    {project.needsAction !== false && (
                      <Button
                        onClick={() => handleTaskAction(task, project)}
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0"
                      >
                        Take Action
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
                {isSchedulePost && isExpanded && (
                  <Button
                    onClick={() => toggleTaskExpansion(task.type)}
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                  >
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Collapse
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


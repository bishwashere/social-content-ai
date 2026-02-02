"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetPendingTasks } from "@/backend-apis/pending-tasks/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export function PendingTasksPanel() {
  const router = useRouter();
  const { data: tasks = [], isLoading, error } = useGetPendingTasks();
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const getActionButtonText = (action: string): string => {
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
        return "Take action";
    }
  };

  const handleTaskAction = (task: typeof tasks[0], project?: typeof task.projects[0]) => {
    const projectId = project?.projectId || task.projects[0]?.projectId;
    const userRole = project?.userRole || task.projects[0]?.userRole;
    
    // Check if user has admin access
    const isAdmin = userRole === "admin";
    
    if (!isAdmin) {
      toast.error("You don't have permission to perform this action. Only project admins can take actions.");
      return;
    }
    
    switch (task.action) {
      case "generate_weekly_plan":
        if (projectId) {
          router.push(`/project/${projectId}?tab=campaign`);
        }
        break;
      case "manage_campaign":
        if (projectId) {
          router.push(`/project/${projectId}?tab=campaign`);
        }
        break;
      case "create_mini_campaign":
        if (projectId) {
          router.push(`/project/${projectId}?tab=campaign`);
        }
        break;
      case "assign_templates":
        router.push("/dashboard/templates");
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
        <div className="mb-4">
          <h2 className="text-2xl font-bold">Stay Ahead</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Suggestions to help you plan upcoming content.
          </p>
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">Stay Ahead</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Suggestions to help you plan upcoming content.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Unable to load pending tasks</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "An error occurred"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (tasks.length === 0) {
    return null; // Don't show section if no tasks
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Stay Ahead</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Suggestions to keep your content pipeline full.
        </p>
      </div>
      <div className="grid gap-4">
        {tasks.map((task, index) => {
          const isExpanded = expandedTasks.has(task.type);
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
                {visibleProjects.map((project, projectIndex) => {
                  const daysSinceLastPost = project.daysSinceLastPost;
                  const daysText = daysSinceLastPost !== null && daysSinceLastPost !== undefined
                    ? daysSinceLastPost === 0
                      ? "Last post today"
                      : daysSinceLastPost === 1
                      ? "Last post yesterday"
                      : `${daysSinceLastPost} days since last post`
                    : null;

                  return (
                    <div key={projectIndex} className="flex items-center justify-between gap-4 pb-3 border-b last:border-0 last:pb-0">
                      <div className="flex-1">
                        <CardDescription>
                          {project.description?.replace(/\s+•\s+Project:.*$/, '') || (project.projectName ? `"${project.projectName}"` : '')}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        {daysText && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {daysText}
                          </span>
                        )}
                        <Button
                          onClick={() => handleTaskAction(task, project)}
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                        >
                          {getActionButtonText(task.action)}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
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


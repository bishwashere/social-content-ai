"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { useGetYourToday, YourTodayTask } from "@/backend-apis/your-today/hooks";
import { useGetPendingTasks, PendingTask } from "@/backend-apis/pending-tasks/hooks";
import { ProjectWithChats } from "@/backend-apis/projects/types";

export type FocusType = 
  | "urgent" // Failed posts, campaign ending soon
  | "campaign" // Active campaign needs action
  | "project" // Default project context
  | "empty"; // No focus (new user or no projects)

export type FocusContext = {
  type: FocusType;
  projectId?: string;
  projectName?: string;
  campaignId?: string;
  campaignName?: string;
  urgentReason?: string;
  day?: number;
};

type FocusProviderContextType = {
  focusContext: FocusContext | null;
  setFocusContext: (context: FocusContext | null) => void;
  clearFocus: () => void;
  urgentItems: YourTodayTask[];
  needsAttentionProjects: Array<{
    projectId: string;
    projectName: string;
    reason: string;
    type: "failed_post" | "campaign_ending_soon" | "stuck_blog_news" | "needs_review";
  }>;
  isLoading: boolean;
};

const FocusProviderContext = createContext<FocusProviderContextType | null>(null);

export function useFocus() {
  const context = useContext(FocusProviderContext);
  if (!context) {
    throw new Error("useFocus must be used within a FocusProvider");
  }
  return context;
}

interface FocusProviderProps {
  children: React.ReactNode;
}

export function FocusProvider({ children }: FocusProviderProps) {
  const { data: projects, isLoading: projectsLoading } = useGetAllProjects();
  const { data: yourTodayTasks, isLoading: yourTodayLoading } = useGetYourToday();
  const { data: pendingTasks, isLoading: pendingLoading } = useGetPendingTasks();
  
  const [focusContext, setFocusContext] = useState<FocusContext | null>(null);
  const [hasAutoFocused, setHasAutoFocused] = useState(false);

  const isLoading = projectsLoading || yourTodayLoading || pendingLoading;

  // Identify urgent items (failed posts, stuck blog news, campaigns ending soon)
  const urgentItems = useMemo(() => {
    if (!yourTodayTasks) return [];
    return yourTodayTasks.filter(
      task => task.type === "failed_post" || task.type === "campaign_ending_soon" || task.type === "stuck_blog_news"
    );
  }, [yourTodayTasks]);

  // Identify projects that need attention
  const needsAttentionProjects = useMemo(() => {
    const attention: Array<{
      projectId: string;
      projectName: string;
      reason: string;
      type: "failed_post" | "campaign_ending_soon" | "stuck_blog_news" | "needs_review";
    }> = [];

    // Add from urgent items
    urgentItems.forEach(task => {
      task.projects.forEach(project => {
        if (project.needsAction) {
          attention.push({
            projectId: project.projectId,
            projectName: project.projectName,
            reason: task.title,
            type: task.type as "failed_post" | "campaign_ending_soon" | "stuck_blog_news",
          });
        }
      });
    });

    // Add campaigns that need review today
    if (yourTodayTasks) {
      const campaignTasks = yourTodayTasks.filter(t => t.type === "campaigns");
      campaignTasks.forEach(task => {
        task.projects.forEach(project => {
          if (project.needsAction && !attention.some(a => a.projectId === project.projectId)) {
            attention.push({
              projectId: project.projectId,
              projectName: project.projectName,
              reason: project.description || "Campaign needs attention",
              type: "needs_review",
            });
          }
        });
      });
    }

    return attention;
  }, [urgentItems, yourTodayTasks]);

  // Auto-detect focus based on priority
  const detectFocus = useCallback((): FocusContext | null => {
    if (!projects || projects.length === 0) {
      return { type: "empty" };
    }

    // Priority 1: Urgent items (failed posts)
    if (urgentItems.length > 0) {
      const urgentTask = urgentItems[0];
      const urgentProject = urgentTask.projects[0];
      if (urgentProject) {
        return {
          type: "urgent",
          projectId: urgentProject.projectId,
          projectName: urgentProject.projectName,
          campaignId: urgentProject.campaignId,
          campaignName: urgentProject.campaignName,
          urgentReason: urgentTask.title,
          day: urgentProject.day,
        };
      }
    }

    // Priority 2: Active campaign that needs action today
    if (yourTodayTasks) {
      const campaignTask = yourTodayTasks.find(t => t.type === "campaigns");
      if (campaignTask) {
        const activeProject = campaignTask.projects.find(p => p.needsAction);
        if (activeProject) {
          return {
            type: "campaign",
            projectId: activeProject.projectId,
            projectName: activeProject.projectName,
            campaignId: activeProject.campaignId,
            campaignName: activeProject.campaignName,
            day: activeProject.day,
          };
        }
      }
    }

    // Priority 3: Most recently updated project
    const sortedProjects = [...projects].sort((a, b) => {
      const aDate = new Date(a.updatedAt || a.createdAt);
      const bDate = new Date(b.updatedAt || b.createdAt);
      return bDate.getTime() - aDate.getTime();
    });

    if (sortedProjects[0]) {
      return {
        type: "project",
        projectId: sortedProjects[0].id,
        projectName: sortedProjects[0].name,
      };
    }

    return { type: "empty" };
  }, [projects, urgentItems, yourTodayTasks]);

  // Auto-focus on first load
  useEffect(() => {
    if (!isLoading && !hasAutoFocused) {
      const autoFocus = detectFocus();
      if (autoFocus) {
        setFocusContext(autoFocus);
      }
      setHasAutoFocused(true);
    }
  }, [isLoading, hasAutoFocused, detectFocus]);

  const clearFocus = useCallback(() => {
    setFocusContext(null);
    setHasAutoFocused(false);
  }, []);

  const value: FocusProviderContextType = {
    focusContext,
    setFocusContext,
    clearFocus,
    urgentItems,
    needsAttentionProjects,
    isLoading,
  };

  return (
    <FocusProviderContext.Provider value={value}>
      {children}
    </FocusProviderContext.Provider>
  );
}


"use client";

import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Folder,
  Calendar,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useGetAllProjects, useGetAllScheduledPosts } from "@/backend-apis/projects/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { AddProjectButton } from "./add-project-button";
import { PLATFORM_ICONS, PLATFORM_IDS, ALL_PLATFORM_IDS, type PlatformId } from "@/constants/platforms";

function getPlatformIconUrl(platform: string): string | null {
  const key = platform.toLowerCase();
  const mapped = key === "twitter" ? PLATFORM_IDS.X : key;
  if (ALL_PLATFORM_IDS.includes(mapped as PlatformId)) {
    return PLATFORM_ICONS[mapped as PlatformId];
  }
  return null;
}

function ProjectHealth({ hasConnectedPlatforms, scheduledCount }: { hasConnectedPlatforms: boolean; scheduledCount: number }) {
  if (!hasConnectedPlatforms) {
    return (
      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-xs font-medium">Setup needed</span>
      </div>
    );
  }
  if (scheduledCount > 0) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-xs font-medium">Active</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
      <Activity className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="text-xs font-medium">Connected</span>
    </div>
  );
}

export function AllProjectsView() {
  const { data: projects, isLoading: projectsLoading } = useGetAllProjects();
  const { data: allScheduledPosts, isLoading: postsLoading } = useGetAllScheduledPosts();

  const scheduledByProject = useMemo(() => {
    const map: Record<string, number> = {};
    if (!allScheduledPosts) return map;
    const now = new Date();
    for (const post of allScheduledPosts) {
      if (post.projectId && (post.status === "pending" || post.status === "scheduled") && new Date(post.date) >= now) {
        map[post.projectId] = (map[post.projectId] ?? 0) + 1;
      }
    }
    return map;
  }, [allScheduledPosts]);

  const isLoading = projectsLoading || postsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-500/10 mb-4">
          <Folder className="h-10 w-10 text-violet-500" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No projects yet</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs">
          Create your first project to get started building your social media presence.
        </p>
        <AddProjectButton />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">All Projects</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {projects.length} project{projects.length !== 1 ? "s" : ""} · Global workspace
          </p>
        </div>
        <AddProjectButton variant="ghost" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => {
          const platforms = project.projectToOAuthProviders?.flatMap(p => p.oauthProvider ? [p.oauthProvider.platform] : []) ?? [];
          const hasConnectedPlatforms = platforms.length > 0;
          const scheduledCount = scheduledByProject[project.id] ?? 0;
          const lastActivity = project.updatedAt
            ? formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })
            : null;

          return (
            <button
              key={project.id}
              type="button"
              onClick={() => window.open(`/project/${project.id}`, "_blank")}
              className={cn(
                "group text-left p-5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800",
                "hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg hover:shadow-violet-500/8",
                "transition-all duration-200 cursor-pointer"
              )}
            >
              {/* Top row: icon + project name */}
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/25 flex-shrink-0">
                  <Folder className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                    {project.name}
                  </p>
                  {project.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {project.description}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-violet-500 transition-colors flex-shrink-0 mt-1" />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Scheduled posts */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <Calendar className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{scheduledCount}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Scheduled</p>
                  </div>
                </div>

                {/* Health */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <ProjectHealth hasConnectedPlatforms={hasConnectedPlatforms} scheduledCount={scheduledCount} />
                </div>
              </div>

              {/* Bottom row: platforms + last activity */}
              <div className="flex items-center justify-between">
                {/* Platform icons */}
                {platforms.length > 0 ? (
                  <div className="flex items-center gap-1">
                    {platforms.slice(0, 4).map((platform) => {
                      const iconUrl = getPlatformIconUrl(platform);
                      return iconUrl ? (
                        <img
                          key={platform}
                          src={iconUrl}
                          alt={platform}
                          className="h-4 w-4 rounded-sm object-contain"
                        />
                      ) : (
                        <div
                          key={platform}
                          className="h-4 w-4 rounded-sm bg-slate-200 dark:bg-slate-700 flex items-center justify-center"
                        >
                          <span className="text-[8px] font-bold text-slate-500 uppercase">{platform[0]}</span>
                        </div>
                      );
                    })}
                    {platforms.length > 4 && (
                      <span className="text-[10px] text-slate-400 ml-0.5">+{platforms.length - 4}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500">No platforms</span>
                )}

                {/* Last activity */}
                {lastActivity && (
                  <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="text-[10px]">{lastActivity}</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}

      </div>
    </div>
  );
}

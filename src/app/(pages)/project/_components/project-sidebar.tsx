"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Folder,
  ChevronDown,
  ChevronRight,
  Users,
  TrendingUp,
  Video,
  PlaySquare,
  Calendar,
  Newspaper,
  Layers,
  AlertCircle,
  Home,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AddProjectButton } from "./add-project-button";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/backend-apis/auth/hooks";
import { ProjectWithChats } from "@/backend-apis/projects/types";
import { Logo } from "@/components/common/logo";
import { AddProjectToFolder } from "./add-project-to-folder";
import { AddFolderButton } from "./add-folder-button";
import { ProjectFolderItem } from "./project-folder-item";
import { useGetProjectFolders } from "@/backend-apis/project-folders/hooks";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { useUserSettings } from "@/backend-apis/user-settings/hooks";
import { Badge } from "@/components/ui/badge";
import { useFocus } from "@/providers/focus-provider";

interface ProjectSidebarProps {
  elementRefs?: React.MutableRefObject<Record<string, HTMLElement | null>>;
  onNavigationTourStart?: () => void;
  onFoldersTourStart?: () => void;
  onProjectsTourStart?: () => void;
}

export function ProjectSidebar({ elementRefs, onNavigationTourStart, onFoldersTourStart, onProjectsTourStart }: ProjectSidebarProps) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const sidebar = useSidebar();
  const { data: settings } = useUserSettings();
  const { data: session } = useSession();
  
  // Get focus context
  const { focusContext, needsAttentionProjects, isLoading: focusLoading } = useFocus();
  
  // Initialize open sections from localStorage or default values
  const [openSections, setOpenSections] = React.useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-open-sections');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Fallback to default if parsing fails
        }
      }
    }
    return [params.id?.toString() || ""]; // Don't auto-expand projects by default
  });

  const handleSectionToggle = (value: string) => {
    const newOpenSections = openSections.includes(value)
      ? openSections.filter((item) => item !== value)
      : [...openSections, value];
    
    setOpenSections(newOpenSections);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-open-sections', JSON.stringify(newOpenSections));
    }
  };
  const { data: projects, isLoading } = useGetAllProjects();
  const { data: folders, isLoading: foldersLoading } = useGetProjectFolders();
  const { toggleSidebar } = sidebar;

  // Get the currently focused project details
  const focusedProject = React.useMemo(() => {
    if (!focusContext?.projectId || !projects) return null;
    return projects.find(p => p.id === focusContext.projectId);
  }, [focusContext?.projectId, projects]);

  const activeProjectId = (path: string) => {
    const match = path.match(/project\/([^/]+)/);
    return match ? match[1] : null;
  };

  return (
    <Sidebar className="border-r dark:border-gray-700" collapsible="icon">
      <SidebarHeader className="border-b dark:border-gray-700 p-4 flex justify-center">
        <Logo iconOnly={!sidebar.open} />
      </SidebarHeader>
      <ScrollArea className="h-[calc(100vh-5rem)] overflow-y-auto w-full" style={{ width: '100%', maxWidth: '100%' }}>
        <SidebarContent className="p-2 space-y-3 min-w-0 w-full max-w-full overflow-x-hidden" style={{ width: '100%', maxWidth: '100%' }}>
          
          {/* Quick Actions - Always visible */}
          {sidebar.open && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3 space-y-1 min-w-0 max-w-full overflow-hidden">
              {/* Home/Today Link */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      onClick={() => {
                        if (window.innerWidth <= 768) {
                          toggleSidebar()
                        }
                      }}
                      href="/project"
                      className={cn(
                        "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        pathname === "/project" 
                          ? "bg-gray-200 dark:bg-gray-600" 
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      )}
                    >
                      <Home className="h-4 w-4" />
                      <span className="ml-2">Today</span>
                    </Link>
                  </TooltipTrigger>
                </Tooltip>
              </TooltipProvider>

              <div
                ref={(el) => {
                  if (elementRefs && el) {
                    elementRefs.current.addProject = el;
                  }
                }}
              >
                <AddProjectButton />
              </div>
            </div>
          )}

          {/* Current Focus - Show when there's an active focus */}
          {sidebar.open && focusContext && focusContext.type !== "empty" && focusedProject && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3 min-w-0 max-w-full overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground">Working on</span>
              </div>
              <Link
                onClick={() => {
                  if (window.innerWidth <= 768) {
                    toggleSidebar()
                  }
                }}
                href={`/project/${focusContext.projectId}?tab=campaign`}
                className="block"
              >
                <div className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{focusContext.projectName}</p>
                    {focusContext.campaignName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {focusContext.campaignName}
                        {focusContext.day && ` • Day ${focusContext.day}`}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Needs Attention - Show urgent items */}
          {sidebar.open && needsAttentionProjects.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900 shadow-sm p-3 min-w-0 max-w-full overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">Needs Attention</span>
                </div>
                <Badge variant="destructive" className="text-xs">{needsAttentionProjects.length}</Badge>
              </div>
              <div className="space-y-1">
                {needsAttentionProjects.slice(0, 3).map((item) => (
                  <Link
                    key={item.projectId}
                    onClick={() => {
                      if (window.innerWidth <= 768) {
                        toggleSidebar()
                      }
                    }}
                    href={`/project/${item.projectId}?tab=campaign`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{item.projectName}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.reason}</p>
                    </div>
                  </Link>
                ))}
                {needsAttentionProjects.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    +{needsAttentionProjects.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tools Section */}
          {sidebar.open && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3 space-y-1 min-w-0 max-w-full overflow-hidden">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2 mb-2">Tools</p>
              
              {/* Spotlight Link */}
              <div
                ref={(el) => {
                  if (elementRefs && el) {
                    elementRefs.current.forYou = el;
                  }
                }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        onClick={() => {
                          if (window.innerWidth <= 768) {
                            toggleSidebar()
                          }
                        }}
                        href="/project/wall"
                        className={cn(
                          "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          pathname === "/project/wall" 
                            ? "bg-gray-200 dark:bg-gray-600" 
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <Newspaper className="h-4 w-4" />
                        <span className="ml-2">Spotlight</span>
                      </Link>
                    </TooltipTrigger>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Calendar Link */}
              <div
                ref={(el) => {
                  if (elementRefs && el) {
                    elementRefs.current.contentPlanner = el;
                  }
                }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        onClick={() => {
                          if (window.innerWidth <= 768) {
                            toggleSidebar()
                          }
                        }}
                        href="/project/dashboard"
                        className={cn(
                          "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          pathname === "/project/dashboard" 
                            ? "bg-gray-200 dark:bg-gray-600" 
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <Calendar className="h-4 w-4" />
                        <span className="ml-2">Calendar</span>
                      </Link>
                    </TooltipTrigger>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Analytics Link */}
              <div
                ref={(el) => {
                  if (elementRefs && el) {
                    elementRefs.current.analytics = el;
                  }
                }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        onClick={() => {
                          if (window.innerWidth <= 768) {
                            toggleSidebar()
                          }
                        }}
                        href="/project/analytics"
                        className={cn(
                          "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          pathname?.startsWith("/project/analytics") 
                            ? "bg-gray-200 dark:bg-gray-600" 
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <TrendingUp className="h-4 w-4" />
                        <span className="ml-2">Analytics</span>
                      </Link>
                    </TooltipTrigger>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Templates Link */}
              <div
                ref={(el) => {
                  if (elementRefs && el) {
                    elementRefs.current.template = el;
                  }
                }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        onClick={() => {
                          if (window.innerWidth <= 768) {
                            toggleSidebar()
                          }
                        }}
                        href="/project/templates"
                        className={cn(
                          "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          pathname === '/project/templates' || pathname?.startsWith('/project/templates/') 
                            ? "bg-gray-200 dark:bg-gray-600" 
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <Layers className="h-4 w-4" />
                        <span className="ml-2">Templates</span>
                      </Link>
                    </TooltipTrigger>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Video Maker Link */}
              <div
                ref={(el) => {
                  if (elementRefs && el) {
                    elementRefs.current.videoMaker = el;
                  }
                }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        onClick={() => {
                          if (window.innerWidth <= 768) {
                            toggleSidebar()
                          }
                        }}
                        href="/project/video-maker"
                        className={cn(
                          "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          pathname === '/project/video-maker' 
                            ? "bg-gray-200 dark:bg-gray-600" 
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <Video className="h-4 w-4" />
                        <span className="ml-2">Video Maker</span>
                      </Link>
                    </TooltipTrigger>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* My Videos Link */}
              <div
                ref={(el) => {
                  if (elementRefs && el) {
                    elementRefs.current.myVideos = el;
                  }
                }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        onClick={() => {
                          if (window.innerWidth <= 768) {
                            toggleSidebar()
                          }
                        }}
                        href="/project/my-videos"
                        className={cn(
                          "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          pathname === '/project/my-videos' 
                            ? "bg-gray-200 dark:bg-gray-600" 
                            : "hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <PlaySquare className="h-4 w-4" />
                        <span className="ml-2">My Videos</span>
                      </Link>
                    </TooltipTrigger>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {/* What's this? button */}
              {onNavigationTourStart && (settings?.guidedTourEnabled ?? true) && (
                <div className="flex justify-end mt-2 w-full hidden md:flex">
                  <button
                    onClick={onNavigationTourStart}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap"
                  >
                    What&apos;s this?
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Folders Section - Collapsed by default */}
          {sidebar.open && folders && folders.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3 min-w-0 max-w-full overflow-hidden" data-folders-section>
              <Collapsible open={openSections.includes("folders")} onOpenChange={() => handleSectionToggle("folders")}>
                <CollapsibleTrigger asChild>
                  <div className="cursor-pointer">
                    <div className="flex items-center justify-between px-2 mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Folders</p>
                      {openSections.includes("folders") ? (
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      ) : (
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <AddFolderButton />
                  {foldersLoading
                    ? Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 mt-2" />
                    ))
                    : folders.map((folder: any) => (
                        <div key={folder.id} data-folder-item>
                          <ProjectFolderItem
                            folder={folder}
                            isOpen={openSections.includes(folder.id)}
                            onToggle={() => handleSectionToggle(folder.id)}
                            currentPath={pathname}
                          />
                        </div>
                      ))}
                </CollapsibleContent>
              </Collapsible>
              
              {/* What's this? button */}
              {onFoldersTourStart && (settings?.guidedTourEnabled ?? true) && openSections.includes("folders") && (
                <div className="flex justify-end mt-2 w-full">
                  <button
                    onClick={onFoldersTourStart}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap"
                  >
                    What&apos;s this?
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Projects Section - Collapsed by default */}
          {sidebar.open && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-3 min-w-0 max-w-full overflow-hidden" data-projects-section-card>
              <Collapsible open={openSections.includes("projects")} onOpenChange={() => handleSectionToggle("projects")}>
                <CollapsibleTrigger asChild>
                  <div 
                    ref={(el) => {
                      if (elementRefs && el) {
                        elementRefs.current.projects = el;
                      }
                    }}
                    className="cursor-pointer"
                    data-collapsible-trigger
                  >
                    <div className="flex items-center justify-between px-2 mb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">All Projects</p>
                        {projects && (
                          <Badge variant="secondary" className="text-xs">{projects.length}</Badge>
                        )}
                      </div>
                      {openSections.includes("projects") ? (
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      ) : (
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent data-projects-section>
                  {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 mb-1" />
                    ))
                    : projects?.map((project) => (
                      <div key={project.id} data-project-item>
                        <ProjectItem
                          project={project}
                          isOpen={false}
                          onToggle={() => {}}
                          currentPath={pathname}
                          isFocused={focusContext?.projectId === project.id}
                        />
                      </div>
                    ))}
                </CollapsibleContent>
              </Collapsible>
              
              {/* What's this? button */}
              {onProjectsTourStart && (settings?.guidedTourEnabled ?? true) && openSections.includes("projects") && (
                <div className="flex justify-end mt-2 w-full">
                  <button
                    onClick={onProjectsTourStart}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap"
                  >
                    What&apos;s this?
                  </button>
                </div>
              )}
            </div>
          )}
        </SidebarContent>
      </ScrollArea>
    </Sidebar>
  );
}

interface ProjectItemProps {
  project: ProjectWithChats;
  isOpen: boolean;
  onToggle: () => void;
  currentPath: string;
  isFocused?: boolean;
}

function ProjectItem({
  project,
  isOpen,
  onToggle,
  currentPath,
  isFocused = false,
}: ProjectItemProps) {
  const router = useRouter();
  const { data } = useSession();

  const activeProjectId = (path: string) => {
    const match = path.match(/project\/([^/]+)/);
    return match ? match[1] : null;
  };

  // Function to determine if project is active (same formula as dashboard)
  const isProjectActive = (project: ProjectWithChats) => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday end
    
    return (project.projectTrackings || []).some(tracking => {
      const postDate = new Date(tracking.date);
      return isWithinInterval(postDate, { start: weekStart, end: weekEnd });
    });
  };

  // Function to calculate project progress (simplified version)
  const calculateProjectProgress = (project: ProjectWithChats): number => {
    if (!project.campaignPlanners || project.campaignPlanners.length === 0) {
      return 0;
    }

    let totalProgress = 0;
    let totalCampaigns = 0;

    project.campaignPlanners.forEach(planner => {
      if (planner.chats && planner.chats.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const baseDate = planner.startDate ? new Date(planner.startDate) : new Date(planner.createdAt);
        baseDate.setHours(0, 0, 0, 0);
        
        const totalDays = planner.chats.length;
        const passedDays = planner.chats.filter(chat => {
          const chatDate = new Date(baseDate.getTime() + (chat.day - 1) * 86400000);
          chatDate.setHours(0, 0, 0, 0);
          return chatDate < today;
        }).length;

        const campaignProgress = totalDays > 0 ? (passedDays / totalDays) * 100 : 0;
        totalProgress += campaignProgress;
        totalCampaigns++;
      }
    });

    return totalCampaigns > 0 ? Math.round(totalProgress / totalCampaigns) : 0;
  };

  // Function to determine progress bar color
  const getProgressBarColor = (project: ProjectWithChats) => {
    if (isFocused) {
      return "bg-primary"; // Primary color for focused project
    }
    if (isProjectActive(project)) {
      return "bg-green-500 dark:bg-green-600"; // Green for active projects
    } else if (project.campaignPlanners && project.campaignPlanners.length > 0) {
      return "bg-gray-400 dark:bg-gray-500"; // Grey for inactive projects with campaigns
    } else {
      return "bg-blue-500 dark:bg-blue-600"; // Default blue for projects without campaigns
    }
  };

  const { toggleSidebar } = useSidebar()

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer min-w-0",
        activeProjectId(currentPath) === project.id && "bg-gray-200 dark:bg-gray-700",
        isFocused && "ring-1 ring-primary/50"
      )}
      onClick={() => {
        if (window.innerWidth <= 768) {
          toggleSidebar()
        }
        const tab = localStorage.getItem("projectTab");
        router.push(`/project/${project.id}${tab ? `?tab=${tab}` : ''}`)
      }}
    >
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Folder className="h-4 w-4 shrink-0" />
          <span className="font-medium truncate min-w-0">{project.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <AddProjectToFolder projectId={project.id} projectName={project.name} />
          {data?.user?.id !== project.userId && (
            <Users className="h-4 w-4 shrink-0 opacity-50" />
          )}
        </div>
      </div>

      {/* Progress Bar with Dynamic Fill Color */}
      <div className="px-1">
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full transition-all duration-300 ${getProgressBarColor(project)}`}
            style={{ width: `${calculateProjectProgress(project)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

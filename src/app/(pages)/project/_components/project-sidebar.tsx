"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Folder,
  ChevronDown,
  ChevronRight,
  Users,
  BarChart3,
  TrendingUp,
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
import FirstViewTooltip from "@/components/common/first-view-tooltip";
import { Logo } from "@/components/common/logo";
import { AddProjectToFolder } from "./add-project-to-folder";
import { AddFolderButton } from "./add-folder-button";
import { ProjectFolderItem } from "./project-folder-item";
import { useGetProjectFolders } from "@/backend-apis/project-folders/hooks";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

export function ProjectSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const sidebar = useSidebar();
  
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
    return [params.id?.toString() || "", "projects"]; // Default to projects open
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
  const { toggleSidebar } = useSidebar()

  return (
    <Sidebar className="border-r" collapsible="icon">
      <SidebarHeader className="border-b p-4 flex justify-center">
        <Logo iconOnly={!sidebar.open} />
      </SidebarHeader>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <SidebarContent className="p-2">
          <AddProjectButton />
          
          {/* For You Link */}
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
                  className={`flex items-center rounded-md px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors ${
                    !sidebar.open ? 'justify-center' : ''
                  }`}
                >
                  <Users className="h-4 w-4" />
                  {sidebar.open && <span className="ml-2">For You</span>}
                </Link>
              </TooltipTrigger>
              {!sidebar.open && (
                <TooltipContent side="right">
                  For You
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Dashboard Link */}
          <FirstViewTooltip tooltipKey="contentPlanner" order={3} content="You can log what was posted here along with date. This helps you plan for future posts.">
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
                    className={`flex items-center rounded-md px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors ${
                      !sidebar.open ? 'justify-center' : ''
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    {sidebar.open && <span className="ml-2">Content Planner</span>}
                  </Link>
                </TooltipTrigger>
                {!sidebar.open && (
                  <TooltipContent side="right">
                    Content Planner
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </FirstViewTooltip>

          {/* Analytics Link */}
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
                  className={`flex items-center rounded-md px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors ${
                    !sidebar.open ? 'justify-center' : ''
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  {sidebar.open && <span className="ml-2">Analytics</span>}
                </Link>
              </TooltipTrigger>
              {!sidebar.open && (
                <TooltipContent side="right">
                  Analytics
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          {/* Project Folders */}
          <div className="mt-6">
            {sidebar.open && (
              <div className="flex items-center justify-between px-2 mb-2">
                <p className="text-sm font-semibold">Project Folders</p>
              </div>
            )}
            <AddFolderButton />
            {foldersLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 mt-2" />
              ))
              : folders && folders.length > 0
              ? folders.map((folder: any) => (
                  <ProjectFolderItem
                    key={folder.id}
                    folder={folder}
                    isOpen={openSections.includes(folder.id)}
                    onToggle={() => handleSectionToggle(folder.id)}
                    currentPath={pathname}
                  />
                ))
              : (
                <div className="text-xs text-gray-500 px-3 py-2 text-center">
                  No project folders yet
                </div>
              )}
          </div>

                    {/* Projects */}
          <Collapsible open={openSections.includes("projects")} onOpenChange={() => handleSectionToggle("projects")}>
            <CollapsibleTrigger asChild>
              <div className="mt-6 cursor-pointer">
                {sidebar.open ? (
                  <div className="flex items-center justify-between px-2 mb-2">
                    <p className="text-sm font-semibold">Projects</p>
                    {openSections.includes("projects") ? (
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    ) : (
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    )}
                  </div>
                ) : (
                  <div className="flex justify-center mb-2">
                    <Folder className="h-4 w-4 opacity-70" />
                  </div>
                )}
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8" />
                ))
                : projects?.map((project) => (
                  <ProjectItem
                    key={project.id}
                    project={project}
                    isOpen={false}
                    onToggle={() => {}}
                    currentPath={pathname}
                  />
                ))}
            </CollapsibleContent>
          </Collapsible>
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
}

function ProjectItem({
  project,
  isOpen,
  onToggle,
  currentPath,
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
    if (isProjectActive(project)) {
      return "bg-green-500"; // Green for active projects
    } else if (project.campaignPlanners && project.campaignPlanners.length > 0) {
      return "bg-gray-400"; // Grey for inactive projects with campaigns
    } else {
      return "bg-blue-500"; // Default blue for projects without campaigns
    }
  };

  const { toggleSidebar } = useSidebar()

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-200 cursor-pointer",
        activeProjectId(currentPath) === project.id &&
        "bg-gray-200",
      )}
      onClick={() => {
        if (window.innerWidth <= 768) {
          toggleSidebar()
        }
        router.push(`/project/${project.id}`)
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <Folder className="h-4 w-4 shrink-0" />
          <span className="font-medium truncate">{project.name}</span>
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
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(project)}`}
            style={{ width: `${calculateProjectProgress(project)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

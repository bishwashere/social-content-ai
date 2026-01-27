"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Folder,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Users,
  TrendingUp,
  Video,
  PlaySquare,
  Calendar,
  Compass,
  Home,
  Plus,
  Check,
  ChevronsUpDown,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AddProjectButton } from "./add-project-button";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/backend-apis/auth/hooks";
import { Logo } from "@/components/common/logo";
import { useUserSettings } from "@/backend-apis/user-settings/hooks";
import { Badge } from "@/components/ui/badge";
import { useCreateCheckoutSession } from "@/backend-apis/payment/hooks";
import { Button } from "@/components/ui/button";

// Navigation items with accent colors
const navItems = [
  { href: "/project", label: "Today", icon: Home, accent: "from-violet-500 to-purple-600", exact: true },
  { href: "/project/wall", label: "Discover", icon: Compass, accent: "from-amber-500 to-orange-500", exact: false, discoverRoutes: ["/project/wall", "/project/templates"] },
  { href: "/project/content-planner", label: "Content Planner", icon: Calendar, accent: "from-blue-500 to-cyan-500", exact: true },
  { href: "/project/analytics", label: "Analytics", icon: TrendingUp, accent: "from-emerald-500 to-teal-500", exact: false },
  { href: "/project/video-maker", label: "Video Maker", icon: Video, accent: "from-indigo-500 to-violet-500", exact: true },
  { href: "/project/my-videos", label: "My Videos", icon: PlaySquare, accent: "from-fuchsia-500 to-pink-500", exact: true },
];

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
  // On mobile, treat sheet-open as expanded so nav shows labels left-aligned; desktop uses sidebar.open
  const isOpen = sidebar.isMobile ? sidebar.openMobile : sidebar.open;
  const { data: settings } = useUserSettings();
  const { data: session } = useSession();
  const [projectSelectorOpen, setProjectSelectorOpen] = React.useState(false);
  const payment = useCreateCheckoutSession();

  const { data: projects, isLoading } = useGetAllProjects();
  const { toggleSidebar } = sidebar;

  // Get current project from URL
  const currentProjectId = React.useMemo(() => {
    const match = pathname.match(/\/project\/([^/?]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  // Get current project details
  const currentProject = React.useMemo(() => {
    if (!currentProjectId || !projects) return null;
    return projects.find(p => p.id === currentProjectId);
  }, [currentProjectId, projects]);

  const isNavActive = (item: typeof navItems[0]) => {
    // Special handling for Discover item (combines Spotlight and Templates)
    if (item.discoverRoutes) {
      return item.discoverRoutes.some(route => pathname?.startsWith(route));
    }
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname?.startsWith(item.href);
  };

  // Map refs to nav items
  const getNavRef = (label: string) => {
    const refMap: Record<string, string> = {
      "Today": "today",
      "Discover": "forYou",
      "Content Planner": "contentPlanner",
      "Analytics": "analytics",
      "Video Maker": "videoMaker",
      "My Videos": "myVideos",
    };
    return refMap[label];
  };

  const handleProjectSelect = (projectId: string) => {
    setProjectSelectorOpen(false);
    if (window.innerWidth <= 768) {
      toggleSidebar();
    }
    const tab = localStorage.getItem("projectTab");
    router.push(`/project/${projectId}${tab ? `?tab=${tab}` : ''}`);
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-transparent overflow-hidden cursor-pointer">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/90 via-white/80 to-slate-50/90 dark:from-slate-950/90 dark:via-slate-900/80 dark:to-slate-950/90 backdrop-blur-xl" />
      <div className="absolute top-16 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-slate-200/60 dark:via-slate-700/60 to-transparent" />

      {/* Header with Logo */}
      <SidebarHeader className={cn("relative py-3 border-b border-slate-200/50 dark:border-slate-700/50", isOpen ? "px-3" : "px-2")}>
        <div className={cn("transition-all duration-300", !isOpen && "flex justify-center")}>
          <Logo iconOnly={!isOpen} />
        </div>
      </SidebarHeader>

      <ScrollArea 
        className={cn(
          "relative h-[calc(100vh-8rem)] overflow-y-auto",
          isOpen ? "cursor-w-resize" : "cursor-e-resize"
        )}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          // Check if click is on interactive elements
          const isInteractive = target.closest('a, button, [role="button"]') || 
                               target.tagName === 'A' || 
                               target.tagName === 'BUTTON' ||
                               target.closest('[data-sidebar="rail"]');
          
          // If not on interactive element, toggle sidebar
          if (!isInteractive) {
            toggleSidebar();
          }
        }}
      >
        <SidebarContent 
          className={cn("py-3 space-y-3", isOpen ? "px-2.5" : "px-1 overflow-visible")}
        >
          {/* Navigation Links */}
          <div className={cn("space-y-1", !isOpen && "overflow-visible")}>
            {navItems.map((item) => {
              const active = isNavActive(item);
              const Icon = item.icon;
              const refKey = getNavRef(item.label);
              
              return (
                <div
                  key={item.href}
                  ref={(el) => {
                    if (elementRefs && el && refKey) {
                      elementRefs.current[refKey] = el;
                    }
                  }}
                >
                  {isOpen ? (
                    <Link
                      href={item.href}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.innerWidth <= 768) {
                          toggleSidebar();
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2.5 h-10 px-2 rounded-xl transition-all duration-200 group/item",
                        active
                          ? "bg-white dark:bg-slate-800 shadow-md shadow-slate-200/50 dark:shadow-slate-900/50"
                          : "hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center rounded-lg transition-all duration-200 flex-shrink-0 w-9 h-9",
                        active 
                          ? `bg-gradient-to-br ${item.accent} shadow-sm` 
                          : "bg-slate-100 dark:bg-slate-800 group-hover/item:scale-105"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5 transition-colors",
                          active ? "text-white" : "text-slate-500 dark:text-slate-400"
                        )} />
                      </div>
                      <span className={cn(
                        "font-medium text-sm transition-all duration-300 whitespace-nowrap",
                        active 
                          ? "text-slate-900 dark:text-white" 
                          : "text-slate-600 dark:text-slate-300"
                      )}>
                        {item.label}
                      </span>
                      {active && (
                        <ChevronRight className="h-4 w-4 ml-auto text-slate-400" />
                      )}
                    </Link>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.innerWidth <= 768) {
                                toggleSidebar();
                              }
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 py-1.5 px-1 w-full rounded-xl transition-all duration-200 group/item",
                              "hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                          >
                            <div className={cn(
                              "flex items-center justify-center transition-all duration-200 flex-shrink-0 w-9 h-9",
                              active 
                                ? `bg-gradient-to-br ${item.accent} shadow-sm rounded-lg` 
                                : "group-hover/item:scale-105"
                            )}>
                              <Icon className={cn(
                                "h-5 w-5 transition-colors",
                                active ? "text-white" : "text-slate-500 dark:text-slate-400"
                              )} />
                            </div>
                            <span className={cn(
                              "font-medium text-[11px] leading-tight text-center transition-all duration-300 w-full px-0 break-words overflow-visible whitespace-normal",
                              active 
                                ? "text-slate-900 dark:text-white" 
                                : "text-slate-600 dark:text-slate-300"
                            )} style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                              {item.label}
                            </span>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              );
            })}
          </div>

          {/* What's this for navigation */}
          {isOpen && onNavigationTourStart && (settings?.guidedTourEnabled ?? true) && (
            <div className="flex justify-end px-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigationTourStart();
                }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                What&apos;s this?
              </button>
            </div>
          )}

          {/* Start 7-Day Free Trial CTA */}
          <div className={cn("px-2 mt-6", !isOpen && "px-1")}>
            {isOpen ? (
              <Button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const res = await payment.mutateAsync("subscription");
                    if (res?.data?.redirectUrl) {
                      router.push(res.data.redirectUrl);
                    }
                  } catch (error) {
                    console.error("Error creating checkout session:", error);
                  }
                }}
                disabled={payment.isPending}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300 px-4 py-6 h-auto"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-white flex-shrink-0" />
                  <span className="text-white font-semibold text-sm">
                    {payment.isPending ? "Loading..." : "Start 7-Day Free Trial"}
                  </span>
                </div>
              </Button>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const res = await payment.mutateAsync("subscription");
                          if (res?.data?.redirectUrl) {
                            router.push(res.data.redirectUrl);
                          }
                        } catch (error) {
                          console.error("Error creating checkout session:", error);
                        }
                      }}
                      disabled={payment.isPending}
                      className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300 p-2 h-auto"
                    >
                      <Zap className="w-4 h-4 text-white" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    Start 7-Day Free Trial
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </SidebarContent>
      </ScrollArea>

      {/* Footer with Project Selector */}
      <SidebarFooter 
        className={cn(
          "relative py-3 border-t border-slate-200/50 dark:border-slate-700/50",
          isOpen ? "px-2.5 cursor-w-resize" : "px-1 cursor-e-resize"
        )}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          // Check if click is on interactive elements, inside popover, or inside mobile project dropdown
          const isInteractive = target.closest('a, button, [role="button"], [data-radix-popover-trigger]') || 
                               target.tagName === 'A' || 
                               target.tagName === 'BUTTON' ||
                               target.closest('[data-sidebar="rail"]') ||
                               target.closest('[data-slot="popover-content"]') ||
                               target.closest('[data-project-dropdown]');
          
          // If not on interactive element, toggle sidebar
          if (!isInteractive) {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar();
          }
        }}
      >
        {sidebar.isMobile ? (
          /* Mobile: inline dropdown inside sheet so it's clickable (no portal) */
          <div className="relative w-full">
            <button
              type="button"
              data-project-selector="true"
              ref={(el) => {
                if (elementRefs && el) {
                  elementRefs.current.projects = el;
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                setProjectSelectorOpen((v) => !v);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300 group",
                !isOpen && "justify-center p-2"
              )}
            >
              <div className={cn(
                "rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 flex-shrink-0 flex items-center justify-center",
                isOpen ? "p-2" : "p-1.5"
              )}>
                <Folder className={cn("text-white", isOpen ? "h-4 w-4" : "h-3.5 w-3.5")} />
              </div>
              {isOpen && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {currentProject?.name || "Select Project"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {projects?.length || 0} projects
                    </p>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 text-slate-400 group-hover:text-violet-500 transition-colors flex-shrink-0" />
                </>
              )}
            </button>
            {projectSelectorOpen && (
              <div
                data-project-dropdown
                className="absolute bottom-full left-0 right-0 mb-2 w-full min-w-[var(--sidebar-width)] max-h-[min(256px,calc(50vh-100px))] rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-[60]"
              >
                <div className="p-2 pb-0">
                  <div className="px-2 py-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Switch Project
                    </span>
                    <Badge variant="secondary" className="text-xs rounded-full">
                      {projects?.length || 0}
                    </Badge>
                  </div>
                </div>
                <ScrollArea className="h-[min(240px,_calc(50vh-120px))] px-2" onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-1">
                    {isLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 rounded-lg" />
                      ))
                    ) : projects?.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                        No projects yet
                      </p>
                    ) : (
                      projects?.map((project) => {
                        const isActive = currentProjectId === project.id;
                        return (
                          <button
                            key={project.id}
                            type="button"
                            data-project-item="true"
                            data-project-id={project.id}
                            data-project-name={project.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProjectSelect(project.id);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
                              isActive
                                ? "bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                          >
                            <div className={cn(
                              "p-1.5 rounded-lg flex-shrink-0",
                              isActive ? "bg-violet-100 dark:bg-violet-800/50" : "bg-slate-100 dark:bg-slate-700"
                            )}>
                              <Folder className={cn(
                                "h-3.5 w-3.5",
                                isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-500 dark:text-slate-400"
                              )} />
                            </div>
                            <p className={cn(
                              "flex-1 min-w-0 text-sm font-medium truncate",
                              isActive ? "text-violet-900 dark:text-violet-100" : "text-slate-700 dark:text-slate-200"
                            )}>
                              {project.name}
                            </p>
                            {isActive && (
                              <Check className="h-4 w-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                            )}
                            {session?.user?.id !== project.userId && (
                              <Users className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
                <div className="p-2 pt-0 border-t border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                  <AddProjectButton variant="ghost" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <Popover open={projectSelectorOpen} onOpenChange={setProjectSelectorOpen}>
            <PopoverTrigger asChild>
              <button
                data-project-selector="true"
                ref={(el) => {
                  if (elementRefs && el) {
                    elementRefs.current.projects = el;
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300 group",
                  !isOpen && "justify-center p-2"
                )}
              >
                <div className={cn(
                  "rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25 flex-shrink-0 flex items-center justify-center",
                  isOpen ? "p-2" : "p-1.5"
                )}>
                  <Folder className={cn("text-white", isOpen ? "h-4 w-4" : "h-3.5 w-3.5")} />
                </div>
                {isOpen && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {currentProject?.name || "Select Project"}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {projects?.length || 0} projects
                      </p>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 text-slate-400 group-hover:text-violet-500 transition-colors flex-shrink-0" />
                  </>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent 
              side="top" 
              align="start" 
              className="w-72 p-0 rounded-xl border-slate-200/80 dark:border-slate-700/80 shadow-xl overflow-hidden z-[100]"
              sideOffset={8}
            >
              <div className="p-2 pb-0">
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Switch Project
                  </span>
                  <Badge variant="secondary" className="text-xs rounded-full">
                    {projects?.length || 0}
                  </Badge>
                </div>
              </div>
              <ScrollArea className="h-[min(256px,_calc(50vh-100px))] px-2">
                <div className="space-y-1">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 rounded-lg" />
                    ))
                  ) : projects?.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                      No projects yet
                    </p>
                  ) : (
                    projects?.map((project) => {
                      const isActive = currentProjectId === project.id;
                      return (
                        <button
                          key={project.id}
                          data-project-item="true"
                          data-project-id={project.id}
                          data-project-name={project.name}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProjectSelect(project.id);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200",
                            isActive
                              ? "bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <div className={cn(
                            "p-1.5 rounded-lg flex-shrink-0",
                            isActive ? "bg-violet-100 dark:bg-violet-800/50" : "bg-slate-100 dark:bg-slate-700"
                          )}>
                            <Folder className={cn(
                              "h-3.5 w-3.5",
                              isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-500 dark:text-slate-400"
                            )} />
                          </div>
                          <p className={cn(
                            "flex-1 min-w-0 text-sm font-medium truncate",
                            isActive ? "text-violet-900 dark:text-violet-100" : "text-slate-700 dark:text-slate-200"
                          )}>
                            {project.name}
                          </p>
                          {isActive && (
                            <Check className="h-4 w-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                          )}
                          {session?.user?.id !== project.userId && (
                            <Users className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              <div className="p-2 pt-0">
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <AddProjectButton variant="ghost" />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </SidebarFooter>

      <SidebarRail className="bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/50" />
    </Sidebar>
  );
}

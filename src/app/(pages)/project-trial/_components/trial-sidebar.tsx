"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/cn";
import {
  Calendar,
  Home,
  Compass,
  TrendingUp,
  Video,
  Sparkles,
  ChevronRight,
  Zap,
} from "lucide-react";

const nav = [
  { href: "/project-trial", label: "Today", icon: Home, accent: "from-violet-500 to-purple-600", discoverRoutes: undefined },
  { href: "/project/wall", label: "Discover", icon: Compass, accent: "from-amber-500 to-orange-500", discoverRoutes: ["/project/wall", "/project/templates"] },
  { href: "/project/dashboard", label: "Calendar", icon: Calendar, accent: "from-blue-500 to-cyan-500", discoverRoutes: undefined },
  { href: "/project/analytics", label: "Analytics", icon: TrendingUp, accent: "from-emerald-500 to-teal-500", discoverRoutes: undefined },
  { href: "/project/video-maker", label: "Video Maker", icon: Video, accent: "from-indigo-500 to-violet-500", discoverRoutes: undefined },
];

export function TrialSidebar() {
  const pathname = usePathname();
  const sidebar = useSidebar();
  const isOpen = sidebar.open;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 bg-transparent"
    >
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/90 via-white/80 to-slate-50/90 dark:from-slate-950/90 dark:via-slate-900/80 dark:to-slate-950/90 backdrop-blur-xl" />
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-slate-200/60 dark:via-slate-700/60 to-transparent" />
      
      <SidebarHeader className="relative px-4 py-5">
        <Link 
          href="/project-trial" 
          className={cn(
            "flex items-center gap-3 group transition-all duration-300",
            !isOpen && "justify-center"
          )}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="relative p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className={cn("overflow-hidden transition-all duration-300", isOpen ? "w-auto opacity-100" : "w-0 opacity-0")}>
            <span className="text-base font-bold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
              NextPostAI
            </span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase">
              Trial Mode
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="relative px-3 py-2">
        <SidebarMenu className="space-y-1">
          {nav.map((item) => {
            // Special handling for Discover item (combines Spotlight and Templates)
            const active = item.discoverRoutes 
              ? item.discoverRoutes.some(route => pathname?.startsWith(route))
              : pathname === item.href;
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.label}
                  className={cn(
                    "h-11 rounded-xl transition-all duration-200 group/item",
                    active
                      ? "bg-white dark:bg-slate-800 shadow-md shadow-slate-200/50 dark:shadow-slate-900/50"
                      : "hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
                  )}
                >
                  <Link href={item.href} className="flex items-center gap-3 px-3">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                      active 
                        ? `bg-gradient-to-br ${item.accent} shadow-sm` 
                        : "bg-slate-100 dark:bg-slate-800 group-hover/item:scale-105"
                    )}>
                      <Icon className={cn(
                        "h-4 w-4 transition-colors",
                        active ? "text-white" : "text-slate-500 dark:text-slate-400"
                      )} />
                    </div>
                    <span className={cn(
                      "font-medium transition-colors",
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
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="relative px-3 pb-4">
        <div className={cn(
          "overflow-hidden transition-all duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}>
          <Link
            href="/project/billing"
            className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/30 group hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300"
          >
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Upgrade Plan
              </p>
              <p className="text-[11px] text-amber-700/70 dark:text-amber-300/70">
                Unlock all features
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </SidebarFooter>

      <SidebarRail className="bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/50" />
    </Sidebar>
  );
}

"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Bell,
  CreditCard,
  LogOut,
  Search,
  Settings,
  Command,
  Moon,
  Sun,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout, useSession } from "@/backend-apis/auth/hooks";
import { cn } from "@/lib/cn";

export function TrialHeader() {
  const router = useRouter();
  const sidebar = useSidebar();
  const { data } = useSession();
  const logout = useLogout();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const today = new Date();
  const dayName = format(today, "EEEE");
  const dateStr = format(today, "MMMM d");

  return (
    <header className="sticky top-0 z-20 w-full">
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/90 to-white/80 dark:from-slate-900/80 dark:via-slate-900/90 dark:to-slate-900/80 backdrop-blur-xl" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200/60 dark:via-slate-700/60 to-transparent" />
      
      <div className="relative mx-auto w-full max-w-7xl 2xl:max-w-[90%] px-4 md:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left section */}
          <div className="flex items-center gap-4 min-w-0">
            <SidebarTrigger className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" />
            
            <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-700" />
            
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {dayName}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-xs font-semibold">
                  Trial
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {dateStr}
              </p>
            </div>
          </div>

          {/* Center - Search (hidden on mobile) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <button
              onClick={() => {/* TODO: Open command palette */}}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/50 dark:border-slate-700/50 transition-all duration-200 group"
            >
              <Search className="h-4 w-4 text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors" />
              <span className="flex-1 text-left text-sm text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors">
                Search anything...
              </span>
              <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-slate-700 text-[10px] text-slate-500 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-600">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            {mounted && (() => {
              const currentTheme = theme === "system" 
                ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
                : theme;
              const isDark = currentTheme === "dark";
              
              return (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                >
                  {isDark ? (
                    <Sun className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-slate-500" />
                  )}
                </Button>
              );
            })()}

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 relative"
            >
              <Bell className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white dark:ring-slate-900" />
            </Button>

            {/* Upgrade button */}
            <Button
              onClick={() => router.push("/dashboard/billing")}
              className="hidden sm:inline-flex h-9 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-200"
            >
              Upgrade
            </Button>

            {/* User menu */}
            {data?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="h-9 w-9 rounded-xl p-0 ring-2 ring-slate-200 dark:ring-slate-700 hover:ring-violet-300 dark:hover:ring-violet-700 transition-all duration-200"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={data.user.avatarUrl} alt={data.user.name} className="rounded-lg" />
                      <AvatarFallback className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs font-bold">
                        {data.user.name?.slice(0, 1) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-64 p-2 rounded-xl border-slate-200/80 dark:border-slate-700/80 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50"
                >
                  <DropdownMenuLabel className="p-3 -m-1 mb-1 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage src={data.user.avatarUrl} alt={data.user.name} className="rounded-lg" />
                        <AvatarFallback className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold">
                          {data.user.name?.slice(0, 1) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {data.user.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {data.user.email}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-2 bg-slate-100 dark:bg-slate-800" />
                  <DropdownMenuItem 
                    onClick={() => router.push("/dashboard/billing")}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <CreditCard className="h-4 w-4 text-slate-500" />
                    <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => router.push("/dashboard/settings")}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Settings className="h-4 w-4 text-slate-500" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-2 bg-slate-100 dark:bg-slate-800" />
                  <DropdownMenuItem
                    onClick={() => logout.mutate()}
                    disabled={logout.isPending}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{logout.isPending ? "Logging out..." : "Log out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={() => router.push("/")}
                className="h-9 px-4 rounded-xl"
              >
                Sign in
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

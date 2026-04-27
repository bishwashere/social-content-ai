"use client";

import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import Cookie from "js-cookie";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import {
  Bot,
  CheckSquare,
  Zap,
  Globe,
  Clock,
  CalendarDays,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface SectionCard {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}

const SECTIONS: SectionCard[] = [
  {
    icon: Bot,
    iconBg: "bg-violet-100 dark:bg-violet-950/50",
    iconColor: "text-violet-600 dark:text-violet-400",
    title: "AI Assistant",
    description:
      "Ask anything — brainstorm ideas, start a project, or get instant insights about your content.",
  },
  {
    icon: CheckSquare,
    iconBg: "bg-emerald-100 dark:bg-emerald-950/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    title: "Get Started",
    description:
      "Step-by-step guidance to connect your socials, create projects, and publish your first post.",
  },
  {
    icon: Zap,
    iconBg: "bg-amber-100 dark:bg-amber-950/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    title: "Action Required",
    description:
      "Tasks and alerts that need your attention — overdue posts, stale projects, and more.",
  },
  {
    icon: Globe,
    iconBg: "bg-cyan-100 dark:bg-cyan-950/50",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    title: "Get Inspired",
    description:
      "Live world events and trending topics to spark your next winning campaign idea.",
  },
  {
    icon: Clock,
    iconBg: "bg-blue-100 dark:bg-blue-950/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    title: "Recent Activity",
    description:
      "A real-time feed of everything happening across all your projects and campaigns.",
  },
  {
    icon: CalendarDays,
    iconBg: "bg-pink-100 dark:bg-pink-950/50",
    iconColor: "text-pink-600 dark:text-pink-400",
    title: "Calendar",
    description:
      "Today and tomorrow's scheduled posts at a glance so you never miss a beat.",
  },
];

interface DashboardIntroModalProps {
  open: boolean;
  onClose: () => void;
}

export function DashboardIntroModal({ open, onClose }: DashboardIntroModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleDismiss = useCallback(async () => {
    setIsClosing(true);
    const token = Cookie.get(AUTH_TOKEN_COOKIE_NAME);
    try {
      await fetch("/api/user/dashboard-intro-shown", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {
      // Non-blocking — user can still proceed
    } finally {
      setIsClosing(false);
      onClose();
    }
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent
        className="max-w-2xl p-0 overflow-hidden border-0 shadow-2xl"
        aria-describedby="dashboard-intro-description"
      >
        {/* Header gradient */}
        <div className="relative bg-gradient-to-br from-violet-600 via-violet-500 to-fuchsia-500 px-8 pt-8 pb-10 text-white overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-fuchsia-400/20 rounded-full blur-xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-medium backdrop-blur-sm">
                <Sparkles className="w-3 h-3" />
                Quick overview
              </span>
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight mb-1">
              Your dashboard, unlocked
            </DialogTitle>
            <p id="dashboard-intro-description" className="text-violet-100 text-sm leading-relaxed">
              Here&apos;s everything you have at your fingertips — all in one place.
            </p>
          </div>
        </div>

        {/* Section cards */}
        <div className="px-8 py-6 bg-background">
          <div className="grid grid-cols-2 gap-3">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.title}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-border/60 bg-card/50 hover:border-border hover:bg-card transition-colors duration-150"
                >
                  <div className={cn("flex-shrink-0 p-2 rounded-lg", section.iconBg)}>
                    <Icon className={cn("w-4 h-4", section.iconColor)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug mb-0.5">
                      {section.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              You can always explore these sections on your dashboard.
            </p>
            <Button
              onClick={handleDismiss}
              disabled={isClosing}
              className="gap-2 bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 text-white shadow-md"
              size="sm"
            >
              Let&apos;s explore
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

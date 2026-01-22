"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar,
  Video,
  FileText,
  Rocket,
  Target,
  BarChart3,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTodayItems, TimelineItem } from "@/hooks/useTodayItems";
import { useFocus } from "@/providers/focus-provider";
import { useSession } from "@/backend-apis/auth/hooks";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import Loading from "@/components/common/loading";
import { cn } from "@/lib/cn";
import { ProjectCreationSuggestions } from "@/components/project-creation-suggestions";
import { NewsTrendingSection } from "@/app/(pages)/project/_components/news-trending";

export default function ProjectTrialPage() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading, isError: sessionError } = useSession();
  const projects = useGetAllProjects();
  const { groupedItems, isLoading, isEmpty } = useTodayItems();
  const { focusContext } = useFocus();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [hasUnlinkedPages, setHasUnlinkedPages] = useState(false);

  if (sessionLoading) {
    return <Loading className="h-screen" />;
  }

  if (sessionError) {
    return null;
  }

  const greeting = getGreeting(session?.user?.name);
  const projectCount = projects.data?.length ?? 0;

  const getHref = (item: TimelineItem) => {
    if (item.action?.href) return item.action.href;
    if (item.projects && item.projects.length > 0) return item.projects[0].href;
    return null;
  };

  return (
    <div className="min-h-screen">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-violet-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-100/40 via-transparent to-transparent dark:from-violet-900/20" />
      </div>

      <div className="mx-auto w-full max-w-7xl 2xl:max-w-[90%] px-4 md:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <header className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
                {format(new Date(), "EEEE, MMMM d")}
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                {greeting}
              </h1>
              {focusContext?.projectName && focusContext.type !== "empty" && (
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Focused on <span className="font-medium text-slate-700 dark:text-slate-200">{focusContext.projectName}</span>
                </p>
              )}
            </div>
            
            {/* Quick Stats */}
            <div className="flex items-center gap-3">
              <StatPill icon={<FileText className="h-4 w-4" />} value={projectCount} label="Projects" color="violet" />
              <StatPill icon={<Zap className="h-4 w-4" />} value={groupedItems.action.length} label="Actions" color="amber" />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <QuickAction href="/project/video-maker" icon={<Video className="h-4 w-4" />} label="Create Video" />
            <QuickAction href="/project/templates" icon={<Sparkles className="h-4 w-4" />} label="Use Template" />
            <QuickAction href="/project/content-planner" icon={<Calendar className="h-4 w-4" />} label="Content Planner" />
            <QuickAction href="/project/analytics" icon={<BarChart3 className="h-4 w-4" />} label="Analytics" />
          </div>
        </header>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && isEmpty && <EmptyState />}

        {/* Main Content */}
        {!isLoading && !isEmpty && (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Left Column - Main Content */}
            <div className="space-y-6">
              {/* Urgent Items */}
              {groupedItems.urgent.length > 0 && (
                <section className="space-y-4">
                  <SectionHeader 
                    icon={<AlertCircle className="h-5 w-5 text-rose-500" />} 
                    title="Needs Attention" 
                    count={groupedItems.urgent.length}
                    variant="urgent"
                  />
                  <div className="space-y-3">
                    {groupedItems.urgent.map((item) => (
                      <UrgentCard key={item.id} item={item} onClickHref={getHref(item)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Action Required */}
              {(groupedItems.action.length > 0 || hasUnlinkedPages) && (
                <section className="space-y-4">
                  <SectionHeader 
                    icon={<CheckCircle2 className="h-5 w-5 text-violet-500" />} 
                    title="Action Required" 
                    count={groupedItems.action.length + (hasUnlinkedPages ? 1 : 0)}
                  />
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm overflow-hidden">
                    {/* Project Creation Suggestions */}
                    <ProjectCreationSuggestions onHasPagesChange={setHasUnlinkedPages} />
                    
                    {/* Existing Action Items */}
                    {groupedItems.action.length > 0 && (
                      <>
                        {hasUnlinkedPages && (
                          <div className="border-t border-slate-100 dark:border-slate-700/50" />
                        )}
                        {groupedItems.action.slice(0, 8).map((item, idx) => (
                          <ActionRow key={item.id} item={item} onClickHref={getHref(item)} isLast={idx === Math.min(7, groupedItems.action.length - 1)} />
                        ))}
                        {groupedItems.action.length > 8 && (
                          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 text-center">
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              +{groupedItems.action.length - 8} more items
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </section>
              )}

              {/* Check out the news on */}
              <section className="space-y-4">
                <NewsTrendingSection />
              </section>
            </div>

            {/* Right Column - Sidebar */}
            <aside className="space-y-6 lg:sticky lg:top-24 self-start">
              {/* Stay Ahead */}
              {groupedItems.suggestions.length > 0 && (
                <CollapsibleSection
                  icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
                  title="Stay Ahead"
                  count={groupedItems.suggestions.length}
                  isOpen={showSuggestions}
                  onToggle={() => setShowSuggestions(v => !v)}
                >
                  <div className="space-y-1 pt-2">
                    {groupedItems.suggestions.map((item) => (
                      <CompactRow key={item.id} item={item} onClickHref={getHref(item)} />
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Recent Activity */}
              {groupedItems.activity.length > 0 && (
                <CollapsibleSection
                  icon={<Clock className="h-4 w-4 text-blue-500" />}
                  title="Recent Activity"
                  count={groupedItems.activity.length}
                  isOpen={showActivity}
                  onToggle={() => setShowActivity(v => !v)}
                >
                  <div className="space-y-1 pt-2">
                    {groupedItems.activity.map((item) => (
                      <CompactRow key={item.id} item={item} onClickHref={getHref(item)} showTime />
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Projects Quick Access */}
              {projects.data && projects.data.length > 0 && (
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                          <Rocket className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">Projects</span>
                      </div>
                      <Badge variant="secondary" className="rounded-full text-xs">
                        {projects.data.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-2">
                    {projects.data.slice(0, 5).map((p) => (
                      <Link
                        key={p.id}
                        href={`/project/${p.id}`}
                        className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                          {p.name}
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    ))}
                    {projects.data.length > 5 && (
                      <Link
                        href="/project"
                        className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors font-medium"
                      >
                        View all projects
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function
function getGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  let timeGreeting = "Good morning";
  if (hour >= 12 && hour < 17) timeGreeting = "Good afternoon";
  else if (hour >= 17) timeGreeting = "Good evening";
  
  const firstName = name?.split(' ')[0];
  return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
}

// Components
function StatPill({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: "violet" | "amber" }) {
  const colors = {
    violet: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  };
  
  return (
    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl", colors[color])}>
      {icon}
      <span className="font-bold">{value}</span>
      <span className="text-sm opacity-80">{label}</span>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-800 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-200 group"
    >
      <span className="text-slate-500 dark:text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
        {icon}
      </span>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
    </Link>
  );
}

function SectionHeader({ icon, title, count, variant }: { icon: React.ReactNode; title: string; count: number; variant?: "urgent" }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-xl",
          variant === "urgent" 
            ? "bg-rose-100 dark:bg-rose-900/30" 
            : "bg-violet-100 dark:bg-violet-900/30"
        )}>
          {icon}
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
      </div>
      <Badge 
        variant="secondary" 
        className={cn(
          "rounded-full",
          variant === "urgent" && "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
        )}
      >
        {count}
      </Badge>
    </div>
  );
}

function UrgentCard({ item, onClickHref }: { item: TimelineItem; onClickHref: string | null }) {
  const router = useRouter();
  
  return (
    <button
      type="button"
      onClick={() => onClickHref && router.push(onClickHref)}
      disabled={!onClickHref}
      className="w-full text-left group"
    >
      <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 text-white shadow-xl shadow-rose-500/25 hover:shadow-2xl hover:shadow-rose-500/30 hover:-translate-y-0.5 transition-all duration-300">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
              <span className="text-2xl">{item.icon}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg">{item.title}</h3>
                <Badge className="bg-white/20 text-white border-0 text-xs">Urgent</Badge>
              </div>
              {item.description && (
                <p className="text-white/80 text-sm">{item.description}</p>
              )}
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
        </div>
      </div>
    </button>
  );
}

function ActionRow({ item, onClickHref, isLast }: { item: TimelineItem; onClickHref: string | null; isLast: boolean }) {
  const router = useRouter();
  
  return (
    <button
      type="button"
      onClick={() => onClickHref && router.push(onClickHref)}
      disabled={!onClickHref}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group",
        !isLast && "border-b border-slate-100 dark:border-slate-700/50"
      )}
    >
      <span className="text-xl flex-shrink-0">{item.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 dark:text-white truncate">
          {item.title}
        </p>
        {item.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
            {item.description}
          </p>
        )}
      </div>
      {onClickHref && (
        <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      )}
    </button>
  );
}

function CollapsibleSection({ 
  icon, 
  title, 
  count, 
  isOpen, 
  onToggle, 
  children 
}: { 
  icon: React.ReactNode;
  title: string; 
  count: number; 
  isOpen: boolean; 
  onToggle: () => void; 
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50">
            {icon}
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">{title}</span>
          <Badge variant="secondary" className="rounded-full text-xs">
            {count}
          </Badge>
        </div>
        <div className={cn(
          "p-1 rounded-md transition-transform duration-200",
          isOpen && "rotate-180"
        )}>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>
      </button>
      
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="px-3 pb-3">
          {children}
        </div>
      </div>
    </div>
  );
}

function CompactRow({ item, onClickHref, showTime }: { item: TimelineItem; onClickHref: string | null; showTime?: boolean }) {
  const router = useRouter();
  
  return (
    <button
      type="button"
      onClick={() => onClickHref && router.push(onClickHref)}
      disabled={!onClickHref}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
    >
      <span className="text-base flex-shrink-0">{item.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
          {item.title}
        </p>
        {showTime && item.timestamp && (
          <p className="text-xs text-slate-400">
            {format(item.timestamp, "h:mm a")}
          </p>
        )}
      </div>
      {onClickHref && (
        <ArrowRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      )}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-br from-white via-white to-violet-50/50 dark:from-slate-800 dark:via-slate-800 dark:to-violet-950/30 p-8 sm:p-12">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-violet-200/30 dark:bg-violet-800/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="text-center sm:text-left space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-violet-100 dark:bg-violet-900/30">
            <CheckCircle2 className="h-8 w-8 text-violet-600 dark:text-violet-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            All caught up!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md">
            You&apos;re on top of everything. Use the sidebar to explore or create something new.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            asChild
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 rounded-xl"
          >
            <Link href="/project/video-maker">
              <Plus className="h-4 w-4 mr-2" />
              Create Content
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-xl border-slate-300 dark:border-slate-600"
          >
            <Link href="/project/templates">
              <Sparkles className="h-4 w-4 mr-2" />
              Browse Templates
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

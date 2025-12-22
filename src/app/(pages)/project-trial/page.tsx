"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { 
  ArrowRight, 
  Calendar, 
  CheckCircle2, 
  ChevronRight,
  Clock, 
  Folder,
  Lightbulb,
  Sparkles,
  Video,
  Zap,
  TrendingUp,
  BarChart3,
  Globe,
  Plus,
  Play,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { useTodayItems, TimelineItem, TimelineProject } from "@/hooks/useTodayItems";
import { useFocus } from "@/providers/focus-provider";
import { useSession } from "@/backend-apis/auth/hooks";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import Loading from "@/components/common/loading";

export default function ProjectTrialPage() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading, isError: sessionError } = useSession();
  const projects = useGetAllProjects();
  const { items, groupedItems, isLoading, isEmpty } = useTodayItems();
  const { focusContext } = useFocus();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  if (sessionLoading) {
    return <Loading className="h-screen" />;
  }

  if (sessionError) {
    return null;
  }

  const greeting = getGreeting(session?.user?.name);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-violet-400/20 to-fuchsia-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8 lg:px-12">
        {/* Hero Header */}
        <header className="mb-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {format(new Date(), "EEEE, MMMM d")}
              </p>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
                {greeting}
              </h1>
              {focusContext?.projectName && focusContext.type !== "empty" && (
                <p className="mt-2 text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Working on <span className="font-medium text-foreground">{focusContext.projectName}</span>
                </p>
              )}
            </div>
            
            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-3">
              <QuickStatPill icon={<Folder className="w-4 h-4" />} value={projects.data?.length || 0} label="Projects" />
              <QuickStatPill icon={<Zap className="w-4 h-4" />} value={groupedItems.action.length} label="Actions" />
            </div>
          </div>
        </header>

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && isEmpty && <EmptyState />}

        {/* Main Content */}
        {!isLoading && !isEmpty && (
          <div className="space-y-8">
            {/* Urgent Items - Full Width Alert Style */}
            {groupedItems.urgent.length > 0 && (
              <section className="space-y-4">
                {groupedItems.urgent.map((item) => (
                  <UrgentCard key={item.id} item={item} />
                ))}
              </section>
            )}

            {/* Bento Grid Layout */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
              {/* Action Items - Featured */}
              {groupedItems.action.length > 0 && (
                <section className="md:col-span-2 lg:col-span-2 row-span-2">
                  <BentoCard 
                    className="h-full bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-amber-200/50 dark:border-amber-800/50"
                    onMouseEnter={() => setHoveredCard('actions')}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold">Action Required</h2>
                          <p className="text-sm text-muted-foreground">{groupedItems.action.length} items need attention</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {groupedItems.action.slice(0, 4).map((item) => (
                        <ActionItemRow key={item.id} item={item} />
                      ))}
                      {groupedItems.action.length > 4 && (
                        <button className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                          View {groupedItems.action.length - 4} more
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </BentoCard>
                </section>
              )}

              {/* Quick Actions */}
              <section>
                <BentoCard className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 border-violet-200/50 dark:border-violet-800/50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/25">
                      <Plus className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-semibold">Quick Actions</h2>
                  </div>
                  
                  <div className="space-y-2">
                    <QuickActionButton 
                      icon={<Video className="w-4 h-4" />}
                      label="Create Video"
                      href="/project/video-maker"
                      gradient="from-pink-500 to-rose-500"
                    />
                    <QuickActionButton 
                      icon={<Sparkles className="w-4 h-4" />}
                      label="Generate Content"
                      href={projects.data?.[0] ? `/project/${projects.data[0].id}?tab=generate` : "/project"}
                      gradient="from-cyan-500 to-blue-500"
                    />
                    <QuickActionButton 
                      icon={<Calendar className="w-4 h-4" />}
                      label="View Calendar"
                      href="/project/dashboard"
                      gradient="from-emerald-500 to-teal-500"
                    />
                  </div>
                </BentoCard>
              </section>

              {/* Stay Ahead / Suggestions */}
              {groupedItems.suggestions.length > 0 && (
                <section>
                  <BentoCard className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40 border-blue-200/50 dark:border-blue-800/50">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25">
                        <Lightbulb className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">Stay Ahead</h2>
                        <p className="text-sm text-muted-foreground">{groupedItems.suggestions.length} suggestions</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {groupedItems.suggestions.slice(0, 3).map((item) => (
                        <SuggestionRow key={item.id} item={item} />
                      ))}
                    </div>
                  </BentoCard>
                </section>
              )}

              {/* Recent Activity */}
              {groupedItems.activity.length > 0 && (
                <section>
                  <BentoCard className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/60 dark:to-gray-900/60 border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-500 to-gray-500 text-white shadow-lg shadow-slate-500/25">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">Recent Activity</h2>
                        <p className="text-sm text-muted-foreground">Latest updates</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {groupedItems.activity.slice(0, 3).map((item) => (
                        <ActivityRow key={item.id} item={item} />
                      ))}
                    </div>
                  </BentoCard>
                </section>
              )}

              {/* Projects Overview */}
              {projects.data && projects.data.length > 0 && (
                <section className="md:col-span-2 lg:col-span-1">
                  <BentoCard className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-emerald-200/50 dark:border-emerald-800/50">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
                          <Folder className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-semibold">Your Projects</h2>
                      </div>
                      <Badge variant="secondary">{projects.data.length}</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {projects.data.slice(0, 4).map((project) => (
                        <Link 
                          key={project.id}
                          href={`/project/${project.id}`}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/60 dark:hover:bg-white/5 transition-colors group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white text-sm font-medium">
                            {project.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="flex-1 text-sm font-medium truncate">{project.name}</span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      ))}
                    </div>
                  </BentoCard>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components

function getGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  let timeGreeting = "Good morning";
  if (hour >= 12 && hour < 17) timeGreeting = "Good afternoon";
  else if (hour >= 17) timeGreeting = "Good evening";
  
  const firstName = name?.split(' ')[0];
  return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
}

function QuickStatPill({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-semibold">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function BentoCard({ 
  children, 
  className,
  onMouseEnter,
  onMouseLeave
}: { 
  children: React.ReactNode; 
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div 
      className={cn(
        "p-6 rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-0.5",
        className
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

function UrgentCard({ item }: { item: TimelineItem }) {
  const router = useRouter();
  
  const handleClick = () => {
    if (item.action?.href) {
      router.push(item.action.href);
    } else if (item.projects?.[0]) {
      router.push(item.projects[0].href);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 text-white cursor-pointer shadow-xl shadow-red-500/25 hover:shadow-2xl hover:shadow-red-500/30 transition-all hover:-translate-y-0.5"
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
            <span className="text-2xl">{item.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <Badge className="bg-white/20 text-white border-0">Urgent</Badge>
            </div>
            {item.description && (
              <p className="text-white/80 text-sm mt-1">{item.description}</p>
            )}
          </div>
        </div>
        
        <Button variant="secondary" className="bg-white text-red-600 hover:bg-white/90 shadow-lg">
          Take Action
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function ActionItemRow({ item }: { item: TimelineItem }) {
  const router = useRouter();
  
  const handleClick = () => {
    if (item.action?.href) {
      router.push(item.action.href);
    } else if (item.projects?.[0]) {
      router.push(item.projects[0].href);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 cursor-pointer transition-all group"
    >
      <span className="text-xl">{item.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        )}
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function QuickActionButton({ 
  icon, 
  label, 
  href, 
  gradient 
}: { 
  icon: React.ReactNode; 
  label: string; 
  href: string; 
  gradient: string;
}) {
  return (
    <Link 
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all group"
    >
      <div className={cn("p-2 rounded-lg bg-gradient-to-br text-white", gradient)}>
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

function SuggestionRow({ item }: { item: TimelineItem }) {
  const router = useRouter();
  
  const handleClick = () => {
    if (item.action?.href) {
      router.push(item.action.href);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/60 dark:hover:bg-white/5 cursor-pointer transition-all group"
    >
      <span className="text-lg">{item.icon}</span>
      <p className="flex-1 text-sm truncate">{item.title}</p>
      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function ActivityRow({ item }: { item: TimelineItem }) {
  const router = useRouter();
  
  const handleClick = () => {
    if (item.action?.href) {
      router.push(item.action.href);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/60 dark:hover:bg-white/5 cursor-pointer transition-all group"
    >
      <span className="text-lg">{item.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{item.title}</p>
        {item.timestamp && (
          <p className="text-xs text-muted-foreground">{format(item.timestamp, "h:mm a")}</p>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-lg">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
        You&apos;re all caught up!
      </h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        No pending tasks for today. Great job staying on top of your content!
      </p>
      
      <div className="flex flex-wrap gap-3 justify-center">
        <Button asChild className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white border-0 shadow-lg shadow-violet-500/25">
          <Link href="/project/video-maker">
            <Video className="w-4 h-4 mr-2" />
            Create Video
          </Link>
        </Button>
        <Button variant="outline" asChild className="backdrop-blur-sm">
          <Link href="/project/wall">
            <Eye className="w-4 h-4 mr-2" />
            Get Inspired
          </Link>
        </Button>
        <Button variant="outline" asChild className="backdrop-blur-sm">
          <Link href="/project/dashboard">
            <Calendar className="w-4 h-4 mr-2" />
            View Calendar
          </Link>
        </Button>
      </div>
    </div>
  );
}


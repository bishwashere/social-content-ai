"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useSession } from "@/backend-apis/auth/hooks";
import Loading from "@/components/common/loading";
import { AddGuidedProjectModal } from "./_components/add-guided-project-modal";
import { OnboardingModal } from "./_components/onboarding-modal";
import { usePricingModal } from "@/providers/pricing-modal-provider";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { TodayTimelineView } from "./_components/today-timeline-view";
import { GetStartedGuide } from "./_components/get-started-guide";
import { useFocus } from "@/providers/focus-provider";

function getGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  let timeGreeting = "Good morning";
  if (hour >= 12 && hour < 17) timeGreeting = "Good afternoon";
  else if (hour >= 17) timeGreeting = "Good evening";
  
  const firstName = name?.split(' ')[0];
  return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
}

export default function Home() {
  const router = useRouter();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const { isLoading: sessionLoading, isError: sessionError, data: session } = useSession();
  const projects = useGetAllProjects();
  const { open: pricingModalOpen } = usePricingModal();
  const { focusContext } = useFocus();
  const onboardingShownRef = useRef(false);
  const projectSelectionCallbackRef = useRef<((projectId: string) => void) | null>(null);
  
  // Determine if user is new (has fewer than 3 projects)
  const isNewUser = (projects.data?.length ?? 0) < 3;
  const greeting = getGreeting(session?.user?.name);

  // Redirect if not authenticated (SessionProvider should handle this, but this is a safety check)
  useEffect(() => {
    if (!sessionLoading && sessionError) {
      // Use setTimeout to avoid state update during render
      const timer = setTimeout(() => {
        router.replace("/");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [sessionLoading, sessionError, router]);

  // Auto-open onboarding modal for first-time users (zero projects)
  // Show onboarding FIRST, before any pricing/trial modals
  useEffect(() => {
    if (sessionLoading || sessionError) return;
    if (projects.isLoading) return;
    
    // NEVER show onboarding if pricing modal is currently open
    if (pricingModalOpen) {
      setOnboardingOpen(false);
      return;
    }
    
    // Check if user has zero projects
    if (projects.data?.length === 0) {
      // Show onboarding immediately for first-time users
      if (!onboardingShownRef.current) {
        // Small delay to ensure UI is ready
        const timer = setTimeout(() => {
          setOnboardingOpen(true);
          onboardingShownRef.current = true;
        }, 300);
        return () => clearTimeout(timer);
      }
    } else if (projects.data && projects.data.length > 0) {
      // Reset the ref when user has projects (allows modal to show again if they delete all projects)
      onboardingShownRef.current = false;
      // Close modal if it's open (in case projects were created outside the modal)
      if (onboardingOpen) {
        setOnboardingOpen(false);
      }
    }
  }, [projects.isLoading, projects.data, sessionLoading, sessionError, onboardingOpen, pricingModalOpen]);

  const handleProjectCreated = (projectId: string) => {
    setOnboardingOpen(false);
    onboardingShownRef.current = false;
    if (projectSelectionCallbackRef.current) {
      projectSelectionCallbackRef.current(projectId);
    }
    setTimeout(() => {
      router.push(`/project/${projectId}?tab=campaign&autoplay=1`);
    }, 400);
  };

  // Show loading while session is being checked
  if (sessionLoading) {
    return <Loading className="h-screen" />;
  }

  // Don't render if not authenticated - SessionProvider will redirect
  if (sessionError) {
    return null;
  }

  // Handle case when query is disabled (user not authenticated)
  // This should not happen if session check passes, but handle it gracefully
  if (!projects.isLoading && !projects.data && projects.error) {
    return <Loading className="h-screen" />;
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-violet-400/20 to-fuchsia-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl 2xl:max-w-[90%] mx-auto py-6 px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20">
        <div className="space-y-6">
          {/* Header with greeting and date - always at the top */}
          <header className="mb-2">
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
                {focusContext.campaignName && (
                  <span className="text-muted-foreground">• {focusContext.campaignName}</span>
                )}
              </p>
            )}
          </header>

          {/* Show GetStartedGuide only for new users */}
          {isNewUser && <GetStartedGuide />}
          
          {/* Unified Today Timeline View - replaces YourTodayPanel, PendingTasksPanel, RecentActivityFeed */}
          <TodayTimelineView showGetStartedGuide={isNewUser} />
        </div>
        
        <AddGuidedProjectModal />
        <OnboardingModal 
          open={onboardingOpen} 
          onProjectCreated={handleProjectCreated}
          onClose={() => setOnboardingOpen(false)}
        />
      </div>
    </div>
  );
}

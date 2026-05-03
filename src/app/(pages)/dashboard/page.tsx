"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Lock } from "lucide-react";
import Cookie from "js-cookie";
import { useSession } from "@/backend-apis/auth/hooks";
import Loading from "@/components/common/loading";
import { AddGuidedProjectModal } from "./_components/add-guided-project-modal";
import { OnboardingModal } from "./_components/onboarding-modal";
import { usePricingModal } from "@/providers/pricing-modal-provider";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { TodayTimelineView } from "./_components/today-timeline-view";
import { GetStartedGuide } from "./_components/get-started-guide";
import { useFocus } from "@/providers/focus-provider";
import { cn } from "@/lib/cn";
import { VoiceInput } from "./_components/voice-input";
import { DashboardChat, type DashboardChatMode } from "./_components/dashboard-chat";
import { useWidgetVisibility } from "@/providers/widget-visibility-provider";
import { AdminQuickLinks } from "./_components/admin-quick-links";
import { DashboardIntroTour } from "@/components/common/dashboard-intro-tour";
import { isSubscriptionExpired } from "@/lib/sub";
import { AUTH_TOKEN_COOKIE_NAME, FREE_DASHBOARD_CHAT_SESSIONS } from "@/constants/common";

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
  const { open: pricingModalOpen, setOpen: setPricingModalOpen } = usePricingModal();
  const { focusContext } = useFocus();
  const { hideFeatureRequest, showFeatureRequest } = useWidgetVisibility();
  const onboardingShownRef = useRef(false);
  const projectSelectionCallbackRef = useRef<((projectId: string) => void) | null>(null);
  const [chatMode, setChatMode] = useState(false);
  const [chatFlowType, setChatFlowType] = useState<DashboardChatMode>("chat");
  const [initialChatMessage, setInitialChatMessage] = useState("");
  const [sessionLimitReached, setSessionLimitReached] = useState(false);
  const [dashboardIntroOpen, setDashboardIntroOpen] = useState(false);
  const introShownRef = useRef(false);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine if user is new (has fewer than 3 projects)
  const isNewUser = (projects.data?.length ?? 0) < 3;
  const greeting = getGreeting(session?.user?.name);

  // Compute premium status and session limit on the client from cached session data
  useEffect(() => {
    if (sessionLoading || !session) return;
    const sub = session.subscription;
    const hasPremium =
      !!sub && !isSubscriptionExpired(sub.endsAt).isExpired;
    if (!hasPremium) {
      const used = (session.user as { dashboardChatSessionsUsed?: number })
        ?.dashboardChatSessionsUsed ?? 0;
      if (used >= FREE_DASHBOARD_CHAT_SESSIONS) {
        setSessionLimitReached(true);
      }
    }
  }, [session, sessionLoading]);

  // Show the one-time dashboard intro after the user has at least 1 project
  // (meaning they've been through onboarding and demo — complete or cancelled).
  // Guard: don't show while the onboarding or pricing modals are still open.
  //
  // IMPORTANT: the timer is stored in introTimerRef and is NOT cleared in this
  // effect's own cleanup — only on component unmount.  Without this, React
  // Query's stale-while-revalidate background refetch gives `session` a new
  // object reference on client-side navigation, causing the effect cleanup to
  // fire and cancel the timer before it can open the tour.
  useEffect(() => {
    if (introShownRef.current) return;
    if (sessionLoading || sessionError) return;
    if (projects.isLoading) return;
    if (pricingModalOpen || onboardingOpen) return;
    if (!session) return;

    const hasProjects = (projects.data?.length ?? 0) >= 1;
    const alreadySeen = (session?.user as { dashboardIntroShown?: boolean })
      ?.dashboardIntroShown ?? false;

    if (hasProjects && !alreadySeen) {
      introShownRef.current = true;
      // Store in ref — not cleared on dep-change, only on unmount
      introTimerRef.current = setTimeout(() => setDashboardIntroOpen(true), 600);
    }
  }, [
    sessionLoading,
    sessionError,
    projects.isLoading,
    projects.data,
    session,
    pricingModalOpen,
    onboardingOpen,
  ]);

  // Clean up intro timer only when the component unmounts
  useEffect(() => {
    return () => {
      if (introTimerRef.current) clearTimeout(introTimerRef.current);
    };
  }, []);

  const handleChatSubmit = useCallback(async (text: string, mode: DashboardChatMode = "chat") => {
    if (sessionLimitReached) return;

    const token = Cookie.get(AUTH_TOKEN_COOKIE_NAME);
    try {
      const res = await fetch("/api/dashboard-chat/session/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.status === 403) {
        setSessionLimitReached(true);
        return;
      }
    } catch {
      // Network error – still allow entry to avoid blocking the user
    }

    setInitialChatMessage(text);
    setChatFlowType(mode);
    setChatMode(true);
  }, [sessionLimitReached]);

  const handleBackToDashboard = useCallback(() => {
    setChatMode(false);
    setChatFlowType("chat");
    setInitialChatMessage("");
  }, []);

  // Hide the feature-request widget while the chat is active
  useEffect(() => {
    if (chatMode) {
      hideFeatureRequest();
    } else {
      showFeatureRequest();
    }
    return () => showFeatureRequest();
  }, [chatMode, hideFeatureRequest, showFeatureRequest]);

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

    // Only trigger autoplay demo when:
    // 1. User hasn't completed the demo before, and
    // 2. This is the first project they're seeing (no other owned or invited projects).
    // If they were already working on someone else's project and just created their first own project, skip the demo.
    const hasCreatedDemoCampaign = session?.user?.demoCampaignCreated;
    const totalProjectsCount = projects.data?.length ?? 0;
    const isFirstProjectEver = totalProjectsCount <= 1; // 0 = stale cache before refetch, 1 = only this new project
    const shouldShowDemo = !hasCreatedDemoCampaign && isFirstProjectEver;

    const targetUrl = shouldShowDemo
      ? `/project/${projectId}?tab=campaign&autoplay=1&fromOnboarding=1`
      : `/project/${projectId}?tab=campaign`;

    setTimeout(() => {
      router.push(targetUrl);
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

      <div className={cn(
        "relative max-w-7xl 2xl:max-w-[90%] mx-auto px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20",
        chatMode ? "py-2" : "py-6"
      )}>
        {chatMode ? (
          /* Chat Mode - full conversation view, account for header (h-16 + mb-5) + padding */
          <div className="flex flex-col" style={{ height: "calc(100vh - 7.5rem)" }}>
            <DashboardChat
              initialMessage={initialChatMessage}
              onBack={handleBackToDashboard}
              userName={session?.user?.name}
              mode={chatFlowType}
            />
          </div>
        ) : (
          /* Dashboard Mode - normal view */
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

            {/* Voice Input - Whisper transcription with waveform animation */}
            <div data-dashboard-section="ai-input" className="space-y-3">
            <VoiceInput onSubmit={handleChatSubmit} disabled={sessionLimitReached} />

            {/* Quick suggestion bubbles */}
            <div className="flex items-center gap-2 -mt-3">
              <button
                onClick={() => !sessionLimitReached && handleChatSubmit("Start a project", "start-project")}
                disabled={sessionLimitReached}
                className={cn(
                  "px-4 py-2 rounded-full border border-border bg-card/60 backdrop-blur-sm text-sm text-muted-foreground transition-all duration-200 shadow-sm",
                  sessionLimitReached
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:text-foreground hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:shadow"
                )}
              >
                Start a project
              </button>
              <button
                onClick={() => !sessionLimitReached && handleChatSubmit("Help me brainstorm a new project idea")}
                disabled={sessionLimitReached}
                className={cn(
                  "px-4 py-2 rounded-full border border-border bg-card/60 backdrop-blur-sm text-sm text-muted-foreground transition-all duration-200 shadow-sm",
                  sessionLimitReached
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:text-foreground hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:shadow"
                )}
              >
                Brainstorm project idea
              </button>
              <button
                onClick={() => !sessionLimitReached && handleChatSubmit("Help me brainstorm a new content idea")}
                disabled={sessionLimitReached}
                className={cn(
                  "px-4 py-2 rounded-full border border-border bg-card/60 backdrop-blur-sm text-sm text-muted-foreground transition-all duration-200 shadow-sm",
                  sessionLimitReached
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:text-foreground hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:shadow"
                )}
              >
                Brainstorm content idea
              </button>
              <AdminQuickLinks isInternalAdmin={session?.isInternalAdmin} />
            </div>

            {/* Session limit upgrade banner */}
            {sessionLimitReached && (
              <div className="-mt-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  You&apos;ve used your {FREE_DASHBOARD_CHAT_SESSIONS} free chat sessions.{" "}
                  <button
                    onClick={() => setPricingModalOpen(true)}
                    className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
                  >
                    Get premium
                  </button>{" "}
                  to have more access.
                </p>
              </div>
            )}
            </div>{/* end ai-input */}

            {/* Show GetStartedGuide only for new users */}
            {isNewUser && (
              <div data-dashboard-section="get-started">
                <GetStartedGuide />
              </div>
            )}
            
            {/* Unified Today Timeline View - replaces YourTodayPanel, PendingTasksPanel, RecentActivityFeed */}
            <TodayTimelineView showGetStartedGuide={isNewUser} />
          </div>
        )}
        
        <AddGuidedProjectModal />
        <OnboardingModal 
          open={onboardingOpen} 
          onProjectCreated={handleProjectCreated}
          onClose={() => setOnboardingOpen(false)}
        />
        <DashboardIntroTour
          isOpen={dashboardIntroOpen}
          onClose={() => setDashboardIntroOpen(false)}
        />
      </div>
    </div>
  );
}

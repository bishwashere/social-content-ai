"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/backend-apis/auth/hooks";
import Loading from "@/components/common/loading";
import { AddGuidedProjectModal } from "./_components/add-guided-project-modal";
import { OnboardingModal } from "./_components/onboarding-modal";
import { usePricingModal } from "@/providers/pricing-modal-provider";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { TodayTimelineView } from "./_components/today-timeline-view";
import { GetStartedGuide } from "./_components/get-started-guide";

export default function Home() {
  const router = useRouter();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const { isLoading: sessionLoading, isError: sessionError } = useSession();
  const projects = useGetAllProjects();
  const { open: pricingModalOpen } = usePricingModal();
  const onboardingShownRef = useRef(false);
  const pricingModalWasOpenRef = useRef(false);
  const projectSelectionCallbackRef = useRef<((projectId: string) => void) | null>(null);

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

  // Track when pricing modal opens/closes
  // This ensures payment screen always shows first, before onboarding
  useEffect(() => {
    if (pricingModalOpen) {
      pricingModalWasOpenRef.current = true;
      setOnboardingOpen(false); // Always close onboarding when pricing modal opens
      onboardingShownRef.current = false; // Reset so onboarding can show after payment modal closes
    }
  }, [pricingModalOpen]);

  // Auto-open onboarding modal for first-time users (zero projects)
  // BUT only after payment wall is handled (pricing modal has been closed)
  useEffect(() => {
    if (sessionLoading || sessionError) return;
    if (projects.isLoading) return;
    
    // NEVER show onboarding if pricing modal is currently open (payment wall must show first)
    if (pricingModalOpen) {
      setOnboardingOpen(false);
      return;
    }
    
    // Check if user has zero projects
    if (projects.data?.length === 0) {
      // Only show onboarding if:
      // 1. Pricing modal was opened at some point (user saw payment screen)
      // 2. Pricing modal is now closed (not currently open)
      // 3. Onboarding hasn't been shown yet
      if (pricingModalWasOpenRef.current && !onboardingShownRef.current) {
        // Small delay to ensure pricing modal is fully closed and UI is ready
        const timer = setTimeout(() => {
          setOnboardingOpen(true);
          onboardingShownRef.current = true;
        }, 500);
        return () => clearTimeout(timer);
      }
    } else if (projects.data && projects.data.length > 0) {
      // Reset the refs when user has projects (allows modals to show again if they delete all projects)
      onboardingShownRef.current = false;
      pricingModalWasOpenRef.current = false; // Reset for next time
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
      router.push(`/project/${projectId}`);
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

  // Determine if user is new (has fewer than 3 projects)
  const isNewUser = (projects.data?.length ?? 0) < 3;

  return (
    <div className="flex-grow max-w-4xl mx-auto py-6 px-6 md:px-8 lg:px-12">
      <div className="space-y-6">
        {/* Show GetStartedGuide only for new users */}
        {isNewUser && <GetStartedGuide />}
        
        {/* Unified Today Timeline View - replaces YourTodayPanel, PendingTasksPanel, RecentActivityFeed */}
        <TodayTimelineView />
      </div>
      
      <AddGuidedProjectModal />
      <OnboardingModal 
        open={onboardingOpen} 
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}

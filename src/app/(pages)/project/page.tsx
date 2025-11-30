"use client";
import { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import {
  useGetAllProjects,
} from "@/backend-apis/projects/hooks";
import { useSession } from "@/backend-apis/auth/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import Loading from "@/components/common/loading";
import HomepageProjectDropdown from "./_components/homepage-project-dropdown";
import AdvanceCustomization from "./_components/advance-customization";
import { CompactStatsCards } from "./_components/compact-stats-cards";
import { AddGuidedProjectModal } from "./_components/add-guided-project-modal";
import { OnboardingModal } from "./_components/onboarding-modal";
import { usePricingModal } from "@/providers/pricing-modal-provider";

export default function Home() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [content, setContent] = useState<'normal' | 'advanced'>('normal');
  const { isLoading: sessionLoading, isError: sessionError } = useSession();
  const projects = useGetAllProjects();
  const { open: pricingModalOpen } = usePricingModal();
  const onboardingShownRef = useRef(false);
  const pricingModalWasOpenRef = useRef(false);
  const projectSelectionCallbackRef = useRef<((projectId: string) => void) | null>(null);

  const handleSelectProject = (projectId: string) => {
    router.push(`/project/${projectId}`);
  };

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
    // Reset the ref so modal can show again if user deletes all projects
    onboardingShownRef.current = false;
    // Call the callback to select the project in the dropdown
    if (projectSelectionCallbackRef.current) {
      projectSelectionCallbackRef.current(projectId);
    }
    // Navigate to the newly created project page
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

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        Welcome to NextPostAI!
        <br />
        Select a project from the left to get started, or click &apos;Add Project&apos; to
        create a new one.
      </div>

      {/* Dashboard Top Section */}
      <div className="w-full max-w-6xl mx-auto mb-6 flex justify-center">
        <div className="w-full">
          <CompactStatsCards />
        </div>
      </div>

      {/* Quick Video Maker Card */}
      <div className="w-full max-w-4xl mx-auto">
        <div 
          onClick={() => router.push('/project/video-maker')}
          className="group relative overflow-hidden rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 hover:shadow-xl transition-all duration-300 cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-purple-300/40 transition-colors" />
          <div className="relative p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg group-hover:scale-110 transition-transform">
                <svg 
                  className="w-8 h-8 text-white" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
                  />
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-purple-700 transition-colors">
                  Quick Video Maker
                </h3>
                <p className="text-sm text-gray-600">
                  Create engaging videos in 3 simple steps - no project setup required!
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm group-hover:bg-purple-600 group-hover:text-white transition-all">
              <span className="font-semibold text-sm">Try Now</span>
              <svg 
                className="w-4 h-4 group-hover:translate-x-1 transition-transform" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 5l7 7-7 7" 
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {content === "normal" ?
        <HomepageProjectDropdown onProjectSelectRef={projectSelectionCallbackRef} />
        :
        <AdvanceCustomization />
      }

      <div className="w-full mt-4 flex items-center justify-center">
        {content === "normal" ?
          <p className="text-xs font-medium">Need Advanced Customizations? <button className="text-blue-500" onClick={() => setContent("advanced")}>Click Here</button></p>
          :
          <p className="text-xs font-medium">Want Quick Generate? <button className="text-blue-500" onClick={() => setContent("normal")}>Click Here</button></p>
        }
      </div>


      {/* Floating Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          variant="default"
          size="icon"
          className="rounded-full w-16 h-16 shadow-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
          onClick={() => setOpen(true)}
        >
          <Plus className="w-8 h-4" />
        </Button>
      </div>

      {/* Modal for Project Selection */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>Select a Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {projects.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded-lg" />
              ))
            ) : (projects?.data?.length || 0) > 0 ? (
              projects?.data?.map((project, i) => (
                <Button
                  key={i}
                  className="w-full rounded-lg"
                  onClick={() => handleSelectProject(project.id)}
                >
                  {project.name}
                </Button>
              ))
            ) : (
              <p className="text-center text-gray-500">
                No projects available.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AddGuidedProjectModal />
      <OnboardingModal 
        open={onboardingOpen} 
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}

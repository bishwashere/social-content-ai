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

  // Auto-open onboarding modal for first-time users (zero projects)
  // BUT only after payment wall is handled (pricing modal is closed)
  useEffect(() => {
    if (sessionLoading || sessionError) return;
    if (projects.isLoading) return;
    
    // Don't show onboarding if pricing modal is open (payment wall should show first)
    if (pricingModalOpen) {
      setOnboardingOpen(false);
      // Reset the ref when pricing modal opens so onboarding can show after it closes
      onboardingShownRef.current = false;
      return;
    }
    
    // Check if user has zero projects
    if (projects.data?.length === 0) {
      // Show onboarding after payment modal closes (if user has zero projects)
      if (!onboardingShownRef.current) {
        setOnboardingOpen(true);
        onboardingShownRef.current = true;
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
        Select a project from the left to get started, or click ‘Add Project’ to
        create a new one.
      </div>

      {/* Dashboard Top Section */}
      <div className="w-full max-w-6xl mx-auto mb-6 flex justify-center">
        <div className="w-full">
          <CompactStatsCards />
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

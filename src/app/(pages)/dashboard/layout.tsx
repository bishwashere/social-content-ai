"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { ProjectSidebar } from "./_components/project-sidebar";
import { Header } from "./_components/header";
import { TooltipManagerProvider } from "@/providers/first-view-tooltip-manager";
import { PricingModalProvider } from "@/providers/pricing-modal-provider";
import { FocusProvider } from "@/providers/focus-provider";
import { DashboardTour } from "@/components/common/dashboard-tour";
import { NavigationTour } from "@/components/common/navigation-tour";
import { FoldersTour } from "@/components/common/folders-tour";
import { ProjectsTour } from "@/components/common/projects-tour";
import { Footer } from "./_components/footer";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipManagerProvider>
      <SidebarProvider defaultOpen={true}>
        <PricingModalProvider>
          <FocusProvider>
            <Main>{children}</Main>
          </FocusProvider>
        </PricingModalProvider>
      </SidebarProvider>
    </TooltipManagerProvider>
  );
}

const Main = ({ children }: { children: React.ReactNode }) => {
  const [showTour, setShowTour] = useState(false);
  const [showNavigationTour, setShowNavigationTour] = useState(false);
  const [showFoldersTour, setShowFoldersTour] = useState(false);
  const [showProjectsTour, setShowProjectsTour] = useState(false);
  const elementRefs = useRef<Record<string, HTMLElement | null>>({
    projects: null,
    today: null,
    forYou: null,
    contentPlanner: null,
    analytics: null,
    template: null,
    videoMaker: null,
    myVideos: null,
    subscribe: null,
  });

  const subscribeRef = useRef<HTMLDivElement>(null);
  const sidebar = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarElementRef = useRef<HTMLElement | null>(null);

  // Auto-minimize sidebar after 50 seconds of inactivity
  useEffect(() => {
    // Don't auto-minimize during tours
    const isTourActive = showTour || showNavigationTour || showFoldersTour || showProjectsTour;
    
    // Also check for any active tour/demo overlays in the DOM
    const hasActiveTourOverlay = () => {
      return document.querySelector('[data-tour]') !== null || 
             document.querySelector('[data-demo-active="true"]') !== null;
    };
    
    // Only auto-minimize on desktop (not mobile) and when sidebar is open, visible, and no tour is active
    if (sidebar.isMobile || !sidebar.open || sidebar.hidden || isTourActive) {
      // Clear timer if sidebar is closed/hidden or on mobile or tour is active
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    const resetTimer = () => {
      // Clear existing timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      // Set new timer to close sidebar after 50 seconds
      inactivityTimerRef.current = setTimeout(() => {
        // Double-check no tour is active before closing
        if (sidebar.open && !sidebar.isMobile && !isTourActive && !hasActiveTourOverlay()) {
          sidebar.setOpen(false);
        }
      }, 50000); // 50 seconds
    };

    // Track user interactions
    const handleActivity = () => {
      resetTimer();
    };

    // Find sidebar element to track hover events
    const findSidebarElement = () => {
      // Try to find the sidebar element by its data attribute
      return document.querySelector('[data-sidebar="sidebar"]') as HTMLElement | null;
    };

    // Initial timer
    resetTimer();

    // Listen for user interactions on window
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    // Set up sidebar hover tracking with a small delay to ensure sidebar is rendered
    const setupSidebarTracking = () => {
      const sidebarElement = findSidebarElement();
      if (sidebarElement && !sidebarElementRef.current) {
        // Add event listeners for sidebar hover and mouse events
        sidebarElement.addEventListener("mouseenter", handleActivity);
        sidebarElement.addEventListener("mouseover", handleActivity);
        sidebarElement.addEventListener("mousemove", handleActivity);
        sidebarElementRef.current = sidebarElement;
      }
    };

    // Try to set up immediately, and also after a short delay in case sidebar isn't ready
    setupSidebarTracking();
    const timeoutId = setTimeout(() => {
      setupSidebarTracking();
    }, 100);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      
      // Clean up sidebar event listeners
      if (sidebarElementRef.current) {
        sidebarElementRef.current.removeEventListener("mouseenter", handleActivity);
        sidebarElementRef.current.removeEventListener("mouseover", handleActivity);
        sidebarElementRef.current.removeEventListener("mousemove", handleActivity);
        sidebarElementRef.current = null;
      }
    };
  }, [sidebar.open, sidebar.isMobile, sidebar.setOpen, sidebar.hidden, showTour, showNavigationTour, showFoldersTour, showProjectsTour]);

  // When landing from project page with ?tour=dashboard, start tour after nav completes
  useEffect(() => {
    if (searchParams.get("tour") === "dashboard") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tour");
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
      sidebar.setOpen(true);
      setTimeout(() => {
        if (subscribeRef.current) {
          elementRefs.current.subscribe = subscribeRef.current;
        }
        setShowTour(true);
      }, 400);
    }
  }, [searchParams, pathname, router]);

  const handleTourStart = () => {
    startTour();
  };

  const startTour = () => {
    // Ensure sidebar is open for the tour
    sidebar.setOpen(true);
    
    // Small delay to ensure sidebar is open and elements are rendered
    setTimeout(() => {
      // Update refs from header elements
      if (subscribeRef.current) {
        elementRefs.current.subscribe = subscribeRef.current;
      }
      setShowTour(true);
    }, 300);
  };

  const handleNavigationTourStart = () => {
    // Ensure sidebar is open for the tour
    sidebar.setOpen(true);
    
    // Small delay to ensure sidebar is open and elements are rendered
    setTimeout(() => {
      setShowNavigationTour(true);
    }, 300);
  };

  const handleFoldersTourStart = () => {
    // Ensure sidebar is open for the tour
    sidebar.setOpen(true);
    
    // Small delay to ensure sidebar is open and elements are rendered
    setTimeout(() => {
      setShowFoldersTour(true);
    }, 300);
  };

  const handleProjectsTourStart = () => {
    // Ensure sidebar is open for the tour
    sidebar.setOpen(true);
    
    // Small delay to ensure sidebar is open and elements are rendered
    setTimeout(() => {
      setShowProjectsTour(true);
    }, 300);
  };

  return (
    <>
      <ProjectSidebar 
        elementRefs={elementRefs} 
        onNavigationTourStart={handleNavigationTourStart}
        onFoldersTourStart={handleFoldersTourStart}
        onProjectsTourStart={handleProjectsTourStart}
      />
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-x-hidden">
        {/* Decorative background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-violet-400/20 to-fuchsia-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-3xl" />
        </div>
        <div className="w-full overflow-hidden mb-5 relative">
          <Header 
            onTourStart={handleTourStart}
            subscribeRef={subscribeRef}
          />
        </div>
        <main className="relative overflow-x-hidden">
          {children}
        </main>
        <Footer />
      </div>
      <DashboardTour
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        elementRefs={elementRefs.current}
      />
      <NavigationTour
        isOpen={showNavigationTour}
        onClose={() => setShowNavigationTour(false)}
        elementRefs={elementRefs.current}
      />
      <FoldersTour
        isOpen={showFoldersTour}
        onClose={() => setShowFoldersTour(false)}
      />
      <ProjectsTour
        isOpen={showProjectsTour}
        onClose={() => setShowProjectsTour(false)}
      />
    </>
  );
};

"use client";

import { useState, useRef } from "react";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { ProjectSidebar } from "./_components/project-sidebar";
import { Header } from "./_components/header";
import { TooltipManagerProvider } from "@/providers/first-view-tooltip-manager";
import { PricingModalProvider } from "@/providers/pricing-modal-provider";
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
          <Main>{children}</Main>
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
    addProject: null,
    forYou: null,
    contentPlanner: null,
    analytics: null,
    template: null,
    videoMaker: null,
    myVideos: null,
    connectSocials: null,
    subscribe: null,
  });

  const connectSocialsRef = useRef<HTMLDivElement>(null);
  const subscribeRef = useRef<HTMLDivElement>(null);
  const sidebar = useSidebar();

  const handleTourStart = () => {
    // Ensure sidebar is open for the tour
    sidebar.setOpen(true);
    
    // Small delay to ensure sidebar is open and elements are rendered
    setTimeout(() => {
      // Update refs from header elements
      if (connectSocialsRef.current) {
        elementRefs.current.connectSocials = connectSocialsRef.current;
      }
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
      <div className="w-full">
        <div className="w-full overflow-hidden mb-5">
          <Header 
            onTourStart={handleTourStart}
            connectSocialsRef={connectSocialsRef}
            subscribeRef={subscribeRef}
          />
        </div>
        <main className="">
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

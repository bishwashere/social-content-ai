"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { ProjectSidebar } from "../project/_components/project-sidebar";
import { Header } from "../project/_components/header";
import { TooltipManagerProvider } from "@/providers/first-view-tooltip-manager";
import { PricingModalProvider } from "@/providers/pricing-modal-provider";
import { FocusProvider } from "@/providers/focus-provider";

export default function ProjectTrialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipManagerProvider>
      <SidebarProvider defaultOpen={true}>
        <PricingModalProvider>
          <FocusProvider>
            <ProjectSidebar />
            <div className="w-full">
              <div className="w-full overflow-hidden mb-5">
                <Header />
              </div>
              <main className="">
                {children}
              </main>
            </div>
          </FocusProvider>
        </PricingModalProvider>
      </SidebarProvider>
    </TooltipManagerProvider>
  );
}


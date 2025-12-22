"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipManagerProvider } from "@/providers/first-view-tooltip-manager";
import { PricingModalProvider } from "@/providers/pricing-modal-provider";
import { FocusProvider } from "@/providers/focus-provider";
import { TrialSidebar } from "./_components/trial-sidebar";
import { TrialHeader } from "./_components/trial-header";

export default function ProjectTrialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipManagerProvider>
      <SidebarProvider defaultOpen={true} storageKey="trial_sidebar_state">
        <PricingModalProvider>
          <FocusProvider>
            <div className="flex min-h-screen w-full">
              <TrialSidebar />
              <SidebarInset className="flex flex-col flex-1 min-w-0">
                <TrialHeader />
                <main className="flex-1 min-h-0">
                  {children}
                </main>
              </SidebarInset>
            </div>
          </FocusProvider>
        </PricingModalProvider>
      </SidebarProvider>
    </TooltipManagerProvider>
  );
}

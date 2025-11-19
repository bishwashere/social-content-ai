"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { ProjectSidebar } from "./_components/project-sidebar";
import { Header } from "./_components/header";
import { TooltipManagerProvider } from "@/providers/first-view-tooltip-manager";
import { PricingModalProvider } from "@/providers/pricing-modal-provider";

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

  return (
    <>
      <ProjectSidebar />
      <div className="w-full">
        <div className="w-full overflow-hidden mb-5">
          <Header />
        </div>
        <main className="">
          {children}
        </main>
      </div>
    </>
  );
};

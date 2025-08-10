"use client";

import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { ProjectSidebar } from "./_components/project-sidebar";
import { Header } from "./_components/header";
import { TooltipManagerProvider } from "@/providers/first-view-tooltip-manager";
import { PricingModalProvider } from "@/providers/pricing-modal-provider";
import { Alert, AlertTitle } from "@/components/ui/alert";

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
  const sidebar = useSidebar();

  return (
    <>
      <ProjectSidebar />
      <div className={`w-full ${sidebar.open && !sidebar.isMobile ? `pl-[16rem]` : 'pl-0'}`}>
        <div className="w-full overflow-hidden mb-5">
          <Header />
        </div>
        <main className="">
          <div className="px-6 mb-2 max-w-4xl mx-auto">
            <Alert
              className="cursor-pointer flex items-center gap-2  border-orange-500 px-2 py-2"
            >
              <div className="h-3">
                <AlertTitle className="text-orange-400 text-xs ">
                  Autopost Supported: Facebook, X, Threads, Reddit. Autopost Pending: Linkedin, Instagram
                </AlertTitle>
              </div>
            </Alert>
          </div>
          {children}
        </main>
      </div>
    </>
  );
};

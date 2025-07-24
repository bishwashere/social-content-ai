"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { ProjectSidebar } from "./_components/project-sidebar";
import { Header } from "./_components/header";
import { TooltipManagerProvider } from "@/providers/first-view-tooltip-manager";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipManagerProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="h-screen overflow-auto w-full">
          <ProjectSidebar />
          <Main>{children}</Main>
        </div>
      </SidebarProvider>
    </TooltipManagerProvider>
  );
}

const Main = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full">
      <div className="w-full overflow-hidden">
        <Header />
      </div>
      <main className="flex-grow pt-16 overflow-auto">{children}</main>
    </div>
  );
};

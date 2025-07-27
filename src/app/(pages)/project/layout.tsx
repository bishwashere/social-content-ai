"use client";

import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { ProjectSidebar } from "./_components/project-sidebar";
import { Header } from "./_components/header";
import { TooltipManagerProvider } from "@/providers/first-view-tooltip-manager";
import { useEffect } from "react";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipManagerProvider>
      <SidebarProvider defaultOpen={true}>
        <Main>{children}</Main>
      </SidebarProvider>
    </TooltipManagerProvider>
  );
}

const Main = ({ children }: { children: React.ReactNode }) => {
  const sidebar = useSidebar();

  return (
    <>
      <ProjectSidebar />
      <div className={`w-full ${sidebar.open ? `pl-[${sidebar.width.trim()}]` : 'pl-0'}`}>
        <div className="w-full overflow-hidden mb-5">
          <Header />
        </div>
        <main className="">{children}</main>
      </div>
    </>
  );
};

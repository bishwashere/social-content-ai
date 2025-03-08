"use client";

import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { ProjectSidebar } from "./_components/project-sidebar";
import { Header } from "./_components/header";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="h-screen overflow-auto w-full">
        <ProjectSidebar />
        <Main>{children}</Main>
      </div>
    </SidebarProvider>
  );
}

const Main = ({ children }: { children: React.ReactNode }) => {
  return (<div className="w-full"
  >
    <Header />
    <main className="flex-grow pt-16 overflow-auto">{children}</main>
  </div>)
}
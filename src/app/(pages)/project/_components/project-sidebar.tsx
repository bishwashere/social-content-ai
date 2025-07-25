"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  FolderOpen,
  Folder,
  ChevronDown,
  ChevronRight,
  PlusCircleIcon,
  Users2Icon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddProjectButton } from "./add-project-button";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/backend-apis/auth/hooks";
import { ProjectWithChats } from "@/backend-apis/projects/types";
import FirstViewTooltip from "@/components/common/first-view-tooltip";

export function ProjectSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const [openSections, setOpenSections] = React.useState<string[]>([
    params.id?.toString() || "",
  ]);

  const handleSectionToggle = (value: string) => {
    setOpenSections((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };
  const { data: projects, isLoading } = useGetAllProjects();
  const { toggleSidebar } = useSidebar()

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b p-4">
        <AddProjectButton />
      </SidebarHeader>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <SidebarContent className="p-2">
          <Link
            onClick={toggleSidebar}
            href="/project/wall"
            className="block rounded-md px-3 py-2 text-sm font-medium text-left bg-gray-100 hover:bg-gray-200 mb-3"
          >
            👥 For You
          </Link>
          {/* Dashboard Link */}
          <FirstViewTooltip tooltipKey="contentPlanner" order={3} content="You can log what was posted here along with date. This helps you plan for future posts.">
            <Link
              onClick={toggleSidebar}
              href="/project/dashboard"
              className="block rounded-md px-3 py-2 text-sm font-medium text-left bg-gray-100 hover:bg-gray-200 mb-3"
            >
              📊 Content Planner
            </Link>
          </FirstViewTooltip>
          {/* Projects */}
          <p className="text-sm font-semibold px-2">Projects</p>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))
            : projects?.map((project) => (
              <ProjectItem
                key={project._id}
                project={project}
                isOpen={openSections.includes(project._id)}
                onToggle={() => handleSectionToggle(project._id)}
                currentPath={pathname}
              />
            ))}
        </SidebarContent>
      </ScrollArea>
    </Sidebar>
  );
}

interface ProjectItemProps {
  project: ProjectWithChats;
  isOpen: boolean;
  onToggle: () => void;
  currentPath: string;
}

function ProjectItem({
  project,
  isOpen,
  onToggle,
  currentPath,
}: ProjectItemProps) {
  const router = useRouter();
  const { data } = useSession();

  const activeProjectId = (path: string) => {
    const match = path.match(/project\/([^/]+)/);
    return match ? match[1] : null;
  };

  const { toggleSidebar } = useSidebar()

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger
        className="w-[calc(var(--sidebar-width)-1rem)]"
        onClick={() => router.push(`/project/${project._id}`)}
      >
        <div
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-200",
            activeProjectId(currentPath) === project._id &&
            "bg-gray-200",
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {isOpen ? (
              <FolderOpen className="h-4 w-4 shrink-0" />
            ) : (
              <Folder className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium truncate">{project.name}</span>
          </div>

          <div className="flex items-center gap-2">
            {data?.user?._id !== project.userId && (
              <Users2Icon className="h-4 w-4 shrink-0 opacity-50" />
            )}
            {isOpen ? (
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 px-3 py-2">
        <Link
          onClick={toggleSidebar}
          href={`/project/${project._id}`}
          className={cn(
            "rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground flex gap-2 items-center",
            currentPath === `/project/${project._id}` &&
            "bg-accent text-accent-foreground",
          )}
        >
          Create new post <PlusCircleIcon className="h-4 w-4 shrink-0" />
        </Link>
        {project.chats?.map((chat) => (
          <Link
            onClick={toggleSidebar}
            key={chat._id}
            href={`/project/${project._id}/chat/${chat._id}`}
            className={cn(
              "block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
              currentPath === `/project/${project._id}/chat/${chat._id}` &&
              "bg-accent text-accent-foreground",
            )}
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-current opacity-60" />
              <span className="truncate max-w-[150px]">{chat.title}</span>
            </div>
          </Link>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

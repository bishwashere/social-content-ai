"use client";

import { Suspense, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAllProjects, useGetProjectPulse } from "@/backend-apis/projects/hooks";
import { Projects as Project } from "@prisma/client";
import QuickGenerate from "./_components/quick-generate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignPlannerPage from "./_components/campaing-planner";
import History from "./_components/history";
import { Media } from "./_components/media";
import { ScheduledPosts } from "./_components/scheduled-posts";
import ProjectPulseMetrics from "./_components/project-pulse-metrics";
import ProjectAnalytics from "./_components/project-analytics";

const TAB_VALUES = ["generate", "campaign", "history", "media", "scheduled", "analytics"] as const;

function ProjectPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const projects = useGetAllProjects();
  const project = useMemo(
    () => projects?.data?.find((p: Project) => p.id === id) || null,
    [projects?.data, id]
  );

  const currentTab = useMemo(() => {
    const tab = searchParams.get("tab");
    if (TAB_VALUES.includes(tab as any)) return tab as typeof TAB_VALUES[number];
    return "generate";
  }, [searchParams]);

  const handleTabChange = (tab: typeof TAB_VALUES[number]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${window.location.pathname}?${params.toString()}`);
    localStorage.setItem("projectTab", tab);
  };

  const { data: projectPulse } = useGetProjectPulse(id as string);

  console.log(projectPulse)

  if (projects.isLoading)
    return (
      <div className="p-6 space-y-6 items-center justify-center">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );

  if (!project)
    return (
      <Card className="flex flex-wrap gap-2 items-center">
        <CardHeader>
          <CardTitle className="text-destructive">Project Not Found</CardTitle>
          <CardDescription>
            The project you&apos;re looking for doesn&apos;t exist or has been deleted.
          </CardDescription>
        </CardHeader>
      </Card>
    );

  return (
    <div className="flex-grow max-w-5xl mx-auto py-6 px-6 md:px-14 xl:px-20 space-y-6 -mt-5">
      {projectPulse && <ProjectPulseMetrics projectPulse={projectPulse} />}
      <Tabs value={currentTab} className="w-full">
        <TabsList className="flex flex-wrap w-full h-fit">
          <TabsTrigger value="generate" onClick={() => handleTabChange("generate")}>
            Quick Generate
          </TabsTrigger>
          <TabsTrigger value="campaign" onClick={() => handleTabChange("campaign")}>
            Campaign Planner
          </TabsTrigger>
          <TabsTrigger value="history" onClick={() => handleTabChange("history")}>
            History
          </TabsTrigger>
          <TabsTrigger value="media" onClick={() => handleTabChange("media")}>
            Media
          </TabsTrigger>
          <TabsTrigger value="scheduled" onClick={() => handleTabChange("scheduled")}>
            Scheduled Posts
          </TabsTrigger>
          <TabsTrigger value="analytics" onClick={() => handleTabChange("analytics")}>
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <QuickGenerate project={project} />
        </TabsContent>
        <TabsContent value="campaign">
          <CampaignPlannerPage project={project} />
        </TabsContent>
        <TabsContent value="history">
          <History project={project} />
        </TabsContent>
        <TabsContent value="media">
          <Media project={project} />
        </TabsContent>
        <TabsContent value="scheduled">
          <ScheduledPosts project={project} />
        </TabsContent>
        <TabsContent value="analytics">
          <ProjectAnalytics projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ProjectPage />
    </Suspense>
  );
}

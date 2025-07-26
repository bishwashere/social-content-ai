"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetAllProjects,
} from "@/backend-apis/projects/hooks";
import { Project } from "@/db/projects/schema/project";
import QuickGenerate from "./_components/quick-generate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignPlannerPage from "./_components/campaing-planner";
import History from "./_components/history";
import { Media } from "./_components/media";

export default function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const projects = useGetAllProjects();

  useEffect(() => {
    const fetchProject = () => {
      const currentProject = projects?.data?.find((p: Project) => p._id === id);
      setProject(currentProject || null);
      setLoading(false);
    };

    fetchProject();
  }, [id, project, projects?.data]);

  const [defaultTab, setDefaultTab] = useState<'generate' | 'campaign' | 'history'>();

  useEffect(() => {
    const defaultLocalTab = localStorage.getItem("projectTab") as 'generate' | 'campaign' | 'history' | undefined;
    setDefaultTab(defaultLocalTab || "generate");
  }, [])

  if (defaultTab)
    return (
      <div className="flex-grow max-w-3xl mx-auto items-center justify-center md:ml-64 lg:ml-72 p-6 space-y-6 -mt-10">
        {loading || projects.isLoading ? (
          <div className="p-6 space-y-6 items-center justify-center">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !project ? (
          <Card className="flex flex-wrap gap-2 items-center ">
            <CardHeader>
              <CardTitle className="text-destructive">
                Project Not Found
              </CardTitle>
              <CardDescription>
                The project you&apos;re looking for doesn&apos;t exist or has been
                deleted.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="mb-5">
              <TabsTrigger value="generate" onClick={() => localStorage.setItem("projectTab", "generate")}>Quick Generate</TabsTrigger>
              <TabsTrigger value="campaign" onClick={() => localStorage.setItem("projectTab", "campaign")}>Campaign Planner</TabsTrigger>
              <TabsTrigger value="history" onClick={() => localStorage.setItem("projectTab", "history")}>History</TabsTrigger>
              <TabsTrigger value="media" onClick={() => localStorage.setItem("projectTab", "media")}>Media Uploads</TabsTrigger>
            </TabsList>
            <TabsContent value="generate"><QuickGenerate /></TabsContent>
            <TabsContent value="campaign"><CampaignPlannerPage project={project!} /></TabsContent>
            <TabsContent value="history"><History project={project!} /></TabsContent>
            <TabsContent value="media"><Media project={project!} /></TabsContent>
          </Tabs>
        )}
      </div>
    );
}

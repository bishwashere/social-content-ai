"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
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
import { useGetCampaignPlanner } from "@/backend-apis/campaign-planner/hooks";
import QuickGenerate from "./_components/quick-generate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignPlannerPage from "./_components/campaign-planner";
import History from "./_components/history";
import { Media } from "./_components/media";
import { ScheduledPosts } from "./_components/scheduled-posts";
import ProjectPulseMetrics from "./_components/project-pulse-metrics";
import { ProjectSocialConnectionAlert } from "./_components/project-social-connection-alert";
import AdvanceCustomization from "@/app/(pages)/dashboard/_components/advance-customization";
import { ProjectAnalyticsDashboard } from "./_components/project-analytics-dashboard";
import { ProjectTools } from "./_components/project-tools-stepbystep";

const TAB_VALUES = ["generate", "campaign", "media", "scheduled", "tools"] as const;
const STORAGE_KEY = "lastProjectTab";

function ProjectPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [contentMode, setContentMode] = useState<'normal' | 'advanced'>('normal');
  const [isInitialized, setIsInitialized] = useState(false);

  const projects = useGetAllProjects();
  const project = useMemo(
    () => projects?.data?.find((p: Project) => p.id === id) || null,
    [projects?.data, id]
  );

  const isProjectLessThanOneDayOld = useMemo(() => {
    if (!project?.createdAt) return false;
    const createdAtMs =
      project.createdAt instanceof Date
        ? project.createdAt.getTime()
        : new Date(project.createdAt as any).getTime();
    if (!Number.isFinite(createdAtMs)) return false;
    return Date.now() - createdAtMs < 24 * 60 * 60 * 1000;
  }, [project?.createdAt]);

  // Call campaign planner query here to track its status (React Query will deduplicate)
  // This allows us to check when it completes before loading project pulse
  // React Query automatically refetches when projectId changes (via query key dependency)
  const campaignPlannerQuery = useGetCampaignPlanner({
    projectId: id as string,
    loadChats: false,
    limit: 3,
  });
  
  // Only enable project pulse after campaign planner has completed
  const campaignPlannerCompleted = 
    campaignPlannerQuery.status === "success" || 
    campaignPlannerQuery.status === "error";

  // Handle "history" and "analytics" tab redirects (history is now part of generate tab, analytics removed)
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab === "history" || urlTab === "analytics") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "generate");
      router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    }
  }, [searchParams, router]);

  // Restore last visited tab from localStorage if no tab in URL
  useEffect(() => {
    if (isInitialized) return;
    
    const urlTab = searchParams.get("tab");
    if (!urlTab) {
      const savedTab = localStorage.getItem(STORAGE_KEY);
      // If saved tab is "history" or "analytics", redirect to "generate" (history is now part of generate tab, analytics removed)
      if (savedTab === "history" || savedTab === "analytics") {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", "generate");
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
      } else if (savedTab && TAB_VALUES.includes(savedTab as any)) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", savedTab);
        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
      }
    }
    setIsInitialized(true);
  }, [searchParams, router, isInitialized]);

  const currentTab = useMemo(() => {
    const tab = searchParams.get("tab");
    if (TAB_VALUES.includes(tab as any)) return tab as typeof TAB_VALUES[number];
    return "campaign";
  }, [searchParams]);

  // Save tab to localStorage whenever it changes (including via URL)
  useEffect(() => {
    if (currentTab && TAB_VALUES.includes(currentTab as any)) {
      localStorage.setItem(STORAGE_KEY, currentTab);
    }
  }, [currentTab]);

  const handleTabChange = (tab: typeof TAB_VALUES[number]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${window.location.pathname}?${params.toString()}`);
    localStorage.setItem(STORAGE_KEY, tab);
  };

  // Only load project pulse after campaign planner has completed
  const { data: projectPulse } = useGetProjectPulse(
    id as string,
    campaignPlannerCompleted
  );

  console.log(projectPulse)

  // Default project pulse data when no data is available
  const defaultProjectPulse = {
    daysPosted: 0,
    gapDays: 0,
    pulse: 0,
    components: {
      cadence: 0,
      onTime: 0,
      engagement: 0,
      consistency: 0,
      successRate: 0,
      coverage: 0,
      platformDiversity: 0,
      planProgress: 0,
    },
    thiwWeekPostSummaries: {
      posts: 0,
      noPosts: 0,
      likes: 0,
      impressions: 0,
      uniqueImpressions: 0,
      er: 0,
    },
  };

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
    <div className="flex-grow max-w-7xl 2xl:max-w-[90%] mx-auto py-6 px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 space-y-6 -mt-5 overflow-x-hidden">
      <ProjectSocialConnectionAlert projectId={id as string} />
      <Tabs value={currentTab} className="w-full max-w-full overflow-hidden">
        <TabsList className="flex flex-wrap w-full h-fit">
          <TabsTrigger value="campaign" onClick={() => handleTabChange("campaign")}>
            Campaign Planner
          </TabsTrigger>
          <TabsTrigger value="generate" onClick={() => handleTabChange("generate")}>
            Quick Generate
          </TabsTrigger>
          <TabsTrigger value="tools" onClick={() => handleTabChange("tools")}>
            Tools
          </TabsTrigger>
          <TabsTrigger value="media" onClick={() => handleTabChange("media")}>
            Media
          </TabsTrigger>
          <TabsTrigger value="scheduled" onClick={() => handleTabChange("scheduled")}>
            Scheduled Posts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaign">
          {/* Pulse metrics only shown in Campaign Planner */}
          {!isProjectLessThanOneDayOld && (
            <ProjectPulseMetrics projectPulse={projectPulse || defaultProjectPulse} />
          )}
          {/* Project Analytics Dashboard */}
          <div className="mb-6">
            <ProjectAnalyticsDashboard projectId={id as string} />
          </div>
          <CampaignPlannerPage project={project} />
        </TabsContent>
        <TabsContent value="generate">
          {contentMode === "normal" ? (
            <QuickGenerate project={project} />
          ) : (
            <AdvanceCustomization project={project} />
          )}
          <div className="w-full mt-4 flex items-center justify-center">
            {contentMode === "normal" ? (
              <p className="text-xs font-medium">Need Advanced Customizations? <button className="text-blue-500" onClick={() => setContentMode("advanced")}>Click Here</button></p>
            ) : (
              <p className="text-xs font-medium">Want Quick Generate? <button className="text-blue-500" onClick={() => setContentMode("normal")}>Click Here</button></p>
            )}
          </div>
          <div className="w-full mt-6">
            <h2 className="text-2xl font-bold mb-4">History:</h2>
            <History project={project} />
          </div>
        </TabsContent>
        <TabsContent value="media">
          <Media project={project} />
        </TabsContent>
        <TabsContent value="scheduled" className="w-full max-w-full overflow-hidden">
          <ScheduledPosts project={project} />
        </TabsContent>
        <TabsContent value="tools" className="w-full max-w-full overflow-hidden">
          <ProjectTools projectId={id as string} />
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

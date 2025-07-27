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
  useUpdateProject,
} from "@/backend-apis/projects/hooks";
import { Project } from "@/db/projects/schema/project";
import QuickGenerate from "./_components/quick-generate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CampaignPlannerPage from "./_components/campaing-planner";
import History from "./_components/history";
import { Media } from "./_components/media";
import { Settings } from "lucide-react";
import { InviteUserDialog } from "../_components/invite-user";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS } from "@/lib/prompt";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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


  const [showDescription, setShowDescription] = useState(false); // ✅ Define state
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [platformUrls, setPlatformUrls] = useState<Project["platformUrls"]>(
    {} as Project["platformUrls"],
  );
  const updateProject = useUpdateProject();
  useEffect(() => {
    if (project) {
      setEditedName(project.name);
      setEditedDescription(project.description);
    }
  }, [project]); // Runs only when `project` is updated

  useEffect(() => {
    const fetchProject = () => {
      const currentProject = projects?.data?.find((p: Project) => p._id === id);
      setProject(currentProject || null);

      if (project) {
        setEditedName(project.name);
        setEditedDescription(project.description);
        setPlatformUrls((prev) => {
          return {
            ...prev,
            ...project.platformUrls,
          };
        });
      }
    };

    fetchProject();
  }, [id, project, projects?.data]);

  if (defaultTab)
    return (
      <div className="flex-grow max-w-3xl mx-auto items-center justify-center p-6 space-y-6 -mt-5">
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
          <>
            <Card className="flex flex-col gap-2 items-start p-4">
              <div className="relative w-full">
                {/* Settings Icon - Positioned Top Right */}
                {/* Title - Centered */}
                <CardHeader className="flex items-center flex-row justify-between gap-2 w-full px-0">
                  <CardTitle className="text-base sm:text-lg xl:text-xl font-bold break-all ">
                    {project.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowDescription(!showDescription)}
                      className="p-2 rounded-full hover:bg-gray-100 transition"
                    >
                      <Settings className="w-5 h-5 text-gray-500" />
                    </button>

                    <InviteUserDialog />
                  </div>
                </CardHeader>
              </div>

              {/* Toggleable Description */}
              {showDescription && (
                <CardDescription className="p-2 bg-gray-50 rounded-lg w-full">
                  {isEditing ? (
                    <div className="space-y-4">
                      <Input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="w-full"
                        placeholder="Project Name"
                      />
                      <Textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="w-full"
                        placeholder="Project Description"
                      />

                      <div className="grid-cols-2 grid gap-4">
                        {Object.values(PLATFORMS).map((platform) => (
                          <div key={platform} className="flex flex-col gap-2">
                            <Label className="capitalize" htmlFor={platform}>
                              {platform} (optional)
                            </Label>
                            <Input
                              type="text"
                              value={platformUrls?.[platform]}
                              onChange={(e) => {
                                setPlatformUrls((prev) => {
                                  return {
                                    ...prev,
                                    [platform]: e.target.value,
                                  };
                                });
                              }}
                              className="w-full"
                              id={platform}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          className=" w-28"
                          loading={updateProject.isPending}
                          onClick={async () => {
                            try {
                              await updateProject.mutateAsync({
                                _id: project._id,
                                name: editedName,
                                description: editedDescription,
                                platformUrls: platformUrls,
                              });
                            } catch { }
                            setIsEditing(false);
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          variant={"secondary"}
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <p>{project.description}</p>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-2 rounded-full hover:bg-gray-100 transition"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </CardDescription>
              )}
            </Card>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="mb-5">
                <TabsTrigger value="generate" onClick={() => localStorage.setItem("projectTab", "generate")}>Quick Generate</TabsTrigger>
                <TabsTrigger value="campaign" onClick={() => localStorage.setItem("projectTab", "campaign")}>Campaign Planner</TabsTrigger>
                <TabsTrigger value="history" onClick={() => localStorage.setItem("projectTab", "history")}>History</TabsTrigger>
                <TabsTrigger value="media" onClick={() => localStorage.setItem("projectTab", "media")}>Media</TabsTrigger>
              </TabsList>
              <TabsContent value="generate"><QuickGenerate project={project!} /></TabsContent>
              <TabsContent value="campaign"><CampaignPlannerPage project={project!} /></TabsContent>
              <TabsContent value="history"><History project={project!} /></TabsContent>
              <TabsContent value="media"><Media project={project!} /></TabsContent>
            </Tabs>
          </>
        )}
      </div>
    );
}

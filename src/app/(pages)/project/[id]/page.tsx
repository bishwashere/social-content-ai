"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Settings } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAllProjects, useUpdateProject } from "@/backend-apis/projects/hooks";
import { Project } from "@/backend-apis/projects/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ContentGenerator } from "../_components/content-generator";
import { Label } from "@/components/ui/label";


export default function ProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDescription, setShowDescription] = useState(false); // ✅ Define state
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const projects = useGetAllProjects()
  const updateProject = useUpdateProject()
  useEffect(() => {
    if (project) {
      setEditedName(project.name);
      setEditedDescription(project.description);
    }
  }, [project]); // Runs only when `project` is updated

  const [platformUrls, setPlatformUrls] = useState<Project["platformUrls"]>({
    x: "",
    tiktok: "",
    instagram: "",
    facebook: "",
  });


  useEffect(() => {
    const fetchProject = () => {
      const currentProject = projects?.data?.find(
        (p: Project) => p._id === id
      );
      setProject(currentProject || null);
      setLoading(false);

      if (project) {
        setEditedName(project.name);
        setEditedDescription(project.description);
        console.log(project.platformUrls);
        setPlatformUrls({
          x: project.platformUrls?.x || "",
          tiktok: project.platformUrls?.tiktok || "",
          instagram: project.platformUrls?.instagram || "",
          facebook: project.platformUrls?.facebook || "",
        });
      }

    };

    fetchProject();
  }, [id, project, projects?.data]);


  return (
    <div className="flex-grow max-w-3xl mx-auto items-center justify-center px-4 space-y-4">

      {
        loading || projects.isLoading ? (
          <div className="p-6 space-y-6 items-center justify-center">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) :

          !project ? (
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
          )
            :
            <>
              <Card className="flex flex-col gap-2 items-start p-4">

                <div className="relative w-full">
                  {/* Settings Icon - Positioned Top Right */}
                  <button
                    onClick={() => setShowDescription(!showDescription)}
                    className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100 transition"
                  >
                    <Settings className="w-5 h-5 text-gray-500" />
                  </button>

                  {/* Title - Centered */}
                  <CardHeader className="flex items-center justify-center w-full mt-6">
                    <CardTitle className="text-xl font-bold">{project.name}</CardTitle>
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
                          {
                            (["x", "tiktok", "instagram", "facebook"] as const).map((platform) => (
                              <div
                                key={platform}
                                className="flex flex-col gap-2"
                              >
                                <Label
                                  className="capitalize"
                                  htmlFor={platform}
                                >{platform} (optional)
                                </Label>
                                <Input
                                  type="text"
                                  value={platformUrls[platform]}
                                  onChange={(e) => {
                                    setPlatformUrls({
                                      ...platformUrls,
                                      [platform]: e.target.value,
                                    });
                                  }}
                                  className="w-full"
                                  id={platform}
                                />

                              </div>
                            ))
                          }

                        </div>

                        <div className="flex gap-2">
                          <Button
                            className=" w-28"
                            loading={updateProject.isPending}
                            onClick={async () => {
                              await updateProject.mutateAsync({
                                _id: project._id,
                                name: editedName,
                                description: editedDescription,
                                platformUrls: platformUrls
                              });
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

              <ContentGenerator project={project} />
            </>
      }
    </div >
  );
}

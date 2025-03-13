"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { AddProjectButton } from "./_components/add-project-button";

export default function Home() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const projects = useGetAllProjects()

  const handleSelectProject = (projectId: string) => {
    router.push(`/project/${projectId}`);
  };

  return (
    <div className="md:ml-64 lg:ml-72 p-6 space-y-6">
      <div className="text-center">
        Welcome to NextPostAI!<br />
        Select a project from the left to get started, or click ‘Add Project’ to create a new one.
      </div>


      {/* Floating Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          variant="default"
          size="icon"
          className="rounded-full w-16 h-16 shadow-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
          onClick={() => setOpen(true)}
        >
          <Plus className="w-8 h-8" />
        </Button>
      </div>


      <div className="flex justify-center items-center w-full">
        <AddProjectButton />
      </div>


      {/* Modal for Project Selection */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>Select a Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">

            {
              projects.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8" />
                ))
              ) : (
                (projects?.data?.length || 0) > 0 ? (
                  projects?.data?.map((project, i) => (
                    <Button
                      key={i}
                      className="w-full"
                      onClick={() => handleSelectProject(project._id)}
                    >
                      {project.name}
                    </Button>
                  ))
                ) : (
                  <p className="text-center text-gray-500">No projects available.</p>
                )
              )
            }


          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

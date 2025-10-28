"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import {
  useGetAllProjects,
} from "@/backend-apis/projects/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import HomepageProjectDropdown from "./_components/homepage-project-dropdown";
import AdvanceCustomization from "./_components/advance-customization";
import { CompactStatsCards } from "./_components/compact-stats-cards";
import { AddGuidedProjectModal } from "./_components/add-guided-project-modal";

export default function Home() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<'normal' | 'advanced'>('normal');

  const projects = useGetAllProjects();

  const handleSelectProject = (projectId: string) => {
    router.push(`/project/${projectId}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        Welcome to NextPostAI!
        <br />
        Select a project from the left to get started, or click ‘Add Project’ to
        create a new one.
      </div>

      {/* Dashboard Top Section */}
      <div className="w-full max-w-6xl mx-auto mb-6 flex justify-center">
        <div className="w-full">
          <CompactStatsCards />
        </div>
      </div>

      {/* Main Content */}
      {content === "normal" ?
        <HomepageProjectDropdown />
        :
        <AdvanceCustomization />
      }

      <div className="w-full mt-4 flex items-center justify-center">
        {content === "normal" ?
          <p className="text-xs font-medium">Need Advanced Customizations? <button className="text-blue-500" onClick={() => setContent("advanced")}>Click Here</button></p>
          :
          <p className="text-xs font-medium">Want Quick Generate? <button className="text-blue-500" onClick={() => setContent("normal")}>Click Here</button></p>
        }
      </div>


      {/* Floating Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          variant="default"
          size="icon"
          className="rounded-full w-16 h-16 shadow-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
          onClick={() => setOpen(true)}
        >
          <Plus className="w-8 h-4" />
        </Button>
      </div>

      {/* Modal for Project Selection */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>Select a Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {projects.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded-lg" />
              ))
            ) : (projects?.data?.length || 0) > 0 ? (
              projects?.data?.map((project, i) => (
                <Button
                  key={i}
                  className="w-full rounded-lg"
                  onClick={() => handleSelectProject(project.id)}
                >
                  {project.name}
                </Button>
              ))
            ) : (
              <p className="text-center text-gray-500">
                No projects available.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AddGuidedProjectModal />
    </div>
  );
}

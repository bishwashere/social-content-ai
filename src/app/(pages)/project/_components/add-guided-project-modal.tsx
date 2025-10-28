"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle } from "lucide-react";
import { useCreateProject, useGetAllProjects, useGetWebsiteDescription } from "@/backend-apis/projects/hooks";
import FirstViewTooltip from "@/components/common/first-view-tooltip";
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/backend-apis/auth/hooks";
import { isSubscriptionExpired } from "@/lib/sub";

export function AddGuidedProjectModal() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);
  const createProject = useCreateProject();
  const desc = useGetWebsiteDescription()
  const sidebar = useSidebar();
  const { data } = useSession();
  const projects = useGetAllProjects();

  useEffect(() => {
    if (!data) return;
    if (!projects || !projects.data) return;
    if (data.subscription && !isSubscriptionExpired(data.subscription.endsAt).isExpired && !projects.data?.length) {
      setOpen(true);
    }
  }, [data?.subscription, data?.user?.id, projects.data])

  const handleNext = async () => {
    if (step === 1 && url) {
      const description = await desc.mutateAsync(url)
      setDescription(description || "")
    }
    setStep((prev) => prev + 1)
  };
  // const handleBack = () => setStep((prev) => prev - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProject.mutateAsync({ name, url, description });
      setOpen(false);
      setStep(0);
      setName("");
      setUrl("");
      setDescription("");
    } catch { }
  };

  const steps = [
    <div key="getstarted" className="space-y-2 p-10 text-center max-w-md w-full">
      <div className="mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-20 w-20 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m9-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-700 mb-8">Create your first project and start building right away.</h2>
      {/* <p className="text-gray-500 mb-8"></p> */}
    </div>,
    <div key="name" className="space-y-2">
      <Label htmlFor="name">What&apos;s the name of your project?</Label>
      <Input
        id="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Spring Campaign 2025"
        required
      />
    </div>,
    <div key="url" className="space-y-2">
      <Label htmlFor="url">Provide URL linked to it if present?</Label>
      <Input
        id="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://springcampaign2025.com"
      />
    </div>,
    <div key="description" className="space-y-2">
      <Label htmlFor="description">Could you give a brief description of what it’s about?</Label>
      <Textarea
        id="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="A campaign to promote eco-friendly products through creative storytelling"
        className="h-24"
      />
    </div>,
  ];

  return (
    <Dialog open={open} onOpenChange={(value) => {
      setStep(0);
      setName("");
      setUrl("");
      setDescription("");
      setOpen(value);
    }}>
      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {steps[step]}

          {step > 0 ?
            <div className="flex justify-end mt-4">
              {/* {step > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleBack}
              >
                Back
              </Button>
            )} */}

              {step < steps.length - 1 ? (
                <Button
                  className="w-full"
                  type="button"
                  onClick={handleNext}
                  loading={desc.isPending}
                  disabled={
                    (step === 0 && !name) || (step === 1 && !url && false)
                  }
                >
                  Next
                </Button>
              ) : (
                <Button
                  className="w-full"
                  loading={createProject.isPending}
                  disabled={!name || !description}
                  type="submit"
                >
                  Create Project
                </Button>
              )}
            </div>
            :
            <div className="flex items-center justify-center" onClick={handleNext}>
              <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 shadow-md">
                Create One & Get Started
              </button>
            </div>
          }
        </form>
      </DialogContent>
    </Dialog>
  );
}

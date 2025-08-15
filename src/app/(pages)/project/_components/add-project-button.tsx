"use client";

import { useState } from "react";
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
import { useCreateProject, useGetWebsiteDescription } from "@/backend-apis/projects/hooks";
import FirstViewTooltip from "@/components/common/first-view-tooltip";

export function AddProjectButton() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);
  const createProject = useCreateProject();
  const desc = useGetWebsiteDescription()
  const handleNext = async () => {
    if (step === 1 && url) {
      const description = await desc.mutateAsync(url)
      setDescription(description || "")
    }
    setStep((prev) => prev + 1)
  };
  const handleBack = () => setStep((prev) => prev - 1);

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
    <div key="name" className="space-y-2">
      <Label htmlFor="name">Project Name</Label>
      <Input
        id="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Spring Campaign 2025"
        required
      />
    </div>,
    <div key="url" className="space-y-2">
      <Label htmlFor="url">Url</Label>
      <Input
        id="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://springcampaign2025.com"
      />
    </div>,
    <div key="description" className="space-y-2">
      <Label htmlFor="description">Description</Label>
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
      <DialogTrigger asChild>
        <FirstViewTooltip
          tooltipKey="addProject"
          content="Add project to save them permanently and see history of content generated."
          order={1}
        >
          <Button
            className="w-full h-10 text-sm md:h-9 lg:h-8"
            onClick={() => setOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </FirstViewTooltip>
      </DialogTrigger>

      <DialogContent>
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {steps[step]}

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
        </form>
      </DialogContent>
    </Dialog>
  );
}

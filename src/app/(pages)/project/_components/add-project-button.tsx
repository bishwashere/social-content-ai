"use client";

import { useState, useEffect, useRef } from "react";
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
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AddProjectButton() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [textareaHeight, setTextareaHeight] = useState(96); // Default h-24 = 96px
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const createProject = useCreateProject();
  const desc = useGetWebsiteDescription()
  const sidebar = useSidebar()

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current && description) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      // Calculate new height based on content (min 96px, max 300px)
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 96), 300);
      textareaRef.current.style.height = `${newHeight}px`;
      setTextareaHeight(newHeight);
    } else if (textareaRef.current && !description) {
      // Reset to default height when empty
      textareaRef.current.style.height = '96px';
      setTextareaHeight(96);
    }
  }, [description]);

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
        ref={textareaRef}
        id="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="A campaign to promote eco-friendly products through creative storytelling"
        className="min-h-24 resize-none overflow-y-auto"
        style={{ height: `${textareaHeight}px` }}
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={`flex items-center bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors ${
                    sidebar.open 
                      ? 'w-full h-10 text-sm px-4' 
                      : 'h-10 w-10 justify-center p-0'
                  }`}
                  onClick={() => setOpen(true)}
                >
                  <PlusCircle className={sidebar.open ? "mr-2 h-4 w-4" : "h-4 w-4"} />
                  {sidebar.open && <span>Add Project</span>}
                </Button>
              </TooltipTrigger>
              {!sidebar.open && (
                <TooltipContent side="right">
                  Add Project
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
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

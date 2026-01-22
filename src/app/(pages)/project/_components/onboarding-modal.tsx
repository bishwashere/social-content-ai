"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProject, useGetWebsiteDescription } from "@/backend-apis/projects/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useLogout } from "@/backend-apis/auth/hooks";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

type OnboardingModalProps = {
  open: boolean;
  onProjectCreated?: (projectId: string) => void;
  onClose?: () => void;
};

export function OnboardingModal({ open, onProjectCreated, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const createProject = useCreateProject();
  const desc = useGetWebsiteDescription();
  const queryClient = useQueryClient();
  const logout = useLogout();

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setStep(0);
      setName("");
      setUrl("");
      setDescription("");
    }
  }, [open]);

  // Auto-resize textarea based on content - simple and reliable
  useEffect(() => {
    if (step === 2 && textareaRef.current) {
      // Set height to auto first to get accurate scrollHeight
      textareaRef.current.style.height = 'auto';
      // Get the actual content height
      const scrollHeight = textareaRef.current.scrollHeight;
      // Set the height to match content (min 96px)
      const newHeight = Math.max(scrollHeight, 96);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [description, step]);

  const handleNext = async () => {
    // When on URL step (step 1), fetch description before moving to description step
    if (step === 1 && url) {
      try {
        // Ensure URL has a protocol - handle cases like "domain.com", "www.domain.com", etc.
        let urlToFetch = url.trim();
        // Remove any trailing slashes
        urlToFetch = urlToFetch.replace(/\/+$/, '');
        // Add https:// if no protocol is present
        if (!urlToFetch.match(/^https?:\/\//i)) {
          urlToFetch = `https://${urlToFetch}`;
        }
        
        const fetchedDescription = await desc.mutateAsync(urlToFetch);
        // Set description first, then move to next step
        if (fetchedDescription && fetchedDescription.trim()) {
          setDescription(fetchedDescription);
          toast.success("Description fetched from URL");
        } else {
          toast.warning("Could not fetch description from URL. Please enter it manually.");
        }
        // Move to next step after a brief delay to ensure description is set
        setTimeout(() => {
          setStep((prev) => prev + 1);
        }, 0);
      } catch (err) {
        console.error("Error fetching description:", err);
        toast.error("Failed to fetch description from URL. Please enter it manually.");
        // Still move to next step so user can enter description manually
        setTimeout(() => {
          setStep((prev) => prev + 1);
        }, 0);
      }
    } else {
      setStep((prev) => prev + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only submit if we're on the last step
    if (step < steps.length - 1) {
      // If not on last step, go to next step instead
      handleNext();
      return;
    }
    
    try {
      await createProject.mutateAsync({ name, url, description });
      
      // The mutation updates the cache, so get the project from cache
      // The newly created project is added to the beginning of the array
      let projects = queryClient.getQueryData<any[]>(["projects"]);
      let newProject = projects?.[0]; // First project should be the newly created one
      
      // If project not in cache yet, refetch and wait
      if (!newProject) {
        await queryClient.refetchQueries({ queryKey: ["projects"] });
        projects = queryClient.getQueryData<any[]>(["projects"]);
        newProject = projects?.[0];
      } else {
        // Invalidate to refresh everywhere else
        await queryClient.invalidateQueries({ queryKey: ["projects"] });
      }
      
      // Reset form
      setStep(0);
      setName("");
      setUrl("");
      setDescription("");
      
      // Call callback with project ID if provided
      if (onProjectCreated && newProject?.id) {
        // Use setTimeout to ensure the callback is called after state updates and components re-render
        setTimeout(() => {
          onProjectCreated(newProject.id);
        }, 300);
      }
    } catch {
      // Error is already handled by the mutation's onError
    }
  };

  const steps = [
    <div key="name" className="space-y-2">
      <Label htmlFor="onboarding-name">What&apos;s the name of your project?</Label>
      <Input
        id="onboarding-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Spring Campaign 2025"
        required
      />
    </div>,
    <div key="url" className="space-y-2">
      <Label htmlFor="onboarding-url">Provide URL linked to it if present?</Label>
      <Input
        id="onboarding-url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://springcampaign2025.com"
      />
    </div>,
    <div key="description" className="space-y-2">
      <Label htmlFor="onboarding-description">Could you give a brief description of what it&apos;s about?</Label>
      <Textarea
        ref={textareaRef}
        id="onboarding-description"
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
        }}
        placeholder="A campaign to promote eco-friendly products through creative storytelling"
        className="min-h-24 resize-none overflow-y-auto"
      />
    </div>,
  ];

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader className="relative pr-20">
          <DialogTitle className="pr-8">Create Your First Project</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-0 right-0 text-muted-foreground hover:text-foreground"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {steps[step]}

          <div className="flex justify-end mt-4">
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


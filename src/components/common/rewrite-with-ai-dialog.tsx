"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";

interface RewriteWithAIDialogProps {
  onRewrite: (prompt: string) => Promise<void>;
  isPending: boolean;
  disabled?: boolean;
}

export function RewriteWithAIDialog({
  onRewrite,
  isPending,
  disabled,
}: RewriteWithAIDialogProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  const handleRewrite = async () => {
    await onRewrite(prompt);
    setOpen(false);
    setPrompt("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isPending}
          title="Rewrite with AI (1 credit)"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rewrite with AI</DialogTitle>
          <DialogDescription>
            Enter a prompt to generate new content, or leave empty to let AI rewrite and improve the existing content.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Textarea
            placeholder="e.g., Write a tweet about product launch, Create an engaging LinkedIn post about AI..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Cost: 1 credit
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setOpen(false);
              setPrompt("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRewrite}
            disabled={isPending}
            loading={isPending}
          >
            Rewrite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

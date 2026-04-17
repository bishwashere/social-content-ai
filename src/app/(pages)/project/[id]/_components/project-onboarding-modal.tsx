"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { DESTINATION_TYPES, DestinationRow, DestinationsManager, placeholderMapToRows, rowToPlaceholderKey, rowsToPlaceholderMap } from "./destinations-manager";
import { toast } from "sonner";
import { useUpdateProject } from "@/backend-apis/projects/hooks";
import { getProjectPlaceholders } from "@/lib/placeholders";

// ─── Completion check ─────────────────────────────────────────────────────────

/**
 * The pulsing dot goes away only when the project has both a non-empty
 * description AND at least one destination/placeholder defined.
 */
export function isProjectOnboardingComplete(
  project: { description?: string | null; platformUrls?: unknown } | null | undefined
): boolean {
  if (!project) return false;
  const hasDescription = !!project.description?.trim();
  const placeholders = getProjectPlaceholders(project);
  const hasDestinations = Object.keys(placeholders).length > 0;
  return hasDescription && hasDestinations;
}

// ─── Component ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  project: { description?: string | null; platformUrls?: unknown } | null | undefined;
};

export function ProjectOnboardingModal({ open, onOpenChange, projectId, project }: Props) {
  const updateProject = useUpdateProject();

  const [step, setStep] = useState(0);
  const [description, setDescription] = useState("");
  const [destinations, setDestinations] = useState<DestinationRow[]>([]);

  // Hydrate from project when modal opens
  useEffect(() => {
    if (!open || !project) return;
    setStep(0);
    setDescription(project.description?.trim() ?? "");
    const existing = getProjectPlaceholders(project);
    setDestinations(placeholderMapToRows(existing));
  }, [open, project]);

  const handleSave = async () => {
    if (!description.trim()) {
      toast.error("Please add a project description.");
      setStep(0);
      return;
    }
    try {
      await updateProject.mutateAsync({
        id: projectId,
        description: description.trim(),
        placeholders: rowsToPlaceholderMap(destinations),
      } as any);
      toast.success("Project setup saved!");
      onOpenChange(false);
    } catch {
      // error handled by mutation
    }
  };

  const canProceedStep0 = description.trim().length > 0;
  const progressPct = (step / (TOTAL_STEPS - 1)) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {step === 0 && "Tell us about your project"}
            {step === 1 && "Add your destinations"}
            {step === 2 && "Review & finish"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {step === 0 && "A good description helps generate more relevant content."}
            {step === 1 && "Paste any URL — the type is auto-detected and becomes a token like [Website] or [AppStore] in your posts."}
            {step === 2 && "Everything looks good? Save to complete your project setup."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">Step {step + 1} of {TOTAL_STEPS}</p>

        {/* ── Step 0: Description ── */}
        {step === 0 && (
          <div className="space-y-3 mt-2">
            <Label htmlFor="ob-desc">Project description</Label>
            <Textarea
              id="ob-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. A fitness app helping busy professionals build lasting workout habits with 10-minute daily sessions."
              className="min-h-28 resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This is used when generating campaigns and posts.
            </p>
          </div>
        )}

        {/* ── Step 1: Destinations ── */}
        {step === 1 && (
          <div className="mt-2">
            <DestinationsManager destinations={destinations} onChange={setDestinations} />
          </div>
        )}

        {/* ── Step 2: Review ── */}
        {step === 2 && (
          <div className="space-y-4 mt-2">
            <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
              <h4 className="text-sm font-medium">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {description || <span className="italic">Not set</span>}
              </p>
            </div>

            <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
              <h4 className="text-sm font-medium">Destinations &amp; Placeholders</h4>
              {destinations.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  None added — you can add them later in Project Settings.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {destinations.map((row, idx) => {
                    const def = DESTINATION_TYPES.find((t) => t.id === row.typeId);
                    const key = rowToPlaceholderKey(row);
                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{def?.icon}</span>
                        <Badge variant="outline" className="font-mono text-[11px]">[{key}]</Badge>
                        <span className="text-muted-foreground truncate">{row.url}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {destinations.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  These tokens will be auto-replaced in your posts when publishing.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-2 mt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>

          <div className="flex gap-2">
            {step < TOTAL_STEPS - 1 ? (
              <Button
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 0 && !canProceedStep0}
                className="gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSave}
                loading={updateProject.isPending}
                disabled={!canProceedStep0}
              >
                Save &amp; finish
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  credits?: number;
};

export function FreeCreditsCongratsModal({ open, setOpen, credits = 100 }: Props) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 4600);
    return () => clearTimeout(t);
  }, [open, setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-autoplay-blocker="free-credits" className="sm:max-w-md">
        <div className="flex flex-col items-center text-center gap-3 py-6">
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 rounded-full bg-emerald-300/40 dark:bg-emerald-400/20 animate-ping" />
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 shadow-sm">
              <Sparkles className="h-11 w-11 text-emerald-700 dark:text-emerald-300 motion-safe:animate-bounce" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold tracking-tight">Congrats!</div>
            <div className="text-sm text-muted-foreground">
              You got <span className="font-semibold text-foreground">{credits} free credits</span> to try NextpostAI.
            </div>
          </div>

          <Button className="mt-2 w-full" onClick={() => setOpen(false)}>
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function DashboardTourPromptDialog({
  open,
  onConfirm,
  onSkip,
}: {
  open: boolean;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  const [countdown, setCountdown] = useState(10);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;
    setCountdown(10);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          onConfirm();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- only run when open changes; onConfirm/onSkip are stable via ref

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/40" />
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border px-6 py-5 shadow-lg">
          <div className="text-base sm:text-lg font-semibold mb-1">
            Want a 30-second dashboard tour?
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            See all your tools and shortcuts in one quick walkthrough.
          </div>
          <div className="flex flex-col gap-3">
            <div
              className="flex items-center justify-center py-2 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              onClick={() => {
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                onConfirm();
              }}
            >
              <span className="text-lg font-medium">
                Yes, show me! ({countdown}s)
              </span>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                onSkip();
              }}
            >
              No thanks
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

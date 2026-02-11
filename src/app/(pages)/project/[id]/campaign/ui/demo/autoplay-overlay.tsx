"use client";

import { Button } from "@/components/ui/button";

export function CampaignAutoplayOverlay({
  active,
  cursor,
  highlight,
  label,
  onStop,
}: {
  active: boolean;
  cursor: { x: number; y: number };
  highlight: DOMRect | null;
  label: string;
  onStop: () => void;
}) {
  if (!active) return null;

  // Treat an empty label as the "intro" phase (no separate state).
  const isIntro = label === "";
  const rect = highlight
    ? {
        left: highlight.left - 10,
        top: highlight.top - 10,
        width: highlight.width + 20,
        height: highlight.height + 20,
      }
    : null;

  return (
    <>
      {isIntro ? (
        <div className="fixed inset-0 z-[70] bg-black/40 pointer-events-auto" />
      ) : rect ? (
        <svg
          className="fixed inset-0 z-[70] pointer-events-none"
          width="100%"
          height="100%"
        >
          <defs>
            <mask id="campaign-autoplay-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx="10"
                ry="10"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.25)"
            mask="url(#campaign-autoplay-mask)"
          />
        </svg>
      ) : (
        <div className="fixed inset-0 z-[70] bg-black/25 pointer-events-none" />
      )}

      {isIntro ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border px-6 py-5 shadow-lg">
            <div className="text-base sm:text-lg font-semibold">
              Creating your first campaign
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              This can take a few minutes
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-400 mt-4">
              Preparing…
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed z-[80] top-4 left-1/2 -translate-x-1/2 pointer-events-none w-[min(680px,calc(100vw-2rem))]">
          <div className="rounded-full bg-white/95 text-slate-900 border px-4 py-2 shadow-sm">
            <div className="text-xs sm:text-sm font-medium">
              {label ? label : "Preparing…"}
            </div>
          </div>
        </div>
      )}

      {/* Fake cursor */}
      {!isIntro && rect && (
        <div
          className="fixed z-[80] pointer-events-none"
          style={{
            left: `${cursor.x}px`,
            top: `${cursor.y}px`,
            transform: "translate(-50%, -50%)",
            transition: "left 420ms ease, top 420ms ease",
          }}
        >
          <div className="h-3.5 w-3.5 rounded-full bg-blue-600 shadow-lg ring-4 ring-blue-500/25" />
        </div>
      )}

      {/* Stop button */}
      <div className="fixed z-[80] bottom-4 right-4">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onStop}
        >
          Stop demo
        </Button>
      </div>
    </>
  );
}

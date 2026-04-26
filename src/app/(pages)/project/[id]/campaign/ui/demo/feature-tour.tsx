"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function CampaignDemoFeatureTour({
  isOpen,
  onClose,
  campaignId,
}: {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | undefined>();
  const [tooltipPlacement, setTooltipPlacement] = useState<"below" | "above">("below");
  const tooltipRef = useRef<HTMLDivElement>(null);

  const steps = useMemo(
    () => [
      {
        key: "auto-post",
        name: "Auto-post",
        description:
          "Turn this on to automatically publish your campaign posts. You'll set a start date, then choose platforms and a time. NextPostAI will schedule and auto-post for you.",
        selector: `[data-campaign-mini-tour="auto-post"][data-campaign-mini-tour-campaign-id="${campaignId}"]`,
      },
      {
        key: "generate",
        name: "AI Generate",
        description:
          "Use AI Generate to create (or regenerate) all campaign content. It can use credits/coins because it creates posts across days and platforms.",
        selector: `[data-campaign-mini-tour="generate"][data-campaign-mini-tour-campaign-id="${campaignId}"]`,
      },
    ],
    [campaignId]
  );

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setHighlightRect(undefined);
      return;
    }

    const step = steps[currentStep];
    const originalElement = document.querySelector(step.selector) as HTMLElement | null;
    let element: HTMLElement | null = originalElement;

    // If selector hits a wrapper, highlight an inner actionable element when possible.
    if (element) {
      const inner =
        element.querySelector("button") ||
        element.querySelector("[role='switch']") ||
        element;
      element = inner as HTMLElement;
    }

    if (!element) {
      setHighlightRect(undefined);
      return;
    }

    const rect = element.getBoundingClientRect();
    setHighlightRect(rect);

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });

    const applyHighlight = () => {
      element.classList.add(
        "ring-4",
        "ring-blue-500",
        "ring-offset-2",
        "z-[10002]",
        "relative",
        "rounded",
        "backdrop-blur-0"
      );

      const r = element.getBoundingClientRect();
      const maxTooltipWidth = 360;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 16;
      const actualTooltipWidth = Math.min(
        maxTooltipWidth,
        viewportWidth - padding * 2
      );

      // Prefer placing the dialog BELOW the element.
      // If there's not enough space, fall back ABOVE.
      const estimatedTooltipHeight = 220;
      const gap = 12;

      let placement: "below" | "above" = "below";
      let top = r.bottom + gap;
      if (top + estimatedTooltipHeight > viewportHeight - padding) {
        placement = "above";
        top = r.top - estimatedTooltipHeight - gap;
      }
      if (top < padding) top = padding;
      setTooltipPlacement(placement);

      // Center horizontally under the element, clamped to viewport.
      let left = r.left + r.width / 2;
      const half = actualTooltipWidth / 2;
      if (left + half > viewportWidth - padding) left = viewportWidth - padding - half;
      if (left - half < padding) left = padding + half;

      setPosition({ top, left });
    };

    const timer = setTimeout(applyHighlight, 250);

    return () => {
      clearTimeout(timer);
      element.classList.remove(
        "ring-4",
        "ring-blue-500",
        "ring-offset-2",
        "z-[10002]",
        "relative",
        "rounded",
        "backdrop-blur-0"
      );
    };
  }, [currentStep, isOpen, steps]);

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <>
      <svg className="fixed inset-0 z-[10000] pointer-events-none" width="100%" height="100%">
        <defs>
          <mask id="campaign-feature-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left - 6}
                y={highlightRect.top - 6}
                width={highlightRect.width + 12}
                height={highlightRect.height + 12}
                rx="10"
                ry="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.3)"
          mask="url(#campaign-feature-tour-mask)"
        />
      </svg>
      <div className="fixed inset-0 z-[10000]" onClick={onClose} />

      <div
        ref={tooltipRef}
        className="fixed z-[10001] w-80 max-w-[calc(100vw-2rem)]"
        style={{
          isolation: "isolate",
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: "translateX(-50%)",
          maxWidth: "calc(100vw - 2rem)",
        }}
      >
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-4">
          {/* Arrow points to the highlighted element */}
          {tooltipPlacement === "below" ? (
            <div
              className="absolute -top-2 w-4 h-4 bg-white border-l border-t border-gray-200 rotate-45"
              style={{
                left: "50%",
                transform: "translateX(-50%) rotate(45deg)",
              }}
            />
          ) : (
            <div
              className="absolute -bottom-2 w-4 h-4 bg-white border-r border-b border-gray-200 rotate-45"
              style={{
                left: "50%",
                transform: "translateX(-50%) rotate(45deg)",
              }}
            />
          )}

          <h3 className="text-xl font-semibold">{step.name}</h3>
          <p className="text-base text-gray-600 mt-2 mb-4">{step.description}</p>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {currentStep + 1} of {steps.length}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Skip
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (isLast) onClose();
                  else setCurrentStep((s) => s + 1);
                }}
              >
                {isLast ? "Got it" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

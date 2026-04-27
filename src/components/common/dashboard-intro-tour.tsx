"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Bot,
  CheckSquare,
  Zap,
  Globe,
  Clock,
  CalendarDays,
} from "lucide-react";
import Cookie from "js-cookie";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";

interface IntroStep {
  key: string;
  selector: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const INTRO_STEPS: IntroStep[] = [
  {
    key: "aiInput",
    selector: '[data-dashboard-section="ai-input"]',
    title: "AI Assistant",
    description:
      "Ask anything here — brainstorm ideas, start a project, or get instant answers about your content strategy.",
    icon: Bot,
  },
  {
    key: "getStarted",
    selector: '[data-dashboard-section="get-started"]',
    title: "Get Started",
    description:
      "Step-by-step guidance to connect your socials, create your first project, and publish your first post.",
    icon: CheckSquare,
  },
  {
    key: "actionRequired",
    selector: '[data-dashboard-section="action-required"]',
    title: "Action Required",
    description:
      "Your most important tasks appear here — overdue posts, stale projects, and suggestions that need attention.",
    icon: Zap,
  },
  {
    key: "getInspired",
    selector: '[data-dashboard-section="news-trending"]',
    title: "Get Inspired from World Events",
    description:
      "Live trending news and world events to spark your next winning campaign idea.",
    icon: Globe,
  },
  {
    key: "recentActivity",
    selector: '[data-dashboard-section="activity"]',
    title: "Recent Activity",
    description:
      "A real-time feed of everything happening across all your projects and campaigns.",
    icon: Clock,
  },
  {
    key: "calendar",
    selector: '[data-dashboard-section="calendar"]',
    title: "Calendar",
    description:
      "Today and tomorrow's scheduled posts at a glance so you never miss a beat.",
    icon: CalendarDays,
  },
];

const HIGHLIGHT_ID = "dashboard-intro-highlight-box";
const DIALOG_WIDTH = 380;
const DIALOG_HEIGHT = 220;
const PADDING = 16;

function positionDialogNextTo(rect: DOMRect): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Prefer right side
  let left = rect.right + 24;
  let top = rect.top + rect.height / 2 - DIALOG_HEIGHT / 2;

  if (left + DIALOG_WIDTH > vw - PADDING) {
    // Try left side
    left = rect.left - DIALOG_WIDTH - 24;
    if (left < PADDING) {
      // Centre horizontally, go below or above
      left = Math.max(PADDING, Math.min(rect.left, vw - DIALOG_WIDTH - PADDING));
      top =
        rect.bottom + 24 + DIALOG_HEIGHT < vh - PADDING
          ? rect.bottom + 24
          : rect.top - DIALOG_HEIGHT - 24;
    }
  }

  top = Math.max(PADDING, Math.min(top, vh - DIALOG_HEIGHT - PADDING));
  return { top, left };
}

function arrowDirection(
  dialogLeft: number,
  dialogTop: number,
  rect: DOMRect
): "left" | "right" | "top" | "bottom" {
  const dialogRight = dialogLeft + DIALOG_WIDTH;
  const dialogBottom = dialogTop + DIALOG_HEIGHT;
  if (dialogLeft > rect.right) return "left";
  if (dialogRight < rect.left) return "right";
  if (dialogBottom < rect.top) return "bottom";
  return "top";
}

interface DashboardIntroTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DashboardIntroTour({ isOpen, onClose }: DashboardIntroTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Helper to remove highlight box
  const removeHighlight = useCallback(() => {
    document.getElementById(HIGHLIGHT_ID)?.remove();
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  // Build the visible step list (skip steps whose element is absent from DOM)
  const visibleSteps = isOpen
    ? INTRO_STEPS.filter((s) => !!document.querySelector(s.selector))
    : INTRO_STEPS;

  // Highlight the current step element
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setReady(false);
      removeHighlight();
      return;
    }

    setReady(false);
    removeHighlight();

    const step = visibleSteps[currentStep];
    if (!step) return;

    const timer = setTimeout(() => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        setReady(true);
        return;
      }

      el.scrollIntoView({ behavior: "smooth", block: "nearest" });

      // Give scroll time to settle before measuring
      const measureTimer = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const pad = 8;
        const hRect = new DOMRect(
          rect.left - pad,
          rect.top - pad,
          rect.width + pad * 2,
          rect.height + pad * 2
        );
        setHighlightRect(hRect);

        // Create blue border box
        const box = document.createElement("div");
        box.id = HIGHLIGHT_ID;
        box.style.cssText = `
          position: fixed;
          top: ${hRect.top}px;
          left: ${hRect.left}px;
          width: ${hRect.width}px;
          height: ${hRect.height}px;
          border: 3px solid rgb(139 92 246);
          border-radius: 10px;
          z-index: 60;
          pointer-events: none;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.15);
          transition: top 0.15s, left 0.15s, width 0.15s, height 0.15s;
        `;
        document.body.appendChild(box);

        const pos = positionDialogNextTo(hRect);
        setPosition(pos);
        setReady(true);

        // Keep highlight synced on scroll / resize
        const update = () => {
          const r = el.getBoundingClientRect();
          const hr = new DOMRect(r.left - pad, r.top - pad, r.width + pad * 2, r.height + pad * 2);
          setHighlightRect(hr);
          const b = document.getElementById(HIGHLIGHT_ID);
          if (b) {
            b.style.top = `${hr.top}px`;
            b.style.left = `${hr.left}px`;
            b.style.width = `${hr.width}px`;
            b.style.height = `${hr.height}px`;
          }
          setPosition(positionDialogNextTo(hr));
        };

        window.addEventListener("scroll", update, true);
        window.addEventListener("resize", update);
        cleanupRef.current = () => {
          window.removeEventListener("scroll", update, true);
          window.removeEventListener("resize", update);
        };
      }, 350);

      return () => clearTimeout(measureTimer);
    }, 100);

    return () => {
      clearTimeout(timer);
      removeHighlight();
    };
  }, [currentStep, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFinish = useCallback(async () => {
    removeHighlight();
    const token = Cookie.get(AUTH_TOKEN_COOKIE_NAME);
    try {
      await fetch("/api/user/dashboard-intro-shown", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {
      // non-blocking
    }
    onClose();
  }, [onClose, removeHighlight]);

  const handleNext = useCallback(() => {
    if (currentStep < visibleSteps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleFinish();
    }
  }, [currentStep, visibleSteps.length, handleFinish]);

  if (!isOpen) return null;

  const step = visibleSteps[currentStep];
  if (!step) return null;
  const StepIcon = step.icon;

  const arrow = highlightRect
    ? arrowDirection(position.left, position.top, highlightRect)
    : "top";

  return (
    <>
      {/* Dim overlay with spotlight cutout */}
      <svg
        className="fixed inset-0 z-40 pointer-events-none"
        width="100%"
        height="100%"
        data-tour="dashboard-intro"
      >
        <defs>
          <mask id="intro-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left}
                y={highlightRect.top}
                width={highlightRect.width}
                height={highlightRect.height}
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
          fill="rgba(0,0,0,0.45)"
          mask="url(#intro-spotlight-mask)"
        />
      </svg>

      {/* Click-away dismisses */}
      <div className="fixed inset-0 z-40" onClick={handleFinish} />

      {/* Tooltip dialog */}
      {ready && (
        <div
          className="fixed z-[60] bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xl p-5"
          style={{
            top: position.top,
            left: position.left,
            width: DIALOG_WIDTH,
            maxWidth: `calc(100vw - ${PADDING * 2}px)`,
            isolation: "isolate",
          }}
        >
          {/* Directional arrow */}
          {arrow === "left" && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-white dark:border-r-slate-800" style={{ left: -8 }} />
          )}
          {arrow === "right" && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-white dark:border-l-slate-800" style={{ right: -8 }} />
          )}
          {arrow === "top" && (
            <div className="absolute -top-2 left-8 w-4 h-4 bg-white dark:bg-slate-800 border-l border-t border-gray-200 dark:border-slate-700 rotate-45" />
          )}
          {arrow === "bottom" && (
            <div className="absolute -bottom-2 left-8 w-4 h-4 bg-white dark:bg-slate-800 border-r border-b border-gray-200 dark:border-slate-700 rotate-45" />
          )}

          {/* Step content */}
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/40 shrink-0">
              <StepIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-snug">
              {step.title}
            </h3>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
            {step.description}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {currentStep + 1} of {visibleSteps.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleFinish}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Skip
              </button>
              <Button
                onClick={handleNext}
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 text-white"
              >
                {currentStep < visibleSteps.length - 1 ? "Next →" : "Got it!"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

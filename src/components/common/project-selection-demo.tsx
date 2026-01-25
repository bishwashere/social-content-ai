"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import sleep from "@/lib/sleep";
import { flushSync } from "react-dom";

interface ProjectSelectionDemoProps {
  projectId?: string;
  projectName?: string;
}

export function ProjectSelectionDemo({ projectId, projectName }: ProjectSelectionDemoProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [demoActive, setDemoActive] = useState(false);
  const [demoCursor, setDemoCursor] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const [demoHighlight, setDemoHighlight] = useState<DOMRect | null>(null);
  const [demoLabel, setDemoLabel] = useState<string>("");
  const demoStartedRef = useRef(false);
  const demoCancelledRef = useRef(false);

  useEffect(() => {
    const shouldDemo = searchParams.get("demo") === "project-selection";
    console.log('[PROJECT-DEMO] Effect running, shouldDemo:', shouldDemo, 'demoStartedRef:', demoStartedRef.current);
    if (!shouldDemo) return;
    if (demoStartedRef.current) {
      console.log('[PROJECT-DEMO] Demo already started, skipping effect');
      return;
    }

    // Get saved state from sessionStorage
    let savedProjectId = projectId;
    let savedProjectName = projectName;
    
    try {
      const savedState = sessionStorage.getItem('demo-state');
      console.log('[PROJECT-DEMO] SessionStorage state:', savedState);
      if (savedState) {
        const state = JSON.parse(savedState);
        savedProjectId = state.projectId;
        savedProjectName = state.projectName;
        console.log('[PROJECT-DEMO] Using saved project:', savedProjectName, savedProjectId);
      }
    } catch (err) {
      console.error('[PROJECT-DEMO] Error reading saved state:', err);
    }

    if (!savedProjectId) {
      console.error('[PROJECT-DEMO] No project ID found, cannot run demo');
      return;
    }

    console.log('[PROJECT-DEMO] Marking demo as started');
    demoStartedRef.current = true;
    
    // Start demo IMMEDIATELY
    console.log('[PROJECT-DEMO] Setting demoActive to true IMMEDIATELY');
    setDemoActive(true);
    setDemoLabel("Let's select your project");

    const DEMO = {
      moveMs: 780,
      beforeClickMs: 260,
      afterClickMs: 700,
      betweenStepsMs: 520,
      pollMs: 140,
    } as const;

    const paddedRect = (el: Element | null) => {
      if (!el) return null;
      const r = (el as HTMLElement).getBoundingClientRect();
      return new DOMRect(r.left, r.top, r.width, r.height);
    };

    const moveTo = async (el: Element | null, label: string) => {
      if (demoCancelledRef.current) return;
      setDemoLabel(label);
      const rect = paddedRect(el);
      if (rect) {
        setDemoHighlight(rect);
        setDemoCursor({
          x: rect.left + rect.width / 2,
          y: rect.top + Math.min(18, rect.height / 2),
        });
      }
      await sleep(DEMO.moveMs);
    };

    const clickEl = async (el: Element | null, label: string) => {
      if (demoCancelledRef.current) return;
      await moveTo(el, label);
      if (demoCancelledRef.current) return;
      await sleep(DEMO.beforeClickMs);
      (el as HTMLElement | null)?.click?.();
      await sleep(DEMO.afterClickMs);
    };

    const waitFor = async <T,>(fn: () => T | null, timeoutMs = 7000): Promise<T | null> => {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        if (demoCancelledRef.current) return null;
        const v = fn();
        if (v) return v;
        await sleep(DEMO.pollMs);
      }
      return null;
    };

    (async () => {
      console.log('[PROJECT-DEMO] Async function starting, projectId:', savedProjectId);
      
      // Remove demo param from URL
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete("demo");
      const newUrl = `${window.location.pathname}${newParams.toString() ? `?${newParams}` : ""}`;
      window.history.replaceState({}, "", newUrl);

      await sleep(1000);
      
      if (demoCancelledRef.current) return;

      console.log('[PROJECT-DEMO] Looking for sidebar');
      // Check if sidebar is collapsed and expand it
      const sidebarElement = document.querySelector('[data-sidebar="sidebar"]');
      console.log('[PROJECT-DEMO] Sidebar found:', !!sidebarElement, 'state:', sidebarElement?.getAttribute('data-state'));
      if (sidebarElement?.getAttribute('data-state') === 'collapsed') {
        const railButton = document.querySelector('[data-sidebar="rail"]') as HTMLElement;
        if (railButton) {
          await clickEl(railButton, "Opening sidebar");
          await sleep(400);
        }
      }

      if (demoCancelledRef.current) return;

      console.log('[PROJECT-DEMO] Looking for project selector');
      // Click project selector button
      const projectSelector = await waitFor(
        () => document.querySelector('[data-project-selector="true"]') as HTMLElement | null,
        5000
      );

      if (!projectSelector) {
        console.error('[PROJECT-DEMO] Project selector not found');
        setDemoActive(false);
        return;
      }

      console.log('[PROJECT-DEMO] Project selector found, clicking');
      await clickEl(projectSelector, "Opening projects menu");
      await sleep(600);

      if (demoCancelledRef.current) return;

      console.log('[PROJECT-DEMO] Looking for project button with ID:', savedProjectId);
      // Find and click the project button
      const targetButton = await waitFor(
        () => document.querySelector(`[data-project-item="true"][data-project-id="${savedProjectId}"]`) as HTMLElement | null,
        5000
      );

      if (!targetButton) {
        console.error('[PROJECT-DEMO] Project button not found');
        setDemoActive(false);
        return;
      }

      console.log('[PROJECT-DEMO] Project button found, clicking');
      await clickEl(targetButton, `Selecting "${savedProjectName}"`);

      // Update sessionStorage to indicate we're ready for campaign demo
      try {
        sessionStorage.setItem('demo-state', JSON.stringify({
          phase: 'campaign-ready',
          projectId: savedProjectId,
          projectName: savedProjectName,
          timestamp: Date.now()
        }));
      } catch (err) {
        console.error('[PROJECT-DEMO] Error saving state:', err);
      }

      // Wait a moment then navigate to the project page
      await sleep(800);

      console.log('[PROJECT-DEMO] Navigating to project page');
      // Navigate to project with autoplay for campaign
      router.push(`/project/${savedProjectId}?tab=campaign&autoplay=1`);
    })().catch(err => {
      console.error('[PROJECT-DEMO] Error in demo:', err);
      setDemoActive(false);
    });

    return () => {
      // Only cancel if the demo hasn't started yet
      // If demo has started, let it complete
      if (!demoStartedRef.current) {
        demoCancelledRef.current = true;
        console.log('[PROJECT-DEMO] Cleanup: Demo not started, setting cancelled');
      } else {
        console.log('[PROJECT-DEMO] Cleanup: Demo already started, not cancelling');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - we only want to run once when component mounts

  if (!demoActive) {
    console.log('[PROJECT-DEMO] Component returning null, demoActive:', demoActive);
    return null;
  }

  console.log('[PROJECT-DEMO] Component rendering overlay, demoActive:', demoActive, 'demoLabel:', demoLabel);

  return (
    <>
      {/* Dark overlay */}
      <div className="fixed inset-0 z-[70] bg-black/25 pointer-events-none" data-demo-active="true" />

      {/* Highlight */}
      {demoHighlight && (
        <div
          className="fixed z-[75] pointer-events-none border-4 border-blue-500 rounded-lg"
          style={{
            left: `${demoHighlight.left - 4}px`,
            top: `${demoHighlight.top - 4}px`,
            width: `${demoHighlight.width + 8}px`,
            height: `${demoHighlight.height + 8}px`,
          }}
        />
      )}

      {/* Label */}
      <div className="fixed z-[80] top-4 left-1/2 -translate-x-1/2 pointer-events-none w-[min(680px,calc(100vw-2rem))]">
        <div className="rounded-full bg-white/95 text-slate-900 border px-4 py-2 shadow-sm">
          <div className="text-xs sm:text-sm font-medium">
            {demoLabel || "Preparing…"}
          </div>
        </div>
      </div>

      {/* Fake cursor */}
      {demoHighlight && (
        <div
          className="fixed z-[80] pointer-events-none"
          style={{
            left: `${demoCursor.x}px`,
            top: `${demoCursor.y}px`,
            transform: "translate(-50%, -50%)",
            transition: "left 420ms ease, top 420ms ease",
          }}
        >
          <div className="h-3.5 w-3.5 rounded-full bg-blue-600 shadow-lg ring-4 ring-blue-500/25" />
        </div>
      )}

      {/* Stop button */}
      <div className="fixed z-[80] bottom-4 right-4">
        <button
          type="button"
          onClick={() => {
            demoCancelledRef.current = true;
            setDemoActive(false);
            sessionStorage.removeItem('demo-state');
          }}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg shadow-lg transition-colors"
        >
          Stop demo
        </button>
      </div>
    </>
  );
}

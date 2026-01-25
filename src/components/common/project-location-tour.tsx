"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FolderKanban } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

interface ProjectLocationTourProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
}

export function ProjectLocationTour({
  isOpen,
  onClose,
  projectName,
}: ProjectLocationTourProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | undefined>();
  const [isReady, setIsReady] = useState(false);
  const [projectSelectorRef, setProjectSelectorRef] = useState<HTMLElement | null>(null);
  const sidebar = useSidebar();

  useEffect(() => {
    if (!isOpen) {
      setIsReady(false);
      return;
    }

    const setup = async () => {
      // Expand sidebar if collapsed
      if (!sidebar.open) {
        sidebar.setOpen(true);
        // Wait for sidebar animation
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Find the project selector button
      const projectSelector = document.querySelector('[data-project-selector="true"]') as HTMLElement | null;
      setProjectSelectorRef(projectSelector);

      // Wait a bit more to ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 100));

      setIsReady(true);
    };

    setup();
  }, [isOpen, sidebar]);

  useEffect(() => {
    if (!isOpen || !isReady || !projectSelectorRef) {
      return;
    }

    let element = projectSelectorRef;

    // Try to find button inside if element is a wrapper
    const button = element.querySelector('button, a');
    if (button) {
      element = button as HTMLElement;
    }

    const rect = element?.getBoundingClientRect();
    setHighlightRect(rect);

    if (element) {
      // Scroll into view
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });

      // Add highlight effect
      setTimeout(() => {
        element?.classList.add("ring-4", "ring-blue-500", "ring-offset-2", "z-[65]", "relative", "rounded", "backdrop-blur-0");
        if (element) {
          element.style.setProperty('filter', 'none', 'important');
          element.style.setProperty('position', 'relative', 'important');
        }

        if (element) {
          const rect = element.getBoundingClientRect();

          // Tooltip width (w-80 = 320px)
          const maxTooltipWidth = 320;
          const viewportWidth = window.innerWidth;
          const padding = 16;
          const actualTooltipWidth = Math.min(maxTooltipWidth, viewportWidth - (padding * 2));

          // Position dialog on the right side of the element (sidebar)
          let finalLeft = rect.right + 16;

          // Check if dialog would overflow right edge
          if (finalLeft + actualTooltipWidth > viewportWidth - padding) {
            finalLeft = rect.left - actualTooltipWidth - 16;
            if (finalLeft < padding) {
              finalLeft = padding;
            }
          }

          // Position vertically centered with the element
          // Approximate dialog height is ~200px
          const approximateDialogHeight = 200;
          const viewportHeight = window.innerHeight;
          
          let top = rect.top + (rect.height / 2) - (approximateDialogHeight / 2);
          
          // Check if dialog would overflow top edge
          if (top < padding) {
            top = padding;
          }
          
          // Check if dialog would overflow bottom edge
          if (top + approximateDialogHeight > viewportHeight - padding) {
            top = viewportHeight - approximateDialogHeight - padding;
            // Make sure it doesn't go negative
            if (top < padding) {
              top = padding;
            }
          }

          setPosition({
            top,
            left: finalLeft,
          });
        }
      }, 300);
    }

    // Cleanup highlights
    return () => {
      if (projectSelectorRef) {
        let targetElement = projectSelectorRef;
        const button = projectSelectorRef.querySelector('button, a');
        if (button) {
          targetElement = button as HTMLElement;
        }
        if (targetElement) {
          targetElement.classList.remove("ring-4", "ring-blue-500", "ring-offset-2", "z-[65]", "relative", "rounded", "backdrop-blur-0");
          targetElement.style.removeProperty('filter');
          targetElement.style.removeProperty('position');
        }
      }
    };
  }, [isOpen, isReady, projectSelectorRef]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isOpen || !isReady || !projectSelectorRef) return;

    const updatePosition = () => {
      let element = projectSelectorRef;

      if (element) {
        const button = element.querySelector('button, a');
        if (button) {
          element = button as HTMLElement;
        }
      }

      if (element) {
        const rect = element.getBoundingClientRect();

        const maxTooltipWidth = 320;
        const viewportWidth = window.innerWidth;
        const padding = 16;
        const actualTooltipWidth = Math.min(maxTooltipWidth, viewportWidth - (padding * 2));

        let finalLeft = rect.right + 16;

        if (finalLeft + actualTooltipWidth > viewportWidth - padding) {
          finalLeft = rect.left - actualTooltipWidth - 16;
          if (finalLeft < padding) {
            finalLeft = padding;
          }
        }

        // Position vertically centered with the element
        // Approximate dialog height is ~200px
        const approximateDialogHeight = 200;
        const viewportHeight = window.innerHeight;
        
        let top = rect.top + (rect.height / 2) - (approximateDialogHeight / 2);
        
        // Check if dialog would overflow top edge
        if (top < padding) {
          top = padding;
        }
        
        // Check if dialog would overflow bottom edge
        if (top + approximateDialogHeight > viewportHeight - padding) {
          top = viewportHeight - approximateDialogHeight - padding;
          // Make sure it doesn't go negative
          if (top < padding) {
            top = padding;
          }
        }

        setPosition({
          top,
          left: finalLeft,
        });
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, isReady, projectSelectorRef]);

  const handleClose = () => {
    onClose();
  };

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !isReady) return null;

  return (
    <>
      {/* Dark overlay with spotlight */}
      <svg className="fixed inset-0 z-[60] pointer-events-none" width="100%" height="100%" data-tour="project-location">
        <defs>
          <mask id="project-location-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={highlightRect ? highlightRect.left - 5 : 0}
              y={highlightRect ? highlightRect.top - 5 : 0}
              width={highlightRect ? highlightRect.width + 10 : 0}
              height={highlightRect ? highlightRect.height + 10 : 0}
              rx="8"
              ry="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.3)"
          mask="url(#project-location-spotlight-mask)"
        />
      </svg>
      
      {/* Clickable overlay to close */}
      <div
        className="fixed inset-0 z-[60]"
        onClick={handleClose}
      />

      {/* Dialog box */}
      <div
        ref={tooltipRef}
        className="fixed z-[70] w-80 max-w-[calc(100vw-2rem)]"
        style={{
          isolation: 'isolate',
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'none',
          maxWidth: 'calc(100vw - 2rem)',
        }}
      >
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-lg p-4">
          {/* Arrow pointing to element */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-white dark:border-r-slate-800"
            style={{
              left: '-8px',
            }}
          ></div>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 shrink-0">
              <FolderKanban className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold dark:text-white">Your Project</h3>
          </div>
          <p className="text-base text-gray-600 dark:text-gray-300 mt-2 mb-4">
            <strong>&quot;{projectName}&quot;</strong> is now created! This is where you can switch between projects and manage them. You can create multiple projects to organize different content strategies.
          </p>

          <div className="flex items-center justify-end">
            <Button onClick={handleClose} size="sm">Got it</Button>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Folder } from "lucide-react";

interface FoldersTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FoldersTour({
  isOpen,
  onClose,
}: FoldersTourProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [highlightedRect, setHighlightedRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      // Cleanup highlight box if it exists
      const highlightBox = document.getElementById('folders-tour-highlight-box');
      if (highlightBox) {
        highlightBox.remove();
      }
      return;
    }

    // Find the Folders section card
    setTimeout(() => {
      const foldersSection = document.querySelector('[data-folders-section]') as HTMLElement;

      if (foldersSection) {
        // Scroll into view
        foldersSection.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });

        // Add highlight effect
        setTimeout(() => {
          const rect = foldersSection.getBoundingClientRect();

          // Create highlight box
          const highlightBox = document.createElement('div');
          highlightBox.id = 'folders-tour-highlight-box';
          highlightBox.style.position = 'fixed';
          highlightBox.style.top = `${rect.top - 8}px`;
          highlightBox.style.left = `${rect.left - 8}px`;
          highlightBox.style.width = `${rect.width + 16}px`;
          highlightBox.style.height = `${rect.height + 16}px`;
          highlightBox.style.border = '4px solid rgb(59 130 246)'; // blue-500
          highlightBox.style.borderRadius = '8px';
          highlightBox.style.zIndex = '60';
          highlightBox.style.pointerEvents = 'none';
          highlightBox.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
          document.body.appendChild(highlightBox);

          // Store rect for positioning
          setHighlightedRect(new DOMRect(rect.left - 8, rect.top - 8, rect.width + 16, rect.height + 16));

          // Position dialog on the right side
          const dialogWidth = 320;
          const padding = 16;
          const viewportWidth = window.innerWidth;

          let finalLeft = rect.right + 16;
          if (finalLeft + dialogWidth > viewportWidth - padding) {
            finalLeft = rect.left - dialogWidth - 16;
            if (finalLeft < padding) {
              finalLeft = padding;
            }
          }

          const top = Math.max(padding, rect.top);
          setPosition({ top, left: finalLeft });
        }, 300);
      }
    }, 300);

    // Cleanup
    return () => {
      const highlightBox = document.getElementById('folders-tour-highlight-box');
      if (highlightBox) {
        highlightBox.remove();
      }
    };
  }, [isOpen]);

  const handleFinish = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Dark overlay */}
      <svg className="fixed inset-0 z-40 pointer-events-none" width="100%" height="100%">
        <defs>
          <mask id="folders-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {highlightedRect && (
              <rect
                x={highlightedRect.left}
                y={highlightedRect.top}
                width={highlightedRect.width}
                height={highlightedRect.height}
                rx="8"
                ry="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.3)"
          mask="url(#folders-spotlight-mask)"
        />
      </svg>
      <div
        className="fixed inset-0 z-40"
        onClick={handleFinish}
      />

      {/* Dialog box */}
      <div
        ref={tooltipRef}
        className="fixed z-[60] w-80 max-w-[calc(100vw-2rem)]"
        style={{
          isolation: 'isolate',
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'none',
          maxWidth: 'calc(100vw - 2rem)',
        }}
      >
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-4">
          {/* Arrow pointing to element */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-white"
            style={{
              left: '-8px',
            }}
          ></div>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 shrink-0">
              <Folder className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold">Folders</h3>
          </div>
          <p className="text-base text-gray-600 mt-2 mb-4">
            Organize your projects into folders for better management. Each folder can contain multiple projects, making it easier to group related content together.
          </p>

          <div className="flex items-center justify-end">
            <Button onClick={handleFinish} size="sm">Got it</Button>
          </div>
        </div>
      </div>
    </>
  );
}


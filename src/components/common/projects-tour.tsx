"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Folder } from "lucide-react";

interface ProjectsTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectsTour({
  isOpen,
  onClose,
}: ProjectsTourProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [highlightedRect, setHighlightedRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      // Cleanup highlight box if it exists
      const highlightBox = document.getElementById('projects-tour-highlight-box');
      if (highlightBox) {
        highlightBox.remove();
      }
      return;
    }

    // Find the Projects section card
    setTimeout(() => {
      const projectsSection = document.querySelector('[data-projects-section-card]') as HTMLElement;
      
      if (projectsSection) {
        // Ensure projects section is open
        const trigger = document.querySelector('[data-collapsible-trigger]');
        if (trigger) {
          const collapsible = trigger.closest('[data-state]');
          // Try to expand if collapsed
          if (collapsible?.getAttribute('data-state') === 'closed') {
            (trigger as HTMLElement).click();
            // Wait for expansion
            setTimeout(() => {
              highlightSection(projectsSection);
            }, 300);
          } else {
            highlightSection(projectsSection);
          }
        } else {
          highlightSection(projectsSection);
        }
      }
    }, 300);

    function highlightSection(section: HTMLElement) {
      // Scroll into view
      section.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });

      // Add highlight effect
      setTimeout(() => {
        const rect = section.getBoundingClientRect();
        
        // Create highlight box
        const highlightBox = document.createElement('div');
        highlightBox.id = 'projects-tour-highlight-box';
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

    // Cleanup
    return () => {
      const highlightBox = document.getElementById('projects-tour-highlight-box');
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
      <div 
        className="fixed inset-0 bg-black/30 z-40"
        style={{ 
          backdropFilter: 'none', 
          filter: 'none',
        }}
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
            <h3 className="text-xl font-semibold">Projects</h3>
          </div>
          <p className="text-base text-gray-600 mt-2 mb-4">
            Your projects contain all your generated content. Each project represents a campaign, brand, or content theme. Click on a project to view and manage its content.
          </p>

          <div className="flex items-center justify-end">
            <Button onClick={handleFinish} size="sm">Got it</Button>
          </div>
        </div>
      </div>
    </>
  );
}


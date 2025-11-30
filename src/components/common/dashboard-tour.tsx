"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  Folder, 
  Link as LinkIcon,
  Coins,
} from "lucide-react";
import { useUpdateFirstViewTooltip } from "@/server-actions/first-view-tooltip/hooks";
import { useSession } from "@/backend-apis/auth/hooks";

interface DashboardTourProps {
  isOpen: boolean;
  onClose: () => void;
  elementRefs: Record<string, HTMLElement | null>;
}

const TOP_SECTIONS_KEYS = ["forYou", "contentPlanner", "analytics", "template", "videoMaker", "myVideos"];

const TOUR_STEPS = {
  projects: {
    name: "Folders",
    description: "Your projects are organized here. Click to expand and see all your projects. Each project shows its progress and status.",
    icon: Folder,
  },
  topSections: {
    name: "Top Navigation Sections",
    description: "Overview of the main navigation sections",
    icon: Folder,
  },
  connectSocials: {
    name: "Connect Socials",
    description: "Connect your social media accounts to automatically post content. Link Facebook, LinkedIn, Twitter, and more.",
    icon: LinkIcon,
  },
  subscribe: {
    name: "Subscribe",
    description: "Upgrade to Pro to unlock unlimited content generation, advanced features, and priority support.",
    icon: Coins,
  },
};

const TOUR_ORDER = ["projects", "topSections", "connectSocials", "subscribe"];

export function DashboardTour({
  isOpen,
  onClose,
  elementRefs,
}: DashboardTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [highlightedRect, setHighlightedRect] = useState<DOMRect | null>(null);
  const [showTopSectionsDialog, setShowTopSectionsDialog] = useState(false);
  const { data: session } = useSession();
  const updateTooltip = useUpdateFirstViewTooltip();
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setShowTopSectionsDialog(false);
      // Cleanup highlight box if it exists
      const highlightBox = document.getElementById('tour-highlight-box');
      if (highlightBox) {
        highlightBox.remove();
      }
      return;
    }

    // Get the current element key
    const currentElementKey = TOUR_ORDER[currentStep];
    
    // If it's the topSections step, create a blue box around all 6 sections and show dialog
    if (currentElementKey === 'topSections') {
      setTimeout(() => {
        // Find all elements and calculate bounding box
        const elements: HTMLElement[] = [];
        TOP_SECTIONS_KEYS.forEach((key) => {
          const element = elementRefs[key];
          if (element) {
            let targetElement: HTMLElement | null = element;
            const button = element.querySelector('button, a');
            if (button) {
              targetElement = button as HTMLElement;
            }
            if (targetElement) {
              elements.push(targetElement);
            }
          }
        });
        
        if (elements.length > 0) {
          // Calculate bounding box for all elements
          let minTop = Infinity;
          let maxBottom = -Infinity;
          let minLeft = Infinity;
          let maxRight = -Infinity;
          
          elements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            minTop = Math.min(minTop, rect.top);
            maxBottom = Math.max(maxBottom, rect.bottom);
            minLeft = Math.min(minLeft, rect.left);
            maxRight = Math.max(maxRight, rect.right);
          });
          
          // Create a wrapper div for the blue box
          const sidebar = elements[0]?.closest('[data-sidebar]') || elements[0]?.closest('.sidebar') || document.querySelector('[class*="sidebar"]');
          const container = sidebar || elements[0]?.parentElement?.parentElement;
          
          if (container) {
            // Create highlight box
            const highlightBox = document.createElement('div');
            highlightBox.id = 'tour-highlight-box';
            highlightBox.style.position = 'fixed';
            highlightBox.style.top = `${minTop - 8}px`;
            highlightBox.style.left = `${minLeft - 8}px`;
            highlightBox.style.width = `${maxRight - minLeft + 16}px`;
            highlightBox.style.height = `${maxBottom - minTop + 16}px`;
            highlightBox.style.border = '4px solid rgb(59 130 246)'; // blue-500
            highlightBox.style.borderRadius = '8px';
            highlightBox.style.zIndex = '60';
            highlightBox.style.pointerEvents = 'none';
            highlightBox.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
            document.body.appendChild(highlightBox);
            
            // Store rect for positioning
            setHighlightedRect(new DOMRect(minLeft - 8, minTop - 8, maxRight - minLeft + 16, maxBottom - minTop + 16));
            
            // Position dialog on the right side
            const dialogWidth = 400;
            const padding = 16;
            const viewportWidth = window.innerWidth;
            
            let finalLeft = maxRight + 16;
            if (finalLeft + dialogWidth > viewportWidth - padding) {
              finalLeft = padding;
            }
            
            const top = Math.max(padding, minTop);
            setPosition({ top, left: finalLeft });
          }
        }
        
        setShowTopSectionsDialog(true);
      }, 300);
      
      // Cleanup
      return () => {
        const highlightBox = document.getElementById('tour-highlight-box');
        if (highlightBox) {
          highlightBox.remove();
        }
        setShowTopSectionsDialog(false);
      };
    }
    
    // Regular single element highlighting for other steps
    let element: HTMLElement | null = elementRefs[currentElementKey];
    const originalElement = element; // Keep reference to original element
    
    // Try to find button or link inside if element is a wrapper
    if (element) {
      const button = element.querySelector('button, a');
      if (button) {
        element = button as HTMLElement;
      }
    }
    
    if (element) {
      // Scroll into view
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });

      // Add highlight effect - ensure it's above the overlay with white background
      setTimeout(() => {
        // Store the highlighted element's position for overlay exclusion
        if (element) {
          const rect = element.getBoundingClientRect();
          setHighlightedRect(rect);
        }
        
        // Apply to the element we found (button/link) or original
        // Use Tailwind classes like the ring - just the ring, no white background
        element?.classList.add("ring-4", "ring-blue-500", "ring-offset-2", "z-[60]", "relative", "rounded", "backdrop-blur-0");
        // Ensure no blur and proper positioning
        if (element) {
          element.style.setProperty('filter', 'none', 'important');
          element.style.setProperty('position', 'relative', 'important');
        }
        
        // Also apply to original element if it's different (for wrapper divs like Projects)
        if (originalElement && originalElement !== element) {
          // Just ensure proper z-index and positioning, no white background
          originalElement.classList.add("z-[60]", "relative", "rounded");
          originalElement.style.setProperty('filter', 'none', 'important');
        }
        
        
        // Use the element for positioning
        const positionElement = element;
        
        if (positionElement) {
          const rect = positionElement.getBoundingClientRect();
          
          // Tooltip width (w-80 = 320px), but account for max-width constraint
          const maxTooltipWidth = 320;
          const viewportWidth = window.innerWidth;
          const padding = 16; // 1rem padding on each side
          const actualTooltipWidth = Math.min(maxTooltipWidth, viewportWidth - (padding * 2));
          
          // Calculate centered position
          let left = rect.left + (rect.width / 2);
          
          // Check if tooltip would overflow right edge
          const rightEdge = left + (actualTooltipWidth / 2);
          if (rightEdge > viewportWidth - padding) {
            left = viewportWidth - padding - (actualTooltipWidth / 2);
          }
          
          // Check if tooltip would overflow left edge
          const leftEdge = left - (actualTooltipWidth / 2);
          if (leftEdge < padding) {
            left = padding + (actualTooltipWidth / 2);
          }
          
          // Check if element is on the left side (sidebar) - if left edge is less than 300px, it's likely in sidebar
          const isSidebarElement = rect.left < 300;
          
          let top: number;
          let finalLeft: number;
          
          if (isSidebarElement) {
            // For sidebar elements, position dialog on the right side
            // Position to the right of the element with some gap
            finalLeft = rect.right + 16; // 16px gap from element
            
            // Check if dialog would overflow right edge
            if (finalLeft + actualTooltipWidth > viewportWidth - padding) {
              // If it would overflow, position it to the left instead
              finalLeft = rect.left - actualTooltipWidth - 16;
              // But make sure it doesn't go off the left edge
              if (finalLeft < padding) {
                finalLeft = padding;
              }
            }
            
            // Position vertically centered with the element
            top = rect.top + (rect.height / 2) - 100; // Center vertically, adjust for dialog height
            if (top < padding) {
              top = padding;
            }
          } else {
            // For other elements, use centered positioning
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const tooltipHeight = 200;
            
            if (spaceBelow >= tooltipHeight + 8 || spaceAbove < spaceBelow) {
              top = rect.bottom + 8;
            } else {
              top = rect.top - tooltipHeight - 8;
            }
            finalLeft = left;
          }
          
          setPosition({
            top,
            left: finalLeft,
          });
        }
      }, 300);
    }

    // Cleanup previous highlights
    return () => {
      setHighlightedRect(null); // Clear highlighted rect
      TOUR_ORDER.forEach((key) => {
        if (key === 'topSections') return; // Skip topSections, handled above
        
        const originalElement = elementRefs[key];
        if (originalElement) {
          let targetElement = originalElement;
          const button = originalElement.querySelector('button, a');
          if (button) {
            targetElement = button as HTMLElement;
          }
          if (targetElement) {
            targetElement.classList.remove("ring-4", "ring-blue-500", "ring-offset-2", "z-[60]", "relative", "rounded", "backdrop-blur-0");
            targetElement.style.removeProperty('filter');
            if (targetElement.parentElement) {
              targetElement.parentElement.style.removeProperty('filter');
            }
          }
          
          // Cleanup original element if different
          if (originalElement !== targetElement) {
            originalElement.classList.remove("z-[60]", "relative", "rounded");
            originalElement.style.removeProperty('filter');
          }
        }
      });
    };
  }, [currentStep, isOpen, elementRefs]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isOpen || showTopSectionsDialog) return;

    const updatePosition = () => {
      const currentElementKey = TOUR_ORDER[currentStep];
      if (currentElementKey === 'topSections') return;
      
      let element: HTMLElement | null = elementRefs[currentElementKey];
      
      if (element) {
        const button = element.querySelector('button, a');
        if (button) {
          element = button as HTMLElement;
        }
      }
      
      if (element) {
        const rect = element.getBoundingClientRect();
        // Update highlighted rect for overlay exclusion
        setHighlightedRect(rect);
        
        const maxTooltipWidth = 320;
        const viewportWidth = window.innerWidth;
        const padding = 16;
        const actualTooltipWidth = Math.min(maxTooltipWidth, viewportWidth - (padding * 2));
        
        let left = rect.left + (rect.width / 2);
        
        const rightEdge = left + (actualTooltipWidth / 2);
        if (rightEdge > viewportWidth - padding) {
          left = viewportWidth - padding - (actualTooltipWidth / 2);
        }
        
        const leftEdge = left - (actualTooltipWidth / 2);
        if (leftEdge < padding) {
          left = padding + (actualTooltipWidth / 2);
        }
        
        // Check if element is on the left side (sidebar)
        const isSidebarElement = rect.left < 300;
        
        let top: number;
        let finalLeft: number;
        
        if (isSidebarElement) {
          // For sidebar elements, position dialog on the right side
          finalLeft = rect.right + 16;
          
          if (finalLeft + actualTooltipWidth > viewportWidth - padding) {
            finalLeft = rect.left - actualTooltipWidth - 16;
            if (finalLeft < padding) {
              finalLeft = padding;
            }
          }
          
          top = rect.top + (rect.height / 2) - 100;
          if (top < padding) {
            top = padding;
          }
        } else {
          const spaceBelow = window.innerHeight - rect.bottom;
          const spaceAbove = rect.top;
          const tooltipHeight = 200;
          
          if (spaceBelow >= tooltipHeight + 8 || spaceAbove < spaceBelow) {
            top = rect.bottom + 8;
          } else {
            top = rect.top - tooltipHeight - 8;
          }
          finalLeft = left;
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
  }, [currentStep, isOpen, elementRefs, showTopSectionsDialog]);

  const handleNext = () => {
    if (currentStep < TOUR_ORDER.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleTopSectionsDialogClose = () => {
    setShowTopSectionsDialog(false);
    handleNext();
  };

  const handleFinish = async () => {
    // Mark as seen - we can add a dashboardTour field to the schema later
    // For now, we'll just close the tour
    onClose();
  };

  const currentElementKey = TOUR_ORDER[currentStep];
  const stepInfo = TOUR_STEPS[currentElementKey as keyof typeof TOUR_STEPS];
  const IconComponent = stepInfo?.icon;

  if (!isOpen) return null;

  // If showing top sections dialog, render it
  if (showTopSectionsDialog) {
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
        {/* Custom dialog positioned on the right side */}
        <div
          className="fixed z-[60] bg-white rounded-lg border border-gray-200 shadow-lg p-6 max-w-md"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            isolation: 'isolate',
          }}
        >
          <h2 className="text-lg font-semibold mb-3">Top Navigation Sections</h2>
          <p className="text-sm text-gray-600 mb-4">
            These are your main navigation sections. Use these to navigate between different features and manage your content.
          </p>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {currentStep + 1} of {TOUR_ORDER.length}
            </div>
            <Button onClick={handleTopSectionsDialogClose} size="sm">
              Next
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (!stepInfo || !IconComponent) return null;

  // Sidebar elements are: projects
  const sidebarElementKeys = ["projects"];
  const isSidebarElement = sidebarElementKeys.includes(currentElementKey);

  const arrowOffset = isSidebarElement ? '0%' : '50%';

  return (
    <>
      {/* Dark overlay - simple single overlay, elements above will show through */}
      <div 
        className="fixed inset-0 bg-black/30 z-40"
        style={{ 
          backdropFilter: 'none', 
          filter: 'none',
        }}
        onClick={handleFinish}
      />
      
      {/* Dialog box - positioned above overlay with isolation */}
      <div
        ref={tooltipRef}
        className="fixed z-[60] w-80 max-w-[calc(100vw-2rem)]"
        style={{
          isolation: 'isolate',
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: isSidebarElement ? 'none' : 'translateX(-50%)',
          maxWidth: 'calc(100vw - 2rem)',
        }}
      >
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-4">
          {/* Arrow pointing to element */}
          {isSidebarElement ? (
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-white"
              style={{
                left: '-8px',
              }}
            ></div>
          ) : (
            <div 
              className="absolute -top-2 w-4 h-4 bg-white border-l border-t border-gray-200 rotate-45"
              style={{
                left: arrowOffset,
                transform: `translateX(-50%) rotate(45deg)`,
              }}
            ></div>
          )}
        
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 shrink-0">
              <IconComponent className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold">{stepInfo.name}</h3>
          </div>
          <p className="text-base text-gray-600 mt-2 mb-4">
            {stepInfo.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {currentStep + 1} of {TOUR_ORDER.length}
            </div>
            <div className="flex gap-2">
              {currentStep < TOUR_ORDER.length - 1 ? (
                <Button onClick={handleNext} size="sm">Next</Button>
              ) : (
                <Button onClick={handleFinish} size="sm">Got it</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


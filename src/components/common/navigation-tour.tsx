"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle,
  Newspaper,
  Calendar,
  TrendingUp,
  Layers,
  Video,
  PlaySquare,
} from "lucide-react";

interface NavigationTourProps {
  isOpen: boolean;
  onClose: () => void;
  elementRefs: Record<string, HTMLElement | null>;
}

const NAVIGATION_STEPS = {
  addProject: {
    name: "Add Project",
    description: "Create a new project to organize your content. Each project can have its own description, URL, and content history.",
    icon: PlusCircle,
  },
  forYou: {
    name: "For You",
    description: "Discover curated content and trending posts tailored to your interests. Get personalized recommendations for your content strategy.",
    icon: Newspaper,
  },
  contentPlanner: {
    name: "Content Planner",
    description: "Plan and schedule your content. Track what you've posted along with dates to help you plan future posts with the calendar view.",
    icon: Calendar,
  },
  analytics: {
    name: "Analytics",
    description: "View detailed analytics and insights about your content performance. Track engagement, reach, and growth metrics across all platforms.",
    icon: TrendingUp,
  },
  template: {
    name: "Templates",
    description: "Browse and use pre-made templates to quickly create content. Templates help you maintain consistency across your posts. (under development)",
    icon: Layers,
  },
  videoMaker: {
    name: "Video Maker",
    description: "Create engaging videos quickly with our video maker. Generate professional videos in just a few steps with AI assistance.",
    icon: Video,
  },
  myVideos: {
    name: "My Videos",
    description: "Access all your created videos here. View, manage, and organize your video content library in one place.",
    icon: PlaySquare,
  },
};

const NAVIGATION_ORDER = ["addProject", "forYou", "contentPlanner", "analytics", "template", "videoMaker", "myVideos"];

export function NavigationTour({
  isOpen,
  onClose,
  elementRefs,
}: NavigationTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      return;
    }

    // Get the current element key
    const currentElementKey = NAVIGATION_ORDER[currentStep];
    let element: HTMLElement | null = elementRefs[currentElementKey];
    const originalElement = element;
    
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

      // Add highlight effect
      setTimeout(() => {
        // Apply to the element we found (button/link) or original
        element?.classList.add("ring-4", "ring-blue-500", "ring-offset-2", "z-[60]", "relative", "rounded", "backdrop-blur-0");
        if (element) {
          element.style.setProperty('filter', 'none', 'important');
          element.style.setProperty('position', 'relative', 'important');
        }
        
        // Also apply to original element if it's different
        if (originalElement && originalElement !== element) {
          originalElement.classList.add("z-[60]", "relative", "rounded");
          originalElement.style.setProperty('filter', 'none', 'important');
        }
        
        // Use the element for positioning
        const positionElement = element;
        
        if (positionElement) {
          const rect = positionElement.getBoundingClientRect();
          
          // Tooltip width (w-80 = 320px)
          const maxTooltipWidth = 320;
          const viewportWidth = window.innerWidth;
          const padding = 16;
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
          
          // Check if element is on the left side (sidebar)
          const isSidebarElement = rect.left < 300;
          
          let top: number;
          let finalLeft: number;
          
          if (isSidebarElement) {
            // For sidebar elements, position dialog on the right side
            finalLeft = rect.right + 16;
            
            // Check if dialog would overflow right edge
            if (finalLeft + actualTooltipWidth > viewportWidth - padding) {
              finalLeft = rect.left - actualTooltipWidth - 16;
              if (finalLeft < padding) {
                finalLeft = padding;
              }
            }
            
            // Position vertically centered with the element
            top = rect.top + (rect.height / 2) - 100;
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
      NAVIGATION_ORDER.forEach((key) => {
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
          }
          
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
    if (!isOpen) return;

    const updatePosition = () => {
      const currentElementKey = NAVIGATION_ORDER[currentStep];
      let element: HTMLElement | null = elementRefs[currentElementKey];
      
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
        
        let left = rect.left + (rect.width / 2);
        
        const rightEdge = left + (actualTooltipWidth / 2);
        if (rightEdge > viewportWidth - padding) {
          left = viewportWidth - padding - (actualTooltipWidth / 2);
        }
        
        const leftEdge = left - (actualTooltipWidth / 2);
        if (leftEdge < padding) {
          left = padding + (actualTooltipWidth / 2);
        }
        
        const isSidebarElement = rect.left < 300;
        
        let top: number;
        let finalLeft: number;
        
        if (isSidebarElement) {
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
  }, [currentStep, isOpen, elementRefs]);

  const handleNext = () => {
    if (currentStep < NAVIGATION_ORDER.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    onClose();
  };

  const currentElementKey = NAVIGATION_ORDER[currentStep];
  const stepInfo = NAVIGATION_STEPS[currentElementKey as keyof typeof NAVIGATION_STEPS];
  const IconComponent = stepInfo?.icon;

  if (!isOpen || !stepInfo || !IconComponent) return null;

  const isSidebarElement = true; // All navigation items are in sidebar
  const arrowOffset = '0%';

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
              <IconComponent className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold">{stepInfo.name}</h3>
          </div>
          <p className="text-base text-gray-600 mt-2 mb-4">
            {stepInfo.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {currentStep + 1} of {NAVIGATION_ORDER.length}
            </div>
            <div className="flex gap-2">
              {currentStep < NAVIGATION_ORDER.length - 1 ? (
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


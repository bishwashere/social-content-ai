"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, CopyIcon, UploadCloudIcon, Share2Icon, Sparkles, ImagePlus } from "lucide-react";
import { useUpdateFirstViewTooltip } from "@/server-actions/first-view-tooltip/hooks";
import { useSession } from "@/backend-apis/auth/hooks";

interface PlatformIconsOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  iconRefs: Record<string, HTMLElement | null>;
}

const ICON_INFO = {
  rewriteWithAI: {
    name: "Rewrite with AI",
    description: "Click to rewrite and improve your content using AI. You can enter a custom prompt or let AI enhance it automatically. Costs 1 credit.",
    icon: Sparkles,
  },
  createImage: {
    name: "Create Image",
    description: "Generate an image for your post. Choose between a free Text Card (styled text overlay) or an AI-generated image (1 credit).",
    icon: ImagePlus,
  },
  edit: {
    name: "Edit",
    description: "Click the pencil icon to edit and customize your generated content. Make it perfect for your brand voice and messaging.",
    icon: Pencil,
  },
  copy: {
    name: "Copy",
    description: "Click the copy icon to quickly copy the content to your clipboard. Perfect for pasting into your social media platforms.",
    icon: CopyIcon,
  },
  postToWall: {
    name: "Post to Wall",
    description: "Click the upload icon to publish this content to your public wall. Share it with your audience and showcase your work.",
    icon: UploadCloudIcon,
  },
  autoPost: {
    name: "Auto Post",
    description: "Click the share icon to automatically post this content to your connected social media accounts. Schedule it for later or post now.",
    icon: Share2Icon,
  },
};

const ICON_ORDER = ["rewriteWithAI", "createImage", "edit", "copy", "postToWall", "autoPost"];

export function PlatformIconsOnboarding({
  isOpen,
  onClose,
  iconRefs,
}: PlatformIconsOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const { data: session } = useSession();
  const updateTooltip = useUpdateFirstViewTooltip();
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      return;
    }

    // Get the current icon key
    const currentIconKey = ICON_ORDER[currentStep];
    let iconElement: HTMLElement | null = iconRefs[currentIconKey];
    
    // Try to find button inside if element is a wrapper, otherwise use element directly
    if (iconElement) {
      const button = iconElement.querySelector('button');
      if (button) {
        iconElement = button;
      }
    }
    
    if (iconElement) {
      // Scroll into view
      iconElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });

      // Add highlight effect - ensure it's above the overlay with white background and no blur
      setTimeout(() => {
        iconElement?.classList.add("ring-4", "ring-blue-500", "ring-offset-2", "z-[60]", "relative", "rounded", "backdrop-blur-0");
        // Force white background and ensure no blur
        iconElement.style.backgroundColor = 'white';
        iconElement.style.background = 'white';
        iconElement.style.filter = 'none';
        // Add padding if element doesn't have much padding to make white background more visible
        const computedStyle = window.getComputedStyle(iconElement);
        const padding = computedStyle.padding;
        if (!padding || padding === '0px') {
          iconElement.style.padding = '8px';
        }
        // Ensure the element and its parent are not affected by any blur
        if (iconElement.parentElement) {
          iconElement.parentElement.style.filter = 'none';
        }
        
        // Use the icon element for positioning (already resolved to button if available)
        const positionElement = iconElement;
        
        if (positionElement) {
          const rect = positionElement.getBoundingClientRect();
          
          // Tooltip width (w-80 = 320px), but account for max-width constraint
          const maxTooltipWidth = 320;
          const viewportWidth = window.innerWidth;
          const padding = 16; // 1rem padding on each side
          const actualTooltipWidth = Math.min(maxTooltipWidth, viewportWidth - (padding * 2));
          
          // Calculate centered position (rect.left is already in viewport coordinates)
          // Since we use fixed positioning, we work with viewport coordinates
          let left = rect.left + (rect.width / 2);
          
          // Check if tooltip would overflow right edge
          const rightEdge = left + (actualTooltipWidth / 2);
          if (rightEdge > viewportWidth - padding) {
            // Shift left to keep within viewport
            left = viewportWidth - padding - (actualTooltipWidth / 2);
          }
          
          // Check if tooltip would overflow left edge
          const leftEdge = left - (actualTooltipWidth / 2);
          if (leftEdge < padding) {
            // Shift right to keep within viewport
            left = padding + (actualTooltipWidth / 2);
          }
          
          setPosition({
            top: rect.bottom + 8, // 8px gap below icon (viewport coordinates for fixed positioning)
            left: left, // Adjusted to prevent overflow (viewport coordinates)
          });
        }
      }, 300);
    }

    // Cleanup previous highlights
    return () => {
      ICON_ORDER.forEach((key) => {
        const element = iconRefs[key];
        if (element) {
          // Try to find button inside if element is a wrapper, otherwise use element directly
          let targetElement = element;
          const button = element.querySelector('button');
          if (button) {
            targetElement = button;
          }
          if (targetElement) {
            targetElement.classList.remove("ring-4", "ring-blue-500", "ring-offset-2", "z-[60]", "relative", "rounded", "backdrop-blur-0");
            targetElement.style.backgroundColor = '';
            targetElement.style.background = '';
            targetElement.style.filter = '';
            // Remove padding if we added it
            if (targetElement.style.padding === '8px') {
              targetElement.style.padding = '';
            }
            if (targetElement.parentElement) {
              targetElement.parentElement.style.filter = '';
            }
          }
        }
      });
    };
  }, [currentStep, isOpen, iconRefs]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const currentIconKey = ICON_ORDER[currentStep];
      let iconElement: HTMLElement | null = iconRefs[currentIconKey];
      
      // Try to find button inside if element is a wrapper, otherwise use element directly
      if (iconElement) {
        const button = iconElement.querySelector('button');
        if (button) {
          iconElement = button;
        }
      }
      
      // Use the icon element for positioning (already resolved to button if available)
      const positionElement = iconElement;
      
      if (positionElement) {
        const rect = positionElement.getBoundingClientRect();
        
        // Tooltip width (w-80 = 320px), but account for max-width constraint
        const maxTooltipWidth = 320;
        const viewportWidth = window.innerWidth;
        const padding = 16; // 1rem padding on each side
        const actualTooltipWidth = Math.min(maxTooltipWidth, viewportWidth - (padding * 2));
        
        // Calculate centered position (rect.left is already in viewport coordinates)
        // Since we use fixed positioning, we work with viewport coordinates
        let left = rect.left + (rect.width / 2);
        
        // Check if tooltip would overflow right edge
        const rightEdge = left + (actualTooltipWidth / 2);
        if (rightEdge > viewportWidth - padding) {
          // Shift left to keep within viewport
          left = viewportWidth - padding - (actualTooltipWidth / 2);
        }
        
        // Check if tooltip would overflow left edge
        const leftEdge = left - (actualTooltipWidth / 2);
        if (leftEdge < padding) {
          // Shift right to keep within viewport
          left = padding + (actualTooltipWidth / 2);
        }
        
        setPosition({
          top: rect.bottom + 8, // 8px gap below icon (viewport coordinates for fixed positioning)
          left: left, // Adjusted to prevent overflow (viewport coordinates)
        });
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [currentStep, isOpen, iconRefs]);

  const handleNext = () => {
    if (currentStep < ICON_ORDER.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    // Clean up highlights immediately
    ICON_ORDER.forEach((key) => {
      const element = iconRefs[key];
      if (element) {
        let targetElement = element;
        const button = element.querySelector('button');
        if (button) {
          targetElement = button;
        }
        if (targetElement) {
          targetElement.classList.remove("ring-4", "ring-blue-500", "ring-offset-2", "z-[60]", "relative", "rounded", "backdrop-blur-0");
          targetElement.style.backgroundColor = '';
          targetElement.style.background = '';
          targetElement.style.filter = '';
          if (targetElement.style.padding === '8px') {
            targetElement.style.padding = '';
          }
          if (targetElement.parentElement) {
            targetElement.parentElement.style.filter = '';
          }
        }
      }
    });
    
    // Reset step and close immediately (don't wait for async)
    setCurrentStep(0);
    onClose();
    
    // Mark as seen in background (don't block the close)
    if (session?.user?.id) {
      updateTooltip.mutateAsync({
        userId: session.user.id,
        updateData: { platformIconsOnboarding: true },
      }).catch((error) => {
        console.error('Failed to update tooltip:', error);
      });
    }
  };

  // Early return if not open - ensures complete cleanup
  if (!isOpen) {
    // Clean up any remaining highlights when closed
    ICON_ORDER.forEach((key) => {
      const element = iconRefs[key];
      if (element) {
        let targetElement = element;
        const button = element.querySelector('button');
        if (button) {
          targetElement = button;
        }
        if (targetElement) {
          targetElement.classList.remove("ring-4", "ring-blue-500", "ring-offset-2", "z-[60]", "relative", "rounded", "backdrop-blur-0");
          targetElement.style.backgroundColor = '';
          targetElement.style.background = '';
          targetElement.style.filter = '';
          if (targetElement.style.padding === '8px') {
            targetElement.style.padding = '';
          }
          if (targetElement.parentElement) {
            targetElement.parentElement.style.filter = '';
          }
        }
      }
    });
    return null;
  }

  const currentIconKey = ICON_ORDER[currentStep];
  const iconInfo = ICON_INFO[currentIconKey as keyof typeof ICON_INFO];
  const IconComponent = iconInfo?.icon;

  if (!iconInfo || !IconComponent) return null;

  const arrowOffset = '50%'; // Center the arrow

  return (
    <>
      {/* Dark overlay for entire page - darker background, no blur */}
      <div 
        className="fixed inset-0 bg-black/30 z-40"
        style={{ 
          backdropFilter: 'none', 
          filter: 'none',
        }}
        onClick={handleFinish}
      />
      
      {/* Dialog box - positioned above overlay */}
      <div
        ref={tooltipRef}
        className="fixed z-[60] w-80 max-w-[calc(100vw-2rem)]"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translateX(-50%)', // Center horizontally
          maxWidth: 'calc(100vw - 2rem)', // Ensure it doesn't exceed viewport
        }}
      >
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-4">
          {/* Arrow pointing up to icon */}
          <div 
            className="absolute -top-2 w-4 h-4 bg-white border-l border-t border-gray-200 rotate-45"
            style={{
              left: arrowOffset,
              transform: `translateX(-50%) rotate(45deg)`, // Center the arrow at the offset position
            }}
          ></div>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-blue-100 shrink-0">
            <IconComponent className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold">{iconInfo.name}</h3>
        </div>
        <p className="text-base text-gray-600 mt-2 mb-4">
          {iconInfo.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {currentStep + 1} of {ICON_ORDER.length}
          </div>
          <div className="flex gap-2">
            {currentStep < ICON_ORDER.length - 1 ? (
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



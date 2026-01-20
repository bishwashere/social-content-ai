"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const documentationLinks = [
  {
    title: "Getting Started",
    href: "/documentation/getting-started",
  },
  {
    title: "Features",
    href: "/documentation/features",
    children: [
      { title: "Quick Generate", href: "/documentation/features/quick-generate" },
      { title: "Campaign Planner", href: "/documentation/features/campaign-planner" },
      { title: "Video Features", href: "/documentation/features/video-features" },
      { title: "Analytics & Insights", href: "/documentation/features/analytics-insights" },
      { title: "Templates Library", href: "/documentation/features/templates-library" },
      { title: "Automation", href: "/documentation/features/automation" },
      { title: "Content Discovery", href: "/documentation/features/content-discovery" },
      { title: "Blog News", href: "/documentation/features/blog-news" },
      { title: "Scheduled Posts", href: "/documentation/features/scheduled-posts" },
      { title: "Advanced Customization", href: "/documentation/features/advanced-customization" },
    ],
  },
  {
    title: "User Engagement",
    href: "/documentation/user-engagement",
    children: [
      { title: "Achievements", href: "/documentation/user-engagement/achievements" },
      { title: "Achievement Levels", href: "/documentation/user-engagement/achievement-levels" },
      { title: "Your Today", href: "/documentation/user-engagement/your-today" },
    ],
  },
  {
    title: "Project Management",
    href: "/documentation/project-management",
    children: [
      { title: "Project Folders", href: "/documentation/project-management/folders" },
      { title: "Team Collaboration", href: "/documentation/project-management/collaboration" },
    ],
  },
  {
    title: "Platforms",
    href: "/documentation/platforms",
    children: [
      { title: "Facebook", href: "/documentation/platforms/facebook" },
      { title: "Instagram", href: "/documentation/platforms/instagram" },
      { title: "LinkedIn", href: "/documentation/platforms/linkedin" },
      { title: "Twitter / X", href: "/documentation/platforms/twitter" },
      { title: "TikTok", href: "/documentation/platforms/tiktok" },
      { title: "Threads", href: "/documentation/platforms/threads" },
      { title: "Reddit", href: "/documentation/platforms/reddit" },
    ],
  },
  {
    title: "Integrations",
    href: "/documentation/integrations",
    children: [
      { title: "Webhooks", href: "/documentation/integrations/webhooks" },
    ],
  },
  {
    title: "Pricing & Billing",
    href: "/documentation/pricing-billing",
  },
  {
    title: "Security Overview",
    href: "/documentation/security",
  },
];

// Flatten the documentation structure into a sequential list
function flattenDocumentationLinks(): Array<{ title: string; href: string }> {
  const flat: Array<{ title: string; href: string }> = [];
  
  documentationLinks.forEach((link) => {
    // Add parent link
    flat.push({ title: link.title, href: link.href });
    
    // Add children if they exist
    if (link.children) {
      link.children.forEach((child) => {
        flat.push({ title: child.title, href: child.href });
      });
    }
  });
  
  return flat;
}

interface DocumentationNavigationProps {
  variant?: "top" | "bottom";
}

export function DocumentationNavigation({ variant = "bottom" }: DocumentationNavigationProps) {
  const pathname = usePathname();
  
  // Don't show navigation on the main documentation page
  if (pathname === "/documentation") {
    return null;
  }
  
  const flatLinks = flattenDocumentationLinks();
  const currentIndex = flatLinks.findIndex((link) => link.href === pathname);
  
  if (currentIndex === -1) {
    return null;
  }
  
  const previousPage = currentIndex > 0 ? flatLinks[currentIndex - 1] : null;
  const nextPage = currentIndex < flatLinks.length - 1 ? flatLinks[currentIndex + 1] : null;
  
  if (!previousPage && !nextPage) {
    return null;
  }
  
  // Top variant - compact, right-aligned
  if (variant === "top") {
    return (
      <div className="flex justify-end gap-2 mb-6">
        {previousPage && (
          <Link href={previousPage.href}>
            <Button variant="ghost" size="sm" className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
          </Link>
        )}
        {nextPage && (
          <Link href={nextPage.href}>
            <Button variant="ghost" size="sm" className="gap-1">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    );
  }
  
  // Bottom variant - full width with details
  return (
    <div className="mt-12 pt-8 border-t">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        {previousPage ? (
          <Link href={previousPage.href}>
            <Button variant="outline" className="w-full sm:w-auto">
              <ChevronLeft className="mr-2 h-4 w-4" />
              <div className="text-left">
                <div className="text-xs text-muted-foreground">Previous</div>
                <div className="font-medium">{previousPage.title}</div>
              </div>
            </Button>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        
        {nextPage && (
          <Link href={nextPage.href} className="ml-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Next</div>
                <div className="font-medium">{nextPage.title}</div>
              </div>
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

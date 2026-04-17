"use client";

import { ProjectWithChats, LinkedOAuthProvider } from "@/backend-apis/projects/types";
import { Facebook, Linkedin, Twitter } from "lucide-react";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OauthPlatform } from "@prisma/client";

type Platform = "facebook" | "instagram" | "x" | "linkedin" | "threads" | "reddit" | "tiktok";

const getPlatformIcon = (platform: Platform) => {
  switch (platform) {
    case "facebook":
      return <Facebook className="h-3.5 w-3.5" />;
    case "x":
      return <Twitter className="h-3.5 w-3.5" />;
    case "linkedin":
      return <Linkedin className="h-3.5 w-3.5" />;
    case "threads":
      return <Image src="/threads.svg" alt="Threads" width={14} height={14} className="dark:brightness-0 dark:invert" />;
    case "instagram":
      return <Image src="/instagram.svg" alt="Instagram" width={14} height={14} className="dark:brightness-0 dark:invert" />;
    case "reddit":
      return <Image src="/reddit.svg" alt="Reddit" width={14} height={14} className="dark:brightness-0 dark:invert" />;
    case "tiktok":
      return <Image src="/tiktok.svg" alt="TikTok" width={14} height={14} className="dark:brightness-0 dark:invert" />;
    default:
      return null;
  }
};

const getPlatformLabel = (platform: Platform): string => {
  switch (platform) {
    case "facebook":
      return "Facebook";
    case "x":
      return "X (Twitter)";
    case "linkedin":
      return "LinkedIn";
    case "threads":
      return "Threads";
    case "instagram":
      return "Instagram";
    case "reddit":
      return "Reddit";
    case "tiktok":
      return "TikTok";
    default:
      return platform;
  }
};

/**
 * Construct a profile URL from OAuth provider data
 */
function constructProfileUrl(provider: LinkedOAuthProvider): string | null {
  const { platform, pageId, pageName } = provider;

  if (!pageId && !pageName) return null;

  switch (platform) {
    case "facebook":
      // Facebook pages use pageId
      return pageId ? `https://www.facebook.com/profile.php?id=${pageId}` : null;
    
    case "linkedin":
      // LinkedIn company/organization pages
      return pageId ? `https://www.linkedin.com/company/${pageId}` : null;
    
    case "twitter":
      // Twitter uses username stored in pageName
      return pageName ? `https://x.com/${pageName}` : null;
    
    case "reddit":
      // Reddit subreddits - pageId is the subreddit name
      return pageId ? `https://www.reddit.com/r/${pageId}` : null;
    
    case "threads":
      // Threads uses username - pageName contains the display name, but we need username
      // For now, try to use pageName as it might be the username
      return pageName ? `https://www.threads.net/@${pageName.replace(/\s+/g, '').toLowerCase()}` : null;
    
    case "tiktok":
      // TikTok uses username stored in pageName
      return pageName ? `https://www.tiktok.com/@${pageName.replace(/\s+/g, '')}` : null;
    
    case "instagram":
      // Instagram stores username in pageName
      return pageName ? `https://www.instagram.com/${pageName}` : null;
    
    default:
      return null;
  }
}

/**
 * Map OAuth platform enum to our Platform type
 */
function mapOAuthPlatformToPlatform(platform: OauthPlatform): Platform | null {
  switch (platform) {
    case "facebook":
      return "facebook";
    case "linkedin":
      return "linkedin";
    case "twitter":
      return "x"; // Map twitter to x
    case "reddit":
      return "reddit";
    case "threads":
      return "threads";
    case "tiktok":
      return "tiktok";
    case "instagram":
      return "instagram";
    default:
      return null;
  }
}

interface ProjectSocialLinksProps {
  project: ProjectWithChats;
}

export function ProjectSocialLinks({ project }: ProjectSocialLinksProps) {
  // Get manually configured platform URLs
  const manualPlatformUrls = project.platformUrls as Record<string, string> | null;
  
  // Get linked OAuth providers
  const linkedProviders = project.projectToOAuthProviders || [];

  // Build a map of platform -> URL (OAuth providers take priority, then manual URLs)
  const platformUrlMap: Record<Platform, string> = {} as Record<Platform, string>;

  // First, add manual URLs as fallback
  if (manualPlatformUrls) {
    for (const [platform, url] of Object.entries(manualPlatformUrls)) {
      if (typeof url === "string" && url.trim() !== "") {
        platformUrlMap[platform as Platform] = url;
      }
    }
  }

  // Then, override with auto-constructed URLs from OAuth providers
  for (const { oauthProvider } of linkedProviders) {
    if (!oauthProvider) continue;
    
    const platform = mapOAuthPlatformToPlatform(oauthProvider.platform);
    if (!platform) continue;
    
    const url = constructProfileUrl(oauthProvider);
    if (url) {
      platformUrlMap[platform] = url;
    }
  }

  // Get all platforms with URLs
  const platformsWithUrls = Object.entries(platformUrlMap).filter(
    ([, url]) => url && url.trim() !== ""
  ) as [Platform, string][];

  if (platformsWithUrls.length === 0) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 ml-1">
        {platformsWithUrls.map(([platform, url]) => {
          const icon = getPlatformIcon(platform);
          if (!icon) return null;

          return (
            <Tooltip key={platform}>
              <TooltipTrigger asChild>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  {icon}
                </a>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {getPlatformLabel(platform)}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUnlinkedPagesForProjectCreation } from "@/server-actions/get-unlinked-pages";
import { useSession } from "@/backend-apis/auth/hooks";
import { toast } from "sonner";
import Image from "next/image";
import Cookie from "js-cookie";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";

type UnlinkedPage = {
  oauthProviderId: string;
  platform: string;
  pageName: string;
  pageId: string | null;
};

const PLATFORM_ICONS: Record<string, string> = {
  facebook: "/facebook.svg",
  linkedin: "/linkedin.png",
  twitter: "/x.svg",
  instagram: "/instagram.svg",
  threads: "/threads.svg",
  tiktok: "/tiktok.svg",
  reddit: "/reddit.svg",
};

const DISMISSED_PAGES_STORAGE_KEY = "dismissed-project-suggestions";

export function ProjectCreationSuggestions({ 
  onHasPagesChange 
}: { 
  onHasPagesChange?: (hasPages: boolean) => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  
  // Load dismissed pages from localStorage - now tracking by oauthProviderId
  const [dismissedProviderIds, setDismissedProviderIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(DISMISSED_PAGES_STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  
  // Save dismissed pages to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          DISMISSED_PAGES_STORAGE_KEY,
          JSON.stringify(Array.from(dismissedProviderIds))
        );
      } catch (error) {
        console.error("Failed to save dismissed pages:", error);
      }
    }
  }, [dismissedProviderIds]);

  const { data: unlinkedPages = [], isLoading } = useQuery({
    queryKey: ["unlinked-pages", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      return await getUnlinkedPagesForProjectCreation(session.user.id);
    },
    enabled: !!session?.user?.id,
    staleTime: 30000, // 30 seconds
  });

  const createProjectMutation = useMutation({
    mutationFn: async (pageName: string) => {
      const token = Cookie.get(AUTH_TOKEN_COOKIE_NAME);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          name: pageName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create project");
      }

      return await response.json();
    },
    onSuccess: (data, pageName) => {
      toast.success(`Project "${pageName}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-pages"] });
      // Navigate to the new project
      if (data.data?.id) {
        router.push(`/project/${data.data.id}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create project");
    },
  });

  const handleCreateProject = (pageName: string) => {
    createProjectMutation.mutate(pageName);
  };

  const handleDismiss = (pageName: string, providerIds: string[]) => {
    // Dismiss all provider IDs for this page name
    // This way, if connection is reset (new provider ID), it will show again
    setDismissedProviderIds((prev) => {
      const newSet = new Set(prev);
      providerIds.forEach(id => newSet.add(id));
      return newSet;
    });
  };

  // Group pages by pageName (same page name from different platforms should be one button)
  const groupedPages = useMemo(() => {
    const groups: Record<string, UnlinkedPage[]> = {};
    unlinkedPages.forEach((page) => {
      if (!groups[page.pageName]) {
        groups[page.pageName] = [];
      }
      groups[page.pageName].push(page);
    });
    return groups;
  }, [unlinkedPages]);

  // Filter out dismissed pages - check if ALL provider IDs for this page are dismissed
  // If connection is reset (new provider ID), it will show again
  const visiblePageGroups = Object.entries(groupedPages).filter(
    ([pageName, pages]) => {
      // Only hide if ALL providers for this page are dismissed
      // If connection is reset (new provider ID), it will show again
      const allDismissed = pages.every(page => 
        dismissedProviderIds.has(page.oauthProviderId)
      );
      return !allDismissed;
    }
  );

  // Notify parent about page availability
  useEffect(() => {
    if (onHasPagesChange) {
      onHasPagesChange(visiblePageGroups.length > 0);
    }
  }, [visiblePageGroups.length, onHasPagesChange]);

  if (isLoading) {
    return null;
  }

  if (visiblePageGroups.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3">
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
        Do you want to create projects for the following pages?
      </p>
      <div className="flex flex-wrap gap-2">
        {visiblePageGroups.map(([pageName, pages]) => {
          // Get unique platforms for this page name
          const platforms = pages.map((p) => p.platform.toLowerCase());
          const providerIds = pages.map((p) => p.oauthProviderId);
          
          return (
            <Button
              key={pageName}
              variant="outline"
              size="sm"
              onClick={() => handleCreateProject(pageName)}
              disabled={createProjectMutation.isPending}
              className="gap-2 relative group"
            >
              {/* Show all platform icons for this page */}
              <div className="flex items-center gap-1">
                {platforms.map((platform) => {
                  const iconPath = PLATFORM_ICONS[platform];
                  return iconPath ? (
                    <Image
                      key={platform}
                      src={iconPath}
                      alt={platform}
                      width={16}
                      height={16}
                      className="dark:invert"
                    />
                  ) : null;
                })}
              </div>
              <span className="font-medium">{pageName}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss(pageName, providerIds);
                }}
                className="flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded p-0.5 transition-colors"
                aria-label="Dismiss"
                title="Don't suggest again"
              >
                <X className="h-3 w-3 text-slate-500 dark:text-slate-400" />
              </button>
              <Plus className="h-3 w-3" />
            </Button>
          );
        })}
      </div>
    </div>
  );
}

"use server";

import { prisma } from "@/lib/prisma";
import { OauthPlatform } from "@prisma/client";

type CheckProjectOAuthProviderResult = {
  hasProviderConnected: boolean;
  isProjectMapped: boolean;
  availableProviders?: Array<{
    id: string;
    pageName?: string | null;
    pageId?: string | null;
    isStandalone?: boolean;
  }>;
  mappedProviders?: Array<{
    id: string;
    pageName?: string | null;
    pageId?: string | null;
    isStandalone?: boolean;
  }>;
};

type CheckAllProjectOAuthProvidersResult = Record<OauthPlatform, CheckProjectOAuthProviderResult>;

/**
 * Normalize string for comparison: remove spaces, convert to lowercase
 */
function normalizeForComparison(str: string): string {
  return str.replace(/\s+/g, "").toLowerCase();
}

export async function checkAllProjectOAuthProviders(
  projectId: string,
  userId: string,
  platforms: OauthPlatform[]
): Promise<CheckAllProjectOAuthProvidersResult> {
  try {
    // First, check if the user is the project owner
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { userId: true, name: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    const isOwner = project.userId === userId;

    if (!isOwner) {
      return platforms.reduce((acc, platform) => ({
        ...acc,
        [platform]: {
          hasProviderConnected: false,
          isProjectMapped: false,
        }
      }), {} as CheckAllProjectOAuthProvidersResult);
    }

    // Fetch all OAuth providers for all platforms in a single query
    // Include ALL project mappings to check if provider is linked to any project
    const providers = await prisma.oauthProvider.findMany({
      where: {
        userId: project.userId,
        platform: {
          in: platforms,
        },
      },
      include: {
        projectToOAuthProviders: {
          // Get all mappings, not just for this project
          select: {
            projectId: true,
          },
        },
      },
    });

    // Normalize project name for comparison
    const normalizedProjectName = normalizeForComparison(project.name);

    // Group providers by platform
    const result: CheckAllProjectOAuthProvidersResult = {} as CheckAllProjectOAuthProvidersResult;

    platforms.forEach(platform => {
      const platformProviders = providers.filter(p => p.platform === platform);
      const hasProviderConnected = platformProviders.length > 0;
      const isProjectMapped = platformProviders.some(
        provider => provider.projectToOAuthProviders.some(
          mapping => mapping.projectId === projectId
        )
      );

      // Filter providers that:
      // 1. Are NOT mapped to THIS specific project
      // 2. Are NOT mapped to ANY other project (hide providers already linked elsewhere)
      // 3. Do NOT match the project name (to hide auto-link candidates)
      const filteredProviders = platformProviders.filter(provider => {
        // Check if mapped to THIS specific project
        const isMappedToThisProject = provider.projectToOAuthProviders.some(
          mapping => mapping.projectId === projectId
        );
        
        // Exclude if already mapped to this project
        if (isMappedToThisProject) {
          return false;
        }
        
        // Exclude if mapped to ANY other project (already linked elsewhere)
        if (provider.projectToOAuthProviders.length > 0) {
          return false;
        }
        
        // Exclude if name matches project name (auto-link candidate)
        if (provider.pageName) {
          const normalizedPageName = normalizeForComparison(provider.pageName);
          if (normalizedPageName === normalizedProjectName) {
            return false;
          }
        }
        
        return true;
      });


      result[platform] = {
        hasProviderConnected,
        isProjectMapped,
        availableProviders: hasProviderConnected
          ? filteredProviders.map((p) => ({
            id: p.id,
            pageName: p.pageName,
            pageId: p.pageId,
            isStandalone: p.isStandalone,
          }))
          : undefined,
        mappedProviders: platformProviders.map((p) => ({
          id: p.id,
          pageName: p.pageName,
          pageId: p.pageId,
          isStandalone: p.isStandalone,
        })),
      };
    });

    return result;
  } catch (error) {
    console.error("Error checking project OAuth providers:", error);
    throw error;
  }
}

export async function checkProjectOAuthProvider(
  projectId: string,
  userId: string,
  platform: OauthPlatform
): Promise<CheckProjectOAuthProviderResult> {
  try {
    // First, check if the user is the project owner
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    const isOwner = project.userId === userId;

    if (!isOwner) {
      return {
        hasProviderConnected: false,
        isProjectMapped: false,
      };
    }

    // Check if the owner has any OAuth providers for the platform
    const providers = await prisma.oauthProvider.findMany({
      where: {
        userId: project.userId,
        platform,
      },
      select: {
        id: true,
        pageName: true,
        pageId: true,
        isStandalone: true,
        projectToOAuthProviders: true,
      },
    });

    const hasProviderConnected = providers.length > 0;
    const isProjectMapped = providers.some(provider =>
      provider.projectToOAuthProviders.some(p => p.projectId === projectId)
    );

    // Filter providers that are NOT mapped to THIS specific project
    const filteredProviders = providers.filter(
      provider => !provider.projectToOAuthProviders.some(p => p.projectId === projectId)
    );

    return {
      hasProviderConnected,
      isProjectMapped,
      availableProviders: hasProviderConnected
        ? filteredProviders.map((p) => ({
          id: p.id,
          pageName: p.pageName,
          pageId: p.pageId,
          isStandalone: p.isStandalone,
        }))
        : undefined,
    };
  } catch (error) {
    console.error("Error checking project OAuth provider:", error);
    throw error;
  }
}

export async function getOauthPages(
  userId: string,
  platform: OauthPlatform
): Promise<{ id: string; pageId: string | null; pageName: string | null }[]> {
  try {
    // Check if the user has any OAuth providers for the platform
    const providers = await prisma.oauthProvider.findMany({
      where: {
        userId: userId,
        platform,
      },
      select: {
        id: true,
        pageName: true,
        pageId: true,
      },
    });

    return providers;
  } catch (error) {
    console.error("Error checking project OAuth provider:", error);
    throw error;
  }
}
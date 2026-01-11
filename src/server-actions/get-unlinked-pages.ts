"use server";

import { prisma } from "@/lib/prisma";
import { OauthPlatform } from "@prisma/client";

type UnlinkedPage = {
  oauthProviderId: string;
  platform: OauthPlatform;
  pageName: string;
  pageId: string | null;
};

/**
 * Normalize string for comparison: remove spaces, convert to lowercase
 */
function normalizeForComparison(str: string): string {
  return str.replace(/\s+/g, "").toLowerCase();
}

/**
 * Get OAuth provider pages that don't have a matching project
 * These are pages that the user has connected but haven't created a project for
 */
export async function getUnlinkedPagesForProjectCreation(
  userId: string
): Promise<UnlinkedPage[]> {
  try {
    // Get all OAuth providers for the user that have a pageName
    const providers = await prisma.oauthProvider.findMany({
      where: {
        userId,
        pageName: {
          not: null,
        },
      },
      select: {
        id: true,
        platform: true,
        pageName: true,
        pageId: true,
        projectToOAuthProviders: {
          select: {
            projectId: true,
          },
        },
      },
    });

    // Get all projects for the user
    const projects = await prisma.projects.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Create a set of normalized project names for quick lookup
    const normalizedProjectNames = new Set(
      projects.map((p) => normalizeForComparison(p.name))
    );

    // Filter providers that:
    // 1. Are not linked to any project
    // 2. Don't have a matching project by name
    const unlinkedPages: UnlinkedPage[] = [];

    for (const provider of providers) {
      // Skip if already linked to any project
      if (provider.projectToOAuthProviders.length > 0) {
        continue;
      }

      // Skip if no pageName
      if (!provider.pageName) {
        continue;
      }

      // Check if there's a matching project by name
      const normalizedPageName = normalizeForComparison(provider.pageName);
      const hasMatchingProject = normalizedProjectNames.has(normalizedPageName);

      // If no matching project, add to unlinked pages
      if (!hasMatchingProject) {
        unlinkedPages.push({
          oauthProviderId: provider.id,
          platform: provider.platform,
          pageName: provider.pageName,
          pageId: provider.pageId,
        });
      }
    }

    return unlinkedPages;
  } catch (error) {
    console.error("Error getting unlinked pages for project creation:", error);
    throw error;
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { OauthPlatform } from "@prisma/client";

type AutoLinkedProvider = {
  oauthProviderId: string;
  platform: OauthPlatform;
  pageName: string | null;
  projectId: string;
};

/**
 * Normalize string for comparison: remove spaces, convert to lowercase
 */
function normalizeForComparison(str: string): string {
  return str.replace(/\s+/g, "").toLowerCase();
}

/**
 * Auto-link a specific OAuth provider to all matching projects for a user
 * This is called when a new OAuth provider is connected
 */
export async function autoLinkProviderToAllProjects(
  oauthProviderId: string,
  userId: string
): Promise<void> {
  try {
    // Get the OAuth provider
    const provider = await prisma.oauthProvider.findUnique({
      where: { id: oauthProviderId },
      select: {
        id: true,
        pageName: true,
        userId: true,
      },
    });

    if (!provider || !provider.pageName || provider.userId !== userId) {
      return;
    }

    const normalizedPageName = normalizeForComparison(provider.pageName);

    // Get all user's projects
    const projects = await prisma.projects.findMany({
      where: { userId },
      select: { id: true, name: true },
    });

    // Auto-link to matching projects
    // Note: projects are already filtered by userId, so they're all owned by the user
    for (const project of projects) {
      const normalizedProjectName = normalizeForComparison(project.name);
      
      if (normalizedPageName === normalizedProjectName) {
        // Verify project ownership (same validation as manual linking)
        const projectCheck = await prisma.projects.findUnique({
          where: { id: project.id },
          select: { userId: true },
        });

        if (!projectCheck || projectCheck.userId !== userId) {
          console.log(`[autoLinkProviderToAllProjects] Skipping project ${project.id} - ownership mismatch`);
          continue;
        }

        // Check if mapping already exists
        const existingMapping = await prisma.projectToOAuthProvider.findFirst({
          where: {
            projectId: project.id,
            oauthProviderId: provider.id,
          },
        });

        if (!existingMapping) {
          // Create the same type of mapping as manual linking
          await prisma.projectToOAuthProvider.create({
            data: {
              projectId: project.id,
              oauthProviderId: provider.id,
            },
          });
          console.log(`[autoLinkProviderToAllProjects] Auto-linked ${provider.pageName} to project ${project.name}`);
        }
      }
    }
  } catch (error) {
    console.error("Error auto-linking provider to all projects:", error);
    // Don't throw - this is a background operation
  }
}

/**
 * Auto-link all OAuth providers to all matching projects for a user
 * This is called when projects are fetched or when a new project is created
 */
export async function autoLinkAllProvidersToAllProjects(
  userId: string
): Promise<void> {
  try {
    // Get all user's projects
    const projects = await prisma.projects.findMany({
      where: { userId },
      select: { id: true, name: true },
    });

    if (projects.length === 0) {
      return;
    }

    // Get all OAuth providers for the user
    const providers = await prisma.oauthProvider.findMany({
      where: { userId },
      select: {
        id: true,
        pageName: true,
        projectToOAuthProviders: {
          select: {
            projectId: true,
          },
        },
      },
    });

    // For each project, find matching providers and link them
    // Note: projects are already filtered by userId, so they're all owned by the user
    for (const project of projects) {
      // Verify project ownership (same validation as manual linking)
      const projectCheck = await prisma.projects.findUnique({
        where: { id: project.id },
        select: { userId: true },
      });

      if (!projectCheck || projectCheck.userId !== userId) {
        console.log(`[autoLinkAllProvidersToAllProjects] Skipping project ${project.id} - ownership mismatch`);
        continue;
      }

      const normalizedProjectName = normalizeForComparison(project.name);

      for (const provider of providers) {
        if (!provider.pageName) continue;

        // Skip if already linked to this project
        const isAlreadyLinked = provider.projectToOAuthProviders.some(
          mapping => mapping.projectId === project.id
        );
        if (isAlreadyLinked) continue;

        // Check if names match
        const normalizedPageName = normalizeForComparison(provider.pageName);
        if (normalizedPageName === normalizedProjectName) {
          // Create the same type of mapping as manual linking
          await prisma.projectToOAuthProvider.create({
            data: {
              projectId: project.id,
              oauthProviderId: provider.id,
            },
          });
          console.log(`[autoLinkAllProvidersToAllProjects] Auto-linked ${provider.pageName} to project ${project.name}`);
        }
      }
    }
  } catch (error) {
    console.error("Error auto-linking all providers to all projects:", error);
    // Don't throw - this is a background operation
  }
}

/**
 * Auto-link OAuth providers to projects based on name matching
 * Returns providers that were auto-linked and need user approval
 */
export async function autoLinkOAuthProviders(
  projectId: string,
  userId: string
): Promise<AutoLinkedProvider[]> {
  try {
    // Get project details
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { userId: true, name: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.userId !== userId) {
      throw new Error("Only project owner can auto-link providers");
    }

    const normalizedProjectName = normalizeForComparison(project.name);

    // Get all OAuth providers for the user that are not already linked to this project
    const allProviders = await prisma.oauthProvider.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        platform: true,
        pageName: true,
        pageId: true,
        projectToOAuthProviders: {
          where: {
            projectId,
          },
        },
      },
    });

    // Filter providers that:
    // 1. Are not already linked to this project
    // 2. Have a pageName
    // 3. Match the project name (normalized, case-insensitive, no spaces)
    const matchingProviders = allProviders.filter((provider) => {
      // Skip if already linked
      if (provider.projectToOAuthProviders.length > 0) {
        return false;
      }

      // Skip if no pageName
      if (!provider.pageName) {
        return false;
      }

      // Compare normalized names
      const normalizedPageName = normalizeForComparison(provider.pageName);
      return normalizedPageName === normalizedProjectName;
    });

    // Auto-link matching providers
    const autoLinkedProviders: AutoLinkedProvider[] = [];

    for (const provider of matchingProviders) {
      // Check if mapping already exists (race condition check)
      const existingMapping = await prisma.projectToOAuthProvider.findFirst({
        where: {
          projectId,
          oauthProviderId: provider.id,
        },
      });

      if (!existingMapping) {
        // Create the mapping
        await prisma.projectToOAuthProvider.create({
          data: {
            projectId,
            oauthProviderId: provider.id,
          },
        });

        autoLinkedProviders.push({
          oauthProviderId: provider.id,
          platform: provider.platform,
          pageName: provider.pageName,
          projectId,
        });
      }
    }

    return autoLinkedProviders;
  } catch (error) {
    console.error("Error auto-linking OAuth providers:", error);
    throw error;
  }
}

/**
 * Get auto-linked providers that are pending approval for a project
 */
export async function getPendingAutoLinkedProviders(
  projectId: string,
  userId: string
): Promise<AutoLinkedProvider[]> {
  try {
    // Get project details
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { userId: true, name: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.userId !== userId) {
      return [];
    }

    // Get approved auto-links from FirstViewTooltip
    const tooltip = await prisma.firstViewTooltip.findFirst({
      where: { userId },
      select: { approvedAutoLinks: true },
    });

    const approvedAutoLinks = Array.isArray(tooltip?.approvedAutoLinks) 
      ? (tooltip.approvedAutoLinks as string[])
      : [];
    const approvedSet = new Set(approvedAutoLinks);

    // Get all mappings for this project
    const mappings = await prisma.projectToOAuthProvider.findMany({
      where: {
        projectId,
      },
      include: {
        oauthProvider: {
          select: {
            id: true,
            platform: true,
            pageName: true,
            userId: true,
          },
        },
      },
    });

    const normalizedProjectName = normalizeForComparison(project.name);

    const pendingProviders: AutoLinkedProvider[] = [];

    for (const mapping of mappings) {
      const provider = mapping.oauthProvider;
      
      // Skip if provider is null
      if (!provider) {
        continue;
      }
      
      // Only include providers that belong to the user
      if (provider.userId !== userId) {
        continue;
      }

      // Check if this provider matches the project name (auto-linked)
      if (provider.pageName) {
        const normalizedPageName = normalizeForComparison(provider.pageName);
        if (normalizedPageName === normalizedProjectName) {
          // Check if this auto-link has been approved
          const autoLinkKey = `${projectId}:${provider.id}`;
          if (!approvedSet.has(autoLinkKey)) {
            pendingProviders.push({
              oauthProviderId: provider.id,
              platform: provider.platform,
              pageName: provider.pageName,
              projectId,
            });
          }
        }
      }
    }

    return pendingProviders;
  } catch (error) {
    console.error("Error getting pending auto-linked providers:", error);
    throw error;
  }
}

/**
 * Approve an auto-linked provider (dismiss the approval message)
 */
export async function approveAutoLinkedProvider(
  projectId: string,
  oauthProviderId: string,
  userId: string
): Promise<void> {
  try {
    // Verify the mapping exists and belongs to the user
    const mapping = await prisma.projectToOAuthProvider.findFirst({
      where: {
        projectId,
        oauthProviderId,
      },
      include: {
        oauthProvider: {
          select: {
            userId: true,
          },
        },
        project: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!mapping) {
      throw new Error("Mapping not found");
    }

    if (!mapping.oauthProvider || !mapping.project) {
      throw new Error("Invalid mapping");
    }

    if (mapping.oauthProvider.userId !== userId || mapping.project.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Add to approved auto-links in FirstViewTooltip
    const tooltip = await prisma.firstViewTooltip.findFirst({
      where: { userId },
    });

    const autoLinkKey = `${projectId}:${oauthProviderId}`;
    const currentApproved = Array.isArray(tooltip?.approvedAutoLinks)
      ? (tooltip.approvedAutoLinks as string[])
      : [];
    
    if (!currentApproved.includes(autoLinkKey)) {
      const updatedApproved = [...currentApproved, autoLinkKey];
      
      if (tooltip) {
        await prisma.firstViewTooltip.update({
          where: { id: tooltip.id },
          data: { approvedAutoLinks: updatedApproved as any },
        });
      } else {
        await prisma.firstViewTooltip.create({
          data: {
            userId,
            approvedAutoLinks: updatedApproved as any,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error approving auto-linked provider:", error);
    throw error;
  }
}

/**
 * Cancel an auto-linked provider (remove the mapping)
 */
export async function cancelAutoLinkedProvider(
  projectId: string,
  oauthProviderId: string,
  userId: string
): Promise<void> {
  try {
    // Verify the mapping exists and belongs to the user
    const mapping = await prisma.projectToOAuthProvider.findFirst({
      where: {
        projectId,
        oauthProviderId,
      },
      include: {
        oauthProvider: {
          select: {
            userId: true,
          },
        },
        project: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!mapping) {
      throw new Error("Mapping not found");
    }

    if (!mapping.oauthProvider || !mapping.project) {
      throw new Error("Invalid mapping");
    }

    if (mapping.oauthProvider.userId !== userId || mapping.project.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Delete the mapping
    await prisma.projectToOAuthProvider.delete({
      where: {
        id: mapping.id,
      },
    });
  } catch (error) {
    console.error("Error canceling auto-linked provider:", error);
    throw error;
  }
}


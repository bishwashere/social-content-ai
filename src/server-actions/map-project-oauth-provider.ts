"use server";

import { prisma } from "@/lib/prisma";
import { getProjectOAuthPermission } from "@/lib/project-oauth-permissions";

export async function mapProjectToOAuthProvider(
  projectId: string,
  oauthProviderId: string,
  userId: string
) {
  try {
    const permission = await getProjectOAuthPermission(projectId, userId);
    if (!permission || !permission.canManageOAuth) {
      throw new Error("You do not have permission to link OAuth providers to this project");
    }

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new Error("Project not found");
    }

    // Provider must belong to the current user (owner or editor can only link their own OAuth)
    const provider = await prisma.oauthProvider.findUnique({
      where: { id: oauthProviderId },
      select: { userId: true },
    });

    if (!provider) {
      throw new Error("OAuth provider not found");
    }

    if (provider.userId !== userId) {
      throw new Error("OAuth provider does not belong to you");
    }

    // Check if mapping already exists
    const existingMapping = await prisma.projectToOAuthProvider.findFirst({
      where: {
        projectId,
        oauthProviderId,
      },
    });

    if (existingMapping) {
      return existingMapping;
    }

    // Create new mapping
    const mapping = await prisma.projectToOAuthProvider.create({
      data: {
        projectId,
        oauthProviderId,
      },
    });

    return mapping;
  } catch (error) {
    console.error("Error mapping project to OAuth provider:", error);
    throw error;
  }
}
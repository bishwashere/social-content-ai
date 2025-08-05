"use server";

import { prisma } from "@/lib/prisma";

export async function mapProjectToOAuthProvider(
  projectId: string,
  oauthProviderId: string,
  userId: string
) {
  try {
    // First, check if the user is the project owner
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.userId !== userId) {
      throw new Error("Only project owner can map OAuth providers");
    }

    // Check if the OAuth provider exists and belongs to the user
    const provider = await prisma.oauthProvider.findUnique({
      where: { id: oauthProviderId },
      select: { userId: true },
    });

    if (!provider) {
      throw new Error("OAuth provider not found");
    }

    if (provider.userId !== userId) {
      throw new Error("OAuth provider does not belong to the user");
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
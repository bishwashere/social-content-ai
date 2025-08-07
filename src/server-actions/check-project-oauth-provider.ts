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
  }>;
};

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
        isPersonal: true,
        projectToOAuthProviders: {
          where: {
            projectId,
          },
        },
      },
    });

    const hasProviderConnected = providers.length > 0;
    const isProjectMapped = providers.some(
      (provider) => provider.projectToOAuthProviders.length > 0
    );

    return {
      hasProviderConnected,
      isProjectMapped,
      availableProviders: hasProviderConnected
        ? providers.map((p) => ({
            id: p.id,
            pageName: p.pageName,
            pageId: p.pageId,
            isPersonal: p.isPersonal,
          }))
        : undefined,
    };
  } catch (error) {
    console.error("Error checking project OAuth provider:", error);
    throw error;
  }
}

export async function getOauthPages(
  // projectId: string,
  userId: string,
  platform: OauthPlatform
): Promise<{ id: string; pageId: string | null; pageName: string | null }[]> {
  try {
    // First, check if the user is the project owner
    // const project = await prisma.projects.findUnique({
    //   where: { id: projectId },
    //   select: { userId: true },
    // });

    // if (!project) {
    //   throw new Error("Project not found");
    // }

    // const isOwner = project.userId === userId;

    // if (!isOwner) {
    //   throw new Error("Project not found");
    // }

    // Check if the owner has any OAuth providers for the platform
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

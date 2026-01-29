"use server";

import { prisma } from "@/lib/prisma";

export async function deleteAllUserOAuthProviders(userId: string) {
  if (!userId) throw new Error("Not authenticated");

  // Find all oauth provider ids for this user
  const providers = await prisma.oauthProvider.findMany({
    where: { userId: userId },
    select: { id: true },
  });
  const providerIds = providers.map((p) => p.id);

  // Delete all ProjectToOAuthProvider entries for these provider ids
  await prisma.projectToOAuthProvider.deleteMany({
    where: { oauthProviderId: { in: providerIds } },
  });

  // Delete all OauthProvider entries for this user
  await prisma.oauthProvider.deleteMany({
    where: { userId: userId },
  });

  return { success: true };
}

/**
 * Delete a single OAuth provider by ID
 * Also cleans up any ProjectToOAuthProvider links
 */
export async function deleteSingleOAuthProvider(providerId: string, userId: string) {
  if (!userId) throw new Error("Not authenticated");
  if (!providerId) throw new Error("Provider ID is required");

  // Verify the provider belongs to the user
  const provider = await prisma.oauthProvider.findFirst({
    where: { 
      id: providerId,
      userId: userId 
    },
  });

  if (!provider) {
    throw new Error("Provider not found or you don't have permission to delete it");
  }

  // Delete all ProjectToOAuthProvider entries for this provider
  await prisma.projectToOAuthProvider.deleteMany({
    where: { oauthProviderId: providerId },
  });

  // Delete the OauthProvider entry
  await prisma.oauthProvider.delete({
    where: { id: providerId },
  });

  return { success: true, deletedProvider: provider };
}

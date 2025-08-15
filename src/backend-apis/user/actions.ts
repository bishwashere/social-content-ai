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

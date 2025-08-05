"use server";
import { prisma } from "@/lib/prisma";
import { OauthProvider } from "@prisma/client";

/**
 * Get all OAuth providers for a specific user
 */
export async function getOAuthProviders(
  userId: string
): Promise<OauthProvider[]> {
  const providers = await prisma.oauthProvider.findMany({
    where: { userId },
    orderBy: [{ platform: "asc" }, { createdAt: "desc" }],
  });

  return providers;
}

"use server";

import { prisma } from "@/lib/prisma";

export const checkAuthTokens = async (userId: string, platform: string, postDate?: Date) => {
  try {
    console.log(
      `🔍 Finding OAuth provider for userId: ${userId}, platform: ${platform}`
    );
    const data = await prisma.oauthProvider.findFirst({
      where: {
        userId: userId,
        platform: platform === "x" ? "twitter" : platform,
      },
    });

    if (!data) {
      console.log(
        `❌ No OAuth provider found for userId: ${userId}, platform: ${platform}`
      );
      return false;
    }

    // Check if token will expire till posting date and doesnot contain refreshtoken too
    if (data.expiresAt && !data.refreshToken && postDate) {
      const diff = Number(data.expiresAt) - (postDate.getTime() / 1000);
      if (diff <= 0) {
        console.log(
          `❌ Token expired and no refresh token. Relogin ...`
        );
        return false;
      };
    }

    return true;
  } catch (error) {
    console.error("❌ Error checking auth tokens:", error);
    console.error(
      "Stack trace:",
      error instanceof Error ? error.stack : "No stack trace available"
    );
    return false;
  }
};

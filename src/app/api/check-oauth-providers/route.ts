import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { sendNextResponse } from "@/lib/send-next-response";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return sendNextResponse({
        status: 400,
        message: "User ID is required",
      });
    }

    // Check if user has any Facebook or LinkedIn providers (connected to user account)
    const providers = await prisma.oauthProvider.findMany({
      where: {
        userId,
        platform: {
          in: ["facebook", "linkedin", "twitter", "threads", "tiktok", "reddit", "instagram"],
        },
      },
      select: {
        platform: true,
      },
    });

    // Get unique platforms connected to user account
    const uniquePlatforms = Array.from(
      new Set(providers.map((p) => p.platform))
    ).map((platform) => ({ platform }));

    // Check which platforms are connected
    const hasFacebook = uniquePlatforms.some(p => p.platform === "facebook");
    const hasLinkedin = uniquePlatforms.some(p => p.platform === "linkedin");
    const hasTwitter = uniquePlatforms.some(p => p.platform === "twitter");
    const hasThreads = uniquePlatforms.some(p => p.platform === "threads");
    const hasTiktok = uniquePlatforms.some(p => p.platform === "tiktok");
    const hasReddit = uniquePlatforms.some(p => p.platform === "reddit");
    const hasInstagram = uniquePlatforms.some(p => p.platform === "instagram");

    return sendNextResponse({
      status: 200,
      message: "OAuth providers checked successfully",
      data: {
        hasProviders: providers.length > 0,
        hasFacebook,
        hasLinkedin,
        hasTwitter,
        hasThreads,
        hasTiktok,
        hasReddit,
        hasInstagram,
        count: providers.length,
        providers: uniquePlatforms,
      },
    });
  } catch (error) {
    console.error("Error checking OAuth providers:", error);
    return sendNextResponse({
      status: 500,
      message: "Failed to check OAuth providers",
    });
  }
}


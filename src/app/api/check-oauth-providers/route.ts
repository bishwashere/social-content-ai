import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { sendNextResponse } from "@/lib/send-next-response";

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

    // Check if user has any Facebook or LinkedIn providers
    const providers = await prisma.oauthProvider.findMany({
      where: {
        userId,
        platform: {
          in: ["facebook", "linkedin"],
        },
      },
      select: {
        platform: true,
      },
    });

    // Get unique platforms
    const uniquePlatforms = Array.from(
      new Set(providers.map((p) => p.platform))
    ).map((platform) => ({ platform }));

    return sendNextResponse({
      status: 200,
      message: "OAuth providers checked successfully",
      data: {
        hasProviders: providers.length > 0,
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


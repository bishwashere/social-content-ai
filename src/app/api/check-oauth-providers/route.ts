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
        projectToOAuthProviders: true,
      },
    });

    // Filter providers that are mapped to at least one project
    const mappedProviders = providers.filter(
      (p) => p.projectToOAuthProviders.length > 0
    );

    // Get unique platforms that are mapped to projects
    const uniquePlatforms = Array.from(
      new Set(mappedProviders.map((p) => p.platform))
    ).map((platform) => ({ platform }));

    return sendNextResponse({
      status: 200,
      message: "OAuth providers checked successfully",
      data: {
        hasProviders: mappedProviders.length > 0,
        count: mappedProviders.length,
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


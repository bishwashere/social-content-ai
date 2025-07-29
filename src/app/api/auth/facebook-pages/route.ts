import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { sendNextResponse } from "@/lib/send-next-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, pageId, pageAccessToken } = body;

    if (!userId || !pageId || !pageAccessToken) {
      return sendNextResponse({
        status: 400,
        message: "Missing required fields",
      });
    }

    // Update the OAuth provider with the selected page's information
    await prisma.oauthProvider.updateMany({
      where: {
        userId: userId,
        platform: "facebook",
      },
      data: {
        accessToken: pageAccessToken,
        facebookPageId: pageId,
      },
    });

    return sendNextResponse({
      status: 200,
      message: "Facebook page updated successfully",
    });
  } catch (error) {
    console.error("Error updating Facebook page:", error);
    return sendNextResponse({
      status: 500,
      message: "Failed to update Facebook page",
    });
  }
}
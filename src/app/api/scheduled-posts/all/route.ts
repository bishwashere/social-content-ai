import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import catchApiAsyncError from "@/lib/catch-api-async-error";

export async function GET(request: NextRequest) {
  return applyMiddleware(
    validateUserAuth({ errorIfNotAuthenticated: true }),
    catchApiAsyncError(async (req) => {
      //@ts-expect-error: user is not defined in Request type
      const user = req.parsed.user;

      const scheduledPosts = await prisma.scheduledPost.findMany({
        where: {
          OR: [
            { project: { userId: user.id } },
            { project: { invitedUsers: { some: { userId: user.id } } } }
          ]
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true,
            }
          },
          oauthProvider: true,
        },
        orderBy: {
          date: "asc",
        },
      });

      // generate signed url for each post
      const withSignedUrl = await Promise.all(
        scheduledPosts.map(async (p) => {
          if (!p.media) return p;
          const signedUrl = await s3.getSignedUrlForVideoDownload(p.media);
          return {
            ...p,
            media: signedUrl,
          };
        })
      );

      return NextResponse.json(withSignedUrl);
    })
  )(request, { params: {} });
}

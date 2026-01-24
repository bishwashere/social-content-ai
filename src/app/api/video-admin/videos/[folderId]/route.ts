import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateVideoAdminAuth } from "@/middlewares/validate-video-admin-auth";
import { s3 } from "@/lib/s3";
import { prisma } from "@/lib/prisma";
import { Params } from "@/types/api";

/**
 * Get video details by folder ID
 */
export const GET = applyMiddleware(
  validateVideoAdminAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (_req, routeParams?: Params) => {
    const folderId = routeParams?.params?.folderId;
    if (!folderId) {
      return sendNextResponse({
        status: 400,
        message: "folderId is required",
      });
    }

    // Get video from database
    const video = await prisma.uploadedVideo.findFirst({
      where: {
        folderId: folderId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!video) {
      return sendNextResponse({
        status: 404,
        message: "Video not found",
      });
    }

    // Get files from S3
    const s3Files = await s3.readDir(`rendering/${folderId}/`);

    // Generate signed URLs for the files
    const files = await Promise.all(
      (s3Files || []).map(async (file) => {
        const signedUrl = await s3.getSignedUrlForVideoDownload(file.Key!);
        return {
          key: file.Key,
          name: file.Key?.split("/").pop() || "",
          url: signedUrl,
          size: file.Size,
          lastModified: file.LastModified,
        };
      })
    );

    // Find the output video if it exists
    const outputVideo = files.find((f) => f.name === "output.mp4");
    const inputVideo = files.find(
      (f) => f.name?.endsWith(".mp4") && f.name !== "output.mp4"
    );
    const textFile = files.find((f) => f.name === "txt.txt");
    const metadataFile = files.find((f) => f.name === "metadata.txt");

    return sendNextResponse({
      status: 200,
      message: "Video details fetched successfully",
      data: {
        video,
        files,
        outputVideo,
        inputVideo,
        textFile,
        metadataFile,
      },
    });
  })
);

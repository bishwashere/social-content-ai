"use server";

import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";

export const listAllViralVideos = async () => {
  try {
    return (await s3.listAllVideos("viral-video/")) || [];
  } catch (err) {
    console.log("err", err);
    return [];
  }
};

export const getPresignedUrlForDemoVideoUpload = async ({
  folder,
  name,
}: {
  folder: string;
  name: string;
}) => {
  return await s3.getPresignedUrlForVideoUpload(`rendering/${folder}/${name}`);
};

export const addMetadataToVideo = async ({
  text,
  viralVideoId,
  demoVideoId,
  folderId,
  musicId,
}: {
  text: string;
  viralVideoId: string;
  demoVideoId: string;
  folderId: string;
  musicId: string | null | undefined;
}) => {
  // Validate required fields
  if (!text || text.trim().length === 0) {
    throw new Error("Text content is required for video generation");
  }
  if (!viralVideoId || viralVideoId.trim().length === 0) {
    throw new Error("Viral video ID is required for video generation");
  }
  if (!demoVideoId || demoVideoId.trim().length === 0) {
    throw new Error("Demo video ID is required for video generation");
  }
  if (!folderId || folderId.trim().length === 0) {
    throw new Error("Folder ID is required for video generation");
  }

  const file1 = {
    name: "txt.txt",
    content: text,
  };

  const file2 = {
    name: "metadata.txt",
    content: `viral_video: ${viralVideoId}\ndemo_video: ${demoVideoId}\nviral_music: ${musicId || ""}`,
  };

  await Promise.all([
    s3.uploadTextAsFile(`rendering/${folderId}/${file1.name}`, file1.content),
    s3.uploadTextAsFile(`rendering/${folderId}/${file2.name}`, file2.content),
  ]);

  return true;
};

export const saveVideoDataToDb = async ({
  folderId,
  text,
  userId,
  projectId,
  campaignPlannerId,
  day,
}: {
  folderId: string;
  text: string;
  userId: string;
  projectId?: string;
  campaignPlannerId?: string;
  day?: number;
}) => {
  // Check if user has enough credits
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const CREDITS_PER_VIDEO = 10;

  if (user.remainingChatGenerations < CREDITS_PER_VIDEO) {
    throw new Error(`Insufficient credits. You need ${CREDITS_PER_VIDEO} credits to generate a video.`);
  }

  // Create video record
  await prisma.uploadedVideo.create({
    data: {
      folderId,
      text,
      userId: userId,
      projectId,
      campaignPlannerId,
      day,
    },
  });

  // Deduct credits
  await prisma.user.update({
    where: { id: userId },
    data: {
      remainingChatGenerations: {
        decrement: CREDITS_PER_VIDEO,
      },
    },
  });

  return true;
};

export const listAllUploadedVideos = async (userId: string) => {
  const videos = await prisma.uploadedVideo.findMany({
    where: {
      userId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const res = await Promise.all(
    videos.map(async (video) => {
      const s3Result = await s3.readDir(`rendering/${video.folderId}/`);

      const output = s3Result.find((file) => file.Key?.endsWith("output.mp4"));

      if (!output) {
        const input = s3Result.find(
          (file) => file.Key?.endsWith(".mp4") && !file.Key?.endsWith("output.mp4")
        )!;

        const signedUrl = await s3.getSignedUrlForVideoDownload(
          input.Key as string
        );

        return {
          ...video,
          output: null,
          input: signedUrl,
          inputFullPath: input.Key as string,
        };
      } else {
        if (video.status !== "completed") {
          await prisma.uploadedVideo.update({
            where: {
              id: video.id,
            },
            data: {
              status: "completed",
            },
          });
        }

        const signedUrl = await s3.getSignedUrlForVideoDownload(
          output.Key as string
        );

        const input = s3Result.find(
          (file) => file.Key?.endsWith(".mp4") && !file.Key?.endsWith("output.mp4")
        )!;

        const inputUrl = await s3.getSignedUrlForVideoDownload(
          input.Key as string
        );

        return {
          ...video,
          output: signedUrl,
          input: inputUrl,
          status: "completed",
          inputFullPath: input.Key as string,
        };
      }
    })
  );

  return res;
};

export const listAllViralMusics = async () => {
  try {
    return (await s3.listAllViralMusics()) || [];
  } catch {
    return [];
  }
};

export const copyVideo = async (from: string, to: string) => {
  return await s3.copyVideo(from, to);
};

export const uploadMedia = async (
  userId: string,
  folderPath: string,
  filename: string
) => {
  const key = `media-uploads/${userId}/${folderPath}/${filename}`;
  const url = await s3.getPresignedUrlForVideoUpload(key);

  return {
    key,
    url,
  };
};

export const getSignedKeyForScheduledPost = async (
  userId: string,
  filename: string
) => {
  const key = `scheduled-posts/${userId}/${filename}`;
  const url = await s3.getPresignedUrlForVideoUpload(key);

  return {
    key,
    url,
  };
};

export const getSignedKeyForCampaignChat = async (
  userId: string,
  campaignId: string,
  day: number,
  platform: string,
  filename: string
) => {
  const key = `campaign-chats/${userId}/${campaignId}/${day}/${platform}/${filename}`;
  const url = await s3.getPresignedUrlForVideoUpload(key);

  return {
    key,
    url,
  };
};

export const listAllUserMedia = async (userId: string) => {
  try {
    // List all media recursively from media-uploads/{userId}/
    // This includes all projects and video-maker folder
    return (await s3.listAllFilesByKey(`media-uploads/${userId}/`)) || [];
  } catch {
    return [];
  }
};

export const listAllFilesByKey = async (key: string) => {
  try {
    return (await s3.listAllFilesByKey(key)) || [];
  } catch {
    return [];
  }
};

export const getSignedUrlForMediaKey = async (key: string) => {
  return await s3.getSignedUrlForVideoDownload(key);
};

export const getUploadedVideoUrl = async (
  projectId: string,
  campaignPlannerId: string,
  day: string
) => {
  console.log(
    "projectId",
    projectId,
    "campaignPlannerId",
    campaignPlannerId,
    "day",
    day
  );
  const data = await prisma.uploadedVideo.findFirst({
    where: {
      projectId,
      campaignPlannerId,
      day: Number(day),
    },
  });

  console.log("data", data);

  if (!data) return "no-data";

  // find output.mp4 in the rendering folder
  const files = await listAllFilesByKey(`rendering/${data.folderId}/`);
  const output = files.find((file) => file.key?.endsWith("output.mp4"));
  console.log("output", files);
  if (!output) return "pending";

  await prisma.uploadedVideo.update({
    where: {
      id: data.id,
    },
    data: {
      status: "completed",
    },
  });

  const signedUrl = await s3.getSignedUrlForVideoDownload(output.key as string);

  return signedUrl;
};

export const deleteProcessingVideo = async (videoId: string, userId: string) => {
  // First, find the video record
  const video = await prisma.uploadedVideo.findFirst({
    where: {
      id: videoId,
      userId: userId,
    },
  });

  if (!video) {
    throw new Error("Video not found or you don't have permission to delete it");
  }

  // Delete all files from S3 folder
  await s3.deleteFolder(`rendering/${video.folderId}/`);

  // Delete the database record
  await prisma.uploadedVideo.delete({
    where: {
      id: videoId,
    },
  });

  return { success: true };
};

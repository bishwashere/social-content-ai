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
  const file1 = {
    name: "txt.txt",
    content: text,
  };

  const file2 = {
    name: "metadata.txt",
    content: `viral_video: ${viralVideoId}\ndemo_video: ${demoVideoId}\nviral_music: ${
      musicId || ""
    }`,
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
  projectId: string;
  campaignPlannerId: string;
  day: number;
}) => {
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
          (file) => !file.Key?.endsWith("output.mp4")
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
          (file) => !file.Key?.endsWith("output.mp4")
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

export const copyVideo = async (from: string, to: string) => {
  console.log("Copying video", from, to);
  return await s3.copyVideo(from, to);
};

export const listAllViralMusics = async () => {
  try {
    return (await s3.listAllViralMusics()) || [];
  } catch {
    return [];
  }
};

export const uploadMedia = async (
  userId: string,
  projectId: string,
  filename: string
) => {
  const key = `media-uploads/${userId}/${projectId}/${filename}`;
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

export const listAllFilesByKey = async (key: string) => {
  try {
    return (await s3.listAllFilesByKey(key)) || [];
  } catch {
    return [];
  }
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

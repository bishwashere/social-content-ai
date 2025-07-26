"use server";

import { UploadedVideosModel } from "@/db/video-generation/schema";
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
  await UploadedVideosModel.create({
    folderId,
    text,
    userId: userId,
    projectId,
    campaignPlannerId,
    day,
  });

  return true;
};

export const listAllUploadedVideos = async (userId: string) => {
  const videos = await UploadedVideosModel.find({
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
          await UploadedVideosModel.updateOne({
            where: {
              _id: video._id,
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
  return await s3.getPresignedUrlForVideoUpload(
    `media-uploads/${userId}/${projectId}/${filename}`
  );
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
  const data = await UploadedVideosModel.find({
    where: {
      projectId,
      campaignPlannerId,
      day: Number(day),
    },
  });

  if (!data) return null;

  return { url: "" };
};

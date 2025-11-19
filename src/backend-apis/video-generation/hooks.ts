import {
  addMetadataToVideo,
  copyVideo,
  getPresignedUrlForDemoVideoUpload,
  getSignedKeyForScheduledPost,
  getUploadedVideoUrl,
  listAllFilesByKey,
  listAllUploadedVideos,
  listAllViralMusics,
  listAllViralVideos,
  saveVideoDataToDb,
  uploadMedia,
} from "./actions";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { v4 as id } from "uuid";
import { useRouter } from "next/navigation";
import { GenerateVideoProps } from "./types";
import { useSession } from "../auth/hooks";

export const useQueryViralVideos = () => {
  return useQuery({
    queryKey: ["viral-videos"],
    queryFn: () => listAllViralVideos(),
  });
};

export const useGenerateVideo = () => {
  const router = useRouter();
  const { data: session } = useSession();
  let uid: string;
  return useMutation({
    mutationFn: async (data: GenerateVideoProps) => {
      uid = id();

      if (typeof data.video !== "string") {
        const signedUrl = await getPresignedUrlForDemoVideoUpload({
          folder: uid,
          name: data.name,
        });

        if (!signedUrl) {
          throw new Error("Failed to get signed url");
        }

        // upload the video as binary to the signed url
        const res = await fetch(signedUrl, {
          method: "PUT",
          body: data.video,
          headers: {
            "Content-Type": "video/mp4",
          },
        });

        if (!res.ok) {
          throw new Error("Failed to upload video");
        }
      } else {
        console.log("Copying video", data.video);
        const filename = data.video.split("/").pop();
        await copyVideo(data.video, `rendering/${uid}/${filename}`);
      }

      await addMetadataToVideo({
        text: data.text,
        viralVideoId: data.viralVideoId,
        demoVideoId: data.name,
        folderId: uid,
        musicId: data.musicId,
      });

      await saveVideoDataToDb({
        folderId: uid,
        text: data.text,
        userId: session?.user?.id || "",
        projectId: data.projectId,
        campaignPlannerId: data.campaignPlannerId,
        day: data.day,
      });

      return { hasProjectContext: !!(data.projectId && data.campaignPlannerId) };
    },

    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Failed to upload video");
    },
    onSuccess: (result) => {
      toast.success("Video added to queue for render!");
      
      // If video has project context (from campaign planner), go back
      // Otherwise (from Quick Video Maker), redirect to My Videos
      if (result.hasProjectContext) {
        router.back();
      } else {
        router.push("/project/my-videos");
      }
    },
  });
};

export const useQueryAllUploadedVideos = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["uploaded-videos", session?.user?.id],
    queryFn: () => listAllUploadedVideos(session?.user?.id || ""),
  });
};

export const useListAllViralMusics = () => {
  return useQuery({
    queryKey: ["viral-musics"],
    queryFn: () => listAllViralMusics(),
  });
};

export const useUploadMedia = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { projectId: string; file: File }) => {
      const { url: presignedUrl, key } = await uploadMedia(
        session?.user?.id || "",
        data.projectId,
        data.file.name
      );

      const res = await fetch(presignedUrl, {
        method: "PUT",
        body: data.file,
        headers: {
          "Content-Type": data.file.type,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to upload media");
      }

      return key;
    },
    onSuccess: () => {
      toast.success("Media uploaded successfully");
      queryClient.invalidateQueries({
        queryKey: ["uploaded-media"],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useUploadMediaForScheduledPost = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { file: File }) => {
      const { url: presignedUrl, key } = await getSignedKeyForScheduledPost(
        session?.user?.id || "",
        data.file.name
      );

      const res = await fetch(presignedUrl, {
        method: "PUT",
        body: data.file,
        headers: {
          "Content-Type": data.file.type,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to upload media");
      }

      return key;
    },
    onSuccess: () => {
      toast.success("Media uploaded successfully");
      queryClient.invalidateQueries({
        queryKey: ["uploaded-media"],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useQueryAllUploadedMedia = (projectId: string) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["uploaded-media", session?.user?.id, projectId],
    queryFn: () =>
      listAllFilesByKey(`media-uploads/${session?.user?.id}/${projectId}/`),
    enabled: !!session?.user?.id && !!projectId,
  });
};

export const useQueryUploadedVideoUrl = (
  projectId: string,
  campaignPlannerId: string,
  day: string
) => {
  return useQuery({
    queryKey: ["uploaded-video-url", projectId, campaignPlannerId, day],
    queryFn: () => getUploadedVideoUrl(projectId, campaignPlannerId, day),
    enabled: !!projectId && !!campaignPlannerId && !!day,
  });
};

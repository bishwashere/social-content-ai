import {
  addMetadataToVideo,
  copyVideo,
  deleteProcessingVideo,
  getFreeVideoLimitStatus,
  getPresignedUrlForDemoVideoUpload,
  getSignedKeyForScheduledPost,
  getSignedKeyForCampaignChat,
  getSignedUrlForMediaKey,
  getUploadedVideoUrl,
  listAllFilesByKey,
  listAllUploadedVideos,
  listAllUserMedia,
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
      // Validate required fields: video file, text, and viralVideoId
      if (!data.video) {
        throw new Error("Video file is required");
      }
      if (!data.text || data.text.trim().length === 0) {
        throw new Error("Text content is required");
      }
      if (!data.viralVideoId || data.viralVideoId.trim().length === 0) {
        throw new Error("Viral video ID is required");
      }

      uid = id();

      if (typeof data.video === "string") {
        // Copy from media-uploads to rendering
        const filename = data.video.split("/").pop() || data.name;
        await copyVideo(data.video, `rendering/${uid}/${filename}`);
      } else {
        // Upload File directly to rendering
        const signedUrl = await getPresignedUrlForDemoVideoUpload({
          folder: uid,
          name: data.name,
        });

        if (!signedUrl) {
          throw new Error("Failed to get signed url");
        }

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
      toast.error(error.message || "Failed to upload video");
    },
    onSuccess: (result) => {
      toast.success("Video added to queue for render!");
      
      // If video has project context (from campaign planner), go back
      // Otherwise (from Create a Viral Video), redirect to My Videos
      if (result.hasProjectContext) {
        router.back();
      } else {
        router.push("/dashboard/my-videos");
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

      // Get signed download URL for preview
      const downloadUrl = await getSignedUrlForMediaKey(key);

      return { key, url: downloadUrl };
    },
    onSuccess: () => {
      toast.success("Media uploaded successfully");
      queryClient.invalidateQueries({
        queryKey: ["uploaded-media"],
      });
      queryClient.invalidateQueries({
        queryKey: ["all-user-media"],
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

export const useUploadMediaForCampaignChat = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { 
      file: File; 
      campaignId: string; 
      day: number; 
      platform: string;
    }) => {
      const { url: presignedUrl, key } = await getSignedKeyForCampaignChat(
        session?.user?.id || "",
        data.campaignId,
        data.day,
        data.platform,
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
        queryKey: ["campaignPlanner"],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useUploadMediaForVideoMaker = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { file: File; sessionId: string }) => {
      const { url: presignedUrl, key } = await uploadMedia(
        session?.user?.id || "",
        `video-maker-${data.sessionId}`,
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

      // Get signed download URL for preview
      const downloadUrl = await getSignedUrlForMediaKey(key);

      return { key, url: downloadUrl };
    },
    onSuccess: (_, variables) => {
      toast.success("Media uploaded successfully");
      queryClient.invalidateQueries({
        queryKey: ["all-user-media"],
      });
      queryClient.invalidateQueries({
        queryKey: ["video-maker-media", session?.user?.id, variables.sessionId],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useQueryAllUserMedia = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["all-user-media", session?.user?.id],
    queryFn: () => listAllUserMedia(session?.user?.id || ""),
    enabled: !!session?.user?.id,
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

export const useQueryVideoMakerMedia = (sessionId?: string) => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["video-maker-media", session?.user?.id, sessionId],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      
      if (sessionId) {
        // Query specific session folder
        return listAllFilesByKey(
          `media-uploads/${session.user.id}/video-maker-${sessionId}/`
        );
      } else {
        // Query all video-maker-* folders
        // First get all folders under media-uploads/{userId}/
        const allMedia = await listAllUserMedia(session.user.id);
        // Filter to only video-maker-* folders
        const videoMakerFiles = allMedia.filter(
          (file) => file.key?.includes("/video-maker-") && !file.key?.includes("/video-maker/")
        );
        return videoMakerFiles;
      }
    },
    enabled: !!session?.user?.id,
  });
};

export const useDeleteProcessingVideo = () => {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: string) => {
      if (!session?.user?.id) {
        throw new Error("Not authenticated");
      }
      return deleteProcessingVideo(videoId, session.user.id);
    },
    onSuccess: () => {
      toast.success("Video deleted successfully");
      queryClient.invalidateQueries({
        queryKey: ["uploaded-videos"],
      });
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error(error.message || "Failed to delete video");
    },
  });
};

export const useGetFreeVideoLimitStatus = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ["free-video-limit-status", session?.user?.id],
    queryFn: () => getFreeVideoLimitStatus(session?.user?.id || ""),
    enabled: !!session?.user?.id,
  });
};

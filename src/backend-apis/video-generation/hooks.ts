import {
  addMetadataToVideo,
  copyVideo,
  getPresignedUrlForDemoVideoUpload,
  listAllUploadedVideos,
  listAllViralMusics,
  listAllViralVideos,
  saveVideoDataToDb,
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

        await copyVideo(
          data.video,
          data.video
            ?.split("/")
            .map((val, i) => {
              return i === 1 ? uid : val;
            })
            .join("/")
        );
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
        userId: session?.user?._id || "",
      });
    },

    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Failed to upload video");
    },
    onSuccess: () => {
      toast.success("Video added to queue for render!");
      router.back();
    },
  });
};

export const useQueryAllUploadedVideos = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  Promise.resolve(() => {
    queryClient.invalidateQueries({
      queryKey: ["user-subscription"],
    });
  });

  return useQuery({
    queryKey: ["uploaded-videos", session?.user?._id],
    queryFn: () => listAllUploadedVideos(session?.user?._id || ""),
  });
};

export const useListAllViralMusics = () => {
  return useQuery({
    queryKey: ["viral-musics"],
    queryFn: () => listAllViralMusics(),
  });
};

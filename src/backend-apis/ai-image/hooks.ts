import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { generateAIImage, generateAIImageForQuickGenerate, generateAIImageForScheduledPost } from "./actions";

export const useGenerateAIImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateAIImage,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Image generated successfully!");
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["campaignPlanner"] });
        queryClient.invalidateQueries({ queryKey: ["session"] });
      } else {
        toast.error(result.error || "Failed to generate image");
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    },
  });
};

export const useGenerateAIImageForQuickGenerate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateAIImageForQuickGenerate,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Image generated successfully!");
        queryClient.invalidateQueries({ queryKey: ["session"] });
      } else {
        toast.error(result.error || "Failed to generate image");
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    },
  });
};

export const useGenerateAIImageForScheduledPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateAIImageForScheduledPost,
    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success("Image generated successfully!");
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["scheduledPosts"] });
        queryClient.invalidateQueries({ queryKey: ["session"] });
      } else {
        toast.error(result.error || "Failed to generate image");
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    },
  });
};

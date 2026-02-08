import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { generateTextCardImage, generateTextCardImageForQuickGenerate, generateTextCardImageForScheduledPost } from "./actions";

export const useGenerateTextCardImage = () => {
  return useMutation({
    mutationFn: generateTextCardImage,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Text card image generated!");
      } else {
        toast.error(result.error || "Failed to generate text card image");
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate text card image");
    },
  });
};

export const useGenerateTextCardImageForQuickGenerate = () => {
  return useMutation({
    mutationFn: generateTextCardImageForQuickGenerate,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Text card image generated!");
      } else {
        toast.error(result.error || "Failed to generate text card image");
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate text card image");
    },
  });
};

export const useGenerateTextCardImageForScheduledPost = () => {
  return useMutation({
    mutationFn: generateTextCardImageForScheduledPost,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Text card image generated!");
      } else {
        toast.error(result.error || "Failed to generate text card image");
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to generate text card image");
    },
  });
};

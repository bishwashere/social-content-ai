import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { generateAIImage } from "./actions";

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

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { rewriteWithAI } from "./actions";

export const useRewriteWithAI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rewriteWithAI,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Content rewritten successfully!");
        // Invalidate session to refresh credits
        queryClient.invalidateQueries({ queryKey: ["session"] });
      } else {
        toast.error(result.error || "Failed to rewrite content");
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to rewrite content");
    },
  });
};

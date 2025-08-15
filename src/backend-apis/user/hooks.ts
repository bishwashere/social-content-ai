import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAllUserOAuthProviders } from "./actions";
import { toast } from "sonner";

export const useDeleteAllUserOAuthProviders = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAllUserOAuthProviders,
    onSuccess: () => {
      toast.success("Successfully deleted all OAuth providers");
      queryClient.invalidateQueries({
        queryKey: ["session"],
      });
      queryClient.invalidateQueries({
        queryKey: ["oauth-providers"],
      });
    },
  });
};

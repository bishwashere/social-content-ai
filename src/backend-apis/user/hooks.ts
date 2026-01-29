import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAllUserOAuthProviders, deleteSingleOAuthProvider } from "./actions";
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

export const useDeleteSingleOAuthProvider = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, userId }: { providerId: string; userId: string }) => 
      deleteSingleOAuthProvider(providerId, userId),
    onSuccess: (data) => {
      const platformName = data.deletedProvider?.platform || "account";
      toast.success(`Successfully disconnected ${platformName}`);
      queryClient.invalidateQueries({
        queryKey: ["session"],
      });
      queryClient.invalidateQueries({
        queryKey: ["oauth-providers"],
      });
      queryClient.invalidateQueries({
        queryKey: ["connected-accounts"],
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect account");
    },
  });
};

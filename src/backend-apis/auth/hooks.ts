import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ContinueWithGoogleParams } from "./types";
import { authService } from ".";
import { toast } from "sonner";

export const useContinueWithGoogle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ContinueWithGoogleParams) => {
      return authService.continueWithGoogle(data, queryClient);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
  });
};

export const useSession = () => {
  return useQuery({
    queryFn: () => {
      return authService.getSession();
    },
    queryKey: ["session"],
    retry: 0,
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      return authService.logout(queryClient);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (data) => {
      toast.success(data);
    },
  });
};

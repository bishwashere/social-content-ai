import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ContinueWithGoogleParams, EmailLoginParams } from "./types";
import { authService } from ".";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/**
 * Hook to login with google
 **/
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

export const useEmailLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmailLoginParams) => {
      return authService.emailLogin(data, queryClient);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
  });
};

/**
 * Hook to get the current session
 **/
export const useSession = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryFn: () => {
      return authService.getSession();
    },
    queryKey: ["session"],
    retry: 0,
    enabled: options?.enabled !== false, // Default to true if not specified
  });
};

/**
 * Hook to logout the user
 **/
export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      return authService.logout(queryClient, router);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (data) => {
      toast.success(data);
      localStorage.clear();
    },
  });
};

/**
 * Hook to assign basic tokens to a user who skips payment
 **/
export const useAssignBasicTokens = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      return authService.assignBasicTokens(queryClient);
    },
    onError: (error) => {
      // If the user already has tokens, this shouldn't be surfaced as an error in the UI.
      if (error.message === "User already has tokens") return;
      toast.error(error.message);
    },
  });
};

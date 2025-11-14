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
export const useSession = () => {
  return useQuery({
    queryFn: () => {
      return authService.getSession();
    },
    queryKey: ["session"],
    retry: 0,
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
      toast.error(error.message);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Basic tokens assigned successfully");
    },
  });
};

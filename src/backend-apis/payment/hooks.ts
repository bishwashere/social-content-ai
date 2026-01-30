import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { paymentService } from ".";
import { useRouter } from "next/navigation";
import api from "../axios";

export const useCreateCheckoutSession = () => {
  return useMutation({
    mutationFn: async (type?: "subscription" | "coins" | "monthly" | "yearly") =>
      paymentService.createSession(type),
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useGetCheckoutSessionDetails = (sessionId: string) => {
  return useQuery({
    queryFn: () => paymentService.getSessionDetails(sessionId),
    queryKey: ["checkout-session-details", sessionId],
    retry: 0,
  });
};

export const useGetSubscription = () => {
  return useQuery({
    queryFn: paymentService.getSubscription,
    queryKey: ["subscriptions"],
  });
};

export const useManageSubscription = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: paymentService.manageSubscription,
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (data) => {
      router.push(data.data.url);
    },
  });
};

/**
 * Hook to upgrade trial subscription to pro plan
 */
export const useUpgradeTrialToPro = () => {
  const router = useRouter();
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const response = await api.post("/payment/upgrade-trial",);


      return response.data
    },
    onSuccess: (data) => {
      toast.success("Successfully upgraded to Premium!");
      // invalidate, session
      queryClient.invalidateQueries({
        queryKey: ["session"]
      })
      queryClient.invalidateQueries({
        queryKey: ["subscriptions"]
      })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upgrade trial");
    },
  });
};

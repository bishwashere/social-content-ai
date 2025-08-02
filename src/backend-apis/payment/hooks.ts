import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { paymentService } from ".";
import { useRouter } from "next/navigation";

export const useCreateCheckoutSession = () => {
  return useMutation({
    mutationFn: async (type?: "subscription" | "coins") =>
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

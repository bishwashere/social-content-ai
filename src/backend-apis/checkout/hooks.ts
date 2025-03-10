import { useMutation, useQuery } from "@tanstack/react-query";
import { checkoutService } from ".";
import { toast } from "sonner";

export const useCreateCheckoutSession = () => {
  return useMutation({
    mutationFn: checkoutService.createSession,
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
  });
};

export const useGetCheckoutSessionDetails = (sessionId: string) => {
  return useQuery({
    queryFn: () => checkoutService.getSessionDetails(sessionId),
    queryKey: ["checkout-session-details", sessionId],
    retry: 0,
  });
};

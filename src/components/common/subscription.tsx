import { Button } from "@/components/ui/button";
import { Coins, ArrowUp } from "lucide-react";
import { useSession } from "@/backend-apis/auth/hooks";
import { isSubscriptionExpired } from "@/lib/sub";
import { useCreateCheckoutSession } from "@/backend-apis/payment/hooks";
import { useRouter } from "next/navigation";

const Subscription = () => {
  const { data } = useSession();
  const payment = useCreateCheckoutSession();
  const router = useRouter();
  
  const hasNoSubscription = !data?.subscription || 
    (data?.subscription && isSubscriptionExpired(data?.subscription?.endsAt?.toString()).isExpired);
  
  const handleSubscribe = async () => {
    if (hasNoSubscription) {
      try {
        // Use existing purchase flow - same as pricing modal
        const res = await payment.mutateAsync("subscription");
        if (res?.data?.redirectUrl) {
          router.push(res.data.redirectUrl);
        }
      } catch (error) {
        console.error("Error creating checkout session:", error);
      }
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleSubscribe}
        variant="outline"
        size="sm"
        className="bg-yellow-400 capitalize border-yellow-500 hover:text-yellow-800 hover:bg-yellow-300 text-yellow-900 transition-colors gap-2"
        disabled={payment.isPending}
      >
        <Coins className="h-4 w-4" />
        <span className="max-sm:hidden">
          {data?.subscription?.endsAt
            ? isSubscriptionExpired(data?.subscription?.endsAt?.toString()).isExpired
              ? "Expired"
              : (data?.subscription?.status === "trial" || data?.subscription?.status === "trialing")
                ? "Trial"
                : "Pro"
            : "Subscribe"}
          {" "}{data?.user?.remainingChatGenerations || 0}
        </span>
      </Button>
    </div>
  );
};

export default Subscription;

import { Button } from "@/components/ui/button";
import { Coins, ArrowUp } from "lucide-react";
import { useSession } from "@/backend-apis/auth/hooks";
import { isSubscriptionExpired } from "@/lib/sub";
const Subscription = () => {
  const { data } = useSession();
  return (
    <div className="flex gap-2">
      <Button
        // onClick={async () => {
        //   if (!data?.subscription || data?.subscription?.status === "trial" ) {
        //     const res = await payment.mutateAsync("subscription");
        //     router.push(res.data.redirectUrl);
        //     console.log("Creating checkout session", res);
        //   }
        // }}
        variant="outline"
        size="sm"
        className="bg-yellow-400 capitalize border-yellow-500 hover:text-yellow-800 hover:bg-yellow-300 text-yellow-900 transition-colors"
      >
        <Coins />{" "}
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

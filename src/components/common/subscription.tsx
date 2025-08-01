import React from "react";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import PricingModal from "./pricing-modal";
import { useSession } from "@/backend-apis/auth/hooks";
import { isSubscriptionExpired } from "@/lib/sub";
const Subscription = () => {
  const [open, setOpen] = React.useState(false);
  const { data } = useSession();
  return (
    <div>
      <PricingModal open={open} setOpen={setOpen} />
      <Button
        variant="outline"
        size="sm"
        className="bg-yellow-400 capitalize border-yellow-500 hover:text-yellow-800 hover:bg-yellow-300 text-yellow-900 transition-colors"
      >
        <Coins />{" "}
        <span className="max-sm:hidden">
          {data?.subscription?.endsAt
            ? isSubscriptionExpired(data?.subscription?.endsAt?.toString()).isExpired
              ? "Expired"
              : data?.subscription?.status === "trial"
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

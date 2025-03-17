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
        {data?.subscription?.endsAt
          ? isSubscriptionExpired(data?.subscription?.endsAt).isExpired
            ? "Expired"
            : "Pro"
          : "Subscribe"}
      </Button>
    </div>
  );
};

export default Subscription;

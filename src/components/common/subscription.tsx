import React from "react";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import PricingModal from "./pricing-modal";
const Subscription = () => {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <PricingModal
        open={open}
        setOpen={setOpen}
      />
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="bg-yellow-400 border-yellow-500 hover:text-yellow-800 hover:bg-yellow-300 text-yellow-900 transition-colors"
      >
        <Coins /> Claim your free trial!
      </Button>
    </div>
  );
};

export default Subscription;

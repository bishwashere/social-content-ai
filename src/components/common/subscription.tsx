import React from "react";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
const Subscription = () => {

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        className="bg-yellow-400 border-yellow-500 hover:text-yellow-800 hover:bg-yellow-300 text-yellow-900 transition-colors"
      >
        <Coins /> Trial Ends in 7 days
      </Button>
    </div>
  );
};

export default Subscription;

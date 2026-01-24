"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins } from "lucide-react";
import { useCreateCheckoutSession } from "@/backend-apis/payment/hooks";
import { useRouter } from "next/navigation";
import { useSession } from "@/backend-apis/auth/hooks";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export function CoinsModal({ open, setOpen }: Props) {
  const payment = useCreateCheckoutSession();
  const router = useRouter();
  const user = useSession();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-autoplay-blocker="coins" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Get Coins</DialogTitle>
          <DialogDescription>Purchase coins for your account!</DialogDescription>
        </DialogHeader>
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">
                $50
                <span className="text-sm font-normal text-muted-foreground">
                  /one-time
                </span>
              </div>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 px-3">
                500 Coins
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Coins className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">500 Coins Package</p>
                  <p className="text-sm text-muted-foreground">
                    Get 500 coins to use for content generation
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button
              loading={payment.isPending}
              onClick={async () => {
                try {
                  const res = await payment.mutateAsync("coins");
                  router.push(res.data.redirectUrl);
                } catch { }
              }}
              className="w-full"
            >
              {payment.isSuccess ? "Redirecting..." : "Purchase Coins"}
            </Button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
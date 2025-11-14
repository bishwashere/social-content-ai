"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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
import { Users, FolderKanban, CheckCircle2 } from "lucide-react";
import {
  useCreateCheckoutSession,
  useManageSubscription,
} from "@/backend-apis/payment/hooks";
import { useRouter } from "next/navigation";
import { useAssignBasicTokens, useSession } from "@/backend-apis/auth/hooks";
import { useEffect, useState } from "react";
import { isSubscriptionExpired } from "@/lib/sub";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function PricingModal({ open, setOpen }: Props) {
  const payment = useCreateCheckoutSession();
  const manage = useManageSubscription();
  const router = useRouter();
  const { data } = useSession();
  // const [isLoading, setIsLoading] = useState(false); // COMMENTED OUT: No longer needed for custom trial claims
  const queryClient = useQueryClient();

  // only open the modal if the user doesn't have an active subscription or has no tokens
  useEffect(() => {
    // Don't show modal if user has tokens and no subscription (they're using basic tokens)
    // Show modal if:
    // 1. No subscription or subscription is expired AND no tokens
    // 2. User has exhausted their tokens
    const hasNoTokens = (data?.user?.remainingChatGenerations || 0) <= 0;
    const hasNoSubscription = !data?.subscription || 
      (data.subscription && isSubscriptionExpired(data.subscription.endsAt).isExpired);

    if (hasNoSubscription && hasNoTokens) {
      setOpen(true);
    } else if (hasNoTokens && data?.subscription) {
      // User has subscription but no tokens - show coins modal instead
      setOpen(false);
    } else {
      setOpen(false);
    }
  }, [data?.subscription, data?.user?.remainingChatGenerations, data?.user?.id, setOpen]);

  // COMMENTED OUT: Custom trial claim logic - now handled by Stripe
  // const claimTrial = async () => {
  //   try {
  //     if (!data?.user?.hasClaimedFreeTrial) {
  //       setIsLoading(true);
  //       const res = await claimFreeTrial(data?.user?.id || "")
  //       if (res.success) {
  //         toast.success(res.message);
  //         setOpen(false);
  //         queryClient.invalidateQueries({
  //           queryKey: ["session"],
  //         });
  //       } else {
  //         toast.error(res.message);
  //       }
  //       setIsLoading(false);
  //     }
  //   } catch { }
  // }

  const assignBasicTokens = useAssignBasicTokens();

  return (
    <Dialog open={open} >
      <DialogContent className="sm:max-w-md">
        <DialogClose
          onClick={async () => {
            // Assign basic tokens instead of logging out
            try {
              await assignBasicTokens.mutateAsync();
              localStorage.setItem(`lastOpen__${data?.user?.id}`, Date.now().toString());
              setOpen(false);
              toast.success("You've been assigned 10 free tokens to get started!");
            } catch (error) {
              // If assignment fails, just close the modal
              setOpen(false);
            }
          }}
        />
        <DialogHeader>
          <DialogTitle>Start 7 day FREE Trial</DialogTitle>
          {/* <DialogDescription>Go Pro!</DialogDescription> */}
        </DialogHeader>
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">
                $10
                <span className="text-sm font-normal text-muted-foreground">
                  /month
                </span>
              </div>
              {!data?.user?.hasClaimedFreeTrial && (
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 px-3">
                  7-day free trial
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <FolderKanban className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Unlimited projects</p>
                  <p className="text-sm text-muted-foreground">
                    Create as many projects as you need
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Unlimited user management</p>
                  <p className="text-sm text-muted-foreground">
                    Invite unlimited users to manage projects
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Unlimited viewers</p>
                  <p className="text-sm text-muted-foreground">
                    Invite unlimited users to view projects
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Unlimited completions</p>
                  <p className="text-sm text-muted-foreground">
                    Ample capacity for your workflow
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button
              loading={payment.isPending || manage.isPending}
              onClick={async () => {
                try {
                  // Use existing purchase flow - create checkout session
                  const res = await payment.mutateAsync("subscription");
                  if (res?.data?.redirectUrl) {
                    router.push(res.data.redirectUrl);
                  }
                } catch (error) {
                  // Error handling is done by the hook (toast notification)
                  console.error("Error creating checkout session:", error);
                }
              }}
              className="w-full"
            >
              {
                payment.isSuccess || manage.isSuccess
                  ? "Redirecting..."
                  : (data?.subscription?.status === "trial" )
                    ? "Upgrade Plan"
                    : data?.subscription && isSubscriptionExpired(data.subscription.endsAt).isExpired
                      ? "Upgrade Plan"
                      : "Start Trial"}
            </Button>
            {/* COMMENTED OUT: Custom trial claim button - trials now handled by Stripe during checkout */}
            {/*
              !data?.user?.hasClaimedFreeTrial && (
                <Button
                  loading={isLoading}
                  onClick={async () => {
                    await claimTrial();
                    localStorage.setItem(`lastOpen__${data?.user?.id}`, Date.now().toString());
                    setOpen(false);
                  }}
                  variant={"ghost"}
                  className="w-full text-muted-foreground"
                >
                  Claim Free Trial
                </Button>
              )
            */}
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

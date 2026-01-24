"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FolderKanban, CheckCircle2, XIcon, Lock } from "lucide-react";
import {
  useCreateCheckoutSession,
  useManageSubscription,
} from "@/backend-apis/payment/hooks";
import { useRouter } from "next/navigation";
import { useAssignBasicTokens, useSession } from "@/backend-apis/auth/hooks";
import { useRef } from "react";
import { isSubscriptionExpired } from "@/lib/sub";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSkippedPaywall?: () => void;
};

export default function PricingModal({ open, setOpen, onSkippedPaywall }: Props) {
  const payment = useCreateCheckoutSession();
  const manage = useManageSubscription();
  const router = useRouter();
  const { data } = useSession();
  const userDismissedRef = useRef(false); // Track if user explicitly closed the modal

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

  const handleClose = async () => {
    // Mark that user explicitly dismissed the modal
    userDismissedRef.current = true;
    
    // Assign basic tokens instead of logging out (but congrats message is independent).
    try {
      await assignBasicTokens.mutateAsync();
      localStorage.setItem(`lastOpen__${data?.user?.id}`, Date.now().toString());
      setOpen(false);
    } catch (error) {
      // If assignment fails, just close the modal
      setOpen(false);
    } finally {
      onSkippedPaywall?.();
    }
  };

  return (
    <Sheet 
      open={open} 
      onOpenChange={setOpen}
    >
      <SheetContent 
        side="bottom" 
        data-autoplay-blocker="pricing"
        className="sm:max-w-md mx-auto rounded-t-2xl max-h-[90vh] overflow-y-auto [&>button:last-child]:hidden"
        onInteractOutside={(e) => {
          // Prevent closing when clicking outside
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing on ESC key
          e.preventDefault();
        }}
      >
        {/* Custom close button that actually closes the drawer */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none p-2 bg-background"
          aria-label="Close"
        >
          <XIcon className="h-5 w-5" />
        </button>
        
        <div className="space-y-6 pb-6 px-6">
          {/* Header */}
          <SheetHeader className="text-left space-y-3">
            <SheetTitle className="text-2xl sm:text-3xl font-bold leading-tight">
              Turn ideas into ready-to-post content
            </SheetTitle>
            {/* Hero trial line (big + centered) */}
            <div className="text-center">
              <div className="text-4xl sm:text-5xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                7-day free trial
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Cancel anytime. Then <span className="font-medium text-foreground">$10/month</span> after trial.
            </p>
          </SheetHeader>

          {/* Value - 3 bullets only */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">🚀</span>
              <div>
                <p className="font-semibold">Create faster</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate posts, campaigns, blogs, and videos
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">🧠</span>
              <div>
                <p className="font-semibold">Stay consistent</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Plan and schedule content in one place
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0">🔁</span>
              <div>
                <p className="font-semibold">Reuse across platforms</p>
                <p className="text-sm text-muted-foreground mt-1">
                  One idea → multiple formats
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-2">
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
              className="w-full text-base font-semibold py-6"
              size="lg"
            >
              {payment.isSuccess || manage.isSuccess
                ? "Redirecting..."
                : (data?.subscription?.status === "trial")
                  ? "Upgrade Plan"
                  : data?.subscription && isSubscriptionExpired(data.subscription.endsAt).isExpired
                    ? "Upgrade Plan"
                    : "Start 7-Day Free Trial"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Start creating today
            </p>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
              <Lock className="h-3 w-3" />
              Content stays private
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { XIcon, Lock } from "lucide-react";
import {
  useCreateCheckoutSession,
  useManageSubscription,
} from "@/backend-apis/payment/hooks";
import { useRouter } from "next/navigation";
import { useAssignBasicTokens, useSession } from "@/backend-apis/auth/hooks";
import { useRef, useState } from "react";
import { isSubscriptionExpired } from "@/lib/sub";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSkippedPaywall?: () => void;
  defaultBillingPeriod?: "monthly" | "yearly";
};

export default function PricingModal({ open, setOpen, onSkippedPaywall, defaultBillingPeriod = "yearly" }: Props) {
  const payment = useCreateCheckoutSession();
  const manage = useManageSubscription();
  const router = useRouter();
  const { data } = useSession();
  const userDismissedRef = useRef(false); // Track if user explicitly closed the modal
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(defaultBillingPeriod);

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
            
            {/* Billing Toggle */}
            <div className="flex justify-center">
              <div className="inline-flex items-center rounded-full bg-muted p-1">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all",
                    billingPeriod === "monthly"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod("yearly")}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5",
                    billingPeriod === "yearly"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Yearly
                  <span className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-semibold">
                    -20%
                  </span>
                </button>
              </div>
            </div>

            {/* Pricing Display */}
            <div className="text-center">
              {billingPeriod === "monthly" ? (
                <>
                  <div className="text-4xl sm:text-5xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                    $49.99<span className="text-xl text-muted-foreground">/month</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl sm:text-5xl font-bold tracking-tight text-emerald-700 dark:text-emerald-300">
                    $39.99<span className="text-xl text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    $479.88 billed yearly <span className="line-through text-muted-foreground/60">$599.88</span>
                  </p>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Cancel anytime. <span className="font-medium text-foreground">100 credits</span> included monthly.
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
                  // Use existing purchase flow - create checkout session with billing period
                  const res = await payment.mutateAsync(billingPeriod);
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
                : data?.subscription && isSubscriptionExpired(data.subscription.endsAt).isExpired
                  ? "Renew Subscription"
                  : billingPeriod === "yearly" 
                    ? "Subscribe Yearly (Save 20%)"
                    : "Subscribe Monthly"}
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

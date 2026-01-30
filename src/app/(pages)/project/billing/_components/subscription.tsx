import {
  useCreateCheckoutSession,
  useGetSubscription,
  useManageSubscription,
  useUpgradeTrialToPro,
} from "@/backend-apis/payment/hooks";
import React, { useState } from "react";
import { cn } from "@/lib/cn";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import StatusBadge from "@/components/common/status-badge";
import { formatDate } from "@/lib/format-date";
import { Calendar1Icon, CreditCardIcon, ShieldCheckIcon, ArrowUpIcon, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

import Loading from "@/components/common/loading";
import { Badge } from "@/components/ui/badge";
import { isSubscriptionExpired } from "@/lib/sub";
import { useRouter } from "next/navigation";
import { useSession } from "@/backend-apis/auth/hooks";
import { usePricingModal } from "@/providers/pricing-modal-provider";

const Subscription = () => {
  const { data: activeSubscription, isLoading } = useGetSubscription();
  const [clickedButton, setClickedButton] = useState<
    "manage-subscription" | "cancel-subscription" | "upgrade-trial"
  >();
  const { setCoinsModalOpen } = usePricingModal()
  const payment = useCreateCheckoutSession();
  const manage = useManageSubscription();
  const router = useRouter();
  const { data } = useSession();
  const mangeSubs = useManageSubscription();
  const upgradeTrial = useUpgradeTrialToPro();

  if (isLoading) return <Loading className="h-[70vh]" />;

  // If no subscription, show subscribe section with same content as payment drawer
  if (!activeSubscription) {
    const credits = data?.user?.remainingChatGenerations || 0;
    
    return (
      <SubscribeCard payment={payment} router={router} />
    );
  }

  const status = isSubscriptionExpired(activeSubscription.endsAt);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Current Subscription</CardTitle>
          <div className="flex gap-4 items-center">
            <StatusBadge>{activeSubscription?.status}</StatusBadge>
            <Badge variant={status.expiringSoon ? "destructive" : "default"}>
              {status.isExpired
                ? "Expired"
                : status.expiringSoon
                  ? `Expiring in ${status.remainingDays} days`
                  : "Active"}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Your subscription details and management options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Plan</p>
            <p className="font-medium">
              <StatusBadge>{activeSubscription?.status}</StatusBadge>
            </p>
          </div>
          <div className="space-y-1"></div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Last Billing Started on
            </p>
            <p className="font-medium">
              {formatDate(new Date(activeSubscription?.startedAt))}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {activeSubscription?.status === "trial"
                ? "Premium ends on"
                : "Next billing date"}
            </p>
            <p className="font-medium">
              {formatDate(new Date(activeSubscription?.endsAt))}
            </p>
          </div>
        </div>

        {activeSubscription.status !== "trial"  && <div className="rounded-md bg-muted p-4">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Premium Features</p>
              <p className="text-sm text-muted-foreground">
                Unlimited projects, users, and unlimited completions.
              </p>
            </div>
          </div>
        </div>}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
            {/* Show upgrade button for trial users */}
            {(activeSubscription?.status === "trial" || activeSubscription?.status === "trialing") && (
              <Button
                loading={
                  upgradeTrial.isPending && clickedButton === "upgrade-trial"
                }
                onClick={() => {
                  setClickedButton("upgrade-trial");
                  upgradeTrial.mutate();
                }}
                className="w-full sm:w-auto"
              >
                <ArrowUpIcon className="mr-2 h-4 w-4" />
                Upgrade to Premium
              </Button>
            )}
            
            <Button
              loading={
                mangeSubs.isPending && clickedButton === "manage-subscription"
              }
              onClick={() => {
                setClickedButton("manage-subscription");
                mangeSubs.mutate();
              }}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <CreditCardIcon className="mr-2 h-4 w-4" />
              Update Payment Method
            </Button>

            <Button
              loading={
                mangeSubs.isPending && clickedButton === "cancel-subscription"
              }
              onClick={() => {
                setClickedButton("cancel-subscription");
                mangeSubs.mutate();
              }}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Calendar1Icon className="mr-2 h-4 w-4" />
              Manage Subscription
            </Button>
            <Button onClick={() => setCoinsModalOpen(true)}>
              Purchase Coins
            </Button>
      </CardFooter>
    </Card>
  );
};

// Subscribe card component with billing toggle
function SubscribeCard({ payment, router }: { payment: ReturnType<typeof useCreateCheckoutSession>, router: ReturnType<typeof useRouter> }) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-left">
            <CardTitle className="text-2xl font-bold leading-tight">
              Turn ideas into ready-to-post content
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Cancel anytime
            </p>
          </div>

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

          {/* Price */}
          <div className="text-center">
            {billingPeriod === "monthly" ? (
              <div className="text-2xl text-muted-foreground">
                $49.99 <span className="text-base font-normal">/ month</span>
              </div>
            ) : (
              <>
                <div className="text-2xl text-muted-foreground">
                  $39.99 <span className="text-base font-normal">/ month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  $479.88 billed yearly <span className="line-through">$599.88</span>
                </p>
              </>
            )}
          </div>

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
              loading={payment.isPending}
              onClick={async () => {
                try {
                  const res = await payment.mutateAsync(billingPeriod);
                  if (res?.data?.redirectUrl) {
                    router.push(res.data.redirectUrl);
                  }
                } catch (error) {
                  console.error("Error creating checkout session:", error);
                }
              }}
              className="w-full text-base font-semibold py-6"
              size="lg"
            >
              {payment.isSuccess 
                ? "Redirecting..." 
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
              No posting on your behalf · Content stays private
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Subscription;

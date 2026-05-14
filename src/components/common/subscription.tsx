import { Button } from "@/components/ui/button";
import { useSession } from "@/backend-apis/auth/hooks";
import { isSubscriptionExpired } from "@/lib/sub";
import { useRouter } from "next/navigation";
import { usePricingModal } from "@/providers/pricing-modal-provider";

const Subscription = () => {
  const { data } = useSession();
  const router = useRouter();
  const { setOpen: setPricingModalOpen } = usePricingModal();
  
  const handleClick = () => {
    // Navigate to billing page or open pricing modal
    router.push("/dashboard/billing");
  };

  // Calculate subscription status
  const subscription = data?.subscription;
  const subscriptionExpired = subscription?.endsAt ? isSubscriptionExpired(subscription.endsAt).isExpired : true;
  const hasSubscription = !!subscription && !subscriptionExpired;
  
  // Check trial status - also check if subscription exists and isn't expired (might be trial)
  const isTrial = hasSubscription && (subscription?.status === "trial" || subscription?.status === "trialing");
  const isActive = subscription?.status === "active";
  const isPaymentIssue = subscription?.status === "incomplete" || subscription?.status === "incomplete_expired" || subscription?.status === "past_due";
  const credits = data?.user?.remainingChatGenerations || 0;

  // Debug logging - use JSON.stringify to show actual values
  console.log('[Subscription Pill] Status check:', JSON.stringify({
    hasSubscription,
    subscriptionStatus: subscription?.status,
    isTrial,
    isActive,
    subscriptionExists: !!subscription,
    subscriptionEndsAt: subscription?.endsAt,
    subscriptionExpired,
    credits,
    fullSubscription: subscription
  }, null, 2));


  // Pro users get no pill in the header
  if (isActive && !isTrial) {
    return null;
  }

  // Determine status and styling
  let statusText = "";
  let statusColor = "";
  let bgColor = "";
  let textColor = "";
  let borderColor = "";

  // Determine status
  if (isTrial) {
    // Premium mode
    statusText = "Premium";
    statusColor = "🟣";
    bgColor = "bg-purple-50 dark:bg-purple-950/20";
    textColor = "text-purple-700 dark:text-purple-400";
    borderColor = "border-purple-200 dark:border-purple-800";
  } else if (isPaymentIssue) {
    // Payment issue
    statusText = "Payment issue";
    statusColor = "🟡";
    bgColor = "bg-yellow-50 dark:bg-yellow-950/20";
    textColor = "text-yellow-700 dark:text-yellow-400";
    borderColor = "border-yellow-200 dark:border-yellow-800";
  } else {
    // Free mode (no trial started or expired subscription)
    statusText = `Free · ${credits} credits left`;
    statusColor = "🟢";
    bgColor = "bg-green-50 dark:bg-green-950/20";
    textColor = "text-green-700 dark:text-green-400";
    borderColor = "border-green-200 dark:border-green-800";
  }

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="sm"
      className={`${bgColor} ${textColor} ${borderColor} hover:opacity-80 transition-colors gap-1.5 capitalize font-medium`}
    >
      <span>{statusColor}</span>
      <span className="max-sm:hidden">{statusText}</span>
    </Button>
  );
};

export default Subscription;

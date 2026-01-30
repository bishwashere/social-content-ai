"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import PricingModal from "@/components/common/pricing-modal";
import { CoinsModal } from "@/components/common/coins-modal";
import { FreeCreditsCongratsModal } from "@/components/common/free-credits-congrats-modal";
import { useAssignBasicTokens, useSession } from "@/backend-apis/auth/hooks";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { isSubscriptionExpired } from "@/lib/sub";
import { markFreeCreditsCongratsShown } from "@/server-actions/user-flags";
import { PREMIUM_INTENT_KEY } from "@/components/common/auth/google-login-button";

type PricingModalContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  coinsModalOpen: boolean;
  setCoinsModalOpen: (open: boolean) => void;
  handleCoinsFinished: () => void;
};

const PricingModalContext = createContext<PricingModalContextType | undefined>(
  undefined
);

export function PricingModalProvider({ children }: { children: React.ReactNode }) {
  const { data } = useSession();
  const projects = useGetAllProjects();
  const assignBasicTokens = useAssignBasicTokens();
  const [open, setOpen] = useState(false);
  const [coinsModalOpen, setCoinsModalOpen] = useState(false);
  const [freeCreditsCongratsOpen, setFreeCreditsCongratsOpen] = useState(false);
  const [defaultBillingPeriod, setDefaultBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const freeCreditsCongratsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const firstProjectCongratsShownRef = useRef(false);
  const premiumIntentCheckedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (freeCreditsCongratsTimerRef.current) {
        clearTimeout(freeCreditsCongratsTimerRef.current);
      }
    };
  }, []);

  // Check for premium intent from landing page after login
  useEffect(() => {
    // Only check once per session and when user is logged in
    if (premiumIntentCheckedRef.current) return;
    if (!data?.user?.id) return;
    
    // Don't show pricing if user already has an active subscription
    if (data?.subscription && !isSubscriptionExpired(data.subscription.endsAt).isExpired) {
      localStorage.removeItem(PREMIUM_INTENT_KEY);
      return;
    }

    try {
      const intentStr = localStorage.getItem(PREMIUM_INTENT_KEY);
      if (!intentStr) return;

      const intent = JSON.parse(intentStr);
      
      // Check if intent is still valid (within 5 minutes)
      const isValid = intent.showPricing && 
        intent.timestamp && 
        (Date.now() - intent.timestamp) < 5 * 60 * 1000;

      if (isValid) {
        premiumIntentCheckedRef.current = true;
        // Set the billing period from intent
        if (intent.billingPeriod) {
          setDefaultBillingPeriod(intent.billingPeriod);
        }
        // Show pricing modal after a small delay to let the page load
        setTimeout(() => {
          setOpen(true);
        }, 500);
      }

      // Clear the intent after checking
      localStorage.removeItem(PREMIUM_INTENT_KEY);
    } catch {
      localStorage.removeItem(PREMIUM_INTENT_KEY);
    }
  }, [data?.user?.id, data?.subscription]);

  const showFreeCreditsCongratsWithDelay = (delayMs = 0) => {
    // Optional delay so it can appear after other UI transitions.
    if (freeCreditsCongratsTimerRef.current) {
      clearTimeout(freeCreditsCongratsTimerRef.current);
    }
    freeCreditsCongratsTimerRef.current = setTimeout(() => {
      setFreeCreditsCongratsOpen(true);
    }, delayMs);
  };

  // After the first project is created, don't show a paywall. Just show 100 credits once.
  useEffect(() => {
    const userId = data?.user?.id;
    if (!userId) return;
    if (projects.isLoading) return;

    // Check if user has already seen the congrats modal (from database)
    if (data?.user?.freeCreditsCongratsShown) {
      return;
    }
    
    // Prevent showing multiple times in the same session
    if (firstProjectCongratsShownRef.current) return;

    // Only for the "first project just exists" scenario.
    const projectsCount = projects.data?.length ?? 0;
    if (projectsCount !== 1) return;

    // Only if user is not subscribed/active (otherwise credits are irrelevant).
    const hasNoSubscription =
      !data?.subscription ||
      isSubscriptionExpired(data.subscription.endsAt).isExpired;
    if (!hasNoSubscription) return;

    // Mark as shown in session
    firstProjectCongratsShownRef.current = true;
    
    // Mark as shown in database
    markFreeCreditsCongratsShown(userId).catch(console.error);

    // Ensure the user actually has credits if they were at 0 for any reason.
    if ((data?.user?.remainingChatGenerations ?? 0) <= 0) {
      assignBasicTokens.mutate();
    }

    // Show immediately.
    showFreeCreditsCongratsWithDelay(0);
  }, [assignBasicTokens, data?.subscription, data?.user?.id, data?.user?.freeCreditsCongratsShown, data?.user?.remainingChatGenerations, projects.data, projects.isLoading]);
  
  const handleCoinsFinished = () => {
    // If user has no tokens and no subscription, show pricing modal
    const hasNoTokens = (data?.user?.remainingChatGenerations || 0) <= 0;
    const hasNoSubscription = !data?.subscription;
    
    if (hasNoTokens && hasNoSubscription) {
      setOpen(true);
    } else if (data?.subscription?.status === "trial" || data?.subscription?.status === "trialing") {
      setOpen(true);
    } else {
      setCoinsModalOpen(true);
    }
  };
  return (
    <PricingModalContext.Provider value={{ open, setOpen, coinsModalOpen, setCoinsModalOpen, handleCoinsFinished }}>
      <PricingModal
        open={open}
        setOpen={setOpen}
        onSkippedPaywall={() => showFreeCreditsCongratsWithDelay(500)}
        defaultBillingPeriod={defaultBillingPeriod}
      />
      <FreeCreditsCongratsModal open={freeCreditsCongratsOpen} setOpen={setFreeCreditsCongratsOpen} credits={100} />
      <CoinsModal open={coinsModalOpen} setOpen={setCoinsModalOpen} />
      {children}
    </PricingModalContext.Provider>
  );
}

export function usePricingModal() {
  const context = useContext(PricingModalContext);
  if (context === undefined) {
    throw new Error("usePricingModal must be used within a PricingModalProvider");
  }
  return context;
}
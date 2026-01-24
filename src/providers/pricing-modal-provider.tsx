"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import PricingModal from "@/components/common/pricing-modal";
import { CoinsModal } from "@/components/common/coins-modal";
import { FreeCreditsCongratsModal } from "@/components/common/free-credits-congrats-modal";
import { useAssignBasicTokens, useSession } from "@/backend-apis/auth/hooks";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { isSubscriptionExpired } from "@/lib/sub";

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
  const freeCreditsCongratsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const firstProjectCongratsShownRef = useRef(false);

  useEffect(() => {
    return () => {
      if (freeCreditsCongratsTimerRef.current) {
        clearTimeout(freeCreditsCongratsTimerRef.current);
      }
    };
  }, []);

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

    // Only for the "first project just exists" scenario.
    const projectsCount = projects.data?.length ?? 0;
    if (projectsCount !== 1) return;

    // Only if user is not subscribed/active (otherwise credits are irrelevant).
    const hasNoSubscription =
      !data?.subscription ||
      isSubscriptionExpired(data.subscription.endsAt).isExpired;
    if (!hasNoSubscription) return;

    // Don't show repeatedly.
    const storageKey = `first_project_free_credits_shown__${userId}`;
    if (typeof window !== "undefined" && localStorage.getItem(storageKey) === "1") return;
    if (firstProjectCongratsShownRef.current) return;

    firstProjectCongratsShownRef.current = true;
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, "1");
    }

    // Ensure the user actually has credits if they were at 0 for any reason.
    if ((data?.user?.remainingChatGenerations ?? 0) <= 0) {
      assignBasicTokens.mutate();
    }

    // Show immediately.
    showFreeCreditsCongratsWithDelay(0);
  }, [assignBasicTokens, data?.subscription, data?.user?.id, data?.user?.remainingChatGenerations, projects.data, projects.isLoading]);
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
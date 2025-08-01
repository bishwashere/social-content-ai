"use client";

import { createContext, useContext, useState } from "react";
import PricingModal from "@/components/common/pricing-modal";
import { CoinsModal } from "@/components/common/coins-modal";
import { useSession } from "@/backend-apis/auth/hooks";

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
  const [open, setOpen] = useState(false);
  const [coinsModalOpen, setCoinsModalOpen] = useState(false);
  const handleCoinsFinished = () => {
    if (data?.subscription?.status === "trial") {
      setOpen(true)
    } else {
      setCoinsModalOpen(true)
    }
  }
  return (
    <PricingModalContext.Provider value={{ open, setOpen, coinsModalOpen, setCoinsModalOpen, handleCoinsFinished }}>
      <PricingModal open={open} setOpen={setOpen} />
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
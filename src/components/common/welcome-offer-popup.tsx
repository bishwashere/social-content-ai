"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Gift, Clock, Sparkles, PartyPopper, Zap, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContinueWithGoogle, useSession } from "@/backend-apis/auth/hooks";
import { useGoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";

const SESSION_KEY = "nextpostai_welcome_offer_shown";
const TIMER_STORAGE_KEY = "nextpostai_cta_timer_start";
const SHOW_DELAY_MS = 1000; // Show after 1 second
const TIMER_DURATION_MS = 20 * 60 * 1000; // 20 minutes

function formatTime(ms: number): { minutes: string; seconds: string } {
  if (ms <= 0) return { minutes: "00", seconds: "00" };
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return {
    minutes: minutes.toString().padStart(2, "0"),
    seconds: seconds.toString().padStart(2, "0"),
  };
}

function getTimeRemaining(): number {
  if (typeof window === "undefined") return TIMER_DURATION_MS;
  const stored = sessionStorage.getItem(TIMER_STORAGE_KEY);
  if (!stored) return TIMER_DURATION_MS;
  const elapsed = Date.now() - parseInt(stored, 10);

  // If timer expired, reset for a fresh 20-min cycle
  if (elapsed >= TIMER_DURATION_MS) {
    const now = Date.now();
    sessionStorage.setItem(TIMER_STORAGE_KEY, now.toString());
    return TIMER_DURATION_MS;
  }

  return TIMER_DURATION_MS - elapsed;
}

function fireConfetti() {
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#a855f7", "#06b6d4", "#f59e0b", "#22c55e", "#ec4899"],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ["#a855f7", "#06b6d4", "#f59e0b", "#22c55e", "#ec4899"],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
}

interface WelcomeOfferPopupProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function WelcomeOfferPopup({ externalOpen, onExternalOpenChange }: WelcomeOfferPopupProps) {
  const { data: session, isLoading } = useSession();
  const [internalOpen, setInternalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION_MS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const continueWithGoogle = useContinueWithGoogle();
  const router = useRouter();

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await continueWithGoogle.mutateAsync({
          credential: tokenResponse.access_token,
        });
        if (res?.data?.bearerToken) {
          localStorage.setItem("nextpostai_token", res.data.bearerToken);
        }
        router.replace("/dashboard");
      } catch {}
    },
    scope: "profile email",
  });

  // The popup is open if either internal auto-trigger or external trigger
  const open = internalOpen || (externalOpen ?? false);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(getTimeRemaining());
    }, 1000);
  }, []);

  const handleClose = useCallback(() => {
    setInternalOpen(false);
    onExternalOpenChange?.(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [onExternalOpenChange]);

  const handleClaim = useCallback(() => {
    handleClose();
  }, [handleClose]);

  // Auto-show after 1 second for non-authenticated users
  useEffect(() => {
    if (isLoading) return;
    if (session?.user) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const showTimer = setTimeout(() => {
      setInternalOpen(true);
      sessionStorage.setItem(SESSION_KEY, "1");

      // Fire confetti
      fireConfetti();

      // Start countdown using shared timer
      setTimeLeft(getTimeRemaining());
      startTimer();
    }, SHOW_DELAY_MS);

    return () => {
      clearTimeout(showTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.user, isLoading, startTimer]);

  // When opened externally (via timer click), start the countdown in the dialog
  useEffect(() => {
    if (externalOpen) {
      setTimeLeft(getTimeRemaining());
      startTimer();
      fireConfetti();
    }
    return () => {
      if (!externalOpen && timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [externalOpen, startTimer]);

  if (!open) return null;

  const { minutes, seconds } = formatTime(timeLeft);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="fixed left-1/2 top-1/2 z-[9999] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4 animate-in zoom-in-95 fade-in duration-300"
        role="dialog"
        aria-labelledby="welcome-offer-title"
        aria-modal="true"
      >
        <div
          className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-[#0a0a0f]/98 shadow-2xl shadow-purple-500/20 backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative top gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-500" />

          {/* Background glow effects */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 rounded-full p-1.5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative p-8 pt-10">
            {/* Celebration icon */}
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/30 border border-purple-500/40 flex items-center justify-center animate-bounce">
                  <PartyPopper className="w-10 h-10 text-yellow-400" />
                </div>
                {/* Sparkle accents */}
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-300 animate-pulse" />
                <Sparkles className="absolute -bottom-1 -left-3 w-5 h-5 text-purple-400 animate-pulse delay-300" />
              </div>
            </div>

            {/* Title */}
            <h2
              id="welcome-offer-title"
              className="text-center text-2xl md:text-3xl font-bold text-white mb-2"
            >
              You&apos;re Right On Time!
            </h2>

            {/* Subtitle */}
            <p className="text-center text-gray-300 text-base md:text-lg mb-6">
              Claim your{" "}
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                100 free posts
              </span>{" "}
              before this offer expires
            </p>

            {/* Timer */}
            <div className="flex flex-col items-center mb-7">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                <Clock className="w-4 h-4 text-red-400 animate-pulse" />
                <span>Offer expires in</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Minutes */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold font-mono bg-white/5 border border-white/10 text-white">
                    {minutes}
                  </div>
                  <span className="text-xs text-gray-500 mt-1.5">MINUTES</span>
                </div>

                <span className="text-2xl font-bold text-gray-500 -mt-5">:</span>

                {/* Seconds */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold font-mono bg-white/5 border border-white/10 text-white">
                    {seconds}
                  </div>
                  <span className="text-xs text-gray-500 mt-1.5">SECONDS</span>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="flex flex-col gap-2 mb-7">
              {[
                "AI-powered content for X, LinkedIn, Instagram & more",
                "30 days of posts generated in minutes",
                "No credit card required",
              ].map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <Zap className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  handleClose();
                  googleLogin();
                }}
                className="w-full py-6 text-lg font-bold rounded-xl text-white bg-gradient-to-r from-purple-600 via-purple-500 to-cyan-500 hover:from-purple-700 hover:via-purple-600 hover:to-cyan-600 transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 cursor-pointer"
              >
                <Gift className="w-5 h-5 mr-2" />
                Claim 100 Free Posts Now
              </Button>

              <button
                onClick={() => {
                  handleClose();
                  const section = document.querySelector("#how-it-works");
                  if (section) {
                    section.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="w-full py-3 text-sm font-medium rounded-xl text-gray-400 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                How It Works
              </button>
            </div>

            {/* Trust line */}
            <p className="text-center text-xs text-gray-500 mt-4">
              No credit card needed. Get started in 30 seconds.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

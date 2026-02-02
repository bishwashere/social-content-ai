"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/backend-apis/auth/hooks";
import api from "@/backend-apis/axios";
import { toast } from "sonner";

const SESSION_KEY = "nextpostai_newsletter_popup_shown"; // sessionStorage: each refresh = new session
const SCROLL_THRESHOLD = 0.25; // Show after 25% scroll
const TIME_DELAY_MS = 20000; // Or after 20 seconds

export function NewsletterPopup() {
  const { data: session, isLoading } = useSession();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const showPopup = useCallback(() => {
    if (typeof window === "undefined") return;
    if (session?.user || isLoading) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setOpen(true);
    sessionStorage.setItem(SESSION_KEY, "1");
  }, [session?.user, isLoading]);

  useEffect(() => {
    if (session?.user || isLoading) return;

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0 && scrollTop / docHeight >= SCROLL_THRESHOLD) {
        showPopup();
      }
    };

    const timer = setTimeout(showPopup, TIME_DELAY_MS);

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [session?.user, isLoading, showPopup]);

  const handleClose = () => setOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Please enter your email.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/newsletter-subscribe", { email: trimmed, source: "popup" });
      setSubmitted(true);
      toast.success("Thanks for subscribing! We'll keep you in the loop.");
      setTimeout(handleClose, 2000);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Something went wrong. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className="fixed left-1/2 top-1/2 z-[9999] w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
        role="dialog"
        aria-labelledby="newsletter-title"
        aria-modal="true"
      >
        <div
          className="rounded-2xl border border-white/20 bg-[#0a0a0f]/95 p-6 shadow-xl backdrop-blur-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 id="newsletter-title" className="text-xl font-semibold text-white">
                Stay in the loop
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Subscribe to our updates and newsletter.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-gray-400 hover:text-white"
              onClick={handleClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="mt-4">
            {submitted ? (
              <p className="py-4 text-center text-sm text-gray-300">
                You&apos;re subscribed! We&apos;ll be in touch.
              </p>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 border-white/20 bg-white/5 text-white placeholder:text-gray-500"
                  disabled={submitting}
                  required
                />
                <Button
                  type="submit"
                  disabled={submitting}
                  className="shrink-0 bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:from-purple-600 hover:to-cyan-600"
                >
                  {submitting ? "..." : "Subscribe"}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}

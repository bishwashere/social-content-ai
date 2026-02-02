"use client";

import { useState } from "react";
import { Mail, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import api from "@/backend-apis/axios";
import { toast } from "sonner";
import { useSession } from "@/backend-apis/auth/hooks";

export function NewsletterWidget() {
  const { data: session, isLoading } = useSession();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const openPanel = () => setOpen(true);
  const closePanel = () => setOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Please enter your email.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/newsletter-subscribe", { email: trimmed, source: "widget" });
      setEmail("");
      setSubmitted(true);
      toast.success("Thanks for subscribing! We'll keep you in the loop.");
      setTimeout(() => {
        setSubmitted(false);
        setOpen(false);
      }, 2000);
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

  // Only show newsletter widget when user is NOT logged in (opposite of FeatureRequestWidget)
  if (isLoading || session?.user) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
      {open && (
        <div
          className={cn(
            "w-[340px] max-w-[calc(100vw-3rem)] rounded-2xl border bg-card shadow-lg",
            "animate-in slide-in-from-bottom-4 fade-in duration-200"
          )}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="font-semibold text-foreground">Stay in the loop</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={closePanel}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="p-4">
            {submitted ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Thanks for subscribing! We&apos;ll keep you in the loop.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">
                  Subscribe to our updates and newsletter.
                </p>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mb-3"
                  disabled={submitting}
                  required
                />
                <Button
                  type="submit"
                  size="sm"
                  className="w-full"
                  disabled={submitting || !email.trim()}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Subscribing...
                    </span>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Subscribe
                    </>
                  )}
                </Button>
              </>
            )}
          </form>
        </div>
      )}

      <div className="relative flex flex-col items-end gap-2">
        {!open && (
          <button
            type="button"
            onClick={openPanel}
            className={cn(
              "flex h-7 min-w-0 items-center justify-center rounded-full px-3",
              "bg-violet-500 text-white text-sm font-semibold shadow-md",
              "hover:bg-violet-600 active:scale-95 transition-colors",
              "ring-2 ring-white dark:ring-slate-900"
            )}
            aria-label="Subscribe to newsletter"
            title="Subscribe to newsletter"
          >
            Newsletter
          </button>
        )}
        <Button
          type="button"
          size="icon"
          className={cn(
            "h-12 w-12 rounded-full shadow-lg",
            "bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
          )}
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close newsletter" : "Subscribe to newsletter"}
        >
          <Mail className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

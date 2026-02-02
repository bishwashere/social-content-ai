"use client";

import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import api from "@/backend-apis/axios";
import { toast } from "sonner";

export function FeatureRequestWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const openPanel = () => setOpen(true);
  const closePanel = () => setOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || trimmed.length < 3) {
      toast.error("Please enter at least 3 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/feature-requests", { message: trimmed });
      setMessage("");
      setSubmitted(true);
      toast.success("Thank you! Your feature request has been submitted.");
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
            <span className="font-semibold text-foreground">Feature request</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="p-4">
            {submitted ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                Thanks! We&apos;ll consider your idea.
              </p>
            ) : (
              <>
                <Textarea
                  placeholder="Describe a feature you'd like to see..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[100px] resize-none mb-3"
                  maxLength={2000}
                  disabled={submitting}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="w-full"
                  disabled={submitting || message.trim().length < 3}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Sending...
                    </span>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send request
                    </>
                  )}
                </Button>
              </>
            )}
          </form>
        </div>
      )}

      <div className="relative flex flex-col items-end gap-2">
        {/* Red pill badge with ? – clickable, opens feature request */}
        {!open && (
          <button
            type="button"
            onClick={openPanel}
            className={cn(
              "flex h-7 min-w-0 items-center justify-center rounded-full px-3",
              "bg-red-500 text-white text-sm font-semibold shadow-md",
              "hover:bg-red-600 active:scale-95 transition-colors",
              "ring-2 ring-white dark:ring-slate-900"
            )}
            aria-label="Feature request – suggest a feature"
            title="Feature request"
          >
            Feature request?
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
          aria-label={open ? "Close feature request" : "Suggest a feature"}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

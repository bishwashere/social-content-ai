"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function CheckoutCanceled() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="relative mx-auto mb-6 h-24 w-24">
          <div className="absolute inset-0 rounded-full bg-emerald-300/40 dark:bg-emerald-400/20 animate-ping" />
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 shadow-sm">
            <Sparkles className="h-11 w-11 text-emerald-700 dark:text-emerald-300 motion-safe:animate-bounce" />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Checkout canceled</h1>
        <p className="mt-2 text-muted-foreground">
          No worries - you can continue using NextpostAI.
        </p>

        <div className="mt-6 flex gap-3">
          <Button asChild className="flex-1">
            <Link href="/project">Continue</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/project/billing">View plans</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

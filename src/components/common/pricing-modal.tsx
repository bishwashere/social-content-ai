"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FolderKanban, CheckCircle2, XIcon, Lock } from "lucide-react";
import {
  useCreateCheckoutSession,
  useManageSubscription,
} from "@/backend-apis/payment/hooks";
import { useRouter } from "next/navigation";
import { useAssignBasicTokens, useSession } from "@/backend-apis/auth/hooks";
import { useEffect, useState, useRef } from "react";
import { isSubscriptionExpired } from "@/lib/sub";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function PricingModal({ open, setOpen }: Props) {
  const payment = useCreateCheckoutSession();
  const manage = useManageSubscription();
  const router = useRouter();
  const { data, isLoading: sessionLoading } = useSession();
  // const [isLoading, setIsLoading] = useState(false); // COMMENTED OUT: No longer needed for custom trial claims
  const queryClient = useQueryClient();
  const projects = useGetAllProjects();
  const userDismissedRef = useRef(false); // Track if user explicitly closed the modal
  const lastUserIdRef = useRef<string | undefined>(undefined); // Track last user ID to reset dismissal on login

  // Reset dismissal flag when user logs in (user ID changes)
  useEffect(() => {
    if (data?.user?.id && data.user.id !== lastUserIdRef.current) {
      // User has logged in (new user ID detected or first time seeing this user)
      lastUserIdRef.current = data.user.id;
      userDismissedRef.current = false; // Reset dismissal flag on login
    }
  }, [data?.user?.id]);

  // Show paywall if: user has 1 project AND user has not paid (no subscription)
  useEffect(() => {
    // Wait for projects and session to load
    if (projects.isLoading || sessionLoading) {
      return;
    }

    // Don't show if user has explicitly dismissed the modal in this session
    if (userDismissedRef.current && !open) {
      return;
    }

    const hasNoSubscription = !data?.subscription || 
      (data.subscription && isSubscriptionExpired(data.subscription.endsAt).isExpired);
    const projectsCount = projects.data?.length || 0;
    const hasOneProject = projectsCount === 1;

    // Debug: Log the actual values
    console.log('[PricingModal] Check:', {
      projectsCount,
      hasOneProject,
      hasSubscription: !!data?.subscription,
      hasNoSubscription,
      subscriptionEndsAt: data?.subscription?.endsAt,
      subscriptionExpired: data?.subscription ? isSubscriptionExpired(data.subscription.endsAt).isExpired : 'N/A'
    });

    // Simple check: Show paywall if user has 1 project and has not paid
    if (hasOneProject && hasNoSubscription) {
      console.log('[PricingModal] ✅ Showing paywall - user has 1 project and no subscription');
      setOpen(true);
    } else {
      console.log('[PricingModal] ❌ Not showing:', {
        reason: !hasOneProject ? 'not exactly 1 project' : 'has active subscription'
      });
      setOpen(false);
    }
  }, [data?.subscription, data?.user?.id, setOpen, projects.isLoading, projects.data, open, sessionLoading]);

  // Don't reset dismissal flag when user gets projects - we want to show on next login instead
  // This ensures modal shows on second login, not immediately after project creation

  // COMMENTED OUT: Custom trial claim logic - now handled by Stripe
  // const claimTrial = async () => {
  //   try {
  //     if (!data?.user?.hasClaimedFreeTrial) {
  //       setIsLoading(true);
  //       const res = await claimFreeTrial(data?.user?.id || "")
  //       if (res.success) {
  //         toast.success(res.message);
  //         setOpen(false);
  //         queryClient.invalidateQueries({
  //           queryKey: ["session"],
  //         });
  //       } else {
  //         toast.error(res.message);
  //       }
  //       setIsLoading(false);
  //     }
  //   } catch { }
  // }

  const assignBasicTokens = useAssignBasicTokens();

  const handleClose = async () => {
    // Mark that user explicitly dismissed the modal
    userDismissedRef.current = true;
    
    // Assign basic tokens instead of logging out
    try {
      await assignBasicTokens.mutateAsync();
      localStorage.setItem(`lastOpen__${data?.user?.id}`, Date.now().toString());
      setOpen(false);
      toast.success("You've been assigned 100 free tokens to get started!");
    } catch (error) {
      // If assignment fails, just close the modal
      setOpen(false);
    }
  };

  return (
    <Sheet 
      open={open} 
      onOpenChange={setOpen}
    >
      <SheetContent 
        side="bottom" 
        className="sm:max-w-md mx-auto rounded-t-2xl max-h-[90vh] overflow-y-auto [&>button:last-child]:hidden"
        onInteractOutside={(e) => {
          // Prevent closing when clicking outside
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing on ESC key
          e.preventDefault();
        }}
      >
        {/* Custom close button that actually closes the drawer */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none p-2 bg-background"
          aria-label="Close"
        >
          <XIcon className="h-5 w-5" />
        </button>
        
        <div className="space-y-6 pb-6 px-6">
          {/* Header */}
          <SheetHeader className="text-left">
            <SheetTitle className="text-2xl font-bold leading-tight">
              Turn ideas into ready-to-post content
            </SheetTitle>
            <p className="text-sm text-muted-foreground mt-1">
              7-day free trial · Cancel anytime
            </p>
          </SheetHeader>

          {/* Price - Quiet */}
          <div className="text-center">
            <div className="text-2xl text-muted-foreground">
              $10 <span className="text-base font-normal">/ month after trial</span>
            </div>
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
              loading={payment.isPending || manage.isPending}
              onClick={async () => {
                try {
                  // Use existing purchase flow - create checkout session
                  const res = await payment.mutateAsync("subscription");
                  if (res?.data?.redirectUrl) {
                    router.push(res.data.redirectUrl);
                  }
                } catch (error) {
                  // Error handling is done by the hook (toast notification)
                  console.error("Error creating checkout session:", error);
                }
              }}
              className="w-full text-base font-semibold py-6"
              size="lg"
            >
              {payment.isSuccess || manage.isSuccess
                ? "Redirecting..."
                : (data?.subscription?.status === "trial")
                  ? "Upgrade Plan"
                  : data?.subscription && isSubscriptionExpired(data.subscription.endsAt).isExpired
                    ? "Upgrade Plan"
                    : "Start 7-Day Free Trial"}
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
      </SheetContent>
    </Sheet>
  );
}

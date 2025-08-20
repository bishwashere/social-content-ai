import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { stripe } from "@/lib/stripe";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { PACKAGES_DATA } from "@/constants/packages";
import { User } from "@prisma/client";

/**
 * Upgrade trial subscription to pro plan using existing customer ID
 */
export const POST = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error: user is not defined
    const user = req.parsed.user;

    try {
      // Find the user's current trial subscription
      const currentSubscription = await prisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: "trial",
          active: true,
        },
        orderBy: { createdAt: "desc" },
      });

      if (!currentSubscription) {
        return sendNextResponse({
          status: 400,
          message: "No active trial subscription found",
        });
      }

      // Get the Stripe subscription
      const stripeSubscription = await stripe.stripe.subscriptions.retrieve(
        currentSubscription.subscriptionIdFromStripe
      );

      if (!stripeSubscription) {
        return sendNextResponse({
          status: 400,
          message: "Stripe subscription not found",
        });
      }

      // Update the subscription to remove trial and start billing immediately
      const updatedSubscription = await stripe.stripe.subscriptions.update(
        currentSubscription.subscriptionIdFromStripe,
        {
          trial_end: "now", // End trial immediately
          proration_behavior: "create_prorations", // Handle prorations
        }
      );

      // Update the subscription in our database
      await prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          status: "active",
          startedAt: new Date(updatedSubscription.current_period_start * 1000).toISOString(),
          endsAt: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
        },
      });

      // Mark trial as claimed
      await prisma.user.update({
        where: { id: user.id },
        data: {
          hasClaimedFreeTrial: true,
        },
      });

      return sendNextResponse({
        message: "Trial successfully upgraded to pro plan",
        status: 200,
        data: {
          subscriptionId: updatedSubscription.id,
          status: updatedSubscription.status,
        },
      });
    } catch (error) {
      console.error("❌ Error upgrading trial subscription:", error);
      return sendNextResponse({
        status: 500,
        message: "Failed to upgrade trial subscription",
      });
    }
  })
);
import { PACKAGES } from "@/constants/packages";
import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { stripe } from "@/lib/stripe";
import { isSubscriptionExpired } from "@/lib/sub";
import { applyMiddleware } from "@/middlewares/apply-middleware";

import { validateUserAuth } from "@/middlewares/validate-auth";
import { User } from "@prisma/client";

/**
 * Create a checkout session for the given package.
 */
export const POST = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error: user is not defined
    const user = req.parsed.user;

    // if user is already subscribed, return an error
    const subscriptions = await prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    if (
      subscriptions &&
      subscriptions.status !== "trial" &&
      !isSubscriptionExpired(subscriptions.endsAt.toISOString()).isExpired
    ) {
      return sendNextResponse({
        status: 400,
        message: "User is already subscribed and subscription is not expired",
      });
    }

    try {
      const session = await stripe.createSession(
        PACKAGES.BASIC,
        user as unknown as User,
        !user.hasClaimedFreeTrial // only give trial if user has not claimed it before
      );

      // delete old subscription
      // if (subscriptions) await subscriptions?.deleteOne();

      return sendNextResponse({
        message: "Checkout session created",
        status: 200,
        data: {
          redirectUrl: session.url,
        },
      });
    } catch (error) {
      console.error("❌ Error creating checkout session:", error);
      return sendNextResponse({
        status: 500,
        message: "Failed to create checkout session",
      });
    }
  })
);

/**
 * Get Stripe session details.
 */

export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    const sessionId = req.nextUrl.searchParams.get("sessionId");

    if (!sessionId) {
      return sendNextResponse({
        status: 400,
        message: "Session ID is required",
      });
    }

    try {
      const session = await stripe.getSessionDetails(sessionId);

      return sendNextResponse({
        message: "Checkout session details",
        status: 200,
        data: session,
      });
    } catch (error) {
      console.error("❌ Error getting checkout session details:", error);
      return sendNextResponse({
        status: 400,
        message: "Failed to get checkout session details",
      });
    }
  })
);

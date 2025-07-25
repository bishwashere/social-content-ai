import { PACKAGES } from "@/constants/packages";
import { User, UserDoc } from "@/db/auth/schema/user";
import {
  SubscriptionDoc,
  SubscriptionModel,
} from "@/db/subscriptions/schema/subscription";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { stripe } from "@/lib/stripe";
import { isSubscriptionExpired } from "@/lib/sub";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { validateUserAuth } from "@/middlewares/validate-auth";

/**
 * Create a checkout session for the given package.
 */
export const POST = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error: user is not defined
    const user = req.parsed.user as UserDoc;

    // if user is already subscribed, return an error
    const subscriptions: SubscriptionDoc | null =
      await SubscriptionModel.findOne({
        userId: user._id,
        // latest one
        sort: { createdAt: -1 },
      });

    if (
      subscriptions &&
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
        user.toJSON() as User,
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
  connectToDBMiddleware(),
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

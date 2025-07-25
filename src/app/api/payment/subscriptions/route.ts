/**
 * Get subscription details.
 */

import { UserDoc } from "@/db/auth/schema/user";
import {
  SubscriptionDoc,
  SubscriptionModel,
} from "@/db/subscriptions/schema/subscription";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { stripe } from "@/lib/stripe";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { validateUserAuth } from "@/middlewares/validate-auth";

export const GET = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error: user is not defined
    const user = req.parsed.user as UserDoc;

    const subscription = await SubscriptionModel.findOne({
      userId: user._id,
    });

    return sendNextResponse({
      status: 200,
      message: "Subscription details",
      data: subscription,
    });
  })
);

/**
 * Manage subscription.
 * Returns the stripe customer portal URL.
 */
export const PUT = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error: user is not defined
    const user = req.parsed.user as UserDoc;

    const subscription: SubscriptionDoc | null =
      await SubscriptionModel.findOne({
        userId: user._id,
      });

    if (!subscription || subscription?.customerId?.startsWith("trial__")) {
      return sendNextResponse({
        status: 400,
        message: "User is not subscribed",
      });
    }

    const portal = await stripe.stripe.billingPortal.sessions.create({
      customer: subscription.customerId || "",
      return_url:
        process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL + "/project/billing",
    });

    return sendNextResponse({
      status: 200,
      message: "Customer portal URL",
      data: {
        url: portal.url,
      },
    });
  })
);

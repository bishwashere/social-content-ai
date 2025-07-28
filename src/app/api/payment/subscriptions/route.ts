/**
 * Get subscription details.
 */

import { User, Subscription } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { stripe } from "@/lib/stripe";
import { applyMiddleware } from "@/middlewares/apply-middleware";

import { validateUserAuth } from "@/middlewares/validate-auth";

export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error: user is not defined
    const user = req.parsed.user as User;

    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
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
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error: user is not defined
    const user = req.parsed.user as User;

    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
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

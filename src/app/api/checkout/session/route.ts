import { PACKAGES } from "@/constants/packages";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { stripe } from "@/lib/stripe";
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
    const user = req.parsed.user;

    try {
      const session = await stripe.createSession(PACKAGES.BASIC, user);

      return sendNextResponse({
        message: "Checkout session created",
        status: 200,
        data: {
          redirectUrl: session.url,
        },
      });
    } catch (error) {
      console.error("❌ Error creating checkout session:", error);
      return {
        status: 500,
        message: "Failed to create checkout session",
      };
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

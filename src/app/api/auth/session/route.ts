import {
  SubscriptionDoc,
  SubscriptionModel,
} from "@/db/subscriptions/schema/subscription";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { validateUserAuth } from "@/middlewares/validate-auth";

/**
 * Retrieve the user session
 */
export const GET = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error: user is not defined
    const user = req.parsed.user;

    // subscription status
    const subscription: SubscriptionDoc | null =
      await SubscriptionModel.findOne({
        userId: user._id,
      });

    return sendNextResponse({
      message: "User Session",
      status: 200,
      data: {
        user,
        subscription,
      },
    });
  }),
);

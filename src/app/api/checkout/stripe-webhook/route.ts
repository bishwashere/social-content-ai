import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";

export const POST = applyMiddleware(
  connectToDBMiddleware(),
  catchApiAsyncError(async (req) => {
    console.log(
      "💖 Stripe webhook received",
      await req.json(),
      req.nextUrl.href
    );

    return sendNextResponse({
      message: "Stripe webhook",
      status: 200,
    });
  })
);

import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { stripe } from "@/lib/stripe";
import tryCatchAsync from "@/lib/try-catch-async";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { consola } from "consola";

export const POST = applyMiddleware(
  connectToDBMiddleware(),
  catchApiAsyncError(async (req) => {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
    const sig = req.headers.get("stripe-signature") as string;

    const [err, event] = await tryCatchAsync(async () => {
      return stripe.stripe.webhooks.constructEvent(
        await req.text(),
        sig,
        endpointSecret,
      );
    });

    if (err) {
      consola.error("❌ Stripe webhook error", err.message);
      return sendNextResponse({
        message: "Stripe webhook error",
        status: 400,
      });
    }

    switch (event.type) {
      case "customer.subscription.created":
        consola.success("📢 New subscription created");
        await stripe.createSubscription(event);
        break;

      case "invoice.payment_succeeded":
        consola.log("✅ Payment successful (Trial Ended or Renewal)");
        await stripe.updateSubscription(event);
        break;

      case "invoice.payment_failed":
        consola.info("⚠️ Payment failed!");
        await stripe.endSubscription(event);
        break;

      case "customer.subscription.updated":
        consola.success("🔄 Subscription updated");

        if (event.data.object.canceled_at) {
          consola.error("❌ Subscription cancelled");
          await stripe.cancelSubscription(event);
        } else {
          consola.success("✅ Subscription renewed");
          await stripe.updateSubscription(event);
        }

        break;

      case "customer.subscription.deleted":
        consola.error("❌ Subscription ended");
        await stripe.endSubscription(event);
        break;

      default:
        consola.log(`Ignoring event: ${event.type}`);
    }

    return sendNextResponse({
      message: "Stripe webhook",
      status: 200,
    });
  }),
);

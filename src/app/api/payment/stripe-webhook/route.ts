import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { stripe } from "@/lib/stripe";
import tryCatchAsync from "@/lib/try-catch-async";
import { applyMiddleware } from "@/middlewares/apply-middleware";

import { consola } from "consola";

export const POST = applyMiddleware(
  catchApiAsyncError(async (req) => {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
    const sig = req.headers.get("stripe-signature") as string;

    const [err, event] = await tryCatchAsync(async () => {
      return stripe.stripe.webhooks.constructEvent(
        await req.text(),
        sig,
        endpointSecret
      );
    });

    if (err) {
      consola.error("❌ Stripe webhook error", err.message);
      return sendNextResponse({
        message: "Stripe webhook error",
        status: 400,
      });
    }

    consola.log("Stripe webhook event:", JSON.stringify(event, null, 2));

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

      case "checkout.session.completed":
        const session = event.data.object;
        if (session.metadata?.type === "coins") {
          consola.info("💰 Processing coins purchase");
          consola.info("Session data:", {
            id: session.id,
            customer: session.customer,
            amount_total: session.amount_total,
            metadata: session.metadata,
            payment_status: session.payment_status,
          });
          try {
            await stripe.handleCoinsPayment(event);
            consola.success("✅ Coins purchase processed successfully");
          } catch (error) {
            consola.error("❌ Error processing coins purchase:", error);
            throw error; // Re-throw to trigger error response
          }
        } else if (session.mode === "subscription" && session.payment_status === "paid") {
          consola.info("🔄 Processing subscription payment completion");
          consola.info("Subscription session data:", {
            id: session.id,
            customer: session.customer,
            subscription: session.subscription,
            payment_status: session.payment_status,
          });
          try {
            await stripe.handleSubscriptionPaymentCompleted(event);
            consola.success("✅ Subscription payment completion processed successfully");
          } catch (error) {
            consola.error("❌ Error processing subscription payment completion:", error);
            throw error; // Re-throw to trigger error response
          }
        }
        break;

      default:
        consola.log(`Ignoring event: ${event.type}`);
    }

    return sendNextResponse({
      message: "Stripe webhook",
      status: 200,
    });
  })
);

import {
  Package,
  PACKAGES_DATA,
  TRIAL_PERIOD_IN_DAYS,
} from "@/constants/packages";
import { User } from "@/db/auth/schema/user";
import StripeNative from "stripe";

class Stripe {
  private stripe: StripeNative;

  constructor() {
    this.stripe = new StripeNative(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  async createSession(packageToBuy: Package, user: User) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [PACKAGES_DATA(user)[packageToBuy]],
      mode: "subscription",
      success_url:
        process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL +
        "/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url:
        process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL + "/checkout/cancel",
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_IN_DAYS,
        metadata: {
          userId: user._id.toString(),
          name: user.name,
          email: user.email,
        },
      },
    });

    return session;
  }

  getSessionDetails(sessionId: string) {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }

  getInvoice(invoiceId: string) {
    const invoice = this.stripe.invoices.retrieve(invoiceId);
    return invoice;
  }
}

export const stripe = new Stripe();

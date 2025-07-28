import {
  Package,
  PACKAGES_DATA,
  TRIAL_PERIOD_IN_DAYS,
} from "@/constants/packages";
import { User } from "@generated/prisma";
import consola from "consola";
import StripeNative from "stripe";
import { prisma } from "./prisma";
import { SUBSCRIPTION_STATUS } from "@/constants/subscription-status";
import { CHAT_GENERATION_PER_MONTH_WHILE_TRIAL } from "@/constants/common";
class Stripe {
  stripe: StripeNative;

  constructor() {
    this.stripe = new StripeNative(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  async createSession(packageToBuy: Package, user: User, trial: boolean) {
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
        ...(trial ? { trial_period_days: TRIAL_PERIOD_IN_DAYS } : {}), // only give trial period if the user has not claimed the free trial
        metadata: {
          userId: user.id,
          name: user.name,
          email: user.email,
        },
      },
      allow_promotion_codes: true,
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

  async createSubscription(
    event: StripeNative.CustomerSubscriptionCreatedEvent
  ) {
    const userId = event.data.object?.metadata?.userId;

    if (!userId) {
      consola.error("❌ User ID not found in metadata", event.id);
      throw new Error(`User ID not found in metadata ${event.id}`);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      consola.error("❌ User not found", userId);
      throw new Error(`User not found ${userId}`);
    }

    /**
     * if the user already has a active subscription, disable the old and create a new one
     */

    const activeSubs = await prisma.subscription.findMany({
      where: {
        userId: user.id,
        active: true,
      },
    });

    // disable the old subscription and cancel the subscription in stripe, in case the user has an active subscription
    // in ideal case, the user should not have an active subscription
    if (activeSubs && activeSubs.length > 0) {
      activeSubs.forEach(async (sub) => {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: SUBSCRIPTION_STATUS.INACTIVE,
          },
        });
        await this.stripe.subscriptions.update(
          sub.subscriptionIdFromStripe || "",
          {
            cancel_at_period_end: true,
          }
        );
      });
    }

    await prisma.subscription.create({
      data: {
        userId: user.id,
        startedAt: new Date(
          event.data.object.current_period_start * 1000
        ).toISOString(),
        endsAt: new Date(
          event.data.object.current_period_end * 1000
        ).toISOString(),
        invoiceId: event.data.object.latest_invoice?.toString() || "",
        status: event.data.object.status,
        subscriptionIdFromStripe: event.data.object.id,
        active: true,
        customerId: event.data.object.customer as string,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        remainingChatGenerations: CHAT_GENERATION_PER_MONTH_WHILE_TRIAL,
        hasClaimedFreeTrial: true,
      },
    });

    return;
  }

  async endSubscription(
    event:
      | StripeNative.CustomerSubscriptionDeletedEvent
      | StripeNative.InvoicePaymentFailedEvent
  ) {
    const customer = event.data.object.customer;

    const subscription = await prisma.subscription.findFirst({
      where: {
        customerId: customer as string,
      },
    });

    if (!subscription) {
      consola.error("❌ Subscription not found", customer);
      throw new Error(`Subscription not found ${customer}`);
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SUBSCRIPTION_STATUS.CANCELLED,
      },
    });

    return;
  }

  async updateSubscription(
    event:
      | StripeNative.InvoicePaymentSucceededEvent
      | StripeNative.CustomerSubscriptionUpdatedEvent
  ) {
    // update the subscription status and start and end date
    const subscription = await prisma.subscription.findFirst({
      where: {
        customerId: event.data.object.customer as string,
      },
    });

    if (!subscription) {
      consola.error("❌ Subscription not found", event.data.object.customer);
      throw new Error(`Subscription not found ${event.data.object.customer}`);
    }

    const subscriptionFromStripe = await this.stripe.subscriptions.retrieve(
      subscription.subscriptionIdFromStripe
    );

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: event.data.object.status?.toString(),
        startedAt: new Date(
          subscriptionFromStripe.current_period_start * 1000
        ).toISOString(),
        endsAt: new Date(
          subscriptionFromStripe.current_period_end * 1000
        ).toISOString(),
      },
    });

    return;
  }

  async cancelSubscription(
    event: StripeNative.CustomerSubscriptionUpdatedEvent
  ) {
    // update the subscription status and start and end date
    const subscription = await prisma.subscription.findFirst({
      where: {
        customerId: event.data.object.customer as string,
      },
    });

    if (!subscription) {
      consola.error("❌ Subscription not found", event.data.object.customer);
      throw new Error(`Subscription not found ${event.data.object.customer}`);
    }

    if (event.data.object.canceled_at) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SUBSCRIPTION_STATUS.CANCELLED,
        },
      });
      return;
    }

    return;
  }
}

export const stripe = new Stripe();

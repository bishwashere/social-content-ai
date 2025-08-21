import {
  Package,
  PACKAGES_DATA,
  TRIAL_PERIOD_IN_DAYS,
} from "@/constants/packages";
import { User } from "@prisma/client";
import consola from "consola";
import StripeNative from "stripe";
import { prisma } from "./prisma";
import { SUBSCRIPTION_STATUS } from "@/constants/subscription-status";
import { CHAT_GENERATION_PER_MONTH, CHAT_GENERATION_PER_MONTH_WHILE_TRIAL } from "@/constants/common";
class Stripe {
  stripe: StripeNative;

  constructor() {
    this.stripe = new StripeNative(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  async createCoinsSession(user: User) {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "500 Coins Package",
              description: "Get 500 coins to use for content generation",
            },
            unit_amount: 5000, // $50.00
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url:
        process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL +
        "/checkout/success?session_id={CHECKOUT_SESSION_ID}&type=coins",
      cancel_url:
        process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL + "/checkout/cancel",
      metadata: {
        userId: user.id,
        type: "coins",
        coinsAmount: "500",
      },
    });

    return session;
  }

  async handleCoinsPayment(event: StripeNative.CheckoutSessionCompletedEvent) {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const coinsAmount = parseInt(session.metadata?.coinsAmount || "0");

    consola.info("🔍 Processing coin payment with data:", {
      userId,
      coinsAmount,
      sessionId: session.id,
    });

    if (!userId || !coinsAmount) {
      consola.error("❌ Invalid coins payment metadata", session.id);
      throw new Error(`Invalid coins payment metadata ${session.id}`);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        remainingChatGenerations: true,
      },
    });

    if (!user) {
      consola.error("❌ User not found", userId);
      throw new Error(`User not found ${userId}`);
    }

    consola.info("👤 Found user current state:", {
      userId: user.id,
      currentChatGenerations: user.remainingChatGenerations,
    });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        remainingChatGenerations: {
          increment: coinsAmount,
        },
      },
      select: {
        id: true,
        remainingChatGenerations: true,
      },
    });

    consola.success("✅ Successfully updated user chat generations:", {
      userId: updatedUser.id,
      previousAmount: user.remainingChatGenerations,
      addedAmount: coinsAmount,
      newAmount: updatedUser.remainingChatGenerations,
    });

    return;
  }

  async handleSubscriptionPaymentCompleted(event: StripeNative.CheckoutSessionCompletedEvent) {
    const session = event.data.object;
    const subscriptionId = session.subscription as string;

    if (!subscriptionId) {
      consola.error("❌ Subscription ID not found in session", session.id);
      throw new Error(`Subscription ID not found in session ${session.id}`);
    }

    // Get the subscription from Stripe to get the latest status
    const stripeSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    
    // Find the subscription in our database
    const subscription = await prisma.subscription.findFirst({
      where: {
        subscriptionIdFromStripe: subscriptionId,
      },
    });

    if (!subscription) {
      consola.error("❌ Subscription not found in database", subscriptionId);
      throw new Error(`Subscription not found in database ${subscriptionId}`);
    }

    // Update subscription status to active if payment was successful
    if (stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing') {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: stripeSubscription.status === 'trialing' ? 'trial' : 'active',
          active: true,
        },
      });

      consola.success("✅ Subscription status updated to active after payment completion", {
        subscriptionId,
        newStatus: stripeSubscription.status === 'trialing' ? 'trial' : 'active',
      });
    }

    return;
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

    // Determine the correct status - handle 'incomplete' by setting to 'active' if subscription was created
    let subscriptionStatus: string;
    if (event.data.object.status === "trialing") {
      subscriptionStatus = "trial";
    } else if (event.data.object.status === "incomplete" || event.data.object.status === "incomplete_expired") {
      // For incomplete subscriptions, we'll set them as active since the subscription was created
      // The payment completion webhook will update the status if needed
      subscriptionStatus = "active";
    } else {
      subscriptionStatus = event.data.object.status;
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
        status: subscriptionStatus,
        subscriptionIdFromStripe: event.data.object.id,
        active: true,
        customerId: event.data.object.customer as string,
      },
    });

    consola.success("✅ Subscription created with status:", {
      originalStripeStatus: event.data.object.status,
      finalStatus: subscriptionStatus,
      subscriptionId: event.data.object.id,
    });

    // Update user chat generations and trial status based on subscription status
    const updateData: any = {
      remainingChatGenerations: subscriptionStatus === "trial" ? CHAT_GENERATION_PER_MONTH_WHILE_TRIAL : CHAT_GENERATION_PER_MONTH,
    };
    
    // Only mark trial as claimed when subscription is created (either trial or active)
    if (subscriptionStatus === 'trial' || subscriptionStatus === 'active') {
      updateData.hasClaimedFreeTrial = true;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
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

    // Determine the correct status - handle 'incomplete' by setting to 'active'
    let updatedStatus: string;
    const stripeStatus = event.data.object.status?.toString() || subscriptionFromStripe.status;
    if (stripeStatus === "trialing") {
      updatedStatus = "trial";
    } else if (stripeStatus === "incomplete" || stripeStatus === "incomplete_expired") {
      updatedStatus = "active";
    } else {
      updatedStatus = stripeStatus;
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: updatedStatus,
        startedAt: new Date(
          subscriptionFromStripe.current_period_start * 1000
        ).toISOString(),
        endsAt: new Date(
          subscriptionFromStripe.current_period_end * 1000
        ).toISOString(),
      },
    });

    consola.success("✅ Subscription updated with status:", {
      originalStripeStatus: stripeStatus,
      finalStatus: updatedStatus,
      subscriptionId: subscription.subscriptionIdFromStripe,
    });

    // Reset remaining chat generations for the user and handle trial status
    const updateData: any = {
      remainingChatGenerations: updatedStatus === "trial" ? CHAT_GENERATION_PER_MONTH_WHILE_TRIAL : CHAT_GENERATION_PER_MONTH,
    };
    
    // If subscription is transitioning to active status (from trial), mark trial as claimed
    if (subscriptionFromStripe.status === 'active') {
      updateData.hasClaimedFreeTrial = true;
    }

    await prisma.user.update({
      where: { id: subscription.userId },
      data: updateData,
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

"use server";

import { UserModel } from "@/db/auth/schema/user";
import { SubscriptionModel } from "@/db/subscriptions/schema/subscription";

export const claimFreeTrial = async (userId: string) => {
  const userFromDb = await UserModel.findById(userId);

  if (!userFromDb) {
    return {
      success: false,
      message: "User not found",
    };
  }

  if (userFromDb.hasClaimedFreeTrial) {
    return {
      success: false,
      message: "User has already claimed free trial",
    };
  }

  // give 7 days free trial with 50 tokens
  userFromDb.hasClaimedFreeTrial = true;
  userFromDb.remainingChatGenerations = 50;
  await userFromDb.save();

  await SubscriptionModel.create({
    userId: userFromDb._id,
    status: "trial",
    startedAt: new Date(),
    endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    invoiceId: "trial__invoice",
    subscriptionIdFromStripe: "trial__subscription",
    customerId: "trial__customer",
  });

  return {
    success: true,
    message: "Free trial claimed successfully",
  };
};

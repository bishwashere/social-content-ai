"use server";

import { prisma } from "@/lib/prisma";

// COMMENTED OUT: Custom trial handling - now using Stripe native trials
// export const claimFreeTrial = async (userId: string) => {
//   const userFromDb = await prisma.user.findUnique({
//     where: { id: userId },
//   });

//   if (!userFromDb) {
//     return {
//       success: false,
//       message: "User not found",
//     };
//   }

//   if (userFromDb.hasClaimedFreeTrial) {
//     return {
//       success: false,
//       message: "User has already claimed free trial",
//     };
//   }

//   // give 7 days free trial with 50 tokens
//   await prisma.user.update({
//     where: { id: userId },
//     data: {
//       hasClaimedFreeTrial: true,
//       remainingChatGenerations: 15,
//     },
//   });

//   await prisma.subscription.create({
//     data: {
//       userId: userFromDb.id,
//       status: "trial",
//       startedAt: new Date(),
//       endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//       invoiceId: "trial__invoice",
//       subscriptionIdFromStripe: "trial__subscription",
//       customerId: "trial__customer",
//       active: true,
//     },
//   });

//   return {
//     success: true,
//     message: "Free trial claimed successfully",
//   };
// };

// Placeholder function for Stripe-managed trials
export const claimFreeTrial = async (userId: string) => {
  // Trial is now handled by Stripe during checkout session creation
  // This function is kept for backward compatibility but does nothing
  return {
    success: false,
    message: "Trials are now handled by Stripe during checkout",
  };
};

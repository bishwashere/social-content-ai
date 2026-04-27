import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { isSubscriptionExpired } from "@/lib/sub";
import { FREE_DASHBOARD_CHAT_SESSIONS } from "@/constants/common";

/**
 * Start a new dashboard chat session.
 * Premium users have unlimited sessions.
 * Free users are limited to FREE_DASHBOARD_CHAT_SESSIONS sessions total.
 */
export const POST = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error - user is not defined in Request type
    const user = req.parsed.user;

    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
    });

    const hasPremium =
      !!subscription &&
      !isSubscriptionExpired(subscription.endsAt.toISOString()).isExpired;

    if (hasPremium) {
      return sendNextResponse({
        status: 200,
        message: "Session started",
        data: { sessionsUsed: user.dashboardChatSessionsUsed ?? 0 },
      });
    }

    const sessionsUsed = user.dashboardChatSessionsUsed ?? 0;

    if (sessionsUsed >= FREE_DASHBOARD_CHAT_SESSIONS) {
      return sendNextResponse({
        status: 403,
        message:
          "You have used all your free chat sessions. Upgrade to premium for unlimited access.",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { dashboardChatSessionsUsed: { increment: 1 } },
      select: { dashboardChatSessionsUsed: true },
    });

    return sendNextResponse({
      status: 200,
      message: "Session started",
      data: { sessionsUsed: updatedUser.dashboardChatSessionsUsed },
    });
  })
);

import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";

const BASIC_TOKENS = 10; // Basic tokens for new users who skip payment

/**
 * Assign basic tokens to a user who skips the payment modal
 */
export const POST = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: user is not defined in Request type
    const user = req.parsed.user;

    // Only assign tokens if user has 0 tokens (new user who hasn't started trial)
    if (user.remainingChatGenerations > 0) {
      return sendNextResponse({
        status: 400,
        message: "User already has tokens",
      });
    }

    // Update user with basic tokens
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        remainingChatGenerations: BASIC_TOKENS,
      },
      select: {
        id: true,
        remainingChatGenerations: true,
      },
    });

    return sendNextResponse({
      status: 200,
      message: "Basic tokens assigned successfully",
      data: {
        remainingChatGenerations: updatedUser.remainingChatGenerations,
      },
    });
  })
);


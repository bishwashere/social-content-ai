import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";

/**
 * Mark the dashboard intro modal as shown for the current user.
 * Idempotent – safe to call multiple times.
 */
export const POST = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error - user is not defined in Request type
    const user = req.parsed.user;

    await prisma.user.update({
      where: { id: user.id },
      data: { dashboardIntroShown: true },
    });

    return sendNextResponse({
      status: 200,
      message: "Dashboard intro marked as shown",
    });
  })
);

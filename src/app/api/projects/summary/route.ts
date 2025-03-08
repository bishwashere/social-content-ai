import { db } from "@/db";
import { User } from "@/db/auth/schema/user";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { validateUserAuth } from "@/middlewares/validate-auth";

export const GET = applyMiddleware(
  connectToDBMiddleware(),
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: ................
    const user = req.parsed.user as User;

    const project = await db.projects.getSummary({
      userId: user._id.toString(),
    });

    if (!project.ok) {
      return sendNextResponse({
        status: 400,
        message: project.error,
      });
    }

    return sendNextResponse({
      status: 201,
      data: project.data,
      message: `Project summary fetched successfully!`,
    });
  })
);

import { NextRequest } from "next/server";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateIdeasAdminAuth } from "@/middlewares/validate-ideas-admin-auth";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";

/**
 * Verify if the current token is a valid ideas admin token
 */
export const GET = applyMiddleware(
  validateIdeasAdminAuth({ errorIfNotAuthenticated: false }),
  catchApiAsyncError(async (req: NextRequest) => {
    // @ts-expect-error: parsed is not defined in Request type
    const adminAuth = req.parsed?.ideasAdmin;

    if (adminAuth && adminAuth.id === "ideas_admin") {
      return sendNextResponse({
        status: 200,
        message: "Admin authenticated",
        data: { authenticated: true },
      });
    }

    return sendNextResponse({
      status: 401,
      message: "Not authenticated as admin",
      data: { authenticated: false },
    });
  })
);

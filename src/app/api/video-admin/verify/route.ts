import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateVideoAdminAuth } from "@/middlewares/validate-video-admin-auth";

/**
 * Verify Video Admin token
 */
export const GET = applyMiddleware(
  validateVideoAdminAuth({ errorIfNotAuthenticated: false }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error: parsed is not defined in Request type
    const videoAdmin = req.parsed?.videoAdmin;

    if (videoAdmin) {
      return sendNextResponse({
        status: 200,
        message: "Authenticated",
        data: {
          authenticated: true,
          role: "video_admin",
        },
      });
    }

    return sendNextResponse({
      status: 200,
      message: "Not authenticated",
      data: {
        authenticated: false,
      },
    });
  })
);

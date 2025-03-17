import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";

/**
 * Hello World
 */
export const GET = applyMiddleware(
  catchApiAsyncError(async () => {
    return sendNextResponse({
      status: 200,
      message: "Hello World",
    });
  }),
);

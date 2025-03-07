import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";

export const GET = catchApiAsyncError(async () => {
  return sendNextResponse({
    status: 200,
    message: "Hello World",
  });
});

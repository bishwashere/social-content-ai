import { NextRequest, NextResponse } from "next/server";
import { sendNextResponse } from "./send-next-response";

const catchApiAsyncError = (
  fn: (req: NextRequest, res?: NextResponse) => unknown
) => {
  return async (req: NextRequest, res: NextResponse) => {
    try {
      return await fn(req, res);
    } catch (e) {
      console.error("❌ Error in API route:", e);
      return sendNextResponse({
        status: 500,
        error: e,
        message: "Unexpected error occurred",
      });
    }
  };
};

export default catchApiAsyncError;

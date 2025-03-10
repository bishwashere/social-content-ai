import { NextRequest } from "next/server";
import { sendNextResponse } from "./send-next-response";
import { Params } from "@/types/api";

/**
 *  Wraps an API route handler to catch any async errors and return a 500 response.
 *  @param fn - The API route handler function
 */
const catchApiAsyncError = (
  fn: (req: NextRequest, params: Params) => unknown
) => {
  return async (req: NextRequest, params: Params) => {
    try {
      return await fn(req, params);
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

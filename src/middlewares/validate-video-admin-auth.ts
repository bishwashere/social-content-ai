import { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/jwt";
import { sendNextResponse } from "@/lib/send-next-response";
import { VIDEO_ADMIN_TOKEN_COOKIE_NAME } from "@/constants/common";
import { CALL_NEXT_FUNCTION } from "./apply-middleware";

export function validateVideoAdminAuth(options?: {
  errorIfNotAuthenticated?: boolean;
}) {
  return async (req: NextRequest) => {
    // Get token from request cookies or Authorization header
    let token = req.cookies.get(VIDEO_ADMIN_TOKEN_COOKIE_NAME)?.value;
    
    if (!token) {
      const authHeader = req.headers.get("Authorization");
      token = authHeader?.split("Bearer ")[1] || "";
    }

    if (!token) {
      if (options?.errorIfNotAuthenticated) {
        return sendNextResponse({
          status: 401,
          message: "Unauthorized",
        });
      }
      return CALL_NEXT_FUNCTION;
    }

    const payload = verifyJWT(token, process.env.JWT_SECRET as string);

    if (!payload) {
      if (options?.errorIfNotAuthenticated) {
        return sendNextResponse({
          status: 401,
          message: "Invalid token",
        });
      }
      return CALL_NEXT_FUNCTION;
    }

    // Check if it's video admin (id will be "video_admin")
    const isVideoAdmin = payload.id === "video_admin";

    if (!isVideoAdmin) {
      if (options?.errorIfNotAuthenticated) {
        return sendNextResponse({
          status: 403,
          message: "Access denied. Video Admin access required.",
        });
      }
      return CALL_NEXT_FUNCTION;
    }

    // Attach auth info to request
    // @ts-expect-error: parsed is not defined in Request type
    if (!req.parsed) {
      // @ts-expect-error: parsed is not defined in Request type
      req.parsed = {};
    }

    // @ts-expect-error: parsed is not defined in Request type
    req.parsed.videoAdmin = {
      id: payload.id,
      email: payload.email,
    };

    return CALL_NEXT_FUNCTION;
  };
}

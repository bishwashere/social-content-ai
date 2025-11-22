import { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/jwt";
import { sendNextResponse } from "@/lib/send-next-response";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import { CALL_NEXT_FUNCTION } from "./apply-middleware";

export type ReferralAuthRole = "super_admin" | "referral_partner";

export function validateReferralAuth(options?: {
  allowedRoles?: ReferralAuthRole[];
  errorIfNotAuthenticated?: boolean;
}) {
  return async (req: NextRequest) => {
    // Get token from request cookies
    const token = req.cookies.get(AUTH_TOKEN_COOKIE_NAME)?.value;

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

    // Check if it's super admin (id will be "super_admin")
    const isSuperAdmin = payload.id === "super_admin";

    // For referral partners, verify they exist in database
    let isPartner = false;
    if (!isSuperAdmin && payload.id) {
      const { prisma } = await import("@/lib/prisma");
      const partner = await prisma.referralPartner.findUnique({
        where: { id: payload.id },
      });
      isPartner = !!partner;
    }

    const role: ReferralAuthRole | null = isSuperAdmin
      ? "super_admin"
      : isPartner
      ? "referral_partner"
      : null;

    if (!role) {
      if (options?.errorIfNotAuthenticated) {
        return sendNextResponse({
          status: 403,
          message: "Access denied",
        });
      }
      return CALL_NEXT_FUNCTION;
    }

    if (options?.allowedRoles && !options.allowedRoles.includes(role)) {
      return sendNextResponse({
        status: 403,
        message: "Insufficient permissions",
      });
    }

    // Attach auth info to request
    // @ts-expect-error: parsed is not defined in Request type
    if (!req.parsed) {
      // @ts-expect-error: parsed is not defined in Request type
      req.parsed = {};
    }

    // @ts-expect-error: parsed is not defined in Request type
    req.parsed.referralAuth = {
      userId: payload.id,
      email: payload.email,
      role,
    };

    return CALL_NEXT_FUNCTION;
  };
}

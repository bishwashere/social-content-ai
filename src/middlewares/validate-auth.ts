/* eslint-disable @typescript-eslint/no-explicit-any */
import { verifyJWT } from "@/lib/jwt";
import { sendNextResponse } from "@/lib/send-next-response";
import { NextRequest } from "next/server";
import { CALL_NEXT_FUNCTION } from "./apply-middleware";
import { prisma } from "@/lib/prisma";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";

type Props = {
  errorIfNotAuthenticated: boolean;
};

/**
 * Checks if the user is authenticated and attaches the user object to the request
 */
export const validateUserAuth = ({ errorIfNotAuthenticated }: Props) => {
  return async (req: NextRequest) => {
    // extract bearer token from header
    const token = req.headers.get("Authorization")?.split("Bearer ")[1] || "";

    const payload = verifyJWT(token, process.env.JWT_SECRET as string);

    if (!payload) {
      if (errorIfNotAuthenticated) {
        return sendNextResponse({
          status: 401,
          message: "Unauthorized",
        });
      }
      return CALL_NEXT_FUNCTION;
    }

    const user = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (!user) {
      if (errorIfNotAuthenticated) {
        return sendNextResponse({
          status: 401,
          message: "Unauthorized",
        });
      }
      return CALL_NEXT_FUNCTION;
    }
    // @ts-expect-error: ....
    if (!req.parsed) {
      // @ts-expect-error: ....
      req.parsed = {} as any;
    }

    // @ts-expect-error: ....
    req.parsed.user = user;

    return CALL_NEXT_FUNCTION;
  };
};

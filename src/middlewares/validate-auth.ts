import { verifyJWT } from "@/lib/jwt";
import { sendNextResponse } from "@/lib/send-next-response";
import { NextRequest, NextResponse } from "next/server";
import { CALL_NEXT_FUNCTION } from "./apply-middleware";
import { db } from "@/db";

type Props = {
  errorIfNotAuthenticated: boolean;
};

export const validateUserAuth = ({ errorIfNotAuthenticated }: Props) => {
  return async (req: NextRequest, _res: NextResponse) => {
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

    const user = await db.auth.findUser({ email: payload.email });

    if (!user.ok) {
      if (errorIfNotAuthenticated) {
        return sendNextResponse({
          status: 401,
          message: "Unauthorized",
        });
      }
      return CALL_NEXT_FUNCTION;
    }

    if (!req.parsed) {
      req.parsed = {};
    }

    req.parsed.user = user.data;

    return CALL_NEXT_FUNCTION;
  };
};

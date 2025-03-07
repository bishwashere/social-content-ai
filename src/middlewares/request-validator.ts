/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { fromError } from "zod-validation-error";
import { CALL_NEXT_FUNCTION } from "./apply-middleware";
import { ZodTypeAny } from "zod";
import { sendNextResponse } from "@/lib/send-next-response";

export const validateBody = (schema: ZodTypeAny) => {
  return async (req: NextRequest, _res: NextResponse) => {
    try {
      // @ts-expect-error: ....
      if (!req.data) {
        // @ts-expect-error: ....
        req.data = {} as any;
      }
      const body = await req.json();

      if (!req.parsed) {
        req.parsed = {} as any;
      }

      req.parsed.body = schema.parse(body);
      return CALL_NEXT_FUNCTION;
    } catch (e) {
      const message = fromError(e).toString();
      return sendNextResponse({
        status: 422,
        message,
        error: e,
      });
    }
  };
};

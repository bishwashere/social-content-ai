/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { fromError } from "zod-validation-error";
import { CALL_NEXT_FUNCTION } from "./apply-middleware";
import { ZodTypeAny } from "zod";
import { sendNextResponse } from "@/lib/send-next-response";

/**
 * Validates the request body against a schema
 * @param schema - Zod schema to validate the body against
 **/

class RequestValidator {
  validateBody(schema: ZodTypeAny) {
    return async (req: NextRequest) => {
      try {
        // @ts-expect-error: ....
        if (!req.data) {
          // @ts-expect-error: ....
          req.data = {} as any;
        }
        const body = await req.json();

        // @ts-expect-error: ....
        if (!req.parsed) {
          // @ts-expect-error: ....
          req.parsed = {} as any;
        }

        // @ts-expect-error: ....
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
  }
}

export const requestValidator = new RequestValidator();

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Params } from "@/types/api";
import { NextRequest } from "next/server";

interface IMiddlewareFn {
  (req: NextRequest, params: Params): any;
}

export const CALL_NEXT_FUNCTION = "CALL_NEXT_FUNCTION" as const;

/**
 * Apply middlewares to a request and response
 * @param middlewares - List of middlewares to apply
 */
export const applyMiddleware = (...middlewares: IMiddlewareFn[]) => {
  // recursively apply middlewares
  return async (req: NextRequest, params: Params) => {
    const [currentMiddleware, ...remainingMiddlewares] = middlewares;
    if (remainingMiddlewares.length === 0) {
      return currentMiddleware(req, params);
    } else {
      return currentMiddleware(req, params).then((val: any) => {
        if (val === CALL_NEXT_FUNCTION) {
          return applyMiddleware(...remainingMiddlewares)(req, params);
        } else {
          return val;
        }
      });
    }
  };
};

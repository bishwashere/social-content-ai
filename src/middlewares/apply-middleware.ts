/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

interface IMiddlewareFn {
  (req: NextRequest, res: NextResponse): any;
}

export const CALL_NEXT_FUNCTION = "CALL_NEXT_FUNCTION" as const;

export const applyMiddleware = (...middlewares: IMiddlewareFn[]) => {
  // recursively apply middlewares
  return async (req: NextRequest, res: NextResponse) => {
    const [currentMiddleware, ...remainingMiddlewares] = middlewares;
    if (remainingMiddlewares.length === 0) {
      return currentMiddleware(req, res);
    } else {
      return currentMiddleware(req, res).then((val: any) => {
        if (val === CALL_NEXT_FUNCTION) {
          return applyMiddleware(...remainingMiddlewares)(req, res);
        } else {
          return val;
        }
      });
    }
  };
};

import { NextRequest } from "next/server";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/feature-requests
 * Submit a feature request. Works for both authenticated and anonymous users.
 * Body: { message: string, email?: string }
 */
export const POST = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: false }),
  catchApiAsyncError(async (req: NextRequest) => {
    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() || undefined : undefined;

    if (!message || message.length < 3) {
      return sendNextResponse({
        status: 400,
        message: "Please enter at least 3 characters for your feature request.",
      });
    }

    // @ts-expect-error: parsed is set by validateUserAuth
    const user = req.parsed?.user;

    const featureRequest = await prisma.featureRequest.create({
      data: {
        message: message.slice(0, 2000),
        userId: user?.id ?? null,
        email: email ?? user?.email ?? null,
      },
    });

    return sendNextResponse({
      status: 201,
      message: "Thank you! Your feature request has been submitted.",
      data: { id: featureRequest.id },
    });
  })
);

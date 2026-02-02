import { NextRequest } from "next/server";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { prisma } from "@/lib/prisma";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/newsletter-subscribe
 * Subscribe an email to the newsletter. No auth required.
 * Body: { email: string, source?: string }
 */
export const POST = catchApiAsyncError(async (req: NextRequest) => {
  const body = await req.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const source = typeof body.source === "string" ? body.source.slice(0, 50) : "landing";

  if (!email || !EMAIL_REGEX.test(email)) {
    return sendNextResponse({
      status: 400,
      message: "Please enter a valid email address.",
    });
  }

  // Upsert: avoid duplicates, update source if resubscribing
  await prisma.newsletterSubscription.upsert({
    where: { email },
    create: { email, source },
    update: { source },
  });

  return sendNextResponse({
    status: 201,
    message: "Thanks for subscribing! We'll keep you in the loop.",
    data: { subscribed: true },
  });
});

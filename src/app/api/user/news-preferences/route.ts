import { NextRequest } from "next/server";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updatePreferencesSchema = z.object({
  topics: z.array(z.string()).min(1, "At least one topic must be selected"),
});

export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req: NextRequest) => {
    //@ts-expect-error: user is not defined in Request type
    const user = req.parsed.user;

    // Get or create user preferences
    let preferences = await prisma.userNewsPreferences.findUnique({
      where: { userId: user.id },
    });

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await prisma.userNewsPreferences.create({
        data: {
          userId: user.id,
          topics: ["AI", "Technology", "Investing", "Crypto", "Stocks"],
        },
      });
    }

    return sendNextResponse({
      status: 200,
      message: "News preferences retrieved successfully",
      data: preferences,
    });
  })
);

export const PATCH = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req: NextRequest) => {
    //@ts-expect-error: user is not defined in Request type
    const user = req.parsed.user;

    const body = await req.json();
    const validatedData = updatePreferencesSchema.parse(body);

    // Update or create preferences
    const preferences = await prisma.userNewsPreferences.upsert({
      where: { userId: user.id },
      update: {
        topics: validatedData.topics,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        topics: validatedData.topics,
      },
    });

    return sendNextResponse({
      status: 200,
      message: "News preferences updated successfully",
      data: preferences,
    });
  })
);

import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { z } from "zod";

const updateSettingsSchema = z.object({
  guidedTourEnabled: z.boolean().optional(),
});

export const PATCH = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: user is not defined in Request type
    const user = req.parsed.user;

    const body = await req.json();
    const validatedData = updateSettingsSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: validatedData,
      select: {
        id: true,
        guidedTourEnabled: true,
      },
    });

    return sendNextResponse({
      status: 200,
      message: "Settings updated successfully",
      data: updatedUser,
    });
  })
);

export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: user is not defined in Request type
    const user = req.parsed.user;

    const userSettings = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        guidedTourEnabled: true,
      },
    });

    if (!userSettings) {
      return sendNextResponse({
        status: 404,
        message: "User not found",
      });
    }

    return sendNextResponse({
      status: 200,
      message: "Settings retrieved successfully",
      data: userSettings,
    });
  })
);


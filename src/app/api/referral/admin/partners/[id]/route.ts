import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { requestValidator } from "@/middlewares/request-validator";
import { referralValidator, ReferralValidatorType } from "@/validators/referral";
import { validateReferralAuth } from "@/middlewares/validate-referral-auth";
import { hashPassword } from "@/lib/referral";

/**
 * Update a referral partner (super admin only)
 */
export const PUT = applyMiddleware(
  validateReferralAuth({ allowedRoles: ["super_admin"], errorIfNotAuthenticated: true }),
  requestValidator.validateBody(referralValidator.updatePartner),
  catchApiAsyncError(async (req, { params }) => {
    const { id } = params as { id: string };
    //@ts-expect-error: parsed is not defined in Request type
    const updateData = req.parsed.body as ReferralValidatorType["updatePartner"];

    if (!id) {
      return sendNextResponse({
        status: 400,
        message: "Partner ID is required",
      });
    }

    // Check if partner exists
    const existingPartner = await prisma.referralPartner.findUnique({
      where: { id },
    });

    if (!existingPartner) {
      return sendNextResponse({
        status: 404,
        message: "Partner not found",
      });
    }

    // If username is being updated, check if it's available
    if (updateData.username && updateData.username !== existingPartner.username) {
      const usernameExists = await prisma.referralPartner.findUnique({
        where: { username: updateData.username },
      });

      if (usernameExists) {
        return sendNextResponse({
          status: 400,
          message: "Username already exists",
        });
      }
    }

    // Hash password if provided
    const updatePayload: any = { ...updateData };
    if (updateData.password) {
      updatePayload.password = await hashPassword(updateData.password);
    }

    const partner = await prisma.referralPartner.update({
      where: { id },
      data: updatePayload,
    });

    return sendNextResponse({
      status: 200,
      message: "Partner updated successfully",
      data: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        username: partner.username,
        code: partner.code,
        updatedAt: partner.updatedAt,
      },
    });
  })
);

/**
 * Delete a referral partner (super admin only)
 */
export const DELETE = applyMiddleware(
  validateReferralAuth({ allowedRoles: ["super_admin"], errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req, { params }) => {
    const { id } = params as { id: string };

    if (!id) {
      return sendNextResponse({
        status: 400,
        message: "Partner ID is required",
      });
    }

    await prisma.referralPartner.delete({
      where: { id },
    });

    return sendNextResponse({
      status: 200,
      message: "Partner deleted successfully",
    });
  })
);

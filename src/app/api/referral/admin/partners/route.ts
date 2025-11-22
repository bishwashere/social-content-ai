import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { requestValidator } from "@/middlewares/request-validator";
import { referralValidator, ReferralValidatorType } from "@/validators/referral";
import { validateReferralAuth } from "@/middlewares/validate-referral-auth";
import { hashPassword } from "@/lib/referral";
import { generateReferralCode } from "@/lib/referral";

/**
 * Get all referral partners (super admin only)
 */
export const GET = applyMiddleware(
  validateReferralAuth({ allowedRoles: ["super_admin"], errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    const partners = await prisma.referralPartner.findMany({
      include: {
        _count: {
          select: {
            clicks: true,
            signups: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return sendNextResponse({
      status: 200,
      message: "Partners retrieved successfully",
      data: partners.map((partner) => ({
        id: partner.id,
        name: partner.name,
        email: partner.email,
        username: partner.username,
        code: partner.code,
        createdAt: partner.createdAt,
        updatedAt: partner.updatedAt,
        clicks: partner._count.clicks,
        signups: partner._count.signups,
      })),
    });
  })
);

/**
 * Create a new referral partner (super admin only)
 */
export const POST = applyMiddleware(
  validateReferralAuth({ allowedRoles: ["super_admin"], errorIfNotAuthenticated: true }),
  requestValidator.validateBody(referralValidator.createPartner),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: parsed is not defined in Request type
    const { name, email, username, password } = req.parsed
      .body as ReferralValidatorType["createPartner"];

    // Check if username already exists
    const existingPartner = await prisma.referralPartner.findUnique({
      where: { username },
    });

    if (existingPartner) {
      return sendNextResponse({
        status: 400,
        message: "Username already exists",
      });
    }

    // Generate unique referral code (for backward compatibility, but we use username for links)
    let code = generateReferralCode();
    let codeExists = true;
    while (codeExists) {
      const existing = await prisma.referralPartner.findUnique({
        where: { code },
      });
      if (!existing) {
        codeExists = false;
      } else {
        code = generateReferralCode();
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    const partner = await prisma.referralPartner.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        code, // Keep code for backward compatibility
      },
    });

    return sendNextResponse({
      status: 201,
      message: "Partner created successfully",
      data: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        username: partner.username,
        code: partner.code,
        createdAt: partner.createdAt,
      },
    });
  })
);

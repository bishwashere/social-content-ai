import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateReferralAuth } from "@/middlewares/validate-referral-auth";

/**
 * Get overall referral statistics (super admin only)
 */
export const GET = applyMiddleware(
  validateReferralAuth({ allowedRoles: ["super_admin"], errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    const [totalPartners, totalClicks, totalSignups, partnerStats] = await Promise.all([
      prisma.referralPartner.count(),
      prisma.referralClick.count(),
      prisma.referralSignup.count(),
      prisma.referralPartner.findMany({
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
      }),
    ]);

    return sendNextResponse({
      status: 200,
      message: "Statistics retrieved successfully",
      data: {
        totalPartners,
        totalClicks,
        totalSignups,
        conversionRate: totalClicks > 0 ? (totalSignups / totalClicks) * 100 : 0,
        partners: partnerStats.map((partner) => ({
          id: partner.id,
          name: partner.name,
          email: partner.email,
          username: partner.username,
          code: partner.code,
          clicks: partner._count.clicks,
          signups: partner._count.signups,
          conversionRate:
            partner._count.clicks > 0
              ? (partner._count.signups / partner._count.clicks) * 100
              : 0,
          createdAt: partner.createdAt,
        })),
      },
    });
  })
);

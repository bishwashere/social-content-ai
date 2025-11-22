import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateReferralAuth } from "@/middlewares/validate-referral-auth";

/**
 * Get referral partner's own statistics
 */
export const GET = applyMiddleware(
  validateReferralAuth({ allowedRoles: ["referral_partner"], errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: referralAuth is not defined in Request type
    const { referralAuth } = req.parsed;
    const partnerId = referralAuth.userId;

    const partner = await prisma.referralPartner.findUnique({
      where: { id: partnerId },
      include: {
        _count: {
          select: {
            clicks: true,
            signups: true,
          },
        },
        clicks: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10, // Recent clicks
        },
        signups: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!partner) {
      return sendNextResponse({
        status: 404,
        message: "Partner not found",
      });
    }

    // Get base URL from request origin (works for localhost) or env variable
    const requestOrigin = req.headers.get("origin") || req.nextUrl.origin;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || requestOrigin || "https://nextpostai.com";

    return sendNextResponse({
      status: 200,
      message: "Statistics retrieved successfully",
      data: {
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          username: partner.username,
          code: partner.code,
          referralLink: `${baseUrl}/${partner.username}`,
        },
        stats: {
          totalClicks: partner._count.clicks,
          totalSignups: partner._count.signups,
          conversionRate:
            partner._count.clicks > 0
              ? (partner._count.signups / partner._count.clicks) * 100
              : 0,
        },
        recentClicks: partner.clicks.map((click) => ({
          id: click.id,
          ipAddress: click.ipAddress,
          userAgent: click.userAgent,
          createdAt: click.createdAt,
        })),
        signups: partner.signups.map((signup) => ({
          id: signup.id,
          user: signup.user,
          createdAt: signup.createdAt,
        })),
      },
    });
  })
);

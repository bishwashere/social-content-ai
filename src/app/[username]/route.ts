import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Catch-all route handler for referral usernames
 * This ensures referral links like /username redirect to homepage with tracking
 * This is a fallback in case middleware doesn't catch it
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> | { username: string } }
) {
  // Handle both sync and async params (Next.js 15+ uses Promise)
  const resolvedParams = params instanceof Promise ? await params : params;
  const { username } = resolvedParams;

  console.log(`🔍 Checking referral route for username: ${username}`);

  // Skip if it's a known route
  const knownRoutes = [
    "api",
    "project",
    "blogs",
    "referral",
    "privacy",
    "get",
    "try",
    "error",
    "checkout",
    "_next",
    "favicon.ico",
  ];

  if (knownRoutes.includes(username.toLowerCase())) {
    console.log(`⏭️ Skipping known route: ${username}`);
    return NextResponse.next();
  }

  // Check if it's a referral username
  try {
    const partner = await prisma.referralPartner.findUnique({
      where: { username },
    });

    if (!partner) {
      console.log(`❌ No partner found with username: ${username}`);
      // Not a referral username, let Next.js handle 404
      return NextResponse.next();
    }

    console.log(`🔗 Referral link clicked (route handler): ${username} for partner: ${partner.name}`);

    // Track the click
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      req.ip ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Track click (fire and forget - don't block redirect)
    prisma.referralClick
      .create({
        data: {
          referralPartnerId: partner.id,
          ipAddress,
          userAgent,
        },
      })
      .then(() => {
        console.log(`✅ Referral click tracked for partner: ${partner.name} (${username})`);
      })
      .catch((error) => {
        console.error("❌ Error tracking referral click:", error);
      });

    // Get the base URL for redirect
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    const redirectUrl = new URL("/", baseUrl);

    // Set cookie with username and redirect to home
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("referral_username", username, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    console.log(`🔄 Redirecting ${username} to homepage with referral cookie set`);
    return response;
  } catch (error) {
    // If there's an error, let Next.js handle it (will show 404)
    console.error("❌ Error in referral route handler:", error);
    return NextResponse.next();
  }
}

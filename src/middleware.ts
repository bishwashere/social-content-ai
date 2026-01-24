import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware to handle referral link tracking
 * Checks if the path matches a referral username and handles it
 * Referral links are now username-based: nextpostai.com/username
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip API routes, static files, and known routes
  // Normalize pathname (remove trailing slash for comparison)
  const normalizedPath = pathname.endsWith("/") && pathname.length > 1 
    ? pathname.slice(0, -1) 
    : pathname;
  
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") || // Skip files with extensions
    pathname.startsWith("/project") ||
    (pathname.startsWith("/ideas") && !pathname.startsWith("/ideas/admin")) ||
    pathname.startsWith("/referral") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/get") ||
    pathname.startsWith("/try") ||
    pathname.startsWith("/error") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/documentation") ||
    pathname.startsWith("/landing") ||
    pathname.startsWith("/landing-preview") ||
    normalizedPath === "/receive" || // Skip /receive (webhook endpoint, should be /ideas/receive but handle legacy)
    pathname === "/receive" || // Also check original pathname
    pathname === "/" ||
    pathname.length === 0
  ) {
    return NextResponse.next();
  }

  // Check if it's a potential referral username (single segment, 1+ characters)
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1 || segments[0].length < 1) {
    return NextResponse.next();
  }

  const username = segments[0];

  // Additional safety check: skip common paths that might be mistaken for usernames
  const skipPaths = ["receive", "admin", "login", "signup", "dashboard", "settings"];
  if (skipPaths.includes(username.toLowerCase())) {
    return NextResponse.next();
  }

  // Check if it's a referral username by querying the database
  // Only import Prisma here, after all early returns, to avoid Edge Runtime issues
  try {
    const { prisma } = await import("@/lib/prisma");
    const partner = await prisma.referralPartner.findUnique({
      where: { username },
    });

    if (!partner) {
      // Not a referral username, continue with normal routing
      return NextResponse.next();
    }

    console.log(`🔗 Referral link clicked: ${username} for partner: ${partner.name}`);

    // Track the click
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      request.ip ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Track click asynchronously (don't block the redirect)
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
        // Log error but don't fail the redirect
        console.error("❌ Error tracking referral click:", error);
      });

    // Get the base URL for redirect
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
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
    // If there's an error (e.g., Prisma in Edge Runtime), just continue with normal routing
    // Prisma doesn't work in Edge Runtime, so we catch and silently continue
    if (error instanceof Error) {
      const errorMessage = error.message || "";
      if (errorMessage.includes("browser environment") || 
          errorMessage.includes("bundled for the browser") ||
          errorMessage.includes("Edge Runtime") ||
          errorMessage.includes("PrismaClient is unable to run")) {
        // Silently skip - this is expected in Edge Runtime where Prisma doesn't work
        // The route will be handled by Next.js routing normally
        return NextResponse.next();
      }
    }
    // Log other unexpected errors
    console.error("❌ Error in referral middleware:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

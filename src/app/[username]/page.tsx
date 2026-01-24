import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Page component for referral usernames
 * This handles referral links like /username and redirects to homepage with tracking
 */
export default async function UsernamePage({
  params,
}: {
  params: Promise<{ username: string }> | { username: string };
}) {
  // Handle both sync and async params (Next.js 15+ uses Promise)
  const resolvedParams = params instanceof Promise ? await params : params;
  const { username } = resolvedParams;

  // Skip if it's a known route
  const knownRoutes = [
    "api",
    "project",
    "blogs",
    "ideas",
    "referral",
    "privacy",
    "get",
    "try",
    "error",
    "checkout",
    "_next",
    "favicon.ico",
    "landing",
    "landing-preview",
    "documentation",
    "terms",
  ];

  if (knownRoutes.includes(username.toLowerCase())) {
    redirect("/");
  }

  // Check if it's a referral username
  try {
    const partner = await prisma.referralPartner.findUnique({
      where: { username },
    });

    if (!partner) {
      // Not a referral username, redirect to home
      redirect("/");
    }

    // Track the click (fire and forget)
    prisma.referralClick
      .create({
        data: {
          referralPartnerId: partner.id,
          ipAddress: "unknown", // Will be tracked by middleware/route handler
          userAgent: "unknown",
        },
      })
      .catch((error) => {
        console.error("❌ Error tracking referral click:", error);
      });

    // Redirect to home (cookie will be set by middleware or route handler)
    redirect("/");
  } catch (error) {
    // If there's an error, redirect to home
    console.error("❌ Error in username page:", error);
    redirect("/");
  }
}


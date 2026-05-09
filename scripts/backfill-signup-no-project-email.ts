/**
 * Backfill: send SIGNUP_NO_PROJECT email to the 20 most recently signed-up users
 * who have not yet created any project. Sends one email at a time, sequentially.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/backfill-signup-no-project-email.ts
 */

import { mail } from "../src/lib/mail";
import { prisma } from "../src/lib/prisma";

const LIMIT = 20;

async function main() {
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_PRODUCTION_URL ??
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ??
    "";

  const dashboardUrl = `${appBaseUrl}/project`;

  // Global platform stats (fetched once)
  const [totalPostsGenerated, totalProjectsCreated, totalPlatformsConnected, totalUsersActive] =
    await Promise.all([
      prisma.campaignChat.count(),
      prisma.projects.count(),
      prisma.oauthProvider.count(),
      prisma.user.count(),
    ]);

  console.log("Platform stats:", { totalPostsGenerated, totalProjectsCreated, totalPlatformsConnected, totalUsersActive });
  console.log("─".repeat(60));

  // 20 most recently signed-up users who have no projects
  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: LIMIT,
    where: {
      projects: { none: {} },
    },
  });

  console.log(`Found ${recentUsers.length} users with no projects. Starting...\n`);

  let sent = 0;

  for (const user of recentUsers) {
    try {
      await mail.sendTemplate(
        "SIGNUP_NO_PROJECT",
        {
          name: user.name,
          dashboardUrl,
          platformStats: {
            totalPostsGenerated,
            totalProjectsCreated,
            totalPlatformsConnected,
            totalUsersActive,
          },
        },
        {
          subject: `${user.name.split(" ")[0]}, your first project is one click away`,
          to: [user.email],
        }
      );

      sent++;
      console.log(`[${sent.toString().padStart(2, "0")}] Sent → ${user.email}`);
    } catch (err) {
      console.error(`[ERR] ${user.email} — ${(err as Error).message}`);
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log(`Done. Sent: ${sent}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await prisma.$disconnect();
  process.exit(1);
});

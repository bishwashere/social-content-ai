/**
 * Backfill: send FIRST_PROJECT_CREATED email to the 20 most recently signed-up users.
 * Sends one email at a time, sequentially.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/backfill-first-project-email.ts
 */

import { mail } from "../src/lib/mail";
import { prisma } from "../src/lib/prisma";
import { logEmail } from "../src/lib/log-email";

const LIMIT = 20;

async function main() {
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_PRODUCTION_URL ??
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ??
    "";

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

  // 20 most recently signed-up users
  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: LIMIT,
  });

  console.log(`Found ${recentUsers.length} recent users. Starting...\n`);

  let sent = 0;
  let skipped = 0;

  for (const user of recentUsers) {
    // Pick the user's very first project (earliest created)
    const firstProject = await prisma.projects.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    if (!firstProject) {
      console.log(`[SKIP] ${user.email} — no projects yet`);
      skipped++;
      continue;
    }

    // Guardrail: skip if this template was already sent to this user
    const alreadySent = await prisma.emailLog.findFirst({
      where: { userId: user.id, template: "FIRST_PROJECT_CREATED" },
    });
    if (alreadySent) {
      console.log(`[SKIP] ${user.email} — already sent on ${alreadySent.sentAt.toISOString().slice(0, 10)}`);
      skipped++;
      continue;
    }

    const projectUrl = `${appBaseUrl}/project/${firstProject.id}`;
    const subject = `You just launched "${firstProject.name}". Here's what to do next`;

    try {
      await mail.sendTemplate(
        "FIRST_PROJECT_CREATED",
        {
          name: user.name,
          projectName: firstProject.name,
          projectUrl,
          platformStats: {
            totalPostsGenerated,
            totalProjectsCreated,
            totalPlatformsConnected,
            totalUsersActive,
          },
        },
        { subject, to: [user.email] }
      );

      await logEmail({
        userId: user.id,
        email: user.email,
        template: "FIRST_PROJECT_CREATED",
        subject,
        trigger: "manual_backfill",
        meta: { projectId: firstProject.id, projectName: firstProject.name },
      });

      sent++;
      console.log(`[${sent.toString().padStart(2, "0")}] Sent → ${user.email} | "${firstProject.name}"`);
    } catch (err) {
      console.error(`[ERR] ${user.email} — ${(err as Error).message}`);
    }
  }

  console.log("\n" + "─".repeat(60));
  console.log(`Done. Sent: ${sent} | Skipped (no project): ${skipped}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await prisma.$disconnect();
  process.exit(1);
});

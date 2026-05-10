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
import { buildTrackedUrl } from "../src/lib/email-tracking";

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

  // Exclude users already emailed for this template
  const alreadyEmailedIds = (
    await prisma.emailLog.findMany({
      where: { template: "FIRST_PROJECT_CREATED" },
      select: { userId: true },
    })
  ).map((r) => r.userId);

  // Next batch: users with at least one project, not yet emailed
  // (exact count of 1 is verified per-user in the loop below)
  const recentUsers = await prisma.user.findMany({
    where: {
      projects: { some: {} },
      id: { notIn: alreadyEmailedIds },
    },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
  });

  console.log(`Found ${recentUsers.length} candidates. Starting...\n`);

  let sent = 0;
  let skipped = 0;

  for (const user of recentUsers) {
    // Condition: user must have exactly 1 project (their very first — mirrors live trigger)
    const projectCount = await prisma.projects.count({ where: { userId: user.id } });
    if (projectCount !== 1) {
      console.log(`[SKIP] ${user.email} — has ${projectCount} projects (not exactly 1)`);
      skipped++;
      continue;
    }

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

    const projectUrl = buildTrackedUrl(`${appBaseUrl}/project/${firstProject.id}`, "FIRST_PROJECT_CREATED");
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

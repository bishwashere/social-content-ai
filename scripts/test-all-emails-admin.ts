/**
 * Admin test: force-send all 3 email templates to bishwashere@gmail.com.
 * Bypasses all guards (one-time checks, recent-user filters, email log).
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/test-all-emails-admin.ts
 */

import { mail } from "../src/lib/mail";
import { prisma } from "../src/lib/prisma";

const TO = "bishwashere@gmail.com";

async function main() {
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_PRODUCTION_URL ?? "";

  const user = await prisma.user.findUnique({ where: { email: TO } });
  if (!user) throw new Error(`No user found with email ${TO}`);

  const firstProject = await prisma.projects.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  const [totalPostsGenerated, totalProjectsCreated, totalPlatformsConnected, totalUsersActive] =
    await Promise.all([
      prisma.campaignChat.count(),
      prisma.projects.count(),
      prisma.oauthProvider.count(),
      prisma.user.count(),
    ]);

  const platformStats = { totalPostsGenerated, totalProjectsCreated, totalPlatformsConnected, totalUsersActive };

  console.log(`User: ${user.name} (${user.email})`);
  console.log(`Stats:`, platformStats);
  console.log("─".repeat(60));

  // 1. FIRST_PROJECT_CREATED
  if (firstProject) {
    const projectUrl = `${appBaseUrl}/project/${firstProject.id}`;
    const subject = `You just launched "${firstProject.name}". Here's what to do next`;
    await mail.sendTemplate(
      "FIRST_PROJECT_CREATED",
      { name: user.name, projectName: firstProject.name, projectUrl, platformStats },
      { subject, to: [TO] }
    );
    console.log(`[1/3] Sent FIRST_PROJECT_CREATED — "${firstProject.name}"`);
  } else {
    console.log(`[1/3] Skipped FIRST_PROJECT_CREATED — no projects found`);
  }

  // 2. SIGNUP_NO_PROJECT
  const noProjectSubject = `${user.name.split(" ")[0]}, your first project is one click away`;
  await mail.sendTemplate(
    "SIGNUP_NO_PROJECT",
    { name: user.name, dashboardUrl: `${appBaseUrl}/project`, platformStats },
    { subject: noProjectSubject, to: [TO] }
  );
  console.log(`[2/3] Sent SIGNUP_NO_PROJECT`);

  // 3. INACTIVE_PROJECTS
  const contentCount = await prisma.campaignChat.count({
    where: { planner: { project: { userId: user.id } } },
  });
  const connectedPlatforms = await prisma.oauthProvider.findMany({
    where: { userId: user.id },
    select: { platform: true },
    distinct: ["platform"],
  });
  const allProjects = await prisma.projects.findMany({ where: { userId: user.id } });

  await mail.sendTemplate(
    "INACTIVE_PROJECTS",
    {
      name: user.name,
      dashboardUrl: `${appBaseUrl}/project`,
      stats: {
        projectCount: allProjects.length,
        platformCount: connectedPlatforms.length,
        contentCount,
      },
    },
    { subject: `Your content is waiting for you`, to: [TO] }
  );
  console.log(`[3/3] Sent INACTIVE_PROJECTS`);

  console.log("─".repeat(60));
  console.log("All 3 emails sent to", TO);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Error:", err);
  await prisma.$disconnect();
  process.exit(1);
});

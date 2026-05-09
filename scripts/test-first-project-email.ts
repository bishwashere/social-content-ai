/**
 * Test script: send a FIRST_PROJECT_CREATED email to a given address.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/test-first-project-email.ts
 */

import { mail } from "../src/lib/mail";
import { prisma } from "../src/lib/prisma";

const TO = "bishwashere@gmail.com";

async function main() {
  // Load the real user from the DB
  const user = await prisma.user.findUnique({ where: { email: TO } });
  if (!user) throw new Error(`No user found with email ${TO}`);

  // Pick the most recently updated project owned by this user
  const project = await prisma.projects.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  if (!project) throw new Error(`No projects found for user ${TO}`);

  console.log(`User : ${user.name} (${user.email})`);
  console.log(`Project: ${project.name} (${project.id})`);

  // Guard: never send this template twice to the same user
  const alreadySent = await prisma.emailLog.findFirst({
    where: { userId: user.id, template: "FIRST_PROJECT_CREATED" },
  });
  if (alreadySent) {
    console.log(`Already sent FIRST_PROJECT_CREATED to ${TO} on ${alreadySent.sentAt.toISOString()}. Skipping.`);
    await prisma.$disconnect();
    return;
  }

  // Real platform stats
  const [totalPostsGenerated, totalProjectsCreated, totalPlatformsConnected, totalUsersActive] =
    await Promise.all([
      prisma.campaignChat.count(),
      prisma.projects.count(),
      prisma.oauthProvider.count(),
      prisma.user.count(),
    ]);

  console.log("Stats:", { totalPostsGenerated, totalProjectsCreated, totalPlatformsConnected, totalUsersActive });

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_PRODUCTION_URL ?? process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ?? "";
  const projectUrl = `${appBaseUrl}/project/${project.id}`;

  console.log(`Project URL: ${projectUrl}`);
  console.log(`Sending email to ${TO}...`);

  await mail.sendTemplate(
    "FIRST_PROJECT_CREATED",
    {
      name: user.name,
      projectName: project.name,
      projectUrl,
      platformStats: {
        totalPostsGenerated,
        totalProjectsCreated,
        totalPlatformsConnected,
        totalUsersActive,
      },
    },
    {
      subject: `You just launched "${project.name}". Here's what to do next`,
      to: [TO],
    }
  );

  await prisma.emailLog.create({
    data: {
      userId: user.id,
      email: user.email,
      template: "FIRST_PROJECT_CREATED",
      subject: `You just launched "${project.name}". Here's what to do next`,
      trigger: "test",
      meta: { projectId: project.id, projectName: project.name },
    },
  });

  console.log("Email sent and logged successfully!");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Failed to send email:", err);
  await prisma.$disconnect();
  process.exit(1);
});

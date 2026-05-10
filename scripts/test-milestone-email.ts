/**
 * Admin test: send all 3 milestone variants to bishwashere@gmail.com.
 * No guards. No DB checks.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/test-milestone-email.ts
 */

import { mail } from "../src/lib/mail";
import { prisma } from "../src/lib/prisma";
import type { MilestoneType } from "../src/components/email-templates/milestone-reached";

// ─── SAFETY: test scripts may only send to a single, pre-approved address ───
const ALLOWED_TEST_EMAIL = "bishwashere@gmail.com";
const TO = "bishwashere@gmail.com";

if (!TO || TO.trim() === "") throw new Error("TEST BLOCKED: TO address is empty.");
if (TO !== ALLOWED_TEST_EMAIL) throw new Error(`TEST BLOCKED: "${TO}" is not the approved test address.`);
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_PRODUCTION_URL ?? "";

  const user = await prisma.user.findUnique({ where: { email: TO } });
  if (!user) throw new Error(`No user found with email ${TO}`);

  const firstProject = await prisma.projects.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  const projectName = firstProject?.name ?? "My Project";
  const dashboardUrl = firstProject
    ? `${appBaseUrl}/project/${firstProject.id}`
    : `${appBaseUrl}/project`;

  const userStats = {
    totalPosts: await prisma.campaignChat.count({
      where: { planner: { project: { userId: user.id } } },
    }),
    totalImpressions: 4820,
    totalCampaigns: await prisma.campaignPlanner.count({
      where: { project: { userId: user.id } },
    }),
  };

  console.log(`User   : ${user.name}`);
  console.log(`Project: ${projectName}`);
  console.log(`Stats  :`, userStats);
  console.log("─".repeat(60));

  const milestones: { type: MilestoneType; value: number; subject: string }[] = [
    { type: "posts",       value: 10,   subject: `You just hit 10 posts. Keep it going, ${user.name.split(" ")[0]}` },
    { type: "impressions", value: 1000, subject: `1,000 impressions and counting, ${user.name.split(" ")[0]}` },
    { type: "campaign",    value: 1,    subject: `Campaign complete. Here's what you built, ${user.name.split(" ")[0]}` },
  ];

  for (const { type, value, subject } of milestones) {
    await mail.sendTemplate(
      "MILESTONE_REACHED",
      { name: user.name, milestoneType: type, milestoneValue: value, projectName, userStats, dashboardUrl },
      { subject, to: [TO] }
    );
    console.log(`[SENT] ${type} variant`);
  }

  console.log("─".repeat(60));
  console.log("All 3 milestone variants sent to", TO);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

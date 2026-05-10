/**
 * Dry-run: mirrors the exact logic of both backfill scripts.
 * No emails are sent. Shows who would be sent to and who would be skipped, and why.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/dry-run-backfills.ts
 */

import { prisma } from "../src/lib/prisma";

const LIMIT = 20;

async function main() {

  // ── FIRST_PROJECT_CREATED ──────────────────────────────────────────────────
  console.log("\n" + "═".repeat(65));
  console.log("FIRST_PROJECT_CREATED backfill — dry run");
  console.log("Condition: exactly 1 project + never received this template");
  console.log("═".repeat(65));

  const fpAlreadyEmailedIds = (
    await prisma.emailLog.findMany({
      where: { template: "FIRST_PROJECT_CREATED" },
      select: { userId: true },
    })
  ).map((r) => r.userId);

  const fpCandidates = await prisma.user.findMany({
    where: {
      projects: { some: {} },
      id: { notIn: fpAlreadyEmailedIds },
    },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
  });

  let fpWillSend = 0;
  let fpSkipped = 0;

  for (const user of fpCandidates) {
    const projectCount = await prisma.projects.count({ where: { userId: user.id } });

    if (projectCount !== 1) {
      console.log(`  [SKIP] ${user.email} — has ${projectCount} projects (need exactly 1)`);
      fpSkipped++;
      continue;
    }

    const alreadySent = await prisma.emailLog.findFirst({
      where: { userId: user.id, template: "FIRST_PROJECT_CREATED" },
    });
    if (alreadySent) {
      console.log(`  [SKIP] ${user.email} — already sent on ${alreadySent.sentAt.toISOString().slice(0, 10)}`);
      fpSkipped++;
      continue;
    }

    const project = await prisma.projects.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    fpWillSend++;
    console.log(`  [SEND] ${user.email} | project: "${project?.name}"`);
  }

  console.log(`\n  Result: ${fpWillSend} would be sent | ${fpSkipped} would be skipped\n`);

  // ── SIGNUP_NO_PROJECT ──────────────────────────────────────────────────────
  console.log("═".repeat(65));
  console.log("SIGNUP_NO_PROJECT backfill — dry run");
  console.log("Condition: 0 projects + never received this template");
  console.log("═".repeat(65));

  const snpAlreadyEmailedIds = (
    await prisma.emailLog.findMany({
      where: { template: "SIGNUP_NO_PROJECT" },
      select: { userId: true },
    })
  ).map((r) => r.userId);

  const snpCandidates = await prisma.user.findMany({
    where: {
      projects: { none: {} },
      id: { notIn: snpAlreadyEmailedIds },
    },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
  });

  let snpWillSend = 0;
  let snpSkipped = 0;

  for (const user of snpCandidates) {
    const alreadySent = await prisma.emailLog.findFirst({
      where: { userId: user.id, template: "SIGNUP_NO_PROJECT" },
    });
    if (alreadySent) {
      console.log(`  [SKIP] ${user.email} — already sent on ${alreadySent.sentAt.toISOString().slice(0, 10)}`);
      snpSkipped++;
      continue;
    }

    snpWillSend++;
    console.log(`  [SEND] ${user.email}`);
  }

  console.log(`\n  Result: ${snpWillSend} would be sent | ${snpSkipped} would be skipped\n`);

  console.log("═".repeat(65));
  console.log(`TOTAL: ${fpWillSend + snpWillSend} emails would go out if backfills are run now.`);
  console.log("═".repeat(65) + "\n");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

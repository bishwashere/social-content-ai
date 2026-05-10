/**
 * Analysis only — no emails sent.
 * Shows the next 20 users (excluding already-emailed ones) in both categories,
 * with their signup date and age.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/analyze-next-batch.ts
 */

import { prisma } from "../src/lib/prisma";

const NOW = new Date();

function ageLabel(date: Date): string {
  const diffMs = NOW.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

async function main() {
  // IDs of users already emailed in either category
  const alreadyEmailed = await prisma.emailLog.findMany({
    where: { template: { in: ["FIRST_PROJECT_CREATED", "SIGNUP_NO_PROJECT"] } },
    select: { userId: true, template: true },
  });

  const emailedFirstProject = new Set(
    alreadyEmailed.filter(e => e.template === "FIRST_PROJECT_CREATED").map(e => e.userId)
  );
  const emailedNoProject = new Set(
    alreadyEmailed.filter(e => e.template === "SIGNUP_NO_PROJECT").map(e => e.userId)
  );

  // ── Category 1: Users with EXACTLY 1 project, not yet emailed ──────────────
  // Fetch candidates (has at least 1 project, not yet emailed), then filter to exactly 1
  const candidates = await prisma.user.findMany({
    where: {
      projects: { some: {} },
      id: { notIn: [...emailedFirstProject] },
    },
    orderBy: { createdAt: "desc" },
    take: 60, // fetch extra so we still get 20 after filtering
    select: { id: true, name: true, email: true, createdAt: true },
  });

  const withProjects: typeof candidates = [];
  for (const u of candidates) {
    if (withProjects.length >= 20) break;
    const count = await prisma.projects.count({ where: { userId: u.id } });
    if (count === 1) withProjects.push(u);
  }

  console.log(`\n${"─".repeat(70)}`);
  console.log(`NEXT 20 — Exactly 1 project, not yet emailed (FIRST_PROJECT_CREATED)`);
  console.log(`${"─".repeat(70)}`);

  if (withProjects.length === 0) {
    console.log("None found.");
  } else {
    withProjects.forEach((u, i) => {
      console.log(
        `${String(i + 1).padStart(2)}. ${u.email.padEnd(42)} signed up ${ageLabel(u.createdAt)}  (${u.createdAt.toISOString().slice(0, 10)})`
      );
    });
  }

  // ── Category 2: Users WITHOUT projects, not yet emailed ─────────────────────
  const withoutProjects = await prisma.user.findMany({
    where: {
      projects: { none: {} },
      id: { notIn: [...emailedNoProject] },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, name: true, email: true, createdAt: true },
  });

  console.log(`\n${"─".repeat(70)}`);
  console.log(`NEXT 20 — No project yet, not yet emailed (SIGNUP_NO_PROJECT)`);
  console.log(`${"─".repeat(70)}`);

  if (withoutProjects.length === 0) {
    console.log("None found.");
  } else {
    withoutProjects.forEach((u, i) => {
      console.log(
        `${String(i + 1).padStart(2)}. ${u.email.padEnd(42)} signed up ${ageLabel(u.createdAt)}  (${u.createdAt.toISOString().slice(0, 10)})`
      );
    });
  }

  console.log(`\nSummary: ${withProjects.length} with project | ${withoutProjects.length} without project\n`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

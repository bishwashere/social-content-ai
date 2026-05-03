/**
 * One-time fix: restore correct startDate for campaigns whose startDate was
 * incorrectly set to today (May 2026) by schedule-backfilled-campaigns-this-month.ts.
 *
 * That script did: `startDate = today` on campaigns it processed.
 * The campaign NAME encodes the intended month ("... April 2026", "... March 2026", etc.)
 * because it was set by the clone script using `format(startDate, "MMMM yyyy")`.
 *
 * Fix logic:
 *   1. Find every campaign whose startDate falls in May 2026.
 *   2. Parse the month + year from the campaign name.
 *   3. If the name-month is NOT May 2026, the startDate was corrupted.
 *      → Reset startDate to the 1st of the name-month / year.
 *   4. If the name contains no recognisable month, flag it for manual review
 *      so nothing is touched without human confirmation.
 *
 * Optional env vars:
 *   DRY_RUN=true   (default) — preview only, no writes.
 *   DRY_RUN=false             — actually update the database.
 *
 * Usage:
 *   DRY_RUN=true  npx tsx scripts/fix-campaign-start-dates-may.ts
 *   DRY_RUN=false npx tsx scripts/fix-campaign-start-dates-may.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN !== "false"; // default: true

// Month name → 0-based index
const MONTH_MAP: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3,
  may: 4, june: 5, july: 6, august: 7,
  september: 8, october: 9, november: 10, december: 11,
};

/**
 * Attempt to extract "Month YYYY" from the end (or anywhere) of the name.
 * Returns { month: 0-based, year } or null.
 */
function parseMonthYear(name: string | null | undefined): { month: number; year: number } | null {
  if (!name) return null;

  // Pattern: "Month YYYY" anywhere in the name (case-insensitive)
  const match = name.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i);
  if (!match) return null;

  const month = MONTH_MAP[match[1].toLowerCase()];
  const year = parseInt(match[2], 10);
  return { month, year };
}

async function main() {
  console.log("=".repeat(60));
  console.log("Fix: restore campaign startDates incorrectly set to May 2026");
  console.log(`DRY_RUN : ${DRY_RUN}`);
  console.log("=".repeat(60));

  // ── 1. All campaigns with startDate in May 2026 ──────────────────────────
  const mayStart = new Date(Date.UTC(2026, 4, 1, 0, 0, 0, 0));  // 2026-05-01
  const mayEnd   = new Date(Date.UTC(2026, 5, 1, 0, 0, 0, 0));  // 2026-06-01 (exclusive)

  const campaigns = await prisma.campaignPlanner.findMany({
    where: {
      startDate: { gte: mayStart, lt: mayEnd },
    },
    select: {
      id: true,
      projectId: true,
      name: true,
      startDate: true,
      totalDays: true,
      chats: {
        select: { id: true, day: true, title: true, contents: true },
        orderBy: { day: "asc" },
        take: 3, // just enough for manual-review output
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  console.log(`\nCampaigns with startDate in May 2026 : ${campaigns.length}\n`);

  // Manual overrides for campaigns whose name has no parseable month.
  // Key: campaign id, value: correct startDate (UTC midnight).
  const MANUAL_OVERRIDES: Record<string, Date> = {
    "68adae97488f5af3ad0872e5": new Date(Date.UTC(2025, 8, 1, 0, 0, 0, 0)), // Sep Plan -> remote work → 2025-09-01
  };

  let fixed = 0;
  let skippedMayOk = 0;
  let needsManualReview: typeof campaigns = [];

  for (const c of campaigns) {
    const parsed = parseMonthYear(c.name);

    if (!parsed) {
      // Check manual override first
      if (MANUAL_OVERRIDES[c.id]) {
        const correctStart = MANUAL_OVERRIDES[c.id];
        const correctStr   = correctStart.toISOString().split("T")[0];
        const currentStr   = c.startDate!.toISOString().split("T")[0];
        console.log(`  FIX  "${c.name}" (${c.id.slice(-6)}) [manual override]`);
        console.log(`       project  : ${c.projectId}`);
        console.log(`       current  : ${currentStr}  →  correct: ${correctStr}`);
        if (!DRY_RUN) {
          await prisma.campaignPlanner.update({ where: { id: c.id }, data: { startDate: correctStart } });
          console.log(`       ✓ updated`);
        } else {
          console.log(`       [DRY_RUN] would set startDate = ${correctStr}`);
        }
        fixed++;
        continue;
      }
      // Cannot determine correct month from name — flag for manual review
      needsManualReview.push(c);
      continue;
    }

    const { month, year } = parsed;

    // Is the name month already May 2026? → campaign is legitimately in May, leave it.
    if (month === 4 && year === 2026) {
      console.log(`  OK   "${c.name}" (${c.id.slice(-6)}) — name says May 2026, startDate correct`);
      skippedMayOk++;
      continue;
    }

    // Compute correct startDate: 1st of the name-month/year at midnight UTC
    const correctStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    const correctStr   = correctStart.toISOString().split("T")[0];
    const currentStr   = c.startDate!.toISOString().split("T")[0];

    console.log(`  FIX  "${c.name}" (${c.id.slice(-6)})`);
    console.log(`       project  : ${c.projectId}`);
    console.log(`       current  : ${currentStr}  →  correct: ${correctStr}`);

    if (!DRY_RUN) {
      await prisma.campaignPlanner.update({
        where: { id: c.id },
        data: { startDate: correctStart },
      });
      console.log(`       ✓ updated`);
    } else {
      console.log(`       [DRY_RUN] would set startDate = ${correctStr}`);
    }

    fixed++;
  }

  // ── Manual-review section ─────────────────────────────────────────────────
  if (needsManualReview.length > 0) {
    console.log("\n" + "─".repeat(60));
    console.log("NEEDS MANUAL REVIEW — could not infer month from name:");
    for (const c of needsManualReview) {
      console.log(`\n  id      : ${c.id}`);
      console.log(`  name    : ${c.name ?? "(null)"}`);
      console.log(`  project : ${c.projectId}`);
      console.log(`  startDate (current / wrong): ${c.startDate?.toISOString().split("T")[0]}`);
      console.log(`  days    : ${c.totalDays ?? c.chats.length}`);
      if (c.chats.length > 0) {
        const snippet = c.chats[0].title || Object.values((c.chats[0].contents as Record<string,string>) || {})[0] || "";
        if (snippet) console.log(`  day1 hint: "${snippet.slice(0, 120)}"`);
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log(`Campaigns fixed            : ${fixed}`);
  console.log(`Campaigns correct (May OK) : ${skippedMayOk}`);
  console.log(`Needs manual review        : ${needsManualReview.length}`);
  if (DRY_RUN) {
    console.log("\nDRY_RUN=true — run with DRY_RUN=false to apply changes.");
  }
  console.log("=".repeat(60));
}

main()
  .catch((err) => { console.error("Script failed:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());

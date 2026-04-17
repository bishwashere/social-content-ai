/**
 * Backfill remaining (ungenerated) days for a campaign planner.
 *
 * Uses the exact same generation logic as the Next.js server action so you can
 * verify that content, placeholder tokens, and platform output look correct
 * before trusting new campaigns to run on their own.
 *
 * Usage:
 *
 *   # Generate all pending days for a campaign
 *   CAMPAIGN_ID=<id> npx tsx scripts/backfill-campaign-days.ts
 *
 *   # Only process days 3 through 7
 *   CAMPAIGN_ID=<id> START_DAY=3 END_DAY=7 npx tsx scripts/backfill-campaign-days.ts
 *
 *   # Dry-run: preview the assembled AI prompt without calling the AI or writing to DB
 *   CAMPAIGN_ID=<id> DRY_RUN=true npx tsx scripts/backfill-campaign-days.ts
 *
 *   # Control the pause between days (default 2000 ms) to avoid rate limits
 *   CAMPAIGN_ID=<id> DELAY_MS=3000 npx tsx scripts/backfill-campaign-days.ts
 *
 * Notes:
 *  - Coins are NOT deducted (skipCoinCheck=true) — this is an admin operation.
 *  - Days already in GENERATED status are skipped automatically.
 *  - Pass CAMPAIGN_ID as first positional arg if you prefer:
 *      npx tsx scripts/backfill-campaign-days.ts <campaign-id>
 */

import { prisma } from "../src/lib/prisma";
import { runCampaignDayGeneration } from "../src/lib/campaign-utils";

// ---------------------------------------------------------------------------
// Config (env vars or positional args)
// ---------------------------------------------------------------------------

const CAMPAIGN_ID: string = process.env.CAMPAIGN_ID || process.argv[2] || "";
const START_DAY: number | undefined = process.env.START_DAY
  ? parseInt(process.env.START_DAY, 10)
  : undefined;
const END_DAY: number | undefined = process.env.END_DAY
  ? parseInt(process.env.END_DAY, 10)
  : undefined;
const DRY_RUN: boolean = process.env.DRY_RUN === "true";
const DELAY_MS: number = parseInt(process.env.DELAY_MS || "2000", 10);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sep(char = "─", len = 70) {
  return char.repeat(len);
}

function previewText(text: string, maxLen = 120) {
  const oneLine = text.replace(/\n/g, " ").trim();
  return oneLine.length > maxLen ? oneLine.slice(0, maxLen) + "…" : oneLine;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!CAMPAIGN_ID) {
    console.error("ERROR: No CAMPAIGN_ID provided.");
    console.error("");
    console.error(
      "  Usage: CAMPAIGN_ID=<id> npx tsx scripts/backfill-campaign-days.ts"
    );
    console.error("  Or:    npx tsx scripts/backfill-campaign-days.ts <id>");
    process.exit(1);
  }

  console.log(`\n${sep("=")}`);
  console.log(`Campaign Day Backfill${DRY_RUN ? "  [DRY RUN — no AI calls, no DB writes]" : ""}`);
  console.log(sep("="));
  console.log(`Campaign ID  : ${CAMPAIGN_ID}`);
  if (START_DAY !== undefined) console.log(`Start Day    : ${START_DAY}`);
  if (END_DAY !== undefined) console.log(`End Day      : ${END_DAY}`);
  console.log(`Dry Run      : ${DRY_RUN}`);
  console.log(`Delay (ms)   : ${DELAY_MS}`);
  console.log(`${sep("=")}\n`);

  // Load campaign
  const campaign = await prisma.campaignPlanner.findUnique({
    where: { id: CAMPAIGN_ID },
    include: { chats: { orderBy: { day: "asc" } } },
  });

  if (!campaign) {
    console.error(`ERROR: Campaign not found: ${CAMPAIGN_ID}`);
    console.error("");
    console.error("Tip: run this script with any argument to list all campaigns:");
    console.error("  npx tsx scripts/find-campaign-by-id.ts");
    process.exit(1);
  }

  console.log(`Campaign : ${campaign.name || "(unnamed)"}`);
  console.log(`Project  : ${campaign.projectId}`);
  console.log(`Total days defined : ${campaign.chats.length}\n`);

  // Resolve project owner (used as userId so the generation has a valid user context)
  const project = await prisma.projects.findUnique({
    where: { id: campaign.projectId },
  });
  if (!project) {
    console.error("ERROR: Project not found");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({ where: { id: project.userId } });
  if (!user) {
    console.error("ERROR: Owner user not found for project");
    process.exit(1);
  }

  console.log(`User     : ${user.name || user.email} (${user.id})`);
  console.log(`Coins    : ${user.remainingChatGenerations} (not deducted by this script)\n`);

  // Filter to pending days within optional range
  const chatsToProcess = campaign.chats.filter((chat) => {
    if (chat.status === "GENERATED") return false;
    if (START_DAY !== undefined && chat.day < START_DAY) return false;
    if (END_DAY !== undefined && chat.day > END_DAY) return false;
    return true;
  });

  const alreadyDone = campaign.chats.filter((c) => c.status === "GENERATED").length;

  console.log(`Already generated : ${alreadyDone}`);
  console.log(`To process        : ${chatsToProcess.length}`);

  if (chatsToProcess.length === 0) {
    console.log("\nNothing to do — all days are already generated.");
    return;
  }

  console.log(
    `Days              : ${chatsToProcess.map((c) => c.day).join(", ")}\n`
  );

  // ---------------------------------------------------------------------------
  // Process days one at a time
  // ---------------------------------------------------------------------------

  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < chatsToProcess.length; i++) {
    const chat = chatsToProcess[i];
    console.log(`${sep()} Day ${chat.day} (${i + 1}/${chatsToProcess.length})`);

    const result = await runCampaignDayGeneration({
      projectId: campaign.projectId,
      campaignId: CAMPAIGN_ID,
      userId: user.id,
      day: chat.day,
      prompt: "",           // no extra prompt override — mirrors normal campaign behaviour
      productRelated: true,
      skipCoinCheck: true,  // admin script: no coin deduction
      dryRun: DRY_RUN,
      skipTextCard: DRY_RUN, // skip S3 image upload in dry-run
    });

    if (!result.success) {
      failed++;
      console.error(`  FAILED: ${result.message}`);
      if ((result as any).insufficientCoins) {
        console.error("  Stopping early: insufficient coins.");
        break;
      }
      continue;
    }

    succeeded++;

    if (DRY_RUN && result.dryRunPrompt !== undefined) {
      console.log("  [DRY RUN] Assembled prompt preview:");
      const preview = result.dryRunPrompt.slice(0, 400);
      preview.split("\n").forEach((line) => console.log(`    ${line}`));
      if (result.dryRunPrompt.length > 400) console.log("    …(truncated)");
    } else if (result.content) {
      for (const [platform, text] of Object.entries(result.content)) {
        console.log(`  ${platform.padEnd(12)}: ${previewText(text)}`);
      }
    }

    console.log();

    // Pause between days to respect AI rate limits
    if (!DRY_RUN && i < chatsToProcess.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------

  console.log(sep("="));
  console.log(
    `Done.  Succeeded: ${succeeded}  |  Failed: ${failed}  |  Total: ${chatsToProcess.length}`
  );
  console.log(sep("="));
  console.log();
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

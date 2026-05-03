/**
 * Find projects with more than 1 campaign active in May 2026.
 * A campaign is "active in May" if:
 *   - Its startDate falls within May 2026, OR
 *   - It was created in May 2026 (no startDate set), OR
 *   - It started before May but its duration (startDate + totalDays) extends into May
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MAY_START = new Date("2026-05-01T00:00:00.000Z");
const MAY_END = new Date("2026-06-01T00:00:00.000Z"); // exclusive

function isActiveInMay(startDate: Date | null, totalDays: number | null, createdAt: Date): boolean {
  if (!startDate) {
    // No startDate — use createdAt to determine
    return createdAt >= MAY_START && createdAt < MAY_END;
  }
  // Starts after May ends → not in May
  if (startDate >= MAY_END) return false;
  // Starts in May → yes
  if (startDate >= MAY_START) return true;
  // Started before May — check if it extends into May
  if (totalDays && totalDays > 0) {
    const endDate = new Date(startDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
    return endDate > MAY_START;
  }
  // No totalDays info — assume short campaign, not active in May
  return false;
}

async function main() {
  // Fetch all campaigns that could potentially overlap May 2026
  const allCandidates = await prisma.campaignPlanner.findMany({
    where: {
      OR: [
        { startDate: { gte: MAY_START, lt: MAY_END } },
        { AND: [{ startDate: null }, { createdAt: { gte: MAY_START, lt: MAY_END } }] },
        { startDate: { lt: MAY_START } }, // started before May, check duration in code
      ],
    },
    select: {
      id: true,
      name: true,
      projectId: true,
      startDate: true,
      totalDays: true,
      createdAt: true,
      project: { select: { name: true } },
    },
    orderBy: { projectId: "asc" },
  });

  // Filter to only those actually active in May
  const campaigns = allCandidates.filter((c) =>
    isActiveInMay(c.startDate, c.totalDays, c.createdAt)
  );

  // Group by project
  const byProject = new Map<string, typeof campaigns>();
  for (const c of campaigns) {
    if (!byProject.has(c.projectId)) byProject.set(c.projectId, []);
    byProject.get(c.projectId)!.push(c);
  }

  console.log(`\nTotal campaigns active in May 2026: ${campaigns.length}`);
  console.log(`Across ${byProject.size} projects\n`);

  const multiCampaignProjects: {
    projectId: string;
    projectName: string;
    count: number;
    campaigns: typeof campaigns;
  }[] = [];

  for (const [projectId, cList] of byProject) {
    if (cList.length > 1) {
      multiCampaignProjects.push({
        projectId,
        projectName: cList[0].project?.name ?? "Unknown",
        count: cList.length,
        campaigns: cList,
      });
    }
  }

  if (multiCampaignProjects.length === 0) {
    console.log("✅ No projects have more than 1 campaign active in May 2026.\n");
    // Show all single-campaign projects for reference
    console.log("Projects with exactly 1 May campaign:");
    for (const [, cList] of byProject) {
      const p = cList[0];
      const dateLabel = p.startDate
        ? `startDate=${p.startDate.toISOString().split("T")[0]}`
        : `createdAt=${p.createdAt.toISOString().split("T")[0]}`;
      console.log(`  - ${p.project?.name ?? "Unknown"} (${p.projectId}): "${p.name ?? "(unnamed)"}" [${dateLabel}]`);
    }
    return;
  }

  console.log(`⚠️  Projects with MORE THAN 1 campaign active in May 2026: ${multiCampaignProjects.length}\n`);
  console.log("=".repeat(70));

  for (const p of multiCampaignProjects) {
    console.log(`\nProject: "${p.projectName}" (${p.projectId})`);
    console.log(`  Total May campaigns: ${p.count}`);
    for (const c of p.campaigns) {
      const dateLabel = c.startDate
        ? `startDate=${c.startDate.toISOString().split("T")[0]}, totalDays=${c.totalDays ?? "?"}`
        : `createdAt=${c.createdAt.toISOString().split("T")[0]}`;
      console.log(`    - "${c.name ?? "(unnamed)"}" [${dateLabel}] id=${c.id}`);
    }
  }

  console.log("\n" + "=".repeat(70));
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());

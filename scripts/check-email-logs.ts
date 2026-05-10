import { prisma } from "../src/lib/prisma";

async function main() {
  const counts = await prisma.emailLog.groupBy({
    by: ["template", "trigger"],
    _count: { id: true },
    orderBy: { template: "asc" },
  });

  console.log("\nEmail log summary:\n");
  counts.forEach((c) =>
    console.log(`  ${c.template.padEnd(28)} [${c.trigger.padEnd(16)}]  ${c._count.id} records`)
  );

  const total = await prisma.emailLog.count();
  console.log(`\n  TOTAL in email-logs: ${total}\n`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

import { prisma } from "../src/lib/prisma";

async function fixIdeaStatusEnum() {
  try {
    console.log("\n🔄 Fixing idea status to use enum...\n");

    // Find all ideas with string status
    const ideas = await prisma.idea.findMany();

    console.log(`📄 Found ${ideas.length} idea(s) to check\n`);

    let updated = 0;
    let skipped = 0;

    for (const idea of ideas) {
      // Check if status needs updating (should be enum, but might be string in DB)
      // Prisma should handle this, but let's ensure all are set correctly
      if (idea.status === "published" || idea.status === "draft") {
        // Status is already correct (Prisma enum)
        skipped++;
        continue;
      }

      // If somehow status is not the enum value, update it
      // This shouldn't happen, but just in case
      await prisma.idea.update({
        where: { id: idea.id },
        data: {
          status: idea.status === "published" ? "published" : "draft",
        },
      });

      console.log(`✅ Updated: "${idea.title}"`);
      updated++;
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Fix Summary:");
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log("=".repeat(50) + "\n");

    // Verify all ideas are published
    const publishedIdeas = await prisma.idea.findMany({
      where: { status: "published" },
    });

    console.log(`✅ Found ${publishedIdeas.length} published idea(s)\n`);
  } catch (error) {
    console.error("\n❌ Fix failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run fix
fixIdeaStatusEnum()
  .then(() => {
    console.log("✅ Fix completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fix failed:", error);
    process.exit(1);
  });

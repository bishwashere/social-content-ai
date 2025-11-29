import { prisma } from "../src/lib/prisma";

async function addPlatformIconsOnboardingField() {
  try {
    console.log("\n🔍 Finding all FirstViewTooltip records...\n");

    // Find all FirstViewTooltip records that don't have platformIconsOnboarding field
    const allTooltips = await prisma.firstViewTooltip.findMany({});

    console.log(`Found ${allTooltips.length} FirstViewTooltip record(s)\n`);

    if (allTooltips.length === 0) {
      console.log("✅ No records to update.\n");
      return;
    }

    // Update all records to ensure they have the platformIconsOnboarding field
    // MongoDB is schemaless, so we need to explicitly set it for existing records
    const updateResult = await prisma.firstViewTooltip.updateMany({
      data: {
        platformIconsOnboarding: false,
      },
    });

    console.log(`✅ Updated ${updateResult.count} record(s) with platformIconsOnboarding field\n`);
    console.log("All existing FirstViewTooltip records now have platformIconsOnboarding: false\n");
  } catch (error) {
    console.error("\n❌ Error updating records:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addPlatformIconsOnboardingField()
  .then(() => {
    console.log("Script completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });


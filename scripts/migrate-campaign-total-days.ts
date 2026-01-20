import { prisma } from "../src/lib/prisma";

/**
 * Migration script to add totalDays to existing campaigns
 * Calculates totalDays from the maximum day number in CampaignChat records
 */
async function migrateCampaignTotalDays() {
  try {
    console.log("\n🔄 Starting migration of totalDays to campaigns...\n");

    // Get all campaigns
    const campaigns = await prisma.campaignPlanner.findMany({
      include: {
        chats: true,
      },
    });

    console.log(`📊 Found ${campaigns.length} campaign(s) to migrate\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const campaign of campaigns) {
      try {
        // Calculate totalDays from chats
        // Method 1: Use max day number (since days are sequential: 1, 2, 3, ...)
        let totalDays = 0;
        
        if (campaign.chats && campaign.chats.length > 0) {
          // Find the maximum day number
          const maxDay = Math.max(...campaign.chats.map(chat => chat.day));
          totalDays = maxDay;
        }

        // Skip if totalDays is already set and matches calculated value
        if (campaign.totalDays === totalDays && campaign.totalDays !== null) {
          console.log(`⏭️  Skipping campaign "${campaign.name || campaign.id}" - totalDays already set to ${totalDays}`);
          skipped++;
          continue;
        }

        // Update campaign with totalDays
        await prisma.campaignPlanner.update({
          where: { id: campaign.id },
          data: { totalDays },
        });

        console.log(`✅ Migrated campaign "${campaign.name || campaign.id}": totalDays = ${totalDays}`);
        migrated++;
      } catch (error) {
        console.error(`❌ Error migrating campaign ${campaign.id}:`, error);
        errors++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 Migration Summary:");
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log("=".repeat(50) + "\n");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateCampaignTotalDays()
  .then(() => {
    console.log("✅ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });

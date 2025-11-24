import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixTemplateDates() {
  console.log("🔧 Fixing template dates in MongoDB...");

  try {
    // Get all templates with null dates
    const templatesWithNullDates = await prisma.$runCommandRaw({
      find: "templates",
      filter: {
        $or: [
          { createdAt: null },
          { updatedAt: null },
        ],
      },
    }) as any;

    const templates = templatesWithNullDates.cursor?.firstBatch || [];
    console.log(`Found ${templates.length} templates with null dates`);

    if (templates.length === 0) {
      console.log("✅ No templates need fixing!");
      return;
    }

    const now = new Date();

    // Update templates with null dates
    for (const template of templates) {
      const updateData: any = {};
      const templateId = template._id?.$oid || template._id;
      
      if (!template.createdAt) {
        updateData.createdAt = now;
        console.log(`  - Fixing createdAt for template: ${templateId}`);
      }
      
      if (!template.updatedAt) {
        updateData.updatedAt = now;
        console.log(`  - Fixing updatedAt for template: ${templateId}`);
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.$runCommandRaw({
          update: "templates",
          updates: [
            {
              q: { _id: template._id },
              u: { $set: updateData },
            },
          ],
        });
      }
    }

    console.log(`✅ Fixed ${templates.length} templates!`);
  } catch (error) {
    console.error("❌ Error fixing template dates:", error);
    throw error;
  }
}

fixTemplateDates()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

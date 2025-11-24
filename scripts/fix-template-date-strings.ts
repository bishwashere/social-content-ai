import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixTemplateDateStrings() {
  console.log("🔧 Fixing template date strings in MongoDB...");

  try {
    // Get all templates
    const templatesResult = await prisma.$runCommandRaw({
      find: "templates",
      filter: {},
    }) as any;

    const templates = templatesResult.cursor?.firstBatch || [];
    console.log(`Found ${templates.length} templates`);

    if (templates.length === 0) {
      console.log("✅ No templates found!");
      return;
    }

    let fixedCount = 0;

    // Update templates with string dates
    for (const template of templates) {
      const updateData: any = {};
      const templateId = template._id?.$oid || template._id;
      let needsUpdate = false;

      // Check createdAt
      if (typeof template.createdAt === 'string') {
        updateData.createdAt = new Date(template.createdAt);
        needsUpdate = true;
        console.log(`  - Converting createdAt string to Date for template: ${templateId}`);
      } else if (!template.createdAt) {
        updateData.createdAt = new Date();
        needsUpdate = true;
        console.log(`  - Setting default createdAt for template: ${templateId}`);
      }

      // Check updatedAt
      if (typeof template.updatedAt === 'string') {
        updateData.updatedAt = new Date(template.updatedAt);
        needsUpdate = true;
        console.log(`  - Converting updatedAt string to Date for template: ${templateId}`);
      } else if (!template.updatedAt) {
        updateData.updatedAt = new Date();
        needsUpdate = true;
        console.log(`  - Setting default updatedAt for template: ${templateId}`);
      }

      if (needsUpdate) {
        await prisma.$runCommandRaw({
          update: "templates",
          updates: [
            {
              q: { _id: template._id },
              u: { $set: updateData },
            },
          ],
        });
        fixedCount++;
      }
    }

    console.log(`✅ Fixed ${fixedCount} templates!`);
  } catch (error) {
    console.error("❌ Error fixing template date strings:", error);
    throw error;
  }
}

fixTemplateDateStrings()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

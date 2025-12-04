import { prisma } from "../src/lib/prisma";

/**
 * Script to update idea slug to match title
 * Run with: npx tsx scripts/fix-idea-slug.ts
 */

function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

async function fixIdeaSlug() {
  try {
    const title = "From Idea to Impact: How NextPostAI Turns AI Output into Real World Results";
    const correctSlug = titleToSlug(title);
    
    console.log(`\n🔧 Fixing idea slug...`);
    console.log(`Title: ${title}`);
    console.log(`Correct slug: ${correctSlug}\n`);

    // Find the idea by current slug or title
    const idea = await prisma.idea.findFirst({
      where: {
        OR: [
          { slug: "idea-to-impact" },
          { title: title },
        ],
      },
    });

    if (!idea) {
      console.log("❌ Idea not found!");
      return;
    }

    console.log(`Found idea: ${idea.title}`);
    console.log(`Current slug: ${idea.slug}`);
    console.log(`New slug: ${correctSlug}\n`);

    // Check if new slug already exists for a different idea
    const existingSlug = await prisma.idea.findFirst({
      where: {
        slug: correctSlug,
        id: { not: idea.id },
      },
    });

    if (existingSlug) {
      console.log(`❌ Slug "${correctSlug}" already exists for another idea!`);
      return;
    }

    // Update the slug
    await prisma.idea.update({
      where: { id: idea.id },
      data: { slug: correctSlug },
    });

    console.log(`✅ Successfully updated slug to: ${correctSlug}\n`);
  } catch (error) {
    console.error("❌ Error fixing slug:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixIdeaSlug()
  .then(() => {
    console.log("✅ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

import { prisma } from "../src/lib/prisma";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const ideasDirectory = join(process.cwd(), "content/ideas");

// Convert title to URL-friendly slug
function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function migrateIdeasToDatabase() {
  try {
    console.log("\n🔄 Starting migration of ideas from MDX files to database...\n");

    // Get first user as author (or create a system user if none exists)
    let author = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!author) {
      console.log("⚠️  No users found. Creating a system user for ideas...");
      // You might want to create a system user or handle this differently
      throw new Error("No users found in database. Please create a user first.");
    }

    console.log(`✅ Using author: ${author.name} (${author.email})\n`);

    // Read all MDX files
    const fileNames = readdirSync(ideasDirectory);
    const mdxFiles = fileNames.filter((name) => name.endsWith(".mdx"));

    console.log(`📄 Found ${mdxFiles.length} MDX file(s) to migrate\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const fileName of mdxFiles) {
      try {
        const fullPath = join(ideasDirectory, fileName);
        const fileContents = readFileSync(fullPath, "utf8");
        const { data, content } = matter(fileContents);

        const title = data.title || "Untitled";
        const slug = data.slug || titleToSlug(title);
        const summary = data.summary || "";
        const tags = data.tags || [];
        const thumbnail = data.thumbnail || null;
        const publishedAt = data.publishedAt || data.date || new Date().toISOString();

        // Check if idea already exists
        const existing = await prisma.idea.findUnique({
          where: { slug },
        });

        if (existing) {
          console.log(`⏭️  Skipping "${title}" - already exists in database`);
          skipped++;
          continue;
        }

        // Create idea in database
        await prisma.idea.create({
          data: {
            slug,
            title,
            summary,
            content, // Raw MDX/Markdown content
            tags: Array.isArray(tags) ? tags : [],
            thumbnail,
            status: "published" as const,
            publishedAt: new Date(publishedAt),
            authorId: author.id,
          },
        });

        console.log(`✅ Migrated: "${title}" (slug: ${slug})`);
        migrated++;
      } catch (error) {
        console.error(`❌ Error migrating ${fileName}:`, error);
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
migrateIdeasToDatabase()
  .then(() => {
    console.log("✅ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });

/**
 * Create or update an idea in the DB from an MDX file in content/ideas.
 * Use for draft articles: set status: draft in frontmatter, then run this script.
 * Example: npx tsx scripts/create-draft-idea-from-mdx.ts nextpostai-vs-buffer-2026.mdx
 */
import { prisma } from "../src/lib/prisma";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const ideasDirectory = join(process.cwd(), "content/ideas");

function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const fileName = process.argv[2] || "nextpostai-vs-buffer-2026.mdx";
  const fullPath = join(ideasDirectory, fileName);

  console.log(`\n📄 Reading ${fileName}...\n`);

  const fileContents = readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const title = data.title || "Untitled";
  const slug = data.slug || titleToSlug(title);
  const summary = data.summary || "";
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const thumbnail = data.thumbnail || null;
  const status = data.status === "published" ? "published" : "draft";
  const publishedAt =
    status === "published"
      ? data.publishedAt
        ? new Date(data.publishedAt)
        : new Date()
      : null;

  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!firstUser) {
    throw new Error("No users found in database. Create a user first.");
  }

  const existing = await prisma.idea.findUnique({
    where: { slug },
  });

  if (existing) {
    await prisma.idea.update({
      where: { slug },
      data: {
        title,
        summary,
        content: content.trim(),
        tags,
        thumbnail,
        status: status as "draft" | "published",
        publishedAt,
      },
    });
    console.log(`✅ Updated draft idea: "${title}" (slug: ${slug})\n`);
  } else {
    await prisma.idea.create({
      data: {
        slug,
        title,
        summary,
        content: content.trim(),
        tags,
        thumbnail,
        status: status as "draft" | "published",
        publishedAt,
        authorId: firstUser.id,
      },
    });
    console.log(`✅ Created draft idea: "${title}" (slug: ${slug})\n`);
  }

  console.log("Review and publish from: /ideas/admin\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

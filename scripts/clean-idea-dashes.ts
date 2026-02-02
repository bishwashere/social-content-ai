/**
 * One-off: load an idea by slug, apply cleanDashes to content, save.
 * Run against production DB to fix live content: DATABASE_URL="..." npx tsx scripts/clean-idea-dashes.ts [slug]
 */
import { prisma } from "../src/lib/prisma";
import { cleanDashes } from "../src/lib/idea-content-cleaner";

async function main() {
  const slug = process.argv[2] || "nextpostai-vs-buffer-2026";

  const idea = await prisma.idea.findFirst({ where: { slug } });
  if (!idea) {
    console.error(`Idea not found: ${slug}`);
    process.exit(1);
  }

  const cleaned = cleanDashes(idea.content);
  if (cleaned === idea.content) {
    console.log(`No dashes to clean in "${idea.title}".`);
    process.exit(0);
  }

  await prisma.idea.update({
    where: { id: idea.id },
    data: { content: cleaned },
  });

  console.log(`Updated "${idea.title}" (${slug}): content dashes cleaned and saved.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

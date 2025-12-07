/**
 * Script to update webhook URL for a specific post
 * 
 * Usage:
 *   npx tsx scripts/update-webhook-url.ts <postId> <webhookUrl>
 * 
 * Example:
 *   npx tsx scripts/update-webhook-url.ts 6935d4fa5540347f44055847 http://localhost:3000/ideas/receive
 */

import { prisma } from "../src/lib/prisma";

async function updateWebhookUrl(postId: string, webhookUrl: string) {
  try {
    console.log(`\n🔧 Updating webhook URL for post: ${postId}\n`);
    console.log(`   New URL: ${webhookUrl}\n`);

    const post = await prisma.scheduledPost.findUnique({
      where: { id: postId },
      select: { id: true, meta: true },
    });

    if (!post) {
      console.log("❌ Post not found\n");
      return;
    }

    const meta = post.meta as any;

    // Update webhook URL in meta
    await prisma.$runCommandRaw({
      update: "scheduled-posts",
      updates: [{
        q: { _id: { $oid: postId } },
        u: {
          $set: {
            "meta.webhook": webhookUrl,
            "updatedAt": new Date(),
          }
        }
      }]
    });

    console.log("✅ Webhook URL updated successfully!\n");
  } catch (error) {
    console.error("\n❌ Error updating webhook URL:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const postId = process.argv[2];
const webhookUrl = process.argv[3];

if (!postId || !webhookUrl) {
  console.error("\n❌ Error: Post ID and webhook URL are required");
  console.error("Usage: npx tsx scripts/update-webhook-url.ts <postId> <webhookUrl>\n");
  console.error("Example: npx tsx scripts/update-webhook-url.ts 6935d4fa5540347f44055847 http://localhost:3000/ideas/receive\n");
  process.exit(1);
}

updateWebhookUrl(postId, webhookUrl);

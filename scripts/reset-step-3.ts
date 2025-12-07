/**
 * Script to reset Step 3 for a specific post (for testing)
 * 
 * Usage:
 *   npx tsx scripts/reset-step-3.ts <postId>
 */

import { prisma } from "../src/lib/prisma";

async function resetStep3(postId: string) {
  try {
    console.log(`\n🔧 Resetting Step 3 for post: ${postId}\n`);

    const post = await prisma.scheduledPost.findUnique({
      where: { id: postId },
      select: { id: true, meta: true },
    });

    if (!post) {
      console.log("❌ Post not found\n");
      return;
    }

    const meta = post.meta as any;

    // Reset Step 3 flags
    await prisma.$runCommandRaw({
      update: "scheduled-posts",
      updates: [{
        q: { _id: { $oid: postId } },
        u: {
          $set: {
            "meta.step3InProgress": false,
            "meta.step3Completed": false,
            "updatedAt": new Date(),
          },
          $unset: {
            "meta.step3StartedAt": "",
            "meta.step3CompletedAt": "",
            "meta.step3Error": "",
            "meta.webhookSent": "",
            "meta.articleUrl": "",
          }
        }
      }]
    });

    console.log("✅ Step 3 reset successfully!\n");
    console.log("The post is now ready for Step 3 testing.\n");
  } catch (error) {
    console.error("\n❌ Error resetting Step 3:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const postId = process.argv[2];

if (!postId) {
  console.error("\n❌ Error: Post ID is required");
  console.error("Usage: npx tsx scripts/reset-step-3.ts <postId>\n");
  process.exit(1);
}

resetStep3(postId);

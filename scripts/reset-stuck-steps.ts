/**
 * Script to reset stuck step flags for a specific post
 * 
 * Usage:
 *   npx tsx scripts/reset-stuck-steps.ts <postId>
 * 
 * Example:
 *   npx tsx scripts/reset-stuck-steps.ts 6935d4fa5540347f44055847
 */

import { prisma } from "../src/lib/prisma";

async function resetStuckSteps(postId: string) {
  try {
    console.log(`\n🔧 Resetting stuck steps for post: ${postId}\n`);

    const post = await prisma.scheduledPost.findUnique({
      where: { id: postId },
      select: { id: true, meta: true },
    });

    if (!post) {
      console.log("❌ Post not found\n");
      return;
    }

    const meta = post.meta as any;
    const updates: any = {};
    const unsetFields: any = {};

    // Debug: Print actual values
    console.log("Debug - Actual meta values:");
    console.log(`  step1InProgress: ${meta?.step1InProgress} (type: ${typeof meta?.step1InProgress})`);
    console.log(`  step1Completed: ${meta?.step1Completed} (type: ${typeof meta?.step1Completed})`);
    console.log(`  step2InProgress: ${meta?.step2InProgress} (type: ${typeof meta?.step2InProgress})`);
    console.log(`  step2Completed: ${meta?.step2Completed} (type: ${typeof meta?.step2Completed})`);
    console.log(`  step3InProgress: ${meta?.step3InProgress} (type: ${typeof meta?.step3InProgress})`);
    console.log(`  step3Completed: ${meta?.step3Completed} (type: ${typeof meta?.step3Completed})`);
    console.log(`  step4InProgress: ${meta?.step4InProgress} (type: ${typeof meta?.step4InProgress})`);
    console.log(`  step4Completed: ${meta?.step4Completed} (type: ${typeof meta?.step4Completed})`);
    console.log("");

    // Check which steps are stuck
    // A step is stuck if: inProgress is truthy AND completed is not truthy
    if (meta?.step1InProgress && !meta?.step1Completed) {
      console.log("⚠️  Step 1 is stuck (inProgress but not completed)");
      updates["meta.step1InProgress"] = false;
    }

    if (meta?.step2InProgress && !meta?.step2Completed) {
      console.log("⚠️  Step 2 is stuck (inProgress but not completed)");
      updates["meta.step2InProgress"] = false;
    }

    if (meta?.step3InProgress && !meta?.step3Completed) {
      console.log("⚠️  Step 3 is stuck (inProgress but not completed)");
      updates["meta.step3InProgress"] = false;
      // Clear startedAt if it exists
      if (meta?.step3StartedAt) {
        unsetFields["meta.step3StartedAt"] = "";
      }
    }

    if (meta?.step4InProgress && !meta?.step4Completed) {
      console.log("⚠️  Step 4 is stuck (inProgress but not completed)");
      updates["meta.step4InProgress"] = false;
      // Clear startedAt if it exists
      if (meta?.step4StartedAt) {
        unsetFields["meta.step4StartedAt"] = "";
      }
    }

    if (Object.keys(updates).length === 0) {
      console.log("✅ No stuck steps found\n");
      return;
    }

    console.log("\n🔄 Resetting stuck flags...\n");

    // Use raw MongoDB command to update nested fields
    const setFields: any = {
      ...updates,
      "updatedAt": new Date(),
    };

    const updateCommand: any = {
      update: "scheduled-posts",
      updates: [{
        q: { _id: { $oid: postId } },
        u: {
          $set: setFields,
          ...(Object.keys(unsetFields).length > 0 && { $unset: unsetFields }),
        }
      }]
    };

    await prisma.$runCommandRaw(updateCommand);

    console.log("✅ Stuck flags reset successfully!\n");
    console.log("Updated fields:");
    Object.keys(setFields).forEach(key => {
      if (key !== "updatedAt") {
        console.log(`  - ${key}: ${setFields[key]}`);
      }
    });
    if (Object.keys(unsetFields).length > 0) {
      Object.keys(unsetFields).forEach(key => {
        console.log(`  - ${key}: (removed)`);
      });
    }
    console.log("");

  } catch (error) {
    console.error("\n❌ Error resetting stuck steps:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get postId from command line arguments
const postId = process.argv[2];

if (!postId) {
  console.error("\n❌ Error: Post ID is required");
  console.error("Usage: npx tsx scripts/reset-stuck-steps.ts <postId>\n");
  process.exit(1);
}

resetStuckSteps(postId);

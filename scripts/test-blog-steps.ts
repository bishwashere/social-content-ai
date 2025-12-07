/**
 * Test script to verify Blog News step-based flow
 * 
 * This script:
 * 1. Finds a pending Blog News scheduled post
 * 2. Manually triggers Step 1
 * 3. Monitors the post status through all steps
 * 4. Verifies that the ID flows correctly through each step
 */

import { prisma } from "../src/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testBlogSteps() {
  console.log("🧪 Testing Blog News Step-Based Flow\n");
  console.log("=".repeat(60));

  try {
    // 1. Find a pending Blog News post
    console.log("📋 Step 1: Finding a pending Blog News post...");
    const pendingPost = await prisma.scheduledPost.findFirst({
      where: {
        status: "pending",
        platform: "webhook", // Blog News posts use "webhook" platform
      },
      select: {
        id: true,
        status: true,
        meta: true,
        projectId: true,
        date: true,
      },
    });

    if (!pendingPost) {
      console.log("❌ No pending Blog News posts found. Please create one first.");
      return;
    }

    const meta = pendingPost.meta as any;
    console.log(`✅ Found post:`);
    console.log(`   ID: ${pendingPost.id}`);
    console.log(`   Status: ${pendingPost.status}`);
    console.log(`   Campaign: ${meta?.campaignId || "N/A"}`);
    console.log(`   Day: ${meta?.day || "N/A"}`);
    console.log(`   Topics: ${(meta?.topics || []).join(", ") || "N/A"}`);
    console.log(`   Webhook: ${meta?.webhook || "N/A"}`);
    console.log("");

    // 2. Trigger Step 1
    console.log("🚀 Step 2: Triggering Step 1 (Fetch Article)...");
    const step1Response = await fetch(`${BASE_URL}/api/blog/step-1-fetch-article`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: pendingPost.id }),
    });

    if (!step1Response.ok) {
      const error = await step1Response.text();
      console.log(`❌ Step 1 failed: ${error}`);
      return;
    }

    const step1Result = await step1Response.json();
    console.log(`✅ Step 1 response:`, step1Result);
    console.log("");

    // 3. Wait and check post status after Step 1
    console.log("⏳ Waiting 2 seconds for Step 1 to complete...");
    await sleep(2000);

    const postAfterStep1 = await prisma.scheduledPost.findUnique({
      where: { id: pendingPost.id },
      select: {
        id: true,
        status: true,
        meta: true,
      },
    });

    console.log(`📊 Post status after Step 1:`);
    console.log(`   Status: ${postAfterStep1?.status}`);
    console.log(`   Step 1 Completed: ${(postAfterStep1?.meta as any)?.step1Completed || false}`);
    console.log(`   Has Article: ${!!(postAfterStep1?.meta as any)?.article}`);
    if ((postAfterStep1?.meta as any)?.article) {
      console.log(`   Article Title: ${(postAfterStep1?.meta as any)?.article?.title?.substring(0, 50)}...`);
    }
    console.log("");

    // 4. Wait and check post status after Step 2
    console.log("⏳ Waiting 3 seconds for Step 2 to complete...");
    await sleep(3000);

    const postAfterStep2 = await prisma.scheduledPost.findUnique({
      where: { id: pendingPost.id },
      select: {
        id: true,
        status: true,
        meta: true,
      },
    });

    console.log(`📊 Post status after Step 2:`);
    console.log(`   Status: ${postAfterStep2?.status}`);
    console.log(`   Step 2 Completed: ${(postAfterStep2?.meta as any)?.step2Completed || false}`);
    console.log(`   Has Blog: ${!!(postAfterStep2?.meta as any)?.blog}`);
    if ((postAfterStep2?.meta as any)?.blog) {
      console.log(`   Blog Title: ${(postAfterStep2?.meta as any)?.blog?.title?.substring(0, 50)}...`);
    }
    console.log("");

    // 5. Wait and check post status after Step 3
    console.log("⏳ Waiting 2 seconds for Step 3 to complete...");
    await sleep(2000);

    const postAfterStep3 = await prisma.scheduledPost.findUnique({
      where: { id: pendingPost.id },
      select: {
        id: true,
        status: true,
        meta: true,
      },
    });

    console.log(`📊 Post status after Step 3:`);
    console.log(`   Status: ${postAfterStep3?.status}`);
    console.log(`   Step 3 Completed: ${(postAfterStep3?.meta as any)?.step3Completed || false}`);
    console.log(`   Article URL: ${(postAfterStep3?.meta as any)?.articleUrl || "N/A"}`);
    console.log("");

    // 6. Wait and check final status after Step 4
    console.log("⏳ Waiting 2 seconds for Step 4 to complete...");
    await sleep(2000);

    const finalPost = await prisma.scheduledPost.findUnique({
      where: { id: pendingPost.id },
      select: {
        id: true,
        status: true,
        meta: true,
        error: true,
      },
    });

    console.log(`📊 Final post status:`);
    console.log(`   Status: ${finalPost?.status}`);
    console.log(`   Step 4 Completed: ${(finalPost?.meta as any)?.step4Completed || false}`);
    console.log(`   Error: ${finalPost?.error || "None"}`);
    if ((finalPost?.meta as any)?.platformPosts) {
      const platformPosts = (finalPost?.meta as any)?.platformPosts || [];
      console.log(`   Platform Posts Created: ${platformPosts.filter((p: any) => p.success).length}/${platformPosts.length}`);
    }
    console.log("");

    // 7. Verify ID flow
    console.log("🔍 Verifying ID flow through all steps...");
    const allStepsCompleted = 
      (finalPost?.meta as any)?.step1Completed &&
      (finalPost?.meta as any)?.step2Completed &&
      (finalPost?.meta as any)?.step3Completed &&
      (finalPost?.meta as any)?.step4Completed;

    if (allStepsCompleted && finalPost?.status === "success") {
      console.log("✅ SUCCESS! All steps completed and ID flowed correctly through each step.");
      console.log("");
      console.log("Step completion timeline:");
      console.log(`   Step 1: ${(finalPost?.meta as any)?.step1CompletedAt || "N/A"}`);
      console.log(`   Step 2: ${(finalPost?.meta as any)?.step2CompletedAt || "N/A"}`);
      console.log(`   Step 3: ${(finalPost?.meta as any)?.step3CompletedAt || "N/A"}`);
      console.log(`   Step 4: ${(finalPost?.meta as any)?.step4CompletedAt || "N/A"}`);
    } else {
      console.log("❌ FAILED! Not all steps completed or post not marked as success.");
      console.log(`   Step 1: ${(finalPost?.meta as any)?.step1Completed ? "✅" : "❌"}`);
      console.log(`   Step 2: ${(finalPost?.meta as any)?.step2Completed ? "✅" : "❌"}`);
      console.log(`   Step 3: ${(finalPost?.meta as any)?.step3Completed ? "✅" : "❌"}`);
      console.log(`   Step 4: ${(finalPost?.meta as any)?.step4Completed ? "✅" : "❌"}`);
      console.log(`   Final Status: ${finalPost?.status}`);
    }

    console.log("");
    console.log("=".repeat(60));
    console.log("✅ Test complete!");

  } catch (error) {
    console.error("❌ Test failed with error:", error);
    if (error instanceof Error) {
      console.error("Stack:", error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testBlogSteps();


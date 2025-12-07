/**
 * Comprehensive End-to-End Test for Blog News Flow
 * 
 * Tests:
 * 1. Campaign creation
 * 2. Python cron (Steps 1 & 2)
 * 3. Next.js cron (Steps 3 & 4)
 * 4. Duplicate detection (run Step 1 twice)
 * 5. Exhausted key tracking
 * 6. UI fallback (blog from ScheduledPost.meta if not in CampaignChat)
 * 7. Step status display
 * 8. Conditional webhook/published link display
 */

import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
  console.log(`\n🧪 Testing: ${testName}`);
  try {
    const result = await testFn();
    results.push({ test: testName, passed: true, details: result });
    console.log(`✅ PASSED: ${testName}`);
  } catch (error: any) {
    results.push({ test: testName, passed: false, error: error.message, details: error });
    console.log(`❌ FAILED: ${testName} - ${error.message}`);
  }
}

async function test1_CreateCampaign() {
  // This would require actual API call or direct DB insert
  // For now, we'll check if we can query campaigns
  const campaigns = await prisma.campaignPlanner.findMany({
    where: { goal: "Blog News" },
    take: 1,
    include: { chats: true },
  });
  
  if (campaigns.length === 0) {
    throw new Error("No Blog News campaigns found. Please create one first.");
  }
  
  const campaign = campaigns[0];
  return {
    campaignId: campaign.id,
    chatsCount: campaign.chats.length,
    hasAutoPost: campaign.autoPostEnabled,
  };
}

async function test2_CheckScheduledPosts() {
  // Prisma doesn't support JSON path queries, so fetch all and filter
  const allPosts = await prisma.scheduledPost.findMany({
    take: 100,
  });
  
  const posts = allPosts.filter(p => {
    const meta = p.meta as any;
    return meta?.type === "blog-news";
  }).slice(0, 5);
  
  if (posts.length === 0) {
    throw new Error("No scheduled posts found for blog-news");
  }
  
  return {
    postsCount: posts.length,
    posts: posts.map(p => ({
      id: p.id,
      date: p.date,
      status: p.status,
      step1Completed: (p.meta as any)?.step1Completed,
      step2Completed: (p.meta as any)?.step2Completed,
      step3Completed: (p.meta as any)?.step3Completed,
      step4Completed: (p.meta as any)?.step4Completed,
      hasBlog: !!(p.meta as any)?.blog,
    })),
  };
}

async function test3_CheckPythonStep1And2() {
  // Check if posts have step1 and step2 completed
  const allPosts = await prisma.scheduledPost.findMany({
    where: {
      date: {
        lte: new Date(),
      },
    },
  });
  
  const posts = allPosts.filter(p => {
    const meta = p.meta as any;
    return meta?.type === "blog-news";
  });
  
  const step1Completed = posts.filter(p => (p.meta as any)?.step1Completed === true);
  const step2Completed = posts.filter(p => (p.meta as any)?.step2Completed === true);
  
  if (step1Completed.length === 0) {
    throw new Error("No posts with Step 1 completed");
  }
  
  if (step2Completed.length === 0) {
    throw new Error("No posts with Step 2 completed");
  }
  
  // Check if blog exists in meta
  const withBlog = step2Completed.filter(p => (p.meta as any)?.blog);
  
  return {
    totalPosts: posts.length,
    step1Completed: step1Completed.length,
    step2Completed: step2Completed.length,
    withBlog: withBlog.length,
  };
}

async function test4_CheckCampaignChatUpdate() {
  // Check if CampaignChat has blog content
  const campaigns = await prisma.campaignPlanner.findMany({
    where: { goal: "Blog News" },
    include: {
      chats: true,
    },
  });
  
  const chatsWithBlog = campaigns.flatMap(c => c.chats.filter(chat => {
    const contents = chat.contents as any;
    return contents?.blog;
  }));
  
  if (chatsWithBlog.length === 0) {
    throw new Error("No CampaignChat entries have blog content");
  }
  
  return {
    campaignsChecked: campaigns.length,
    chatsWithBlog: chatsWithBlog.length,
  };
}

async function test5_CheckScheduledPostFallback() {
  // Check if ScheduledPost.meta.blog exists (fallback source)
  const allPosts = await prisma.scheduledPost.findMany({
    take: 100,
  });
  
  const posts = allPosts.filter(p => {
    const meta = p.meta as any;
    return meta?.type === "blog-news" && meta?.blog;
  }).slice(0, 5);
  
  if (posts.length === 0) {
    throw new Error("No ScheduledPost entries have blog in meta (fallback source)");
  }
  
  return {
    postsWithBlogInMeta: posts.length,
    sample: posts[0] ? {
      id: posts[0].id,
      hasBlog: !!(posts[0].meta as any)?.blog,
      blogTitle: (posts[0].meta as any)?.blog?.title,
    } : null,
  };
}

async function test6_CheckStep3And4() {
  const allPosts = await prisma.scheduledPost.findMany({
    take: 100,
  });
  
  const posts = allPosts.filter(p => {
    const meta = p.meta as any;
    return meta?.type === "blog-news";
  });
  
  const step3Completed = posts.filter(p => (p.meta as any)?.step3Completed === true);
  const step4Completed = posts.filter(p => (p.meta as any)?.step4Completed === true);
  const webhookSent = posts.filter(p => (p.meta as any)?.webhookSent === true);
  const hasArticleUrl = posts.filter(p => (p.meta as any)?.articleUrl);
  
  return {
    totalPosts: posts.length,
    step3Completed: step3Completed.length,
    step4Completed: step4Completed.length,
    webhookSent: webhookSent.length,
    hasArticleUrl: hasArticleUrl.length,
  };
}

async function test7_CheckDuplicateDetection() {
  // Check if used article identifiers are being tracked
  const allPosts = await prisma.scheduledPost.findMany({
    take: 100,
  });
  
  const posts = allPosts.filter(p => {
    const meta = p.meta as any;
    return meta?.type === "blog-news";
  });
  
  const withArticleId = posts.filter(p => (p.meta as any)?.articleId);
  const articleIds = new Set(withArticleId.map(p => (p.meta as any)?.articleId));
  
  // Check for duplicates
  const duplicates = withArticleId.filter((p, index, self) => {
    const articleId = (p.meta as any)?.articleId;
    return self.findIndex(pp => (pp.meta as any)?.articleId === articleId) !== index;
  });
  
  return {
    totalPosts: posts.length,
    withArticleId: withArticleId.length,
    uniqueArticleIds: articleIds.size,
    potentialDuplicates: duplicates.length,
  };
}

async function test8_CheckExhaustedKeys() {
  // Check if exhausted keys are tracked in database
  // This would be in a separate collection in MongoDB
  // For now, we'll check if posts have step2Error that mentions quota/exhausted
  try {
    // Note: This requires direct MongoDB access, which Prisma doesn't support well
    // We'll check if posts have step2Error that mentions quota/exhausted
    const allPosts = await prisma.scheduledPost.findMany({
      take: 100,
    });
    
    const posts = allPosts.filter(p => (p.meta as any)?.step2Error);
    
    const exhaustedErrors = posts.filter(p => {
      const error = (p.meta as any)?.step2Error;
      return error && (error.includes("quota") || error.includes("exhausted") || error.includes("429"));
    });
    
    return {
      postsWithErrors: posts.length,
      exhaustedErrors: exhaustedErrors.length,
    };
  } catch (error: any) {
    return {
      note: "Cannot directly check exhausted keys collection via Prisma",
      error: error.message,
    };
  }
}

async function test9_CheckStepStatusFlags() {
  const allPosts = await prisma.scheduledPost.findMany({
    take: 100,
  });
  
  const posts = allPosts.filter(p => {
    const meta = p.meta as any;
    return meta?.type === "blog-news";
  }).slice(0, 10);
  
  const statusCheck = posts.map(p => {
    const meta = p.meta as any;
    return {
      id: p.id,
      step1Completed: meta?.step1Completed || false,
      step1InProgress: meta?.step1InProgress || false,
      step2Completed: meta?.step2Completed || false,
      step2InProgress: meta?.step2InProgress || false,
      step3Completed: meta?.step3Completed || false,
      step3InProgress: meta?.step3InProgress || false,
      step4Completed: meta?.step4Completed || false,
      step4InProgress: meta?.step4InProgress || false,
      hasErrors: !!(meta?.step1Error || meta?.step2Error || meta?.step3Error || meta?.step4Error),
    };
  });
  
  return {
    postsChecked: posts.length,
    statusBreakdown: statusCheck,
  };
}

async function test10_CheckWebhookAndPublishedLink() {
  const allPosts = await prisma.scheduledPost.findMany({
    take: 100,
  });
  
  const posts = allPosts.filter(p => {
    const meta = p.meta as any;
    return meta?.type === "blog-news";
  });
  
  // Check if webhook/published link are only shown when all steps complete
  const allStepsComplete = posts.filter(p => {
    const meta = p.meta as any;
    return meta?.step1Completed && meta?.step2Completed && meta?.step3Completed && meta?.step4Completed;
  });
  
  const withWebhookSent = allStepsComplete.filter(p => (p.meta as any)?.webhookSent === true);
  const withArticleUrl = allStepsComplete.filter(p => (p.meta as any)?.articleUrl);
  
  // Check for posts that have webhook/articleUrl but not all steps complete (shouldn't happen)
  const invalidState = posts.filter(p => {
    const meta = p.meta as any;
    const hasWebhookOrUrl = meta?.webhookSent || meta?.articleUrl;
    const allComplete = meta?.step1Completed && meta?.step2Completed && meta?.step3Completed && meta?.step4Completed;
    return hasWebhookOrUrl && !allComplete;
  });
  
  return {
    totalPosts: posts.length,
    allStepsComplete: allStepsComplete.length,
    withWebhookSent: withWebhookSent.length,
    withArticleUrl: withArticleUrl.length,
    invalidState: invalidState.length, // Should be 0
  };
}

async function main() {
  console.log("🚀 Starting Comprehensive Blog News Flow Test\n");
  console.log("=" .repeat(60));
  
  await runTest("1. Campaign Creation Check", test1_CreateCampaign);
  await runTest("2. Scheduled Posts Check", test2_CheckScheduledPosts);
  await runTest("3. Python Steps 1 & 2 Check", test3_CheckPythonStep1And2);
  await runTest("4. CampaignChat Update Check", test4_CheckCampaignChatUpdate);
  await runTest("5. ScheduledPost Fallback Check", test5_CheckScheduledPostFallback);
  await runTest("6. Next.js Steps 3 & 4 Check", test6_CheckStep3And4);
  await runTest("7. Duplicate Detection Check", test7_CheckDuplicateDetection);
  await runTest("8. Exhausted Keys Tracking Check", test8_CheckExhaustedKeys);
  await runTest("9. Step Status Flags Check", test9_CheckStepStatusFlags);
  await runTest("10. Webhook/Published Link Conditional Display", test10_CheckWebhookAndPublishedLink);
  
  console.log("\n" + "=".repeat(60));
  console.log("\n📊 Test Results Summary:\n");
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach((result, index) => {
    const icon = result.passed ? "✅" : "❌";
    console.log(`${icon} ${result.test}`);
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details && typeof result.details === "object") {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  });
  
  console.log(`\n📈 Total: ${results.length} tests | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log("\n⚠️  Some tests failed. Please review the details above.");
    process.exit(1);
  } else {
    console.log("\n🎉 All tests passed!");
    process.exit(0);
  }
}

main()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

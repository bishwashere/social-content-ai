/**
 * Simple End-to-End Test for Blog News Flow
 * Uses direct MongoDB connection (like Python app) and tests actual flow
 */

import { MongoClient, ObjectId } from "mongodb";

// Read from environment (should be set in shell or .env.local)
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "";
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in environment variables");
  console.error("   Set it: export MONGODB_URI='your-connection-string'");
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);
const dbName = process.env.MONGODB_DB_NAME || "social-content-ai";

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
    if (result && typeof result === "object") {
      console.log(`   Details: ${JSON.stringify(result, null, 2)}`);
    }
  } catch (error: any) {
    results.push({ test: testName, passed: false, error: error.message, details: error });
    console.log(`❌ FAILED: ${testName} - ${error.message}`);
  }
}

async function test1_CheckCampaigns() {
  const db = client.db(dbName);
  const campaigns = db.collection("campaign-planners");
  
  const blogNewsCampaigns = await campaigns.find({ goal: "Blog News" }).toArray();
  
  if (blogNewsCampaigns.length === 0) {
    throw new Error("No Blog News campaigns found. Please create one first via UI.");
  }
  
  return {
    campaignsFound: blogNewsCampaigns.length,
    sampleCampaign: {
      id: blogNewsCampaigns[0]._id.toString(),
      name: blogNewsCampaigns[0].name,
      hasAutoPost: blogNewsCampaigns[0].autoPostEnabled,
    },
  };
}

async function test2_CheckScheduledPosts() {
  const db = client.db(dbName);
  const posts = db.collection("scheduled-posts");
  
  const allPosts = await posts.find({}).toArray();
  const blogNewsPosts = allPosts.filter(p => (p.meta as any)?.type === "blog-news");
  
  if (blogNewsPosts.length === 0) {
    throw new Error("No scheduled posts found for blog-news. Create a campaign with auto-post enabled.");
  }
  
  return {
    totalPosts: allPosts.length,
    blogNewsPosts: blogNewsPosts.length,
    samplePost: {
      id: blogNewsPosts[0]._id.toString(),
      date: blogNewsPosts[0].date,
      status: blogNewsPosts[0].status,
      step1Completed: (blogNewsPosts[0].meta as any)?.step1Completed,
      step2Completed: (blogNewsPosts[0].meta as any)?.step2Completed,
      step3Completed: (blogNewsPosts[0].meta as any)?.step3Completed,
      step4Completed: (blogNewsPosts[0].meta as any)?.step4Completed,
      hasBlog: !!(blogNewsPosts[0].meta as any)?.blog,
    },
  };
}

async function test3_CheckPythonSteps1And2() {
  const db = client.db(dbName);
  const posts = db.collection("scheduled-posts");
  
  const allPosts = await posts.find({ date: { $lte: new Date() } }).toArray();
  const blogNewsPosts = allPosts.filter(p => (p.meta as any)?.type === "blog-news");
  
  const step1Completed = blogNewsPosts.filter(p => (p.meta as any)?.step1Completed === true);
  const step2Completed = blogNewsPosts.filter(p => (p.meta as any)?.step2Completed === true);
  const withBlog = step2Completed.filter(p => (p.meta as any)?.blog);
  
  if (step1Completed.length === 0) {
    throw new Error("No posts with Step 1 completed. Run Python cron to process posts.");
  }
  
  if (step2Completed.length === 0) {
    throw new Error("No posts with Step 2 completed. Run Python cron to generate blogs.");
  }
  
  return {
    totalBlogNewsPosts: blogNewsPosts.length,
    step1Completed: step1Completed.length,
    step2Completed: step2Completed.length,
    withBlog: withBlog.length,
  };
}

async function test4_CheckCampaignChatUpdate() {
  const db = client.db(dbName);
  const chats = db.collection("campaign-chats");
  
  const allChats = await chats.find({}).toArray();
  const chatsWithBlog = allChats.filter(chat => {
    const contents = chat.contents as any;
    return contents?.blog;
  });
  
  if (chatsWithBlog.length === 0) {
    throw new Error("No CampaignChat entries have blog content. Python should update CampaignChat after Step 2.");
  }
  
  return {
    totalChats: allChats.length,
    chatsWithBlog: chatsWithBlog.length,
    sampleChat: chatsWithBlog[0] ? {
      id: chatsWithBlog[0]._id.toString(),
      plannerId: chatsWithBlog[0].plannerId?.toString(),
      day: chatsWithBlog[0].day,
      hasBlog: !!(chatsWithBlog[0].contents as any)?.blog,
    } : null,
  };
}

async function test5_CheckScheduledPostFallback() {
  const db = client.db(dbName);
  const posts = db.collection("scheduled-posts");
  
  const allPosts = await posts.find({}).toArray();
  const postsWithBlog = allPosts.filter(p => {
    const meta = p.meta as any;
    return meta?.type === "blog-news" && meta?.blog;
  });
  
  if (postsWithBlog.length === 0) {
    throw new Error("No ScheduledPost entries have blog in meta (fallback source). Python should save blog to post.meta.");
  }
  
  return {
    postsWithBlogInMeta: postsWithBlog.length,
    sample: postsWithBlog[0] ? {
      id: postsWithBlog[0]._id.toString(),
      hasBlog: !!(postsWithBlog[0].meta as any)?.blog,
      blogTitle: (postsWithBlog[0].meta as any)?.blog?.title,
    } : null,
  };
}

async function test6_CheckNextJsSteps3And4() {
  const db = client.db(dbName);
  const posts = db.collection("scheduled-posts");
  
  const allPosts = await posts.find({}).toArray();
  const blogNewsPosts = allPosts.filter(p => (p.meta as any)?.type === "blog-news");
  
  const step3Completed = blogNewsPosts.filter(p => (p.meta as any)?.step3Completed === true);
  const step4Completed = blogNewsPosts.filter(p => (p.meta as any)?.step4Completed === true);
  const webhookSent = blogNewsPosts.filter(p => (p.meta as any)?.webhookSent === true);
  const hasArticleUrl = blogNewsPosts.filter(p => (p.meta as any)?.articleUrl);
  
  return {
    totalPosts: blogNewsPosts.length,
    step3Completed: step3Completed.length,
    step4Completed: step4Completed.length,
    webhookSent: webhookSent.length,
    hasArticleUrl: hasArticleUrl.length,
  };
}

async function test7_CheckDuplicateDetection() {
  const db = client.db(dbName);
  const posts = db.collection("scheduled-posts");
  
  const allPosts = await posts.find({}).toArray();
  const blogNewsPosts = allPosts.filter(p => (p.meta as any)?.type === "blog-news");
  
  const withArticleId = blogNewsPosts.filter(p => (p.meta as any)?.articleId);
  const articleIds = new Set(withArticleId.map(p => (p.meta as any)?.articleId));
  
  // Check for duplicates (same articleId used multiple times)
  const articleIdCounts = new Map<string, number>();
  withArticleId.forEach(p => {
    const articleId = (p.meta as any)?.articleId;
    articleIdCounts.set(articleId, (articleIdCounts.get(articleId) || 0) + 1);
  });
  
  const duplicates = Array.from(articleIdCounts.entries()).filter(([_, count]) => count > 1);
  
  return {
    totalPosts: blogNewsPosts.length,
    withArticleId: withArticleId.length,
    uniqueArticleIds: articleIds.size,
    duplicateArticleIds: duplicates.length,
    duplicateDetails: duplicates.map(([id, count]) => ({ articleId: id, usedCount: count })),
  };
}

async function test8_CheckExhaustedKeys() {
  const db = client.db(dbName);
  const keyStates = db.collection("gemini-api-key-states");
  
  const exhaustedKeys = await keyStates.find({ exhausted: true }).toArray();
  
  return {
    exhaustedKeysCount: exhaustedKeys.length,
    keys: exhaustedKeys.map(k => ({
      keyName: k.keyName,
      exhaustedAt: k.exhaustedAt,
      retryAfter: k.retryAfter,
      lastError: k.lastError,
    })),
  };
}

async function test9_CheckStepStatusFlags() {
  const db = client.db(dbName);
  const posts = db.collection("scheduled-posts");
  
  const allPosts = await posts.find({}).toArray();
  const blogNewsPosts = allPosts.filter(p => (p.meta as any)?.type === "blog-news").slice(0, 10);
  
  const statusCheck = blogNewsPosts.map(p => {
    const meta = p.meta as any;
    return {
      id: p._id.toString(),
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
    postsChecked: blogNewsPosts.length,
    statusBreakdown: statusCheck,
  };
}

async function test10_CheckWebhookAndPublishedLink() {
  const db = client.db(dbName);
  const posts = db.collection("scheduled-posts");
  
  const allPosts = await posts.find({}).toArray();
  const blogNewsPosts = allPosts.filter(p => (p.meta as any)?.type === "blog-news");
  
  // Check if webhook/published link are only shown when all steps complete
  const allStepsComplete = blogNewsPosts.filter(p => {
    const meta = p.meta as any;
    return meta?.step1Completed && meta?.step2Completed && meta?.step3Completed && meta?.step4Completed;
  });
  
  const withWebhookSent = allStepsComplete.filter(p => (p.meta as any)?.webhookSent === true);
  const withArticleUrl = allStepsComplete.filter(p => (p.meta as any)?.articleUrl);
  
  // Check for posts that have webhook/articleUrl but not all steps complete (shouldn't happen)
  const invalidState = blogNewsPosts.filter(p => {
    const meta = p.meta as any;
    const hasWebhookOrUrl = meta?.webhookSent || meta?.articleUrl;
    const allComplete = meta?.step1Completed && meta?.step2Completed && meta?.step3Completed && meta?.step4Completed;
    return hasWebhookOrUrl && !allComplete;
  });
  
  return {
    totalPosts: blogNewsPosts.length,
    allStepsComplete: allStepsComplete.length,
    withWebhookSent: withWebhookSent.length,
    withArticleUrl: withArticleUrl.length,
    invalidState: invalidState.length, // Should be 0
    invalidStateDetails: invalidState.map(p => ({
      id: p._id.toString(),
      webhookSent: (p.meta as any)?.webhookSent,
      articleUrl: (p.meta as any)?.articleUrl,
      steps: {
        step1: (p.meta as any)?.step1Completed,
        step2: (p.meta as any)?.step2Completed,
        step3: (p.meta as any)?.step3Completed,
        step4: (p.meta as any)?.step4Completed,
      },
    })),
  };
}

async function main() {
  console.log("🚀 Starting Simple Blog News Flow Test (Direct MongoDB)\n");
  console.log("=".repeat(60));
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");
    
    await runTest("1. Campaign Creation Check", test1_CheckCampaigns);
    await runTest("2. Scheduled Posts Check", test2_CheckScheduledPosts);
    await runTest("3. Python Steps 1 & 2 Check", test3_CheckPythonSteps1And2);
    await runTest("4. CampaignChat Update Check", test4_CheckCampaignChatUpdate);
    await runTest("5. ScheduledPost Fallback Check", test5_CheckScheduledPostFallback);
    await runTest("6. Next.js Steps 3 & 4 Check", test6_CheckNextJsSteps3And4);
    await runTest("7. Duplicate Detection Check", test7_CheckDuplicateDetection);
    await runTest("8. Exhausted Keys Tracking Check", test8_CheckExhaustedKeys);
    await runTest("9. Step Status Flags Check", test9_CheckStepStatusFlags);
    await runTest("10. Webhook/Published Link Conditional Display", test10_CheckWebhookAndPublishedLink);
    
    console.log("\n" + "=".repeat(60));
    console.log("\n📊 Test Results Summary:\n");
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    results.forEach((result) => {
      const icon = result.passed ? "✅" : "❌";
      console.log(`${icon} ${result.test}`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log(`\n📈 Total: ${results.length} tests | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
    
    if (failed > 0) {
      console.log("\n⚠️  Some tests failed. Please review the details above.");
      console.log("\n💡 To test the full flow:");
      console.log("   1. Create a Blog News campaign via UI");
      console.log("   2. Run Python cron: cd python-app && python main.py");
      console.log("   3. Run Next.js cron: curl http://localhost:3000/api/post");
      console.log("   4. Run this test again");
      process.exit(1);
    } else {
      console.log("\n🎉 All tests passed!");
      process.exit(0);
    }
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();

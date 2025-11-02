/**
 * Facebook API Test Script
 * 
 * This script:
 * 1. Fetches Facebook OAuth providers from the database
 * 2. Tests the Facebook API connection using stored tokens
 * 3. Fetches and parses Facebook post data
 * 4. Analyzes what data we're currently getting vs. what's available
 * 
 * Usage:
 *   pnpm test:facebook [providerId]
 *   OR
 *   npx tsx scripts/test-facebook-api.ts [providerId]
 * 
 * If providerId is provided, it will test that specific provider.
 * Otherwise, it will test all Facebook providers found in the database.
 * 
 * Environment Variables Required:
 *   - DATABASE_URL: MongoDB connection string
 *   - AUTH_FACEBOOK_ID: Facebook App ID (optional, for token exchange)
 *   - AUTH_FACEBOOK_SECRET: Facebook App Secret (optional, for token exchange)
 */

import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

// Types for Facebook API responses
interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  shares?: {
    count: number;
  };
  reactions?: {
    summary: {
      total_count: number;
    };
    data?: Array<{
      type: string;
    }>;
  };
  comments?: {
    summary: {
      total_count: number;
    };
    data?: Array<any>;
  };
  insights?: {
    data: Array<{
      name: string;
      title: string;
      values: Array<{
        value: number;
      }>;
    }>;
    paging?: {
      next?: string;
    };
  };
  type?: string;
  story?: string;
  permalink_url?: string;
  full_picture?: string;
  link?: string;
  attachments?: {
    data: Array<{
      type: string;
      media?: {
        image?: {
          src: string;
        };
      };
      subattachments?: {
        data: Array<any>;
      };
    }>;
  };
}

interface FacebookPageInfo {
  id: string;
  name: string;
  category: string;
  followers_count?: number;
  fan_count?: number;
  likes?: number;
  access_token: string;
}

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log("\n");
  log("=".repeat(80), "cyan");
  log(title, "bright");
  log("=".repeat(80), "cyan");
}

function logSubsection(title: string) {
  console.log("\n");
  log(`--- ${title} ---`, "yellow");
}

/**
 * Fetch Facebook OAuth providers from database
 */
async function getFacebookProviders(providerId?: string) {
  const where: any = {
    platform: "facebook",
  };

  if (providerId) {
    where.id = providerId;
  }

  const providers = await prisma.oauthProvider.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      projectToOAuthProviders: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      pagePosts: {
        orderBy: {
          date: "desc",
        },
        take: 5, // Just to see if we have posts in DB
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return providers;
}

/**
 * Fetch page information from Facebook API
 */
async function getPageInfo(pageId: string, accessToken: string): Promise<FacebookPageInfo | null> {
  try {
    const url = `https://graph.facebook.com/v23.0/${pageId}`;
    const params = {
      access_token: accessToken,
      fields: "id,name,category,followers_count,fan_count,likes",
    };

    const response = await axios.get(url, { params });
    return {
      ...response.data,
      access_token: accessToken,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log(`❌ Error fetching page info: ${error.response?.status} ${error.response?.statusText}`, "red");
      if (error.response?.data) {
        console.log(JSON.stringify(error.response.data, null, 2));
      }
    }
    return null;
  }
}

/**
 * Test access token validity
 */
async function testAccessToken(accessToken: string): Promise<boolean> {
  try {
    const url = "https://graph.facebook.com/v23.0/me";
    const response = await axios.get(url, {
      params: { access_token: accessToken },
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * Fetch posts with extended fields to see what's available
 */
async function fetchPostsWithExtendedFields(
  pageId: string,
  accessToken: string,
  limit: number = 10
): Promise<FacebookPost[]> {
  // Current fields we're fetching
  const currentFields = [
    "id",
    "message",
    "shares",
    "created_time",
    "reactions.type(LIKE).summary(total_count).limit(0)",
    "comments.summary(total_count).limit(0)",
    "insights.metric(post_impressions,post_impressions_unique)",
  ].join(",");

  // First, fetch with the same fields we use in production (which we know works)
  const productionFields = currentFields;
  
  // Then try to fetch additional insights via separate API call
  // Extended fields - using exact same as production first
  const extendedFields = [
    "id",
    "message",
    "created_time",
    "type",
    "permalink_url",
    "full_picture",
    "link",
    "story",
    "shares",
    "reactions.type(LIKE).summary(total_count).limit(0)",
    "comments.summary(total_count).limit(0)",
    "insights.metric(post_impressions,post_impressions_unique)",
  ].join(",");

  // Use the exact same fields string as production to ensure it works
  const productionFieldsString = "id,message,shares,created_time,reactions.type(LIKE).summary(total_count).limit(0),comments.summary(total_count).limit(0),insights.metric(post_impressions,post_impressions_unique)";
  
  const url = `https://graph.facebook.com/v23.0/${pageId}/posts`;
  const params = {
    access_token: accessToken,
    fields: productionFieldsString, // Use production fields first
    limit: limit,
  };

  try {
    const allPosts: FacebookPost[] = [];
    let nextUrl: string | undefined = `${url}?${new URLSearchParams(params as any).toString()}`;

    while (nextUrl && allPosts.length < limit) {
      const response: { data: { data: FacebookPost[]; paging?: { next?: string } } } = await axios.get<{ data: FacebookPost[]; paging?: { next?: string } }>(nextUrl);
      const data = response.data;

      if (!data.data || data.data.length === 0) {
        break;
      }

      allPosts.push(...data.data);

      // Check for insights paging (insights might be in a separate request)
      nextUrl = data.paging?.next;

      if (!nextUrl || allPosts.length >= limit) {
        break;
      }
    }

    return allPosts.slice(0, limit);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log(`❌ Error fetching posts: ${error.response?.status} ${error.response?.statusText}`, "red");
      if (error.response?.data) {
        console.log(JSON.stringify(error.response.data, null, 2));
      }
    } else {
      log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`, "red");
    }
    return [];
  }
}

/**
 * Fetch insights for a specific post
 */
async function fetchPostInsights(postId: string, accessToken: string) {
  try {
    const url = `https://graph.facebook.com/v23.0/${postId}/insights`;
    const params = {
      access_token: accessToken,
      metric: [
        "post_impressions",
        "post_impressions_unique",
        "post_engaged_users",
        "post_clicks",
        "post_reactions_by_type_total",
        "post_negative_feedback",
        "post_reach",
        "post_story_adds",
        "post_story_removes",
      ].join(","),
    };

    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      log(`❌ Error fetching insights: ${error.response?.status} ${error.response?.statusText}`, "red");
      if (error.response?.data) {
        console.log(JSON.stringify(error.response.data, null, 2));
      }
    }
    return null;
  }
}

/**
 * Analyze what data we're getting vs. what's available
 */
function analyzePostData(post: FacebookPost, insights?: any) {
  const analysis: Record<string, any> = {
    "Currently Stored": {},
    "Available but Not Stored": {},
    "Available Insights": {},
  };

  // What we currently store
  analysis["Currently Stored"] = {
    postId: post.id,
    message: post.message || "No message",
    date: post.created_time,
    shares: post.shares?.count || 0,
    likes: post.reactions?.summary?.total_count || 0,
    comments: post.comments?.summary?.total_count || 0,
    impressions: post.insights?.data?.find((i) => i.name === "post_impressions")?.values?.[0]?.value,
    uniqueImpressions: post.insights?.data?.find((i) => i.name === "post_impressions_unique")?.values?.[0]?.value,
  };

  // What's available but we're not storing
  if (post.type) analysis["Available but Not Stored"].type = post.type;
  if (post.story) analysis["Available but Not Stored"].story = post.story;
  if (post.permalink_url) analysis["Available but Not Stored"].permalink_url = post.permalink_url;
  if (post.full_picture) analysis["Available but Not Stored"].full_picture = post.full_picture;
  if (post.link) analysis["Available but Not Stored"].link = post.link;
  
  // Reaction breakdowns
  if (post.reactions?.data) {
    const reactionsByType: Record<string, number> = {};
    // Note: This is a simplified example - actual API might structure reactions differently
    analysis["Available but Not Stored"].reactionBreakdown = "Available (but requires separate query)";
  }

  // Attachments/media
  if (post.attachments?.data?.length) {
    analysis["Available but Not Stored"].hasMedia = true;
    analysis["Available but Not Stored"].mediaTypes = post.attachments.data.map((a) => a.type);
  }

  // Additional insights
  if (insights?.data) {
    insights.data.forEach((insight: any) => {
      analysis["Available Insights"][insight.name] = insight.values?.[0]?.value || "N/A";
    });
  } else if (post.insights?.data) {
    post.insights.data.forEach((insight) => {
      analysis["Available Insights"][insight.name] = insight.values?.[0]?.value || "N/A";
    });
  }

  return analysis;
}

/**
 * Main test function
 */
async function main() {
  const providerId = process.argv[2];

  logSection("Facebook API Test Script");

  // Fetch providers
  logSubsection("Fetching Facebook OAuth Providers");
  const providers = await getFacebookProviders(providerId);

  if (providers.length === 0) {
    log("❌ No Facebook providers found in database.", "red");
    if (providerId) {
      log(`   Looking for provider ID: ${providerId}`, "yellow");
    }
    process.exit(1);
  }

  log(`✅ Found ${providers.length} Facebook provider(s)`, "green");

  // Test each provider
  for (const provider of providers) {
    logSection(`Testing Provider: ${provider.pageName || provider.id}`);

    log(`Provider ID: ${provider.id}`, "cyan");
    log(`Page ID: ${provider.pageId || "N/A"}`, "cyan");
    log(`User: ${provider.user?.name || "N/A"} (${provider.user?.email || "N/A"})`, "cyan");
    log(`Projects: ${provider.projectToOAuthProviders.length}`, "cyan");
    provider.projectToOAuthProviders.forEach((pto) => {
      log(`  - ${pto.project?.name || "Unknown"} (${pto.projectId})`, "cyan");
    });
    log(`Posts in DB: ${provider.pagePosts.length}`, "cyan");

    if (!provider.pageId || !provider.accessToken) {
      log("⚠️  Missing pageId or accessToken, skipping API test", "yellow");
      continue;
    }

    // Test access token
    logSubsection("Testing Access Token");
    const tokenValid = await testAccessToken(provider.accessToken);
    if (!tokenValid) {
      log("❌ Access token is invalid or expired", "red");
      log("   You may need to refresh the token or re-authenticate.", "yellow");
      continue;
    }
    log("✅ Access token is valid", "green");

    // Get page info
    logSubsection("Page Information");
    const pageInfo = await getPageInfo(provider.pageId, provider.accessToken);
    if (pageInfo) {
      console.log(JSON.stringify(pageInfo, null, 2));
    }

    // Fetch posts with extended fields
    logSubsection("Fetching Posts (Extended Fields)");
    log("Fetching first 5 posts to analyze available data...", "blue");
    const posts = await fetchPostsWithExtendedFields(provider.pageId, provider.accessToken, 5);

    if (posts.length === 0) {
      log("⚠️  No posts found or error fetching posts", "yellow");
      continue;
    }

    log(`✅ Fetched ${posts.length} post(s)`, "green");

    // Analyze each post
    for (let i = 0; i < Math.min(posts.length, 3); i++) {
      const post = posts[i];
      logSubsection(`Post ${i + 1}: ${post.id}`);

      // Try to fetch detailed insights
      log("Fetching detailed insights...", "blue");
      const insights = await fetchPostInsights(post.id, provider.accessToken);

      const analysis = analyzePostData(post, insights);
      console.log(JSON.stringify(analysis, null, 2));

      // Show raw post data (first post only)
      if (i === 0) {
        logSubsection("Raw Post Data (First Post - Sample)");
        console.log(JSON.stringify(post, null, 2));
      }
    }

    // Summary
    logSubsection("Summary");
    log("Currently we fetch and store:", "green");
    log("  - Post ID, message, date, shares, likes (total reactions), comments, impressions, unique impressions", "cyan");

    log("\nAdditional data available from Facebook API:", "yellow");
    log("  - Post type (photo, video, link, status, etc.)", "cyan");
    log("  - Story text", "cyan");
    log("  - Permalink URL", "cyan");
    log("  - Full picture URL", "cyan");
    log("  - Link (if it's a link post)", "cyan");
    log("  - Reaction breakdowns (like, love, wow, haha, sorry, anger)", "cyan");
    log("  - Media attachments", "cyan");
    log("  - Post reach", "cyan");
    log("  - Engaged users", "cyan");
    log("  - Post clicks", "cyan");
    log("  - Negative feedback", "cyan");
    log("  - Story adds/removes (for story posts)", "cyan");
  }

  logSection("Test Complete");
  await prisma.$disconnect();
}

// Run the script
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});


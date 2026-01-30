/**
 * Test script to manually trigger Instagram posting for a specific scheduled post
 * 
 * Usage: npx tsx scripts/test-instagram-post.ts <scheduledPostId>
 * 
 * This script will:
 * 1. Fetch the scheduled post from the database
 * 2. Show the OAuth provider details (including isStandalone)
 * 3. Attempt to post to Instagram
 * 4. Show detailed logs
 */

import { prisma } from "../src/lib/prisma";
import { Instagram } from "../src/lib/3rd-providers/instagram";
import { decryptToken } from "../src/backend-apis/encryption";

async function main() {
  const scheduledPostId = process.argv[2];
  
  if (!scheduledPostId) {
    console.log("Usage: npx tsx scripts/test-instagram-post.ts <scheduledPostId>");
    console.log("\nTo find a scheduled post ID, run:");
    console.log("  npx tsx scripts/test-instagram-post.ts --list");
    
    if (process.argv[2] === "--list") {
      const posts = await prisma.scheduledPost.findMany({
        where: {
          platform: "instagram",
        },
        orderBy: { date: "desc" },
        take: 10,
        include: {
          project: {
            include: {
              projectToOAuthProviders: {
                include: {
                  oauthProvider: true,
                },
              },
            },
          },
        },
      });
      
      console.log("\n📋 Recent Instagram scheduled posts:");
      for (const post of posts) {
        const oauthProvider = post.project?.projectToOAuthProviders.find(
          (p) => p.oauthProvider?.platform === "instagram"
        )?.oauthProvider;
        
        console.log(`\n  ID: ${post.id}`);
        console.log(`  Status: ${post.status}`);
        console.log(`  Date: ${post.date}`);
        console.log(`  Media: ${post.media || "(none)"}`);
        console.log(`  OAuth Provider:`);
        console.log(`    - ID: ${oauthProvider?.id || "N/A"}`);
        console.log(`    - Page Name: ${oauthProvider?.pageName || "N/A"}`);
        console.log(`    - Page ID: ${oauthProvider?.pageId || "N/A"}`);
        console.log(`    - isStandalone: ${oauthProvider?.isStandalone}`);
      }
    }
    
    process.exit(0);
  }
  
  console.log(`\n🔍 Fetching scheduled post: ${scheduledPostId}`);
  
  const post = await prisma.scheduledPost.findUnique({
    where: { id: scheduledPostId },
    include: {
      project: {
        include: {
          projectToOAuthProviders: {
            include: {
              oauthProvider: true,
            },
          },
        },
      },
    },
  });
  
  if (!post) {
    console.error("❌ Scheduled post not found");
    process.exit(1);
  }
  
  console.log("\n📋 Scheduled Post Details:");
  console.log(`  ID: ${post.id}`);
  console.log(`  Platform: ${post.platform}`);
  console.log(`  Status: ${post.status}`);
  console.log(`  Date: ${post.date}`);
  console.log(`  Content: ${post.content?.substring(0, 100)}...`);
  console.log(`  Media: ${post.media || "(none)"}`);
  
  const oauthProvider = post.project?.projectToOAuthProviders.find(
    (p) => p.oauthProvider?.platform === "instagram"
  )?.oauthProvider;
  
  if (!oauthProvider) {
    console.error("❌ No Instagram OAuth provider found for this project");
    process.exit(1);
  }
  
  console.log("\n🔐 OAuth Provider Details:");
  console.log(`  ID: ${oauthProvider.id}`);
  console.log(`  Page Name: ${oauthProvider.pageName}`);
  console.log(`  Page ID: ${oauthProvider.pageId}`);
  console.log(`  isStandalone: ${oauthProvider.isStandalone}`);
  console.log(`  isStandalone type: ${typeof oauthProvider.isStandalone}`);
  
  const expectedEndpoint = oauthProvider.isStandalone 
    ? "https://graph.instagram.com/v23.0" 
    : "https://graph.facebook.com/v23.0";
  console.log(`  Expected API Endpoint: ${expectedEndpoint}`);
  
  if (!post.media) {
    console.error("\n❌ No media found for this post. Instagram requires media.");
    process.exit(1);
  }
  
  console.log("\n🚀 Attempting to post to Instagram...");
  console.log("(This is a DRY RUN - uncomment the actual post code to execute)\n");
  
  // Create Instagram client
  const instagram = new Instagram({
    accessToken: oauthProvider.accessToken,
    isStandalone: oauthProvider.isStandalone ?? false,
  });
  
  // DRY RUN - just show what would happen
  console.log("📸 Would call Instagram API with:");
  console.log(`  Endpoint: ${expectedEndpoint}/${oauthProvider.pageId}/media`);
  console.log(`  Media: ${post.media}`);
  console.log(`  Caption: ${post.content?.substring(0, 50)}...`);
  
  // UNCOMMENT TO ACTUALLY POST:
  // const result = await instagram.postToInstagram(
  //   post.content || "",
  //   oauthProvider.pageId || "",
  //   post.media
  // );
  // console.log("\n📸 Result:", result);
  
  console.log("\n✅ Dry run complete. To actually post, uncomment the code in the script.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

/**
 * Check platform posts and impressions for a specific user
 * Usage: npx tsx scripts/check-user-impressions.ts [email]
 */

import { prisma } from "../src/lib/prisma";

async function checkUserImpressions(email: string) {
  try {
    console.log(`\n🔍 Checking impressions for user: ${email}\n`);

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        oauthProviders: {
          include: {
            pagePosts: true,
            projectToOAuthProviders: {
              include: {
                project: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      console.log(`❌ User not found: ${email}\n`);
      return;
    }

    console.log(`✅ User found: ${user.name} (${user.id})\n`);
    console.log(`📊 OAuth Providers: ${user.oauthProviders.length}\n`);

    if (user.oauthProviders.length === 0) {
      console.log(`❌ No OAuth providers found for this user\n`);
      return;
    }

    let totalPosts = 0;
    let postsWithImpressions = 0;
    let postsWithNullImpressions = 0;
    let postsWithZeroImpressions = 0;

    for (const provider of user.oauthProviders) {
      const linkedProjects = provider.projectToOAuthProviders.map(
        (p) => p.project?.name || "Unknown"
      );

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🔗 Provider: ${provider.platform} - ${provider.pageName}`);
      console.log(`   Provider ID: ${provider.id}`);
      console.log(`   Page ID: ${provider.pageId || "N/A"}`);
      console.log(`   Linked Projects: ${linkedProjects.join(", ") || "None"}`);
      console.log(`   Total Posts: ${provider.pagePosts.length}`);

      if (provider.pagePosts.length === 0) {
        console.log(`   ⚠️  No posts in database for this provider`);
        continue;
      }

      // Analyze impressions
      const posts = provider.pagePosts;
      const withImpressions = posts.filter(
        (p) => p.impressions !== null && p.impressions > 0
      );
      const withNullImpressions = posts.filter((p) => p.impressions === null);
      const withZeroImpressions = posts.filter((p) => p.impressions === 0);

      totalPosts += posts.length;
      postsWithImpressions += withImpressions.length;
      postsWithNullImpressions += withNullImpressions.length;
      postsWithZeroImpressions += withZeroImpressions.length;

      console.log(`\n   📈 Impressions Analysis:`);
      console.log(`      Posts with impressions > 0: ${withImpressions.length}`);
      console.log(`      Posts with impressions = 0: ${withZeroImpressions.length}`);
      console.log(`      Posts with impressions = null: ${withNullImpressions.length}`);

      // Show sample posts
      if (posts.length > 0) {
        console.log(`\n   📝 Sample Posts (up to 5):`);
        posts.slice(0, 5).forEach((post, idx) => {
          console.log(`      ${idx + 1}. Post ID: ${post.postId.substring(0, 30)}...`);
          console.log(`         Date: ${post.date.toISOString()}`);
          console.log(`         Likes: ${post.likes}`);
          console.log(`         Comments: ${post.comments}`);
          console.log(`         Shares: ${post.shares}`);
          console.log(
            `         Impressions: ${post.impressions === null ? "NULL" : post.impressions}`
          );
          console.log(
            `         Unique Impressions: ${post.uniqueImpressions === null ? "NULL" : post.uniqueImpressions}`
          );
          console.log("");
        });
      }

      // Show top performing posts by impressions
      if (withImpressions.length > 0) {
        console.log(`\n   🏆 Top Posts by Impressions:`);
        const sortedByImpressions = [...withImpressions].sort(
          (a, b) => (b.impressions || 0) - (a.impressions || 0)
        );
        sortedByImpressions.slice(0, 3).forEach((post, idx) => {
          console.log(
            `      ${idx + 1}. ${post.impressions} impressions (${post.likes} likes, ${post.comments} comments)`
          );
        });
      }
    }

    // Summary
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n📊 SUMMARY FOR ${email}:`);
    console.log(`   Total Posts in Database: ${totalPosts}`);
    console.log(`   Posts with impressions > 0: ${postsWithImpressions}`);
    console.log(`   Posts with impressions = 0: ${postsWithZeroImpressions}`);
    console.log(`   Posts with impressions = null: ${postsWithNullImpressions}`);

    if (postsWithNullImpressions > 0) {
      console.log(
        `\n   ⚠️  ${postsWithNullImpressions} posts have NULL impressions - these will trigger API refresh`
      );
    }

    if (totalPosts === 0) {
      console.log(
        `\n   ⚠️  No posts in database - analytics will try to fetch from APIs`
      );
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2] || "bishwashere@gmail.com";
checkUserImpressions(email);

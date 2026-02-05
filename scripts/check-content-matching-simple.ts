/**
 * Quick check if ScheduledPost content matches PlatformPost content (first few lines)
 */

import { prisma } from "../src/lib/prisma";

async function quickContentCheck(projectId?: string) {
  try {
    console.log(`\n🔍 Quick content matching check (first 100 chars)\n`);

    // Get recent successful scheduled posts
    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: {
        ...(projectId && { projectId }),
        status: 'success',
      },
      select: {
        id: true,
        content: true,
        platform: true,
        date: true,
        oauthProviderId: true,
        meta: true,
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    console.log(`📊 Checking ${scheduledPosts.length} successful scheduled posts\n`);

    // Get platform posts - ALL of them, regardless of OAuth provider
    const platformPosts = await prisma.platformPost.findMany({
      select: {
        id: true,
        content: true,
        date: true,
        oauthProviderId: true,
        likes: true,
        impressions: true,
      },
      orderBy: { date: 'desc' },
      take: 200, // Get more to increase chance of matches
    });

    console.log(`📊 Checking against ${platformPosts.length} platform posts\n`);

    let matched = 0;
    let unmatched = 0;

    console.log(`\n🔎 Results:\n`);

    for (const scheduled of scheduledPosts) {
      const scheduledContent = scheduled.content.trim();
      const preview = scheduledContent.substring(0, 100);
      
      // Find platform post with similar content (ignore OAuth provider - just match content!)
      const match = platformPosts.find(pp => {
        if (!pp.content) return false;
        const ppContent = pp.content.trim();
        
        // Try exact match on first 100 chars
        if (ppContent.substring(0, 100) === preview) return true;
        
        // Try exact match on first 50 chars (more forgiving)
        if (ppContent.substring(0, 50) === scheduledContent.substring(0, 50)) return true;
        
        // Try fuzzy match - check if platform content starts with scheduled content beginning
        const scheduledStart = scheduledContent.substring(0, 80).toLowerCase();
        const ppStart = ppContent.substring(0, 80).toLowerCase();
        return scheduledStart === ppStart;
      });

      if (match) {
        matched++;
        console.log(`✅ MATCH - "${preview.substring(0, 60)}..."`);
        console.log(`   → Platform post has ${match.likes} likes, ${match.impressions || 0} impressions`);
        console.log(`   → Date diff: ${Math.abs(new Date(match.date).getTime() - new Date(scheduled.date).getTime()) / (1000 * 60 * 60)} hours`);
      } else {
        unmatched++;
        console.log(`❌ NO MATCH - "${preview.substring(0, 60)}..."`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Matched: ${matched}`);
    console.log(`   ❌ No match: ${unmatched}`);
    console.log(`   📈 Match rate: ${(matched / scheduledPosts.length * 100).toFixed(1)}%`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

const projectId = process.argv[2];
quickContentCheck(projectId);

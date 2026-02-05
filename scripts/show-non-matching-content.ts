/**
 * Show content of non-matching posts to debug why they don't match
 */

import { prisma } from "../src/lib/prisma";

async function showNonMatchingContent(projectId: string) {
  try {
    console.log(`\n🔍 Analyzing non-matching posts for project ${projectId}\n`);

    // Get recent successful scheduled posts
    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: {
        projectId,
        status: 'success',
      },
      select: {
        id: true,
        content: true,
        platform: true,
        date: true,
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    console.log(`📊 Found ${scheduledPosts.length} scheduled posts\n`);

    // Get all platform posts
    const platformPosts = await prisma.platformPost.findMany({
      select: {
        id: true,
        content: true,
        date: true,
        likes: true,
        impressions: true,
      },
      orderBy: { date: 'desc' },
      take: 200,
    });

    console.log(`📊 Found ${platformPosts.length} platform posts\n`);

    // Find matches
    const nonMatchingScheduled: any[] = [];
    const nonMatchingPlatform = [...platformPosts];
    
    for (const scheduled of scheduledPosts) {
      const scheduledContent = scheduled.content.trim();
      const preview = scheduledContent.substring(0, 100);
      
      const matchIndex = nonMatchingPlatform.findIndex(pp => {
        if (!pp.content) return false;
        const ppContent = pp.content.trim();
        
        // Try exact match on first 100 chars
        if (ppContent.substring(0, 100) === preview) return true;
        
        // Try exact match on first 50 chars
        if (ppContent.substring(0, 50) === scheduledContent.substring(0, 50)) return true;
        
        // Try fuzzy match
        const scheduledStart = scheduledContent.substring(0, 80).toLowerCase();
        const ppStart = ppContent.substring(0, 80).toLowerCase();
        return scheduledStart === ppStart;
      });

      if (matchIndex === -1) {
        nonMatchingScheduled.push(scheduled);
      } else {
        // Remove matched platform post from list
        nonMatchingPlatform.splice(matchIndex, 1);
      }
    }

    console.log(`\n❌ NON-MATCHING SCHEDULED POSTS (${nonMatchingScheduled.length}):\n`);
    console.log('='.repeat(80));
    
    nonMatchingScheduled.forEach((post, idx) => {
      const preview = post.content.substring(0, 150);
      console.log(`\n${idx + 1}. [${post.platform}] ${post.date.toISOString()}`);
      console.log(`   "${preview}${post.content.length > 150 ? '...' : ''}"`);
    });

    console.log(`\n\n❌ NON-MATCHING PLATFORM POSTS (${nonMatchingPlatform.length}):\n`);
    console.log('='.repeat(80));
    
    nonMatchingPlatform.slice(0, 30).forEach((post, idx) => {
      const preview = post.content?.substring(0, 150) || '[NO CONTENT]';
      console.log(`\n${idx + 1}. ${post.date.toISOString()} (${post.likes} likes, ${post.impressions || 0} impressions)`);
      console.log(`   "${preview}${(post.content?.length || 0) > 150 ? '...' : ''}"`);
    });

    if (nonMatchingPlatform.length > 30) {
      console.log(`\n... and ${nonMatchingPlatform.length - 30} more platform posts`);
    }

    console.log(`\n\n📊 Summary:`);
    console.log(`   Scheduled posts that didn't match: ${nonMatchingScheduled.length}`);
    console.log(`   Platform posts that didn't match: ${nonMatchingPlatform.length}`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

const projectId = process.argv[2];
if (!projectId) {
  console.error('Please provide a project ID');
  process.exit(1);
}

showNonMatchingContent(projectId);

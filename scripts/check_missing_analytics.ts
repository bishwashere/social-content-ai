import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMissingAnalytics() {
  // Get dates for yesterday and day before yesterday
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const dayBeforeYesterday = new Date(now);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
  dayBeforeYesterday.setHours(0, 0, 0, 0);
  
  const endOfYesterday = new Date(yesterday);
  endOfYesterday.setHours(23, 59, 59, 999);

  console.log('📅 Checking for posts published between:');
  console.log(`   Day before yesterday: ${dayBeforeYesterday.toISOString()}`);
  console.log(`   End of yesterday: ${endOfYesterday.toISOString()}`);
  console.log('');

  // Find all scheduled posts with status "success" from the last 2 days
  const publishedPosts = await prisma.scheduledPost.findMany({
    where: {
      status: 'success',
      processedAt: {
        gte: dayBeforeYesterday,
        lte: endOfYesterday,
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      oauthProvider: {
        select: {
          id: true,
          pageId: true,
          platform: true,
        },
      },
    },
    orderBy: {
      processedAt: 'desc',
    },
  });

  console.log(`✅ Found ${publishedPosts.length} published posts in the last 2 days\n`);

  // Group posts by project
  const projectPostsMap = new Map<string, typeof publishedPosts>();
  
  for (const post of publishedPosts) {
    if (!post.project) continue;
    
    const projectId = post.project.id;
    if (!projectPostsMap.has(projectId)) {
      projectPostsMap.set(projectId, []);
    }
    projectPostsMap.get(projectId)!.push(post);
  }

  console.log(`📊 Posts distributed across ${projectPostsMap.size} projects\n`);

  // Check which posts have analytics
  const projectsWithMissingAnalytics: Array<{
    projectName: string;
    projectId: string;
    postsPublished: number;
    postsWithAnalytics: number;
    postsMissingAnalytics: number;
    details: Array<{
      platform: string;
      publishedAt: Date;
      hasAnalytics: boolean;
    }>;
  }> = [];

  for (const [projectId, posts] of projectPostsMap) {
    const projectName = posts[0].project?.name || 'Unknown';
    let postsWithAnalytics = 0;
    const details: Array<{
      platform: string;
      publishedAt: Date;
      hasAnalytics: boolean;
    }> = [];

    for (const post of posts) {
      if (!post.oauthProvider) {
        details.push({
          platform: post.platform,
          publishedAt: post.processedAt!,
          hasAnalytics: false,
        });
        continue;
      }

      // Check if analytics exist for this post in PlatformPost
      // Match by oauthProviderId and date (same day)
      const postDate = post.processedAt!;
      const startOfDay = new Date(postDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(postDate);
      endOfDay.setHours(23, 59, 59, 999);

      const analytics = await prisma.platformPost.findFirst({
        where: {
          oauthProviderId: post.oauthProvider.id,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const hasAnalytics = !!analytics;
      if (hasAnalytics) {
        postsWithAnalytics++;
      }

      details.push({
        platform: post.platform,
        publishedAt: postDate,
        hasAnalytics,
      });
    }

    const postsMissingAnalytics = posts.length - postsWithAnalytics;
    
    if (postsMissingAnalytics > 0) {
      projectsWithMissingAnalytics.push({
        projectName,
        projectId,
        postsPublished: posts.length,
        postsWithAnalytics,
        postsMissingAnalytics,
        details,
      });
    }
  }

  // Sort by number of missing analytics (descending)
  projectsWithMissingAnalytics.sort((a, b) => b.postsMissingAnalytics - a.postsMissingAnalytics);

  console.log('=' .repeat(80));
  console.log('📋 PROJECTS WITH MISSING ANALYTICS');
  console.log('=' .repeat(80));
  console.log('');

  if (projectsWithMissingAnalytics.length === 0) {
    console.log('✨ All projects have complete analytics data! No missing analytics found.');
  } else {
    console.log(`Found ${projectsWithMissingAnalytics.length} projects with missing analytics:\n`);
    
    for (const project of projectsWithMissingAnalytics) {
      console.log(`📦 ${project.projectName}`);
      console.log(`   Project ID: ${project.projectId}`);
      console.log(`   Posts published: ${project.postsPublished}`);
      console.log(`   Posts with analytics: ${project.postsWithAnalytics}`);
      console.log(`   Posts missing analytics: ${project.postsMissingAnalytics}`);
      console.log('   Details:');
      
      for (const detail of project.details) {
        const status = detail.hasAnalytics ? '✅' : '❌';
        const dateStr = detail.publishedAt.toLocaleString();
        console.log(`     ${status} ${detail.platform.padEnd(12)} - ${dateStr}`);
      }
      
      console.log('');
    }

    console.log('=' .repeat(80));
    console.log('📊 SUMMARY');
    console.log('=' .repeat(80));
    console.log(`Total projects with missing analytics: ${projectsWithMissingAnalytics.length}`);
    console.log(`Total posts missing analytics: ${projectsWithMissingAnalytics.reduce((sum, p) => sum + p.postsMissingAnalytics, 0)}`);
    console.log('');
    console.log('Project names with missing analytics:');
    for (const project of projectsWithMissingAnalytics) {
      console.log(`  • ${project.projectName}`);
    }
  }

  await prisma.$disconnect();
}

checkMissingAnalytics().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

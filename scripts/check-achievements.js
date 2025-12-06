const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAchievements() {
  try {
    const userEmail = 'bishwashere@gmail.com';
    
    console.log(`\n🔍 Checking achievements for: ${userEmail}\n`);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, email: true, name: true }
    });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log(`✅ User found: ${user.name} (${user.email})`);
    console.log(`   User ID: ${user.id}\n`);
    
    // Get owned projects
    const ownedProjects = await prisma.projects.findMany({
      where: { userId: user.id },
      select: { id: true, name: true }
    });
    
    console.log(`📁 Owned Projects: ${ownedProjects.length}`);
    ownedProjects.forEach(p => {
      console.log(`   - ${p.name} (${p.id})`);
    });
    
    // Get invited projects
    const invitedProjects = await prisma.invitedUser.findMany({
      where: { userId: user.id },
      include: {
        project: {
          select: { id: true, name: true }
        }
      }
    });
    
    console.log(`\n📁 Invited Projects: ${invitedProjects.length}`);
    invitedProjects.forEach(i => {
      if (i.project) {
        console.log(`   - ${i.project.name} (${i.project.id})`);
      }
    });
    
    const allProjectIds = [
      ...ownedProjects.map(p => p.id),
      ...invitedProjects.map(i => i.project?.id).filter(Boolean)
    ];
    const uniqueProjectIds = Array.from(new Set(allProjectIds));
    
    console.log(`\n📊 Total Unique Project IDs: ${uniqueProjectIds.length}`);
    console.log(`   Project IDs: ${uniqueProjectIds.join(', ')}\n`);
    
    if (uniqueProjectIds.length === 0) {
      console.log('❌ No projects found for this user!');
      return;
    }
    
    // Check campaigns
    const allCampaigns = await prisma.campaignPlanner.findMany({
      select: { id: true, projectId: true, name: true }
    });
    console.log(`\n📅 Total Campaigns in DB: ${allCampaigns.length}`);
    
    const userCampaigns = await prisma.campaignPlanner.findMany({
      where: {
        projectId: { in: uniqueProjectIds }
      },
      select: { id: true, projectId: true, name: true }
    });
    
    const uniqueCampaignProjects = new Set(userCampaigns.map(c => c.projectId));
    console.log(`📅 User's Campaigns: ${userCampaigns.length}`);
    console.log(`📅 Projects with Campaigns: ${uniqueCampaignProjects.size}`);
    userCampaigns.forEach(c => {
      const project = ownedProjects.find(p => p.id === c.projectId) || 
                     invitedProjects.find(i => i.project?.id === c.projectId)?.project;
      console.log(`   - Campaign: ${c.name || 'Untitled'} (Project: ${project?.name || c.projectId})`);
    });
    
    // Check scheduled posts
    const allScheduledPosts = await prisma.scheduledPost.findMany({
      select: { id: true, projectId: true, status: true }
    });
    console.log(`\n📝 Total Scheduled Posts in DB: ${allScheduledPosts.length}`);
    
    const userScheduledPosts = await prisma.scheduledPost.findMany({
      where: {
        projectId: { in: uniqueProjectIds }
      },
      select: { id: true, projectId: true, status: true }
    });
    
    const uniqueScheduledPostProjects = new Set(userScheduledPosts.map(p => p.projectId));
    console.log(`📝 User's Scheduled Posts: ${userScheduledPosts.length}`);
    console.log(`📝 Projects with Scheduled Posts: ${uniqueScheduledPostProjects.size}`);
    console.log(`   Status breakdown:`, {
      pending: userScheduledPosts.filter(p => p.status === 'pending').length,
      success: userScheduledPosts.filter(p => p.status === 'success').length,
      failed: userScheduledPosts.filter(p => p.status === 'failed').length,
      processing: userScheduledPosts.filter(p => p.status === 'processing').length,
    });
    
    // Check platform posts
    const projectOAuthProviders = await prisma.projectToOAuthProvider.findMany({
      where: {
        projectId: { in: uniqueProjectIds }
      },
      select: {
        projectId: true,
        oauthProviderId: true
      }
    });
    
    const oauthProviderIds = Array.from(new Set(projectOAuthProviders.map(p => p.oauthProviderId)));
    console.log(`\n🔗 OAuth Providers linked to projects: ${oauthProviderIds.length}`);
    
    const platformPosts = oauthProviderIds.length > 0 ? await prisma.platformPost.findMany({
      where: {
        oauthProviderId: { in: oauthProviderIds }
      },
      select: {
        id: true,
        oauthProviderId: true
      }
    }) : [];
    
    const oauthProviderToProjectMap = new Map();
    projectOAuthProviders.forEach(p => {
      oauthProviderToProjectMap.set(p.oauthProviderId, p.projectId);
    });
    
    const platformPostProjectIds = platformPosts
      .map(p => oauthProviderToProjectMap.get(p.oauthProviderId))
      .filter(Boolean);
    const uniquePlatformPostProjects = new Set(platformPostProjectIds);
    
    console.log(`📱 Platform Posts: ${platformPosts.length}`);
    console.log(`📱 Projects with Platform Posts: ${uniquePlatformPostProjects.size}`);
    
    // Combine scheduled and platform posts
    const allPostProjects = new Set([
      ...uniqueScheduledPostProjects,
      ...uniquePlatformPostProjects
    ]);
    
    // Check videos
    const allVideos = await prisma.uploadedVideo.findMany({
      where: {
        projectId: { not: null }
      },
      select: { id: true, projectId: true }
    });
    console.log(`\n🎥 Total Videos in DB (with projectId): ${allVideos.length}`);
    
    const userVideos = await prisma.uploadedVideo.findMany({
      where: {
        projectId: { in: uniqueProjectIds }
      },
      select: { id: true, projectId: true }
    });
    
    const uniqueVideoProjects = new Set(userVideos.map(v => v.projectId));
    console.log(`🎥 User's Videos: ${userVideos.length}`);
    console.log(`🎥 Projects with Videos: ${uniqueVideoProjects.size}`);
    
    // Check tracking
    const allTrackings = await prisma.projectTracking.findMany({
      select: { id: true, projectId: true }
    });
    console.log(`\n📊 Total Trackings in DB: ${allTrackings.length}`);
    
    const userTrackings = await prisma.projectTracking.findMany({
      where: {
        projectId: { in: uniqueProjectIds }
      },
      select: { id: true, projectId: true }
    });
    
    const uniqueTrackingProjects = new Set(userTrackings.map(t => t.projectId));
    console.log(`📊 User's Trackings: ${userTrackings.length}`);
    console.log(`📊 Projects with Tracking: ${uniqueTrackingProjects.size}`);
    
    // Final summary
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📈 ACHIEVEMENTS SUMMARY`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Projects with Campaigns: ${uniqueCampaignProjects.size}`);
    console.log(`Projects with Scheduled Posts: ${allPostProjects.size}`);
    console.log(`Projects with Videos: ${uniqueVideoProjects.size}`);
    console.log(`Projects with Tracking: ${uniqueTrackingProjects.size}`);
    console.log(`${'='.repeat(50)}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAchievements();


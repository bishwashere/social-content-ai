import { prisma } from "../src/lib/prisma";

const EMAILS = [
  "bishwas.work@gmail.com",
  "unclesamstechllc@gmail.com",
  "bishwasmishra007@gmail.com",
];

async function deleteUserAndAllData(email: string) {
  try {
    console.log(`\n🔍 Looking for user with email: ${email}\n`);

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        projects: true,
        oauthProviders: true,
      },
    });

    if (!user) {
      console.log(`❌ User with email ${email} not found.`);
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Projects: ${user.projects.length}`);
    console.log(`   OAuth Providers: ${user.oauthProviders.length}\n`);

    console.log("🗑️  Starting deletion process...\n");

    // Get all project IDs for this user
    const projectIds = user.projects.map((p) => p.id);

    // Get all OAuth provider IDs for this user
    const oauthProviderIds = user.oauthProviders.map((p) => p.id);

    console.log("1. Deleting scheduled posts...");
    await prisma.scheduledPost.deleteMany({
      where: {
        OR: [
          { projectId: { in: projectIds } },
          { oauthProviderId: { in: oauthProviderIds } },
        ],
      },
    });

    console.log("2. Deleting project to OAuth provider mappings...");
    await prisma.projectToOAuthProvider.deleteMany({
      where: {
        oauthProviderId: { in: oauthProviderIds },
      },
    });

    console.log("3. Deleting platform posts and insights...");
    // PlatformPost has cascade delete for PostInsights, so we just delete PlatformPost
    await prisma.platformPost.deleteMany({
      where: {
        oauthProviderId: { in: oauthProviderIds },
      },
    });

    console.log("4. Deleting OAuth providers...");
    await prisma.oauthProvider.deleteMany({
      where: { userId: user.id },
    });

    console.log("5. Deleting project folder items...");
    // Get all folder IDs for this user
    const folders = await prisma.projectFolder.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const folderIds = folders.map((f) => f.id);
    await prisma.projectFolderItem.deleteMany({
      where: { folderId: { in: folderIds } },
    });

    console.log("6. Deleting project folders...");
    await prisma.projectFolder.deleteMany({
      where: { userId: user.id },
    });

    console.log("7. Deleting uploaded videos...");
    await prisma.uploadedVideo.deleteMany({
      where: { userId: user.id },
    });

    console.log("8. Deleting walls...");
    await prisma.wall.deleteMany({
      where: { userId: user.id },
    });

    console.log("9. Deleting project pulse metrics...");
    await prisma.projectPulse.deleteMany({
      where: { projectId: { in: projectIds } },
    });

    console.log("10. Deleting projects subreddit data...");
    await prisma.projectsSubredditData.deleteMany({
      where: { projectId: { in: projectIds } },
    });

    console.log("11. Deleting campaign chats (cascade from campaign planners)...");
    // CampaignChat has cascade delete, so we delete CampaignPlanner
    await prisma.campaignPlanner.deleteMany({
      where: { projectId: { in: projectIds } },
    });

    console.log("12. Deleting project trackings...");
    await prisma.projectTracking.deleteMany({
      where: { projectId: { in: projectIds } },
    });

    console.log("13. Deleting project chats...");
    await prisma.projectChat.deleteMany({
      where: { projectId: { in: projectIds } },
    });

    console.log("14. Deleting invited users (where user is invited)...");
    await prisma.invitedUser.deleteMany({
      where: { userId: user.id },
    });

    console.log("15. Deleting invited users (from user's projects)...");
    await prisma.invitedUser.deleteMany({
      where: { projectId: { in: projectIds } },
    });

    console.log("16. Deleting projects...");
    await prisma.projects.deleteMany({
      where: { userId: user.id },
    });

    console.log("17. Deleting subscriptions...");
    await prisma.subscription.deleteMany({
      where: { userId: user.id },
    });

    console.log("18. Deleting first view tooltips...");
    await prisma.firstViewTooltip.deleteMany({
      where: { userId: user.id },
    });

    console.log("19. Deleting referral signup...");
    await prisma.referralSignup.deleteMany({
      where: { userId: user.id },
    });

    console.log("20. Deleting user...");
    await prisma.user.delete({
      where: { id: user.id },
    });

    console.log("\n✅ Successfully deleted user and all associated data!\n");
    console.log(`   Deleted user: ${user.name} (${user.email})`);
    console.log(`   Deleted ${projectIds.length} project(s)`);
    console.log(`   Deleted ${oauthProviderIds.length} OAuth provider(s)\n`);
  } catch (error) {
    console.error(`\n❌ Error deleting user ${email}:`, error);
    throw error;
  }
}

async function deleteAllUsers() {
  try {
    console.log(`\n🗑️  Starting deletion process for ${EMAILS.length} user(s)...\n`);
    
    for (const email of EMAILS) {
      await deleteUserAndAllData(email);
    }

    console.log(`\n✅ Successfully processed all ${EMAILS.length} user(s)!\n`);
  } catch (error) {
    console.error("\n❌ Error in deletion process:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deleteAllUsers()
  .then(() => {
    console.log("Script completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });


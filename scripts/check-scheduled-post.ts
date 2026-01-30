import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Check the specific failed post
  const failedPostId = "697cb8fde4d5113cc245f600";
  
  const post = await prisma.scheduledPost.findUnique({
    where: { id: failedPostId },
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
    console.log("❌ Post not found:", failedPostId);
    return;
  }

  console.log("\n=== SCHEDULED POST DETAILS ===");
  console.log("Post ID:", post.id);
  console.log("Platform:", post.platform);
  console.log("Status:", post.status);
  console.log("Error:", post.error);
  console.log("Scheduled Date:", post.date);
  console.log("Content (first 100 chars):", post.content?.substring(0, 100));
  console.log("\n=== MEDIA FIELD ===");
  console.log("Media value:", post.media);
  console.log("Media is null:", post.media === null);
  console.log("Media is empty string:", post.media === "");
  console.log("Media type:", typeof post.media);
  
  // Check Instagram OAuth provider
  const instagramProvider = post.project?.projectToOAuthProviders.find(
    (p) => p.oauthProvider?.platform === "instagram"
  )?.oauthProvider;

  if (instagramProvider) {
    console.log("\n=== INSTAGRAM OAUTH PROVIDER ===");
    console.log("Provider ID:", instagramProvider.id);
    console.log("Page ID:", instagramProvider.pageId);
    console.log("Page Name:", instagramProvider.pageName);
    console.log("isStandalone:", instagramProvider.isStandalone);
    console.log("isStandalone type:", typeof instagramProvider.isStandalone);
  } else {
    console.log("\n❌ No Instagram OAuth provider found for this project");
  }

  // Also check recent Instagram scheduled posts for comparison
  console.log("\n=== RECENT INSTAGRAM SCHEDULED POSTS ===");
  const recentPosts = await prisma.scheduledPost.findMany({
    where: {
      platform: "instagram",
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      status: true,
      media: true,
      error: true,
      createdAt: true,
    },
  });

  recentPosts.forEach((p, i) => {
    console.log(`\n${i + 1}. Post ${p.id}`);
    console.log("   Status:", p.status);
    console.log("   Media:", p.media || "(empty/null)");
    console.log("   Error:", p.error || "(none)");
    console.log("   Created:", p.createdAt);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

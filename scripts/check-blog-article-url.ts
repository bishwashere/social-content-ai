import { prisma } from "../src/lib/prisma";

/**
 * Script to check if articleUrl is saved in the database for Blog News campaigns
 */
async function checkBlogArticleUrls() {
  try {
    console.log("🔍 Checking Blog News campaigns for articleUrl...\n");

    // Find all Blog News campaigns
    const campaigns = await prisma.campaignPlanner.findMany({
      where: {
        goal: "Blog News",
      },
      include: {
        chats: {
          where: {
            status: "GENERATED",
          },
          orderBy: {
            day: "asc",
          },
        },
      },
    });

    console.log(`Found ${campaigns.length} Blog News campaign(s)\n`);

    for (const campaign of campaigns) {
      console.log(`📋 Campaign: ${campaign.name || campaign.id}`);
      console.log(`   ID: ${campaign.id}`);
      console.log(`   Chats: ${campaign.chats.length}\n`);

      for (const chat of campaign.chats) {
        const contents = chat.contents as Record<string, any>;
        const blog = contents?.blog;

        if (blog) {
          console.log(`   Day ${chat.day}:`);
          console.log(`     Title: ${blog.title || "N/A"}`);
          console.log(`     Webhook Sent: ${blog.webhookSent ?? "N/A"}`);
          console.log(`     Article URL: ${blog.articleUrl || "❌ NOT FOUND"}`);
          console.log(`     Webhook URL: ${blog.webhookUrl || "N/A"}`);
          console.log(`     Generated At: ${blog.generatedAt || "N/A"}`);
          console.log("");
        }
      }
    }

    // Also check the most recent blog
    const recentChat = await prisma.campaignChat.findFirst({
      where: {
        planner: {
          goal: "Blog News",
        },
        status: "GENERATED",
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        planner: {
          select: {
            name: true,
            goal: true,
          },
        },
      },
    });

    if (recentChat) {
      const contents = recentChat.contents as Record<string, any>;
      const blog = contents?.blog;
      
      console.log("📌 Most Recent Blog:");
      console.log(`   Campaign: ${recentChat.planner?.name || recentChat.plannerId}`);
      console.log(`   Day: ${recentChat.day}`);
      console.log(`   Title: ${blog?.title || "N/A"}`);
      console.log(`   Webhook Sent: ${blog?.webhookSent ?? "N/A"}`);
      console.log(`   Article URL: ${blog?.articleUrl || "❌ NOT FOUND"}`);
      console.log(`   Full blog object keys:`, blog ? Object.keys(blog) : "No blog found");
      if (blog) {
        console.log(`   Full blog contents:`, JSON.stringify(blog, null, 2));
      }
    }

  } catch (error) {
    console.error("❌ Error checking database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBlogArticleUrls();


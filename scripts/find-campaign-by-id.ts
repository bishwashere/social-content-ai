/**
 * Find campaign by partial ID
 */

import { prisma } from "../src/lib/prisma";

async function findCampaign(partialId: string) {
  try {
    // Try to find by exact ID first
    let campaign = await prisma.campaignPlanner.findUnique({
      where: { id: partialId },
    });

    if (campaign) {
      console.log(`✅ Found campaign by exact ID: ${campaign.id}`);
      console.log(`   Name: ${campaign.name || "Unnamed"}`);
      console.log(`   Project ID: ${campaign.projectId}`);
      return campaign.id;
    }

    // Try to find by searching scheduled posts
    const allPosts = await prisma.scheduledPost.findMany({
      where: {
        platform: "webhook",
      },
      select: {
        meta: true,
      },
      take: 1000,
    });

    const matchingCampaignIds = new Set<string>();
    allPosts.forEach((post) => {
      const meta = post.meta as any;
      const campaignId = meta?.campaignId;
      if (campaignId && typeof campaignId === "string") {
        if (campaignId.includes(partialId) || partialId.includes(campaignId)) {
          matchingCampaignIds.add(campaignId);
        }
      }
    });

    if (matchingCampaignIds.size > 0) {
      console.log(`\n📋 Found ${matchingCampaignIds.size} matching campaign IDs in scheduled posts:\n`);
      matchingCampaignIds.forEach((id) => {
        console.log(`   ${id}`);
      });
      
      // Try the first one
      const firstId = Array.from(matchingCampaignIds)[0];
      campaign = await prisma.campaignPlanner.findUnique({
        where: { id: firstId },
      });
      
      if (campaign) {
        console.log(`\n✅ Using campaign: ${firstId}`);
        return firstId;
      }
    }

    // List all campaigns
    console.log(`\n📋 Listing all campaigns:\n`);
    const allCampaigns = await prisma.campaignPlanner.findMany({
      select: {
        id: true,
        name: true,
        goal: true,
        projectId: true,
        startDate: true,
      },
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });

    allCampaigns.forEach((c, idx) => {
      console.log(`${idx + 1}. ${c.id}`);
      console.log(`   Name: ${c.name || "Unnamed"}`);
      console.log(`   Goal: ${c.goal}`);
      console.log(`   Start Date: ${c.startDate?.toISOString() || "NOT SET"}`);
      console.log("");
    });

    return null;
  } catch (error) {
    console.error("Error:", error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

const partialId = process.argv[2] || "688d0a4451cf105b4c13d0c8";
findCampaign(partialId);

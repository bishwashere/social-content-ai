import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanContentAsterisks() {
  console.log("🔧 Cleaning ** markers from content in MongoDB...");

  try {
    // Clean ProjectChat contents
    console.log("\n📝 Cleaning ProjectChat contents...");
    const projectChats = await prisma.$runCommandRaw({
      find: "project-chats",
      filter: {},
    }) as any;

    const projectChatsData = projectChats.cursor?.firstBatch || [];
    console.log(`Found ${projectChatsData.length} project chats`);

    let fixedProjectChats = 0;
    for (const chat of projectChatsData) {
      const chatId = chat._id?.$oid || chat._id;
      let needsUpdate = false;
      const cleanedContents: Record<string, string> = {};

      if (chat.contents && typeof chat.contents === 'object') {
        for (const [platform, content] of Object.entries(chat.contents)) {
          if (typeof content === 'string' && content.includes('**')) {
            cleanedContents[platform] = content.replace(/\*\*/g, '');
            needsUpdate = true;
          } else if (typeof content === 'string') {
            cleanedContents[platform] = content;
          }
        }
      }

      if (needsUpdate) {
        await prisma.$runCommandRaw({
          update: "project-chats",
          updates: [
            {
              q: { _id: chat._id },
              u: { $set: { contents: cleanedContents } },
            },
          ],
        });
        fixedProjectChats++;
        console.log(`  - Cleaned project chat: ${chatId}`);
      }
    }

    console.log(`✅ Fixed ${fixedProjectChats} project chats!`);

    // Clean CampaignChat contents
    console.log("\n📝 Cleaning CampaignChat contents...");
    const campaignChats = await prisma.$runCommandRaw({
      find: "campaign-chats",
      filter: {},
    }) as any;

    const campaignChatsData = campaignChats.cursor?.firstBatch || [];
    console.log(`Found ${campaignChatsData.length} campaign chats`);

    let fixedCampaignChats = 0;
    for (const chat of campaignChatsData) {
      const chatId = chat._id?.$oid || chat._id;
      let needsUpdate = false;
      const cleanedContents: Record<string, string> = {};

      if (chat.contents && typeof chat.contents === 'object') {
        for (const [platform, content] of Object.entries(chat.contents)) {
          if (typeof content === 'string' && content.includes('**')) {
            cleanedContents[platform] = content.replace(/\*\*/g, '');
            needsUpdate = true;
          } else if (typeof content === 'string') {
            cleanedContents[platform] = content;
          }
        }
      }

      if (needsUpdate) {
        await prisma.$runCommandRaw({
          update: "campaign-chats",
          updates: [
            {
              q: { _id: chat._id },
              u: { $set: { contents: cleanedContents } },
            },
          ],
        });
        fixedCampaignChats++;
        console.log(`  - Cleaned campaign chat: ${chatId}`);
      }
    }

    console.log(`✅ Fixed ${fixedCampaignChats} campaign chats!`);
    console.log(`\n🎉 Total: Cleaned ${fixedProjectChats + fixedCampaignChats} chats!`);
  } catch (error) {
    console.error("❌ Error cleaning content asterisks:", error);
    throw error;
  }
}

cleanContentAsterisks()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


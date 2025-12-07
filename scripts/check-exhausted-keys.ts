/**
 * Script to check exhausted Gemini API key states in database
 * 
 * Usage:
 *   npx tsx scripts/check-exhausted-keys.ts
 */

import { prisma } from "../src/lib/prisma";

async function checkExhaustedKeys() {
  try {
    console.log(`\n🔍 Checking Gemini API key states in database...\n`);

    const keyStates = await prisma.geminiApiKeyState.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (keyStates.length === 0) {
      console.log("📭 No key states found in database.");
      return;
    }

    console.log(`📊 Found ${keyStates.length} key state(s):\n`);
    console.log("=".repeat(80));
    
    keyStates.forEach((state, index) => {
      console.log(`${index + 1}. ${state.keyName}`);
      console.log(`   Exhausted: ${state.exhausted ? "🔴 YES" : "🟢 NO"}`);
      if (state.exhausted) {
        console.log(`   Exhausted At: ${state.exhaustedAt ? new Date(state.exhaustedAt).toISOString() : "N/A"}`);
        console.log(`   Retry After: ${state.retryAfter ? new Date(state.retryAfter).toISOString() : "N/A"}`);
        if (state.retryAfter) {
          const now = new Date();
          const retryAfter = new Date(state.retryAfter);
          const timeUntilRetry = retryAfter.getTime() - now.getTime();
          const minutesUntilRetry = Math.round(timeUntilRetry / 1000 / 60);
          if (timeUntilRetry > 0) {
            console.log(`   ⏰ Can retry in: ${minutesUntilRetry} minutes`);
          } else {
            console.log(`   ✅ Ready to retry now!`);
          }
        }
        console.log(`   Last Error: ${state.lastError || "N/A"}`);
        console.log(`   Last Error Status: ${state.lastErrorStatus || "N/A"}`);
      }
      console.log(`   Success Count: ${state.successCount}`);
      console.log(`   Updated At: ${new Date(state.updatedAt).toISOString()}`);
      console.log("");
    });
    
    console.log("=".repeat(80));
    
    const exhaustedCount = keyStates.filter(ks => ks.exhausted).length;
    const availableCount = keyStates.length - exhaustedCount;
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total Keys: ${keyStates.length}`);
    console.log(`   🟢 Available: ${availableCount}`);
    console.log(`   🔴 Exhausted: ${exhaustedCount}`);
  } catch (error) {
    console.error("\n❌ Error checking key states:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkExhaustedKeys();


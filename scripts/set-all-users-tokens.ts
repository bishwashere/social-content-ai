import { prisma } from "../src/lib/prisma";

const TARGET_TOKENS = Number(process.env.TOKENS ?? "100");
const MODE = (process.env.MODE ?? "set").toLowerCase(); // "set" | "min"

function validateInputs() {
  if (!Number.isFinite(TARGET_TOKENS) || TARGET_TOKENS < 0) {
    throw new Error(
      `Invalid TOKENS value "${process.env.TOKENS}". Must be a non-negative number.`
    );
  }
  if (MODE !== "set" && MODE !== "min") {
    throw new Error(
      `Invalid MODE value "${process.env.MODE}". Must be "set" or "min".`
    );
  }
}

async function main() {
  validateInputs();

  const result =
    MODE === "min"
      ? await prisma.user.updateMany({
          where: { remainingChatGenerations: { lt: TARGET_TOKENS } },
          data: { remainingChatGenerations: TARGET_TOKENS },
        })
      : await prisma.user.updateMany({
          data: { remainingChatGenerations: TARGET_TOKENS },
        });

  console.log(
    `✅ Updated ${result.count} user(s) to ${TARGET_TOKENS} token(s) (mode: ${MODE}).`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Failed to update user tokens:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


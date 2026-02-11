/**
 * Make given users "pro" by creating/updating an active subscription
 * and granting pro-level chat generations.
 *
 * Usage: npx tsx scripts/make-users-pro.ts
 * Emails are hardcoded below (or pass via MAKE_PRO_EMAILS env, comma-separated).
 */

import { prisma } from "../src/lib/prisma";
import { CHAT_GENERATION_PER_MONTH } from "../src/constants/common";

const PRO_EMAILS =
  process.env.MAKE_PRO_EMAILS?.split(",").map((e) => e.trim()).filter(Boolean) ||
  ["anuphunt1@gmail.com", "bishwashere@gmail.com"];

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: PRO_EMAILS } },
    select: { id: true, email: true },
  });

  if (users.length === 0) {
    console.log("No users found for emails:", PRO_EMAILS.join(", "));
    return;
  }

  const now = new Date();
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  for (const user of users) {
    const existing = await prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          status: "active",
          active: true,
          startedAt: now,
          endsAt: oneYearLater,
        },
      });
      console.log(`Updated subscription for ${user.email}`);
    } else {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          startedAt: now,
          endsAt: oneYearLater,
          status: "active",
          active: true,
          subscriptionIdFromStripe: "",
          customerId: "",
          invoiceId: "",
        },
      });
      console.log(`Created pro subscription for ${user.email}`);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { remainingChatGenerations: CHAT_GENERATION_PER_MONTH },
    });
    console.log(`Set ${user.email} credits to ${CHAT_GENERATION_PER_MONTH}`);
  }

  console.log(`Done. Made ${users.length} user(s) pro.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

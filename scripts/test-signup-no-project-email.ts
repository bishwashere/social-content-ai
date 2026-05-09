import { mail } from "../src/lib/mail";
import { prisma } from "../src/lib/prisma";

const TO = "bishwashere@gmail.com";
const TEMPLATE = "SIGNUP_NO_PROJECT" as const;

async function main() {
  const user = await prisma.user.findUnique({ where: { email: TO } });
  if (!user) throw new Error(`No user found with email ${TO}`);

  // Guard: never send this template twice to the same user
  const alreadySent = await prisma.emailLog.findFirst({
    where: { userId: user.id, template: TEMPLATE },
  });
  if (alreadySent) {
    console.log(`Already sent ${TEMPLATE} to ${TO} on ${alreadySent.sentAt.toISOString()}. Skipping.`);
    await prisma.$disconnect();
    return;
  }

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_PRODUCTION_URL ?? "";

  const [totalPostsGenerated, totalProjectsCreated, totalPlatformsConnected, totalUsersActive] =
    await Promise.all([
      prisma.campaignChat.count(),
      prisma.projects.count(),
      prisma.oauthProvider.count(),
      prisma.user.count(),
    ]);

  const subject = `${user.name.split(" ")[0]}, your first project is one click away`;

  await mail.sendTemplate(
    TEMPLATE,
    {
      name: user.name,
      dashboardUrl: `${appBaseUrl}/project`,
      platformStats: { totalPostsGenerated, totalProjectsCreated, totalPlatformsConnected, totalUsersActive },
    },
    { subject, to: [TO] }
  );

  await prisma.emailLog.create({
    data: {
      userId: user.id,
      email: user.email,
      template: TEMPLATE,
      subject,
      trigger: "test",
      meta: {},
    },
  });

  console.log("Sent and logged!");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

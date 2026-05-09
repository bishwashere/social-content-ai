import { mail } from "../src/lib/mail";
import { prisma } from "../src/lib/prisma";

async function main() {
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_PRODUCTION_URL ?? "";

  const [totalPostsGenerated, totalProjectsCreated, totalPlatformsConnected, totalUsersActive] =
    await Promise.all([
      prisma.campaignChat.count(),
      prisma.projects.count(),
      prisma.oauthProvider.count(),
      prisma.user.count(),
    ]);

  await mail.sendTemplate(
    "SIGNUP_NO_PROJECT",
    {
      name: "Bishwas",
      dashboardUrl: `${appBaseUrl}/project`,
      platformStats: { totalPostsGenerated, totalProjectsCreated, totalPlatformsConnected, totalUsersActive },
    },
    {
      subject: "Bishwas, your first project is one click away",
      to: ["bishwashere@gmail.com"],
    }
  );

  console.log("Sent!");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

import { mail } from "../src/lib/mail";
import { prisma } from "../src/lib/prisma";
import { buildTrackedUrl } from "../src/lib/email-tracking";

// ─── SAFETY: test scripts may only send to a single, pre-approved address ───
const ALLOWED_TEST_EMAIL = "bishwashere@gmail.com";
const TO = "bishwashere@gmail.com";

if (!TO || TO.trim() === "") throw new Error("TEST BLOCKED: TO address is empty.");
if (TO !== ALLOWED_TEST_EMAIL) throw new Error(`TEST BLOCKED: "${TO}" is not the approved test address.`);
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATE = "SIGNUP_NO_PROJECT" as const;

async function main() {
  const user = await prisma.user.findUnique({ where: { email: TO } });
  if (!user) throw new Error(`No user found with email ${TO}`);

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
      dashboardUrl: buildTrackedUrl(`${appBaseUrl}/project`, "SIGNUP_NO_PROJECT"),
      platformStats: { totalPostsGenerated, totalProjectsCreated, totalPlatformsConnected, totalUsersActive },
    },
    { subject, to: [TO] }
  );

  console.log("Sent!");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

/**
 * Backfill email-logs for emails sent manually today before the EmailLog
 * table existed. Run once only.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/backfill-email-logs.ts
 */

import { prisma } from "../src/lib/prisma";

// ── FIRST_PROJECT_CREATED ────────────────────────────────────────────────────
// Sent today via backfill-first-project-email.ts
const FIRST_PROJECT_SENT = [
  "martinjdoo2@gmail.com",
  "isaiahmcbee07@gmail.com",
  "mlacif1@gmail.com",
  "roni@lvlsmarketing.com",
  "karimabdalwahid1w@gmail.com",
  "perla12abourached@gmail.com",
  "boydbjchanza@gmail.com",
  // test sends to the owner
  "bishwashere@gmail.com",
];

// ── SIGNUP_NO_PROJECT ────────────────────────────────────────────────────────
// Sent today via backfill-signup-no-project-email.ts
const SIGNUP_NO_PROJECT_SENT = [
  "bishwas.work@gmail.com",
  "rafael.gonzalez8828@gmail.com",
  "omaurirodriguez375@gmail.com",
  "jarvisdeco@gmail.com",
  "swapnajit@techshu.in",
  "abonaaron175@gmail.com",
  "supersarkar01@gmail.com",
  "officialmanipreet@gmail.com",
  "conejo12carlos@gmail.com",
  "luisgeneralmata@gmail.com",
  "jesusiselavillasenorrobles3@gmail.com",
  "rojasrojasangelleonardo@gmail.com",
  "rosendocoy26@gmail.com",
  "magnumsilva87.9fm@gmail.com",
  "rakeshpandit36083@gmail.com",
  "adarsh.bhat7@gmail.com",
  "swadrestaurantri@gmail.com",
  "ashlynlikesgays89@gmail.com",
  "prrgdrlt@gmail.com",
  "93atkins@gmail.com",
  // test send
  "bishwashere@gmail.com",
];

async function backfillTemplate(
  emails: string[],
  template: string,
  subjectFn: (name: string, projectName?: string) => string,
  trigger: string,
  withProject: boolean
) {
  let inserted = 0;
  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { console.log(`[SKIP] ${email} — user not found`); continue; }

    const existing = await prisma.emailLog.findFirst({
      where: { userId: user.id, template },
    });
    if (existing) { console.log(`[SKIP] ${email} — already logged`); continue; }

    let projectName: string | undefined;
    if (withProject) {
      const project = await prisma.projects.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });
      projectName = project?.name;
    }

    const subject = subjectFn(user.name, projectName);

    await prisma.emailLog.create({
      data: {
        userId: user.id,
        email: user.email,
        template,
        subject,
        trigger,
        sentAt: new Date("2026-05-09T23:45:00.000Z"),
        meta: projectName ? { projectName } : {},
      },
    });

    inserted++;
    console.log(`[OK] ${email} — ${template}`);
  }
  return inserted;
}

async function main() {
  console.log("Backfilling FIRST_PROJECT_CREATED logs...");
  const a = await backfillTemplate(
    FIRST_PROJECT_SENT,
    "FIRST_PROJECT_CREATED",
    (_name, projectName) => `You just launched "${projectName ?? "your project"}". Here's what to do next`,
    "manual_backfill",
    true
  );

  console.log("\nBackfilling SIGNUP_NO_PROJECT logs...");
  const b = await backfillTemplate(
    SIGNUP_NO_PROJECT_SENT,
    "SIGNUP_NO_PROJECT",
    (name) => `${name.split(" ")[0]}, your first project is one click away`,
    "manual_backfill",
    false
  );

  console.log(`\nDone. Inserted: ${a + b} records.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

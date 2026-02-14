/**
 * One-off: Add bishwashere@gmail.com as editor to Anup Dhakal's project "Blackjackiq Pro - Basic Strategy Trainer"
 * Run: npx tsx scripts/add-editor-to-project.ts
 */
import { prisma } from "../src/lib/prisma";
import { INVITED_USER_ROLES } from "../src/constants/common";

const EDITOR_EMAIL = "bishwashere@gmail.com";
const OWNER_EMAIL = "anuphunt1@gmail.com";
const PROJECT_NAME = "Blackjackiq Pro - Basic Strategy Trainer";

async function main() {
  const owner = await prisma.user.findFirst({
    where: { email: OWNER_EMAIL },
    include: { projects: true },
  });
  if (!owner) {
    console.error(`Owner not found: ${OWNER_EMAIL}`);
    process.exit(1);
  }

  const project = owner.projects.find(
    (p) => p.name.trim() === PROJECT_NAME.trim()
  );
  if (!project) {
    console.error(
      `Project "${PROJECT_NAME}" not found for ${OWNER_EMAIL}. Projects:`,
      owner.projects.map((p) => p.name)
    );
    process.exit(1);
  }

  const editor = await prisma.user.findFirst({
    where: { email: EDITOR_EMAIL },
  });
  if (!editor) {
    console.error(`Editor not found: ${EDITOR_EMAIL}`);
    process.exit(1);
  }

  const existing = await prisma.invitedUser.findFirst({
    where: {
      projectId: project.id,
      userId: editor.id,
    },
  });
  if (existing) {
    console.log(
      `${EDITOR_EMAIL} is already invited to this project (role: ${existing.role}).`
    );
    process.exit(0);
  }

  await prisma.invitedUser.create({
    data: {
      projectId: project.id,
      userId: editor.id,
      role: INVITED_USER_ROLES.EDITOR,
    },
  });

  console.log(
    `Added ${EDITOR_EMAIL} as editor to project "${project.name}" (${project.id}).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

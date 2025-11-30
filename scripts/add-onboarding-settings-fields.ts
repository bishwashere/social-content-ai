import { prisma } from "../src/lib/prisma";

async function addOnboardingSettingsFields() {
  try {
    console.log("\n🔍 Finding all users...\n");

    // Find all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        guidedTourEnabled: true,
      },
    });

    console.log(`Found ${allUsers.length} user(s)\n`);

    if (allUsers.length === 0) {
      console.log("✅ No users to update.\n");
      return;
    }

    // Filter users that need updating (those without the field or with null values)
    const usersToUpdate = allUsers.filter(
      (user) =>
        user.guidedTourEnabled === null ||
        user.guidedTourEnabled === undefined
    );

    console.log(`${usersToUpdate.length} user(s) need updating\n`);

    if (usersToUpdate.length === 0) {
      console.log("✅ All users already have the guidedTourEnabled field!\n");
      return;
    }

    // Update all users that need the field
    let updatedCount = 0;
    for (const user of usersToUpdate) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          guidedTourEnabled: true,
        },
      });
      updatedCount++;
      console.log(
        `  ✅ Updated user: ${user.email} (${user.id.substring(0, 8)}...)`
      );
    }

    console.log(`\n✅ Successfully updated ${updatedCount} user(s)!\n`);
    console.log(
      "All users now have guidedTourEnabled set to true\n"
    );
  } catch (error) {
    console.error("\n❌ Error updating users:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addOnboardingSettingsFields()
  .then(() => {
    console.log("✅ Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });


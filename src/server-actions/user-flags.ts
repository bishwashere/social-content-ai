"use server";
import { prisma } from "@/lib/prisma";

export async function markFreeCreditsCongratsShown(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { freeCreditsCongratsShown: true },
  });
}

export async function markDemoCampaignCreated(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { demoCampaignCreated: true },
  });
}

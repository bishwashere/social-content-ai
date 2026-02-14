"use server";

import { prisma } from "@/lib/prisma";
import { INVITED_USER_ROLES } from "@/constants/common";

export type ProjectOAuthPermission = {
  canManageOAuth: boolean;
  ownerId: string;
  isOwner: boolean;
};

/**
 * Returns whether the user can manage OAuth for the project (link/unlink providers).
 * Owner and invited editors/admins can manage; "available to link" is always the current user's own providers.
 */
export async function getProjectOAuthPermission(
  projectId: string,
  userId: string
): Promise<ProjectOAuthPermission | null> {
  const project = await prisma.projects.findUnique({
    where: { id: projectId },
    select: {
      userId: true,
      invitedUsers: {
        select: { userId: true, role: true },
      },
    },
  });

  if (!project) return null;

  const isOwner = project.userId === userId;
  const isEditorOrAdmin = project.invitedUsers.some(
    (inv) =>
      inv.userId === userId &&
      (inv.role === INVITED_USER_ROLES.EDITOR || inv.role === INVITED_USER_ROLES.ADMIN)
  );
  const canManageOAuth = isOwner || isEditorOrAdmin;

  return {
    canManageOAuth,
    ownerId: project.userId,
    isOwner,
  };
}

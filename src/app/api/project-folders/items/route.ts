import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";

export const POST = async (request: NextRequest) => {
  return applyMiddleware(
    validateUserAuth({ errorIfNotAuthenticated: true }),
    catchApiAsyncError(async (req) => {
      //@ts-expect-error: user is not defined in Request type
      const user = req.parsed.user;
      const { folderId, projectId } = await req.json();

      if (!folderId || !projectId) {
        return sendNextResponse({
          status: 400,
          message: "Folder ID and Project ID are required",
        });
      }

      // Verify ownership of folder
      const folder = await prisma.projectFolder.findFirst({
        where: { id: folderId, userId: user.id },
      });

      if (!folder) {
        return sendNextResponse({
          status: 404,
          message: "Folder not found or access denied",
        });
      }

      // Verify access to project (owner or invited)
      const project = await prisma.projects.findFirst({
        where: {
          id: projectId,
          OR: [
            { userId: user.id },
            { invitedUsers: { some: { userId: user.id } } },
          ],
        },
      });

      if (!project) {
        return sendNextResponse({
          status: 404,
          message: "Project not found or access denied",
        });
      }

      // Check if project is already in folder
      const existingItem = await prisma.projectFolderItem.findFirst({
        where: { folderId, projectId },
      });

      if (existingItem) {
        return sendNextResponse({
          status: 400,
          message: "Project is already in this folder",
        });
      }

      const folderItem = await prisma.projectFolderItem.create({
        data: {
          folderId,
          projectId,
        },
        include: {
          project: {
            include: {
              projectChats: {
                orderBy: { updatedAt: "desc" },
              },
            },
          },
        },
      });

      return sendNextResponse({
        status: 201,
        message: "Project added to folder successfully",
        data: folderItem,
      });
    })
  )(request, { params: {} });
};

export const DELETE = async (request: NextRequest) => {
  return applyMiddleware(
    validateUserAuth({ errorIfNotAuthenticated: true }),
    catchApiAsyncError(async (req) => {
      //@ts-expect-error: user is not defined in Request type
      const user = req.parsed.user;
      const { searchParams } = new URL(req.url);
      const folderId = searchParams.get("folderId");
      const projectId = searchParams.get("projectId");

      if (!folderId || !projectId) {
        return sendNextResponse({
          status: 400,
          message: "Folder ID and Project ID are required",
        });
      }

      // Verify ownership of folder
      const folder = await prisma.projectFolder.findFirst({
        where: { id: folderId, userId: user.id },
      });

      if (!folder) {
        return sendNextResponse({
          status: 404,
          message: "Folder not found or access denied",
        });
      }

      // Verify access to project (owner or invited)
      const project = await prisma.projects.findFirst({
        where: {
          id: projectId,
          OR: [
            { userId: user.id },
            { invitedUsers: { some: { userId: user.id } } },
          ],
        },
      });

      if (!project) {
        return sendNextResponse({
          status: 404,
          message: "Project not found or access denied",
        });
      }

      // Remove project from folder
      await prisma.projectFolderItem.deleteMany({
        where: { folderId, projectId },
      });

      return sendNextResponse({
        status: 200,
        message: "Project removed from folder successfully",
      });
    })
  )(request, { params: {} });
};

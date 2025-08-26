import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";

export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: user is not defined in Request type
    const user = req.parsed.user;

    const folders = await prisma.projectFolder.findMany({
      where: { userId: user.id },
      include: {
        projectFolderItems: {
          include: {
            project: {
              include: {
                projectChats: {
                  orderBy: { updatedAt: "desc" },
                },
                projectTrackings: true,
                campaignPlanners: {
                  include: {
                    chats: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return sendNextResponse({
      status: 200,
      message: "Project folders retrieved successfully",
      data: folders,
    });
  })
);

export const POST = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: user is not defined in Request type
    const user = req.parsed.user;
    const { name, description, color } = await req.json();

    if (!name) {
      return sendNextResponse({
        status: 400,
        message: "Folder name is required",
      });
    }

    const folder = await prisma.projectFolder.create({
      data: {
        name,
        description,
        color: color || "#3B82F6",
        userId: user.id,
      },
    });

    return sendNextResponse({
      status: 201,
      message: "Project folder created successfully",
      data: folder,
    });
  })
);

export const PUT = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: user is not defined in Request type
    const user = req.parsed.user;
    const { id, name, description, color } = await req.json();

    if (!id || !name) {
      return sendNextResponse({
        status: 400,
        message: "Folder ID and name are required",
      });
    }

    // Verify ownership
    const existingFolder = await prisma.projectFolder.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingFolder) {
      return sendNextResponse({
        status: 404,
        message: "Folder not found or access denied",
      });
    }

    const folder = await prisma.projectFolder.update({
      where: { id },
      data: {
        name,
        description,
        color,
      },
    });

    return sendNextResponse({
      status: 200,
      message: "Project folder updated successfully",
      data: folder,
    });
  })
);

export const DELETE = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: user is not defined in Request type
    const user = req.parsed.user;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return sendNextResponse({
        status: 400,
        message: "Folder ID is required",
      });
    }

    // Verify ownership
    const existingFolder = await prisma.projectFolder.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingFolder) {
      return sendNextResponse({
        status: 404,
        message: "Folder not found or access denied",
      });
    }

    await prisma.projectFolder.delete({
      where: { id },
    });

    return sendNextResponse({
      status: 200,
      message: "Project folder deleted successfully",
    });
  })
);

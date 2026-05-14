import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";
import axios from "axios";
import { AI } from "@/lib/ai";
import { autoLinkAllProvidersToAllProjects } from "@/server-actions/auto-link-oauth-providers";
import { mail } from "@/lib/mail";
import { logEmail } from "@/lib/log-email";
import { buildTrackedUrl } from "@/lib/email-tracking";

export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: user is not defined in Request type
    const user = req.parsed.user;

    // Get all projects where user is owner or invited
    const [ownedProjects, invitedProjects] = await Promise.all([
      prisma.projects.findMany({
        where: { userId: user.id },
        include: {
          projectTrackings: true,
          projectChats: {
            orderBy: {
              updatedAt: "desc",
            },
          },
          campaignPlanners: {
            include: {
              chats: true,
            },
          },
          invitedUsers: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                }
              }
            }
          },
          projectToOAuthProviders: {
            include: {
              oauthProvider: {
                select: {
                  id: true,
                  platform: true,
                  pageId: true,
                  pageName: true,
                }
              }
            }
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
      prisma.invitedUser.findMany({
        where: { userId: user.id },
        include: {
          project: {
            include: {
              projectTrackings: true,
              projectChats: true,
              campaignPlanners: {
                include: {
                  chats: true,
                },
              },
              invitedUsers: true,
              projectToOAuthProviders: {
                include: {
                  oauthProvider: {
                    select: {
                      id: true,
                      platform: true,
                      pageId: true,
                      pageName: true,
                    }
                  }
                }
              },
            },
          },
        },
      }),
    ]);

    // Add admin role to owned projects
    const ownedProjectsWithAdmin = ownedProjects.map(project => ({
      ...project,
      userRole: "admin" // Project creator is always admin
    }));

    // Add roles to invited projects, but exclude projects the user owns
    const ownedProjectIds = new Set(ownedProjects.map(p => p.id));
    const invitedProjectsWithRoles = invitedProjects
      .filter(invite => !ownedProjectIds.has(invite.project.id))
      .map((invite) => ({
        ...invite.project,
        userRole: invite.role
      }));

    // Combine and format projects
    const allProjects = [
      ...ownedProjectsWithAdmin,
      ...invitedProjectsWithRoles,
    ];

    // Auto-link all providers to all projects (background operation)
    autoLinkAllProvidersToAllProjects(user.id).catch(err => {
      console.error("Error auto-linking providers to projects:", err);
    });

    return sendNextResponse({
      status: 200,
      message: "Projects retrieved successfully",
      data: allProjects?.sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
      ),
    });
  })
);

export const POST = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: user is not defined in Request type
    const user = req.parsed.user;

    const { name, url, description } = await req.json();

    if (!name) {
      return sendNextResponse({
        status: 400,
        message: "Project name is required",
      });
    }

    // Capture before creation — if 0, this will be the user's very first project
    const existingProjectCount = await prisma.projects.count({
      where: { userId: user.id },
    });
    const isFirstProject = existingProjectCount === 0;

    // Create project
    const project = await prisma.projects.create({
      data: {
        name,
        url,
        description,
        userId: user.id,
      },
      include: {
        projectTrackings: true,
        projectChats: true,
        campaignPlanners: {
          include: {
            chats: true,
          },
        },
        invitedUsers: true,
      },
    });

    // Automatically create admin role for project creator
    await prisma.invitedUser.create({
      data: {
        projectId: project.id,
        userId: user.id,
        role: "admin",
      },
    });

    // Auto-link all providers to this new project (background operation)
    autoLinkAllProvidersToAllProjects(user.id).catch(err => {
      console.error("Error auto-linking providers to new project:", err);
    });

    // FIRST_PROJECT_CREATED is a one-time email — guarded by isFirstProject + emailLog check.
    void (async () => {
      try {
        const alreadyLogged = await prisma.emailLog.findFirst({
          where: { userId: user.id, template: "FIRST_PROJECT_CREATED" },
        });

        if (isFirstProject && !alreadyLogged) {
          const [totalPostsGenerated, totalProjectsCreated, totalPlatformsConnected, totalUsersActive] =
            await Promise.all([
              prisma.campaignChat.count(),
              prisma.projects.count(),
              prisma.oauthProvider.count(),
              prisma.user.count(),
            ]);

          const appBaseUrl = process.env.NEXT_PUBLIC_APP_PRODUCTION_URL ?? process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ?? "";
          const rawProjectUrl = `${appBaseUrl}/project/${project.id}`;
          const projectUrl = buildTrackedUrl(rawProjectUrl, "FIRST_PROJECT_CREATED", user.id);

          const subject = `You just launched "${project.name}". Here's what to do next`;

          await mail.sendTemplate(
            "FIRST_PROJECT_CREATED",
            {
              name: user.name,
              projectName: project.name,
              projectUrl,
              platformStats: {
                totalPostsGenerated,
                totalProjectsCreated,
                totalPlatformsConnected,
                totalUsersActive,
              },
            },
            { subject, to: [user.email] }
          );

          await logEmail({
            userId: user.id,
            email: user.email,
            template: "FIRST_PROJECT_CREATED",
            subject,
            trigger: "auto",
            meta: { projectId: project.id, projectName: project.name },
          });
        }
      } catch (err) {
        console.error("[api/projects][POST] Failed to send first-project email:", err);
      }
    })();

    // Best-effort background notify (must not crash the request on failure)
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL;
    if (backendBaseUrl) {
      void axios
        .put(`${backendBaseUrl}/api/projects/`, { projectId: project.id })
        .catch((err) => {
          console.error("[api/projects][POST] Failed to notify backend:", err);
        });
    }

    return sendNextResponse({
      status: 201,
      message: "Project created successfully",
      data: project,
    });
  })
);

// put route to generate subreddit data
export const PUT = async (req: Request) => {
  const { projectId } = await req.json();
  console.log("add subreddit data", projectId);
  if (!projectId) {
    return sendNextResponse({
      status: 400,
      message: "Project ID is required",
    });
  }

  const project = await prisma.projects.findFirst({
    where: { id: projectId },
  });

  if (!project) {
    return sendNextResponse({
      status: 404,
      message: "Project not found",
    });
  }
  try {


    const ai = new AI();
    const newDescription = await ai.beautifyProjectDescription({
      title: project.name,
      description: project.description,
    });

    // console.log(project.name + ". " + newDescription);
    // Generate subreddit data
    const subredditData = await axios.post(
      `${process.env.OLIVEDRIFT_BASE_URL}/api/getKeywordsAndSubreddits`,
      {
        text: project.name + ". " + newDescription,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OLIVEDRIFT_API_KEY}`,
        },
      }
    );

    // console.log(subredditData.data)

    if (subredditData.data.success) {
      await prisma.projectsSubredditData.create({
        data: {
          projectId: project.id,
          subreddit: (subredditData.data.subreddits as string[]).slice(0, 10),
        },
      });
    }
    console.log("subredditData.data", subredditData.data);
    return sendNextResponse({
      status: 200,
      message: "Subreddit data generated successfully",
    });
  } catch (error) {
    console.log("error", error);
    return sendNextResponse({
      status: 500,
      message: "Failed to generate subreddit data",
    });
  }
};

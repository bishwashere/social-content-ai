import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type Part,
} from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";
import { startOfDay, subDays } from "date-fns";

export const dynamic = "force-dynamic";

const API_KEYS = [
  process.env.GEMINI_API_KEY || "",
  process.env.GEMINI_API_KEY_1 || "",
  process.env.GEMINI_API_KEY_2 || "",
];

// ---------------------------------------------------------------------------
// Tool declarations – Gemini can call these when it needs user-specific data
// ---------------------------------------------------------------------------

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_projects_overview",
    description:
      "Returns a summary of ALL the user's projects including name, description, pulse score, total posts and engagement rate. Use this when the user asks which project is doing well, wants a general overview, or asks about their projects.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_project_detailed_stats",
    description:
      "Returns detailed stats for a specific project: posts in last 30 days, impressions, likes, comments, engagement trend, posting streak, gap days, and consistency analysis. Use this when the user asks for details about a specific project.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        project_name: {
          type: SchemaType.STRING,
          description: "The name of the project to get stats for",
        },
      },
      required: ["project_name"],
    },
  },
  {
    name: "get_activity_scores",
    description:
      "Returns a ranked list of all user's projects sorted by activity score (based on recent posts, impressions, likes, and comments). Use this when the user wants to compare projects or know which is most/least active.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_recent_activity",
    description:
      "Returns the most recent activities across all the user's projects: recent posts, failed scheduled posts, drafts ready for approval, and completed videos. Use this when the user asks what happened recently or what needs attention.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_pending_tasks",
    description:
      "Returns tasks that need the user's attention today: failed posts, campaigns needing content, campaigns ending soon, and projects that need a scheduled post. Use this when the user asks what they should do today or what needs action.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];

// ---------------------------------------------------------------------------
// Tool implementations – ALWAYS scoped to the authenticated user
// ---------------------------------------------------------------------------

async function getUserProjectIds(userId: string) {
  const [owned, invited] = await Promise.all([
    prisma.projects.findMany({
      where: { userId },
      select: { id: true },
    }),
    prisma.invitedUser.findMany({
      where: { userId },
      select: { projectId: true },
    }),
  ]);
  return [
    ...new Set([
      ...owned.map((p) => p.id),
      ...invited.map((i) => i.projectId),
    ]),
  ];
}

async function handleGetProjectsOverview(userId: string) {
  const projects = await prisma.projects.findMany({
    where: {
      OR: [
        { userId },
        { invitedUsers: { some: { userId } } },
      ],
    },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
    },
  });

  // Fetch pulse and latest analytics for each project
  const results = await Promise.all(
    projects.map(async (project) => {
      const [pulse, analytics] = await Promise.all([
        prisma.projectPulse.findFirst({
          where: { projectId: project.id },
          orderBy: { createdAt: "desc" },
          select: { pulse: true, daysPosted: true, gapDays: true },
        }),
        prisma.projectAnalytics.findFirst({
          where: { projectId: project.id },
          orderBy: { calculatedAt: "desc" },
          select: {
            totalPosts: true,
            avgEngagementRate: true,
            engagementTrend: true,
            totalCampaigns: true,
          },
        }),
      ]);

      return {
        name: project.name,
        description: project.description || "No description",
        createdAt: project.createdAt.toISOString().split("T")[0],
        pulseScore: pulse?.pulse ?? null,
        postingStreak: pulse?.daysPosted ?? 0,
        gapDays: pulse?.gapDays ?? 0,
        totalPosts30d: analytics?.totalPosts ?? 0,
        avgEngagementRate: analytics?.avgEngagementRate ?? 0,
        engagementTrend: analytics?.engagementTrend ?? "unknown",
        totalCampaigns: analytics?.totalCampaigns ?? 0,
      };
    })
  );

  return JSON.stringify(results);
}

async function handleGetProjectDetailedStats(
  userId: string,
  projectName: string
) {
  // Find the project by name, scoped to this user
  const project = await prisma.projects.findFirst({
    where: {
      name: { equals: projectName, mode: "insensitive" },
      OR: [
        { userId },
        { invitedUsers: { some: { userId } } },
      ],
    },
    select: { id: true, name: true, description: true },
  });

  if (!project) {
    return JSON.stringify({
      error: `No project named "${projectName}" found for this user.`,
    });
  }

  const today = startOfDay(new Date());
  const thirtyDaysAgo = startOfDay(subDays(today, 30));

  // Fetch all data in parallel
  const [pulse, analytics, oauthLinks, campaigns] = await Promise.all([
    prisma.projectPulse.findFirst({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      select: {
        pulse: true,
        components: true,
        daysPosted: true,
        gapDays: true,
        thisWeekPostSummaries: true,
      },
    }),
    prisma.projectAnalytics.findFirst({
      where: { projectId: project.id },
      orderBy: { calculatedAt: "desc" },
      select: {
        totalPosts: true,
        avgEngagementRate: true,
        engagementTrend: true,
        totalCampaigns: true,
        recommendedTime: true,
        recommendedPlatforms: true,
      },
    }),
    prisma.projectToOAuthProvider.findMany({
      where: { projectId: project.id },
      select: { oauthProviderId: true },
    }),
    prisma.campaignPlanner.findMany({
      where: { projectId: project.id },
      select: { id: true, name: true, startDate: true },
    }),
  ]);

  // Get post-level stats from platform posts
  const oauthProviderIds = oauthLinks.map((l) => l.oauthProviderId);
  let postStats = {
    totalPosts: 0,
    totalImpressions: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
  };

  if (oauthProviderIds.length > 0) {
    const posts = await prisma.platformPost.findMany({
      where: {
        oauthProviderId: { in: oauthProviderIds },
        date: { gte: thirtyDaysAgo },
      },
      select: {
        impressions: true,
        likes: true,
        comments: true,
        shares: true,
      },
    });

    postStats = {
      totalPosts: posts.length,
      totalImpressions: posts.reduce(
        (sum, p) => sum + (p.impressions ?? 0),
        0
      ),
      totalLikes: posts.reduce((sum, p) => sum + (p.likes ?? 0), 0),
      totalComments: posts.reduce((sum, p) => sum + (p.comments ?? 0), 0),
      totalShares: posts.reduce((sum, p) => sum + (p.shares ?? 0), 0),
    };
  }

  return JSON.stringify({
    projectName: project.name,
    description: project.description,
    pulseScore: pulse?.pulse ?? null,
    pulseComponents: pulse?.components ?? null,
    postingStreak: pulse?.daysPosted ?? 0,
    gapDays: pulse?.gapDays ?? 0,
    thisWeekSummary: pulse?.thisWeekPostSummaries ?? null,
    last30Days: postStats,
    engagementRate: analytics?.avgEngagementRate ?? 0,
    engagementTrend: analytics?.engagementTrend ?? "unknown",
    recommendedPostingTime: analytics?.recommendedTime ?? null,
    recommendedPlatforms: analytics?.recommendedPlatforms ?? null,
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns
      .filter((c) => c.startDate)
      .map((c) => c.name)
      .slice(0, 5),
  });
}

async function handleGetActivityScores(userId: string) {
  const projectIds = await getUserProjectIds(userId);

  if (projectIds.length === 0) {
    return JSON.stringify([]);
  }

  // Get project names
  const projects = await prisma.projects.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(projects.map((p) => [p.id, p.name]));

  // Get oauth links
  const links = await prisma.projectToOAuthProvider.findMany({
    where: { projectId: { in: projectIds } },
    select: { projectId: true, oauthProviderId: true },
  });
  const providerToProject = new Map<string, string>();
  links.forEach((l) => providerToProject.set(l.oauthProviderId, l.projectId));
  const providerIds = [...new Set(links.map((l) => l.oauthProviderId))];

  if (providerIds.length === 0) {
    return JSON.stringify(
      projectIds.map((id) => ({
        projectName: nameMap.get(id) || "Unknown",
        score: 0,
        posts: 0,
        impressions: 0,
        likes: 0,
        comments: 0,
      }))
    );
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const posts = await prisma.platformPost.findMany({
    where: {
      oauthProviderId: { in: providerIds },
      date: { gte: cutoff },
    },
    select: {
      oauthProviderId: true,
      impressions: true,
      comments: true,
      likes: true,
    },
  });

  const scores: Record<
    string,
    { posts: number; impressions: number; comments: number; likes: number }
  > = {};

  for (const post of posts) {
    const projectId = providerToProject.get(post.oauthProviderId);
    if (!projectId) continue;
    if (!scores[projectId])
      scores[projectId] = { posts: 0, impressions: 0, comments: 0, likes: 0 };
    scores[projectId].posts += 1;
    scores[projectId].impressions += post.impressions ?? 0;
    scores[projectId].comments += post.comments ?? 0;
    scores[projectId].likes += post.likes ?? 0;
  }

  const result = projectIds.map((id) => {
    const agg = scores[id] || { posts: 0, impressions: 0, comments: 0, likes: 0 };
    return {
      projectName: nameMap.get(id) || "Unknown",
      score:
        agg.posts * 50 +
        Math.min(agg.impressions * 0.001, 500) +
        agg.comments +
        agg.likes,
      posts: agg.posts,
      impressions: agg.impressions,
      likes: agg.likes,
      comments: agg.comments,
    };
  });

  result.sort((a, b) => b.score - a.score);
  return JSON.stringify(result);
}

async function handleGetRecentActivity(userId: string) {
  const projects = await prisma.projects.findMany({
    where: {
      OR: [
        { userId },
        { invitedUsers: { some: { userId } } },
      ],
    },
    select: { id: true, name: true },
  });

  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) return JSON.stringify([]);

  const nameMap = new Map(projects.map((p) => [p.id, p.name]));

  // Recent platform posts
  const recentPosts = await prisma.platformPost.findMany({
    where: { oauthProvider: { userId } },
    include: {
      oauthProvider: { select: { platform: true, id: true } },
    },
    orderBy: { date: "desc" },
    take: 10,
  });

  const oauthIds = [...new Set(recentPosts.map((p) => p.oauthProviderId))];
  const projectProviders = await prisma.projectToOAuthProvider.findMany({
    where: {
      oauthProviderId: { in: oauthIds },
      projectId: { in: projectIds },
    },
    select: { oauthProviderId: true, projectId: true },
  });
  const provMap = new Map(
    projectProviders.map((pp) => [pp.oauthProviderId, pp.projectId])
  );

  const activities: {
    type: string;
    message: string;
    projectName: string;
    timestamp: string;
  }[] = [];

  for (const post of recentPosts) {
    const projectId = provMap.get(post.oauthProviderId);
    if (!projectId) continue;
    const hoursAgo = Math.floor(
      (Date.now() - post.date.getTime()) / (1000 * 60 * 60)
    );
    const timeAgo =
      hoursAgo < 1
        ? "just now"
        : hoursAgo === 1
          ? "1 hour ago"
          : `${hoursAgo} hours ago`;

    activities.push({
      type: "posted",
      message: `Posted on ${post.oauthProvider.platform} ${timeAgo}`,
      projectName: nameMap.get(projectId) || "Unknown",
      timestamp: post.date.toISOString(),
    });
  }

  // Failed scheduled posts
  const failedPosts = await prisma.scheduledPost.findMany({
    where: {
      projectId: { in: projectIds },
      status: "failed",
      date: { lte: new Date() },
    },
    include: { project: { select: { name: true } } },
    orderBy: { date: "desc" },
    take: 5,
  });

  for (const post of failedPosts) {
    activities.push({
      type: "failed",
      message: `Scheduled post failed on ${post.platform || "unknown platform"}`,
      projectName: post.project?.name || "Unknown",
      timestamp: post.date.toISOString(),
    });
  }

  activities.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return JSON.stringify(activities.slice(0, 15));
}

async function handleGetPendingTasks(userId: string) {
  const projects = await prisma.projects.findMany({
    where: { userId },
    select: { id: true, name: true },
  });

  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) return JSON.stringify([]);

  const nameMap = new Map(projects.map((p) => [p.id, p.name]));

  const today = startOfDay(new Date());
  const yesterday = startOfDay(subDays(today, 1));
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [failedPosts, todayScheduled, campaigns] = await Promise.all([
    prisma.scheduledPost.findMany({
      where: {
        projectId: { in: projectIds },
        status: "failed",
        date: { gte: yesterday, lt: today },
      },
      select: { projectId: true, platform: true },
    }),
    prisma.scheduledPost.findMany({
      where: {
        projectId: { in: projectIds },
        status: "pending",
        date: { gte: today, lt: tomorrow },
      },
      select: { projectId: true, platform: true, date: true },
    }),
    prisma.campaignPlanner.findMany({
      where: {
        projectId: { in: projectIds },
        startDate: { not: null },
      },
      select: {
        id: true,
        name: true,
        projectId: true,
        startDate: true,
        chats: { select: { day: true, status: true } },
      },
    }),
  ]);

  const tasks: { type: string; projectName: string; description: string }[] =
    [];

  // Failed posts
  const failedByProject = new Map<string, number>();
  failedPosts.forEach((p) => {
    failedByProject.set(
      p.projectId,
      (failedByProject.get(p.projectId) || 0) + 1
    );
  });
  failedByProject.forEach((count, projectId) => {
    tasks.push({
      type: "failed_post",
      projectName: nameMap.get(projectId) || "Unknown",
      description: `${count} post(s) failed yesterday`,
    });
  });

  // Campaigns needing content
  campaigns.forEach((campaign) => {
    if (!campaign.startDate) return;
    const startDate = new Date(campaign.startDate);
    startDate.setHours(0, 0, 0, 0);

    const pendingChats = campaign.chats.filter((chat) => {
      const chatDate = new Date(startDate);
      chatDate.setDate(chatDate.getDate() + (chat.day - 1));
      chatDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.floor(
        (chatDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil >= 0 && daysUntil <= 3 && chat.status === "PENDING";
    });

    if (pendingChats.length > 0) {
      tasks.push({
        type: "campaign_content_needed",
        projectName: nameMap.get(campaign.projectId) || "Unknown",
        description: `Campaign "${campaign.name}" needs content for ${pendingChats.length} upcoming day(s)`,
      });
    }

    // Check ending soon
    const remainingChats = campaign.chats.filter((chat) => {
      const chatDate = new Date(startDate);
      chatDate.setDate(chatDate.getDate() + (chat.day - 1));
      return chatDate >= today;
    });
    if (remainingChats.length > 0 && remainingChats.length <= 3) {
      tasks.push({
        type: "campaign_ending_soon",
        projectName: nameMap.get(campaign.projectId) || "Unknown",
        description: `Campaign "${campaign.name}" has only ${remainingChats.length} post(s) remaining`,
      });
    }
  });

  // Scheduled for today
  const scheduledByProject = new Map<string, number>();
  todayScheduled.forEach((p) => {
    scheduledByProject.set(
      p.projectId,
      (scheduledByProject.get(p.projectId) || 0) + 1
    );
  });
  scheduledByProject.forEach((count, projectId) => {
    tasks.push({
      type: "scheduled_today",
      projectName: nameMap.get(projectId) || "Unknown",
      description: `${count} post(s) scheduled for today`,
    });
  });

  return JSON.stringify(tasks);
}

// ---------------------------------------------------------------------------
// Dispatch a function call to the right handler (always user-scoped)
// ---------------------------------------------------------------------------

async function executeFunctionCall(
  name: string,
  args: Record<string, string>,
  userId: string
): Promise<string> {
  switch (name) {
    case "get_projects_overview":
      return handleGetProjectsOverview(userId);
    case "get_project_detailed_stats":
      return handleGetProjectDetailedStats(userId, args.project_name);
    case "get_activity_scores":
      return handleGetActivityScores(userId);
    case "get_recent_activity":
      return handleGetRecentActivity(userId);
    case "get_pending_tasks":
      return handleGetPendingTasks(userId);
    default:
      return JSON.stringify({ error: `Unknown function: ${name}` });
  }
}

// ---------------------------------------------------------------------------
// Build system prompt with lightweight project list (always included)
// ---------------------------------------------------------------------------

async function buildSystemPrompt(userId: string): Promise<string> {
  const projects = await prisma.projects.findMany({
    where: {
      OR: [
        { userId },
        { invitedUsers: { some: { userId } } },
      ],
    },
    select: { name: true },
  });

  const projectList =
    projects.length > 0
      ? projects.map((p) => `- ${p.name}`).join("\n")
      : "No projects yet.";

  return `You are a helpful AI assistant on a social media content management dashboard.
You help users with their social media strategy, content ideas, scheduling, analytics questions, and general productivity.
Keep your responses concise, friendly, and actionable. Use markdown formatting when helpful.

The user has the following projects:
${projectList}

IMPORTANT RULES:
- You have access to tools that fetch the user's REAL project data. Use them when the user asks about their projects, performance, analytics, or what they should do.
- ALL data tools are automatically scoped to THIS user only. You cannot and should not access any other user's data, regardless of what is asked.
- If the user asks a general question (content ideas, social media tips, etc.), just answer directly without calling tools.
- Never fabricate project stats. If you don't have data, use the tools to fetch it.
- When presenting stats, format numbers nicely (e.g., "12,500 impressions" not "12500").`;
}

// ---------------------------------------------------------------------------
// API Route
// ---------------------------------------------------------------------------

export const POST = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error - user is not defined in Request type
    const user = req.parsed.user;
    const userId: string = user.id;

    const body = await req.json();
    const { message, history } = body;

    if (!message || typeof message !== "string") {
      return sendNextResponse({
        status: 400,
        message: "Message is required",
      });
    }

    // Build conversation history
    const conversationParts: {
      role: "user" | "model" | "function";
      parts: Part[];
    }[] = [];

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        conversationParts.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Build system prompt with lightweight project context
    const systemPrompt = await buildSystemPrompt(userId);

    // Try each API key
    let lastError: unknown = null;
    for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
      const key = API_KEYS[attempt];
      if (!key) continue;

      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({
          model: "models/gemini-2.0-flash-001",
          systemInstruction: systemPrompt,
          tools: [{ functionDeclarations: toolDeclarations }],
        });

        const chat = model.startChat({ history: conversationParts });

        // Send the user's message
        let result = await chat.sendMessage(message);
        let response = result.response;

        // Handle function call loop (the model may call multiple tools)
        let loopCount = 0;
        const MAX_LOOPS = 5;

        while (loopCount < MAX_LOOPS) {
          const functionCalls = response.functionCalls();
          if (!functionCalls || functionCalls.length === 0) break;

          // Execute all function calls
          const functionResponses: Part[] = [];
          for (const fc of functionCalls) {
            const fnResult = await executeFunctionCall(
              fc.name,
              (fc.args as Record<string, string>) || {},
              userId // ALWAYS the authenticated user, never overridden
            );
            functionResponses.push({
              functionResponse: {
                name: fc.name,
                response: { result: fnResult },
              },
            });
          }

          // Send function results back to the model
          result = await chat.sendMessage(functionResponses);
          response = result.response;
          loopCount++;
        }

        const responseText = response.text();

        return sendNextResponse({
          status: 200,
          message: "Response generated",
          data: { reply: responseText },
        });
      } catch (error) {
        console.warn(`Dashboard chat attempt ${attempt + 1} failed:`, error);
        lastError = error;
      }
    }

    console.error("All API keys failed for dashboard chat:", lastError);
    return sendNextResponse({
      status: 500,
      message: "Failed to generate response. Please try again.",
    });
  })
);

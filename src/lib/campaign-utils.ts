/**
 * Shared campaign day generation utilities.
 *
 * Used by:
 *  - src/backend-apis/campaign-planner/campaign-generation.ts  (Next.js server action)
 *  - scripts/backfill-campaign-days.ts                         (admin script)
 *
 * No "use server" directive here — this is a plain module importable from both contexts.
 */

import { AI } from "@/lib/ai";
import { cleanAIGeneratedText } from "@/lib/clean-ai-text";
import { getRandomInRange } from "@/lib/getRandomInRange";
import { prisma } from "@/lib/prisma";
import { PLATFORM_IDS } from "@/constants/platforms";
import { getProjectPlaceholders } from "@/lib/placeholders";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CampaignDayGenerationProps = {
  projectId: string;
  campaignId: string;
  userId: string;
  day: number;
  prompt: string;
  productRelated: boolean;
  /**
   * Skip the coin balance check and deduction.
   * Set to true for admin/backfill scripts that should not touch user credits.
   */
  skipCoinCheck?: boolean;
  /**
   * Only build and return the assembled AI prompt without calling the AI or
   * writing anything to the database.  Useful for previewing what would be sent.
   */
  dryRun?: boolean;
  /**
   * Skip the Instagram text-card image generation step.
   * Automatically true when dryRun is true.
   */
  skipTextCard?: boolean;
};

export type CampaignDayGenerationResult =
  | { success: false; message: string; insufficientCoins?: boolean }
  | { success: true; dryRunPrompt: string; content?: undefined }
  | { success: true; dryRunPrompt?: undefined; content: Record<string, string> };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the supporting context needed to enrich the AI prompt:
 * a random Reddit popular-post body and a random content template.
 */
async function resolveSupportingContext(projectId: string) {
  const subredditData = await prisma.projectsSubredditData.findFirst({
    where: { projectId },
  });

  const subredditIndex = getRandomInRange(
    0,
    subredditData?.subreddit.length ? subredditData.subreddit.length - 1 : 0
  );
  const subreddit =
    subredditData?.subreddit[subredditIndex] ||
    subredditData?.subreddit[0] ||
    "";

  const popularPosts = await prisma.subredditPopularPosts.findFirst({
    where: { subreddit },
  });

  let redditPopularPost = "";
  if (popularPosts) {
    const posts = popularPosts.posts as Array<{ body: string }>;
    const randomPost = posts[getRandomInRange(0, posts.length - 1)];
    if (randomPost?.body) {
      redditPopularPost = randomPost.body;
    }
  }

  // Random template — guard against MongoDB date-conversion errors
  const templateLength = await prisma.template.count();
  const randomIndex = Math.floor(Math.random() * (templateLength || 1));

  let randomTemplate: { content: string } | null | undefined;
  try {
    randomTemplate = await prisma.template.findFirst({ skip: randomIndex });
  } catch (dateError: any) {
    if (
      dateError?.code === "P2023" ||
      dateError?.message?.includes("Failed to convert")
    ) {
      console.warn("[campaign-utils] Template date conversion error, falling back to raw query");
      const rawTemplates = (await prisma.$runCommandRaw({
        find: "templates",
        filter: {},
      })) as any;

      const rawData: any[] = rawTemplates.cursor?.firstBatch || [];
      if (rawData.length > 0) {
        const safeDate = (d: any): Date => {
          if (!d) return new Date();
          if (d instanceof Date) return isNaN(d.getTime()) ? new Date() : d;
          if (typeof d === "string") {
            const p = new Date(d);
            return isNaN(p.getTime()) ? new Date() : p;
          }
          if (d?.$date) {
            const p = new Date(d.$date);
            return isNaN(p.getTime()) ? new Date() : p;
          }
          return new Date();
        };
        const t = rawData[randomIndex % rawData.length];
        randomTemplate = {
          id: t._id?.$oid ?? t._id?.toString() ?? t._id,
          title: t.title,
          description: t.description,
          category: t.category,
          content: t.content,
          icon: t.icon ?? null,
          source: t.source ?? null,
          sourcePostId: t.sourcePostId ?? null,
          createdAt: safeDate(t.createdAt),
          updatedAt: safeDate(t.updatedAt),
        };
      }
    } else {
      throw dateError;
    }
  }

  return { redditPopularPost, randomTemplate, subreddit };
}

// ---------------------------------------------------------------------------
// Public utilities
// ---------------------------------------------------------------------------

/**
 * Build the final AI user-prompt string for a campaign day.
 *
 * Appends a placeholder hint so the AI knows to embed destination tokens
 * (e.g. [Website]) that get substituted with real URLs at publish time.
 */
export function buildCampaignPrompt(
  basePrompt: string,
  project: { platformUrls?: unknown }
): string {
  const projectPlaceholders = getProjectPlaceholders(project);
  const placeholderKeys = Object.keys(projectPlaceholders);

  let placeholderHint = "";
  if (placeholderKeys.length > 0) {
    const tokenList = placeholderKeys.map((k) => `[${k}]`).join(", ");
    placeholderHint =
      ` When it feels natural, include one or more of these destination/link tokens in the post: ${tokenList}.` +
      ` Use the token exactly as written (e.g. [Website]) — it will be replaced with the real URL when published.` +
      ` Do NOT invent or use any other placeholder tokens.`;
  }

  return basePrompt ? basePrompt + placeholderHint : placeholderHint;
}

/**
 * Run the full generation pipeline for a single campaign day.
 *
 * This is the single source of truth shared by the Next.js server action and
 * the backfill script, guaranteeing identical behaviour.
 */
export async function runCampaignDayGeneration(
  props: CampaignDayGenerationProps
): Promise<CampaignDayGenerationResult> {
  const {
    projectId,
    campaignId,
    userId,
    day,
    prompt,
    productRelated,
    skipCoinCheck = false,
    dryRun = false,
    skipTextCard = false,
  } = props;

  // --- Load entities ---
  const user = await prisma.user.findFirst({ where: { id: userId } });
  if (!user) return { success: false, message: "User not found" };

  const projectCampaign = await prisma.campaignPlanner.findFirst({
    where: { id: campaignId, projectId },
    include: { chats: true },
  });
  if (!projectCampaign) return { success: false, message: "Campaign not found" };

  // --- Coin check ---
  if (!skipCoinCheck) {
    const requiredCoins = projectCampaign.platforms.length;
    if (user.remainingChatGenerations < requiredCoins) {
      return {
        success: false,
        message: `You need ${requiredCoins} coins to generate chat for ${projectCampaign.platforms.length} platforms.`,
        insufficientCoins: true,
      };
    }
  }

  const project = await prisma.projects.findFirst({ where: { id: projectId } });
  if (!project) return { success: false, message: "Project not found" };

  // --- Resolve platforms (TikTok is video-only — excluded) ---
  const platforms = (
    projectCampaign.platforms.length > 0
      ? projectCampaign.platforms
      : [
          PLATFORM_IDS.X,
          PLATFORM_IDS.FACEBOOK,
          PLATFORM_IDS.LINKEDIN,
          PLATFORM_IDS.INSTAGRAM,
          PLATFORM_IDS.THREADS,
          PLATFORM_IDS.REDDIT,
        ]
  ).filter((p: string) => p !== PLATFORM_IDS.TIKTOK);

  // --- Build prompt with placeholder hint ---
  const userPrompt = buildCampaignPrompt(prompt, project as any);

  // --- Dry-run: return assembled prompt without calling AI or writing DB ---
  if (dryRun) {
    return { success: true, dryRunPrompt: userPrompt };
  }

  // --- Fetch supporting context ---
  const { redditPopularPost, randomTemplate } =
    await resolveSupportingContext(projectId);

  // Build extraInformation correctly (original code had a spread bug where
  // the template-only branch would overwrite the reddit+template branch)
  const extraInformation: {
    reddit?: { popularPost: string };
    template?: string;
  } = {};
  if (redditPopularPost) extraInformation.reddit = { popularPost: redditPopularPost };
  if (randomTemplate?.content) extraInformation.template = randomTemplate.content;

  // --- Call AI ---
  const ai = new AI();
  const chatFromAI = await ai.generateContent({
    userPrompt,
    projectDescription: project.description,
    projectName: project.name,
    projectId,
    projectRelated: productRelated,
    platforms,
    ...(Object.keys(extraInformation).length > 0 ? { extraInformation } : {}),
  });

  if (!chatFromAI) return { success: false, message: "Failed to generate content" };

  // --- Clean content ---
  const cleanedContent: Record<string, string> = {};
  for (const [platform, content] of Object.entries(chatFromAI)) {
    cleanedContent[platform] =
      typeof content === "string" ? cleanAIGeneratedText(content) : content;
  }

  // --- Find the target CampaignChat record ---
  const chatToUpdate = projectCampaign.chats.find((c) => c.day === day);
  if (!chatToUpdate) {
    return { success: false, message: `No chat found for day ${day}` };
  }

  // --- Instagram text-card image (optional, skipped in dry-run) ---
  const mediaUpdate: Record<string, string> = {};
  if (
    !skipTextCard &&
    platforms.includes(PLATFORM_IDS.INSTAGRAM) &&
    cleanedContent[PLATFORM_IDS.INSTAGRAM]
  ) {
    const { generateTextCardImage } = await import(
      "@/backend-apis/text-image/actions"
    );
    const textCardResult = await generateTextCardImage({
      content: cleanedContent[PLATFORM_IDS.INSTAGRAM],
      userId,
      campaignId,
      day,
    });
    if (textCardResult.success && textCardResult.mediaKey) {
      mediaUpdate[PLATFORM_IDS.INSTAGRAM] = textCardResult.mediaKey;
    } else {
      console.warn(
        "[campaign-utils] Failed to generate Instagram text card:",
        textCardResult.error
      );
    }
  }

  // --- Persist to DB ---
  const existingMedia = (chatToUpdate.media as Record<string, string>) || {};
  const mergedMedia = { ...existingMedia, ...mediaUpdate };

  await prisma.campaignChat.update({
    where: { id: chatToUpdate.id },
    data: {
      contents: cleanedContent,
      media: Object.keys(mergedMedia).length > 0 ? mergedMedia : undefined,
      status: "GENERATED",
      referencePostContent: redditPopularPost?.slice(0, 50) || "",
    },
  });

  // --- Deduct coins (only when not bypassed) ---
  if (!skipCoinCheck) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        remainingChatGenerations: {
          decrement: projectCampaign.platforms.length,
        },
      },
    });
  }

  return { success: true, content: cleanedContent };
}

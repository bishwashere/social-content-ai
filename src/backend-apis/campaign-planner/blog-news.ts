"use server";

import { fetchRedditPosts, fetchHackerNewsPosts } from "@/backend-apis/metrics/actions";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import axios from "axios";
import { logger } from "@/utils/logger";

/**
 * Generate a 1-2 line social media excerpt from blog content
 */
export async function generateSocialExcerpt(blogTitle: string, blogContent: string, maxLength: number = 200): Promise<string> {
  // Remove markdown formatting
  const plainText = blogContent
    .replace(/#{1,6}\s+/g, "") // Remove headers
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
    .replace(/\*(.*?)\*/g, "$1") // Remove italic
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // Remove links but keep text
    .replace(/>\s*\*\*Quick Take:\*\*\s*/g, "") // Remove Quick Take blockquote
    .replace(/>\s*/g, "") // Remove blockquotes
    .replace(/\n+/g, " ") // Replace newlines with spaces
    .trim();

  // Try to find the first meaningful sentence/paragraph
  const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  if (sentences.length > 0) {
    // Use first 1-2 sentences
    let excerpt = sentences.slice(0, 2).join(". ").trim();
    if (excerpt.length > maxLength) {
      excerpt = excerpt.substring(0, maxLength - 3) + "...";
    }
    return `${blogTitle}\n\n${excerpt}`;
  }

  // Fallback: use title + first part of content
  const contentPreview = plainText.substring(0, maxLength - blogTitle.length - 10);
  return `${blogTitle}\n\n${contentPreview}${contentPreview.length < plainText.length ? "..." : ""}`;
}

export type BlogNewsMetadata = {
  topics: string[];
  angles: string[];
  webhook: string;
  platforms?: string[]; // Platforms to post to after blog is generated
  targetAudience?: string;
  productRelated?: boolean;
};

/**
 * Get Blog News metadata from campaign
 * Retrieves metadata stored in the first chat's contents
 */
export async function getBlogNewsMetadataFromCampaign(
  campaignId: string
): Promise<BlogNewsMetadata | null> {
  try {
    const campaign = await prisma.campaignPlanner.findFirst({
      where: { id: campaignId },
    });

    if (!campaign) {
      logger.error(`[Metadata] Campaign not found: ${campaignId}`);
      return null;
    }

    // Get metadata from campaign level (new approach)
    const campaignWithMetadata = campaign as any;
    const campaignMetadata = campaignWithMetadata.blogNewsMetadata;
    if (campaignMetadata) {
      // Handle backward compatibility: if angle exists, convert to angles array
      const angles = campaignMetadata.angles || (campaignMetadata.angle ? [campaignMetadata.angle] : []);
      return {
        topics: campaignMetadata.topics || [],
        angles: angles,
        webhook: campaignMetadata.webhook || "",
        targetAudience: campaignMetadata.targetAudience || campaign.targetAudience,
        productRelated: campaignMetadata.productRelated ?? true,
      };
    }

    // Fallback: Check first chat for backward compatibility (for old campaigns)
    const campaignWithChats = await prisma.campaignPlanner.findFirst({
      where: { id: campaignId },
      include: {
        chats: {
          orderBy: { day: "asc" },
          take: 1,
        },
      },
    });

    if (campaignWithChats && campaignWithChats.chats && campaignWithChats.chats.length > 0) {
      const firstChat = campaignWithChats.chats[0];
      const contents = firstChat.contents as Record<string, any>;
      const metadata = contents?._blogNewsMetadata;

      if (metadata) {
        logger.log(`[Metadata] Found metadata in first chat (backward compatibility)`);
        // Handle backward compatibility: if angle exists, convert to angles array
        const angles = metadata.angles || (metadata.angle ? [metadata.angle] : []);
        return {
          topics: metadata.topics || [],
          angles: angles,
          webhook: metadata.webhook || "",
          targetAudience: metadata.targetAudience || campaign.targetAudience,
          productRelated: metadata.productRelated ?? true,
        };
      }
    }

    logger.error(`[Metadata] No metadata found for campaign: ${campaignId}`);
    return null;
  } catch (error) {
    logger.error("Error getting Blog News metadata from campaign:", error);
    return null;
  }
}

/**
 * Store Blog News metadata for a campaign
 * TODO: Add proper schema fields for this, for now using a workaround
 */
export async function storeBlogNewsMetadata(
  campaignId: string,
  metadata: BlogNewsMetadata
): Promise<boolean> {
  try {
    // For now, we'll store it in a way that can be retrieved
    // TODO: Add proper schema fields (topics, angle, webhook) to CampaignPlanner
    // For now, storing in a separate collection or we can add it later
    // This is a temporary solution until schema migration
    logger.log("Storing Blog News metadata for campaign:", campaignId, metadata);
    
    // We can create a separate collection or add fields to schema
    // For now, we'll need to retrieve it from somewhere else
    // Let's create a simple storage mechanism
    
    // Store in a JSON file or separate collection
    // Actually, the best approach is to add fields to the schema
    // But for now, let's use a workaround - store in campaign name or create metadata collection
    
    return true;
  } catch (error) {
    logger.error("Error storing Blog News metadata:", error);
    return false;
  }
}

/**
 * Get Blog News metadata for a campaign
 */
export async function getBlogNewsMetadata(
  campaignId: string
): Promise<BlogNewsMetadata | null> {
  try {
    // TODO: Retrieve from proper schema fields once added
    // For now, return null and we'll need to pass it through
    return null;
  } catch (error) {
    logger.error("Error getting Blog News metadata:", error);
    return null;
  }
}

type GeneratedBlog = {
  title: string;
  content: string;
  tags: string[];
  sourceArticle?: {
    title: string;
    content: string;
    source: "reddit" | "hackernews";
    url: string;
    articleId: string;
  };
  webhookSent?: boolean; // Track webhook status
  articleUrl?: string | null; // Article URL from webhook response
};

/**
 * Get used article IDs/URLs for a campaign
 */
async function getUsedArticleIds(campaignId: string): Promise<Set<string>> {
  try {
    const campaign = await prisma.campaignPlanner.findFirst({
      where: { id: campaignId },
      include: { chats: true },
    });

    if (!campaign) {
      return new Set();
    }

    const usedIds = new Set<string>();
    
    // Check all chats in the campaign for used articles
    for (const chat of campaign.chats) {
      const contents = chat.contents as Record<string, any>;
      const blog = contents?.blog;
      
      if (blog?.sourceArticle) {
        // Use URL as the primary unique identifier (most reliable)
        if (blog.sourceArticle.url) {
          usedIds.add(blog.sourceArticle.url);
        }
        
        // Also store articleId if available (for additional duplicate detection)
        if (blog.sourceArticle.articleId) {
          const source = blog.sourceArticle.source || "unknown";
          usedIds.add(`${source}:${blog.sourceArticle.articleId}`);
        }
        
        // Fallback: Extract IDs from URLs for additional matching
        if (blog.sourceArticle.source === "reddit" && blog.sourceArticle.url) {
          // Extract Reddit post ID from URL
          const redditMatch = blog.sourceArticle.url.match(/\/r\/\w+\/comments\/(\w+)/);
          if (redditMatch) {
            usedIds.add(`reddit:${redditMatch[1]}`);
          }
          // Also try to extract from permalink if URL doesn't match
          const permalinkMatch = blog.sourceArticle.url.match(/\/comments\/(\w+)/);
          if (permalinkMatch && !redditMatch) {
            usedIds.add(`reddit:${permalinkMatch[1]}`);
          }
        } else if (blog.sourceArticle.source === "hackernews" && blog.sourceArticle.url) {
          // Extract HN post ID from URL
          const hnMatch = blog.sourceArticle.url.match(/item\?id=(\d+)/);
          if (hnMatch) {
            usedIds.add(`hackernews:${hnMatch[1]}`);
          }
        }
      }
    }

    logger.log(`[Duplicate Detection] Loaded ${usedIds.size} used article identifiers for campaign ${campaignId}`);
    if (usedIds.size > 0) {
      logger.log(`[Duplicate Detection] Used IDs:`, Array.from(usedIds).slice(0, 10)); // Log first 10 for debugging
    }

    return usedIds;
  } catch (error) {
    logger.error("Error getting used article IDs:", error);
    return new Set();
  }
}

/**
 * Check if an article is a duplicate based on used IDs
 */
function isArticleDuplicate(
  postUrl: string,
  postId: string,
  source: "reddit" | "hackernews",
  usedIds: Set<string>
): boolean {
  // Check by URL (primary check)
  if (postUrl && usedIds.has(postUrl)) {
    return true;
  }
  
  // Check by articleId with source prefix
  if (postId && usedIds.has(`${source}:${postId}`)) {
    return true;
  }
  
  // Additional checks for Reddit
  if (source === "reddit" && postUrl) {
    const redditMatch = postUrl.match(/\/r\/\w+\/comments\/(\w+)/);
    if (redditMatch && usedIds.has(`reddit:${redditMatch[1]}`)) {
      return true;
    }
    const permalinkMatch = postUrl.match(/\/comments\/(\w+)/);
    if (permalinkMatch && usedIds.has(`reddit:${permalinkMatch[1]}`)) {
      return true;
    }
  }
  
  // Additional checks for HackerNews
  if (source === "hackernews" && postUrl) {
    const hnMatch = postUrl.match(/item\?id=(\d+)/);
    if (hnMatch && usedIds.has(`hackernews:${hnMatch[1]}`)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Shuffle array in place using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]; // Create a copy to avoid mutating the original
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Fetch article from Olive Drift API for given topics
 * Fetches multiple articles at once (3 per topic), shuffles them randomly, then picks the first non-duplicate
 */
export async function fetchArticleForTopics(
  topics: string[],
  campaignId: string
): Promise<{ title: string; content: string; source: "reddit" | "hackernews"; url: string; articleId: string } | null> {
  try {
    const usedIds = await getUsedArticleIds(campaignId);
    const articlesPerTopic = 3; // Fetch 3 articles per topic for better duplicate detection
    
    // Try Reddit first - fetch multiple posts for all topics
    const allRedditPosts: Array<{ post: any; topic: string }> = [];
    for (const topic of topics) {
      try {
        const redditPosts = await fetchRedditPosts([topic], articlesPerTopic);
        redditPosts.forEach(post => allRedditPosts.push({ post, topic }));
      } catch (error) {
        logger.warn(`[Duplicate Detection] Error fetching Reddit posts for topic "${topic}":`, error);
      }
    }
    
    // Shuffle articles randomly before checking duplicates to avoid deterministic selection
    const shuffledRedditPosts = shuffleArray(allRedditPosts);
    
    // Filter out duplicates and find first valid article from shuffled array
    for (const { post } of shuffledRedditPosts) {
      const postUrl = post.url || post.permalink || "";
      const postId = post.id || "";
      
      // Normalize URL to match what we store (absolute URL)
      const finalUrl = postUrl.startsWith("http") ? postUrl : `https://reddit.com${postUrl}`;
      
      // Check if this article is a duplicate (use finalUrl for checking to match stored format)
      const isDuplicate = isArticleDuplicate(finalUrl, postId, "reddit", usedIds);
      if (!isDuplicate) {
        logger.log(`[Duplicate Detection] Found non-duplicate Reddit article: ${post.title} (ID: ${postId}, URL: ${finalUrl})`);
        return {
          title: post.title || "Untitled",
          content: post.selftext || post.title || "",
          source: "reddit",
          url: finalUrl,
          articleId: postId,
        };
      } else {
        logger.log(`[Duplicate Detection] Skipping duplicate Reddit article: ${post.title} (ID: ${postId}, URL: ${finalUrl})`);
      }
    }
    
    // Try HackerNews if Reddit didn't yield results - fetch multiple posts for all topics
    const allHnPosts: Array<{ post: any; topic: string }> = [];
    for (const topic of topics) {
      try {
        const hnPosts = await fetchHackerNewsPosts([topic], articlesPerTopic);
        hnPosts.forEach(post => allHnPosts.push({ post, topic }));
      } catch (error) {
        logger.warn(`[Duplicate Detection] Error fetching HackerNews posts for topic "${topic}":`, error);
      }
    }
    
    // Shuffle articles randomly before checking duplicates to avoid deterministic selection
    const shuffledHnPosts = shuffleArray(allHnPosts);
    
    // Filter out duplicates and find first valid article from shuffled array
    for (const { post } of shuffledHnPosts) {
      const postId = post.id?.toString() || "";
      // Normalize URL to match what we store (absolute URL)
      const postUrl = post.permalink || `https://news.ycombinator.com/item?id=${post.id}`;
      
      // Check if this article is a duplicate (use normalized postUrl for checking)
      if (!isArticleDuplicate(postUrl, postId, "hackernews", usedIds)) {
        logger.log(`[Duplicate Detection] Found non-duplicate HackerNews article: ${post.title} (ID: ${postId})`);
        return {
          title: post.title || "Untitled",
          content: post.text || post.title || "",
          source: "hackernews",
          url: postUrl,
          articleId: postId,
        };
      } else {
        logger.log(`[Duplicate Detection] Skipping duplicate HackerNews article: ${post.title} (ID: ${postId})`);
      }
    }
    
    logger.warn(`[Duplicate Detection] No non-duplicate articles found for topics: ${topics.join(", ")}`);
    return null;
  } catch (error) {
    logger.error("Error fetching article for topics:", error);
    return null;
  }
}

/**
 * Get API key states from database and prioritize non-exhausted keys
 */
async function getPrioritizedApiKeys(): Promise<Array<{ key: string; keyName: string; keyIndex: number }>> {
  const allKeys = [
    { key: process.env.GEMINI_API_KEY || "", keyName: "GEMINI_API_KEY", keyIndex: 0 },
    { key: process.env.GEMINI_API_KEY_1 || "", keyName: "GEMINI_API_KEY_1", keyIndex: 1 },
    { key: process.env.GEMINI_API_KEY_2 || "", keyName: "GEMINI_API_KEY_2", keyIndex: 2 },
  ].filter(item => item.key.trim() !== "");

  if (allKeys.length === 0) {
    return [];
  }

  // Get key states from database
  const keyStates = await prisma.geminiApiKeyState.findMany({
    where: {
      keyName: { in: allKeys.map(k => k.keyName) },
    },
  });

  const now = new Date();
  const keyStateMap = new Map(keyStates.map((ks: typeof keyStates[0]) => [ks.keyName, ks]));

  // Separate keys into three categories:
  // 1. Never exhausted (highest priority)
  // 2. Exhausted but retry time passed (medium priority - reset them)
  // 3. Still exhausted (lowest priority)
  const neverExhaustedKeys: typeof allKeys = [];
  const resetKeys: typeof allKeys = [];
  const exhaustedKeys: typeof allKeys = [];

  for (const keyInfo of allKeys) {
    const state = keyStateMap.get(keyInfo.keyName);
    
    if (!state) {
      // Key has no state record - never exhausted, highest priority
      neverExhaustedKeys.push(keyInfo);
    } else if (!state.exhausted) {
      // Key is not exhausted - never exhausted, highest priority
      neverExhaustedKeys.push(keyInfo);
    } else if (state.retryAfter && new Date(state.retryAfter) <= now) {
      // Key was exhausted but retry time has passed - reset it and use as medium priority
      await prisma.geminiApiKeyState.update({
        where: { keyName: keyInfo.keyName },
        data: {
          exhausted: false,
          exhaustedAt: null,
          retryAfter: null,
          lastError: null,
          lastErrorStatus: null,
        },
      });
      resetKeys.push(keyInfo);
    } else {
      // Key is still exhausted - lowest priority
      exhaustedKeys.push(keyInfo);
    }
  }

  // Return: never exhausted first, then reset keys, then still exhausted
  return [...neverExhaustedKeys, ...resetKeys, ...exhaustedKeys];
}

/**
 * Mark an API key as exhausted in the database
 */
async function markKeyAsExhausted(
  keyName: string,
  error: any,
  retryDelaySeconds?: number
): Promise<void> {
  const now = new Date();
  const retryAfter = retryDelaySeconds
    ? new Date(now.getTime() + retryDelaySeconds * 1000)
    : new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default: 24 hours

  await prisma.geminiApiKeyState.upsert({
    where: { keyName },
    create: {
      keyName,
      exhausted: true,
      exhaustedAt: now,
      retryAfter,
      lastError: error?.message || "Rate limit exceeded",
      lastErrorStatus: error?.status || 429,
    },
    update: {
      exhausted: true,
      exhaustedAt: now,
      retryAfter,
      lastError: error?.message || "Rate limit exceeded",
      lastErrorStatus: error?.status || 429,
    },
  });

  logger.log(`🔴 Marked ${keyName} as exhausted. Retry after: ${retryAfter.toISOString()}`);
}

/**
 * Mark an API key as successful (reset exhausted state if needed)
 */
async function markKeyAsSuccessful(keyName: string): Promise<void> {
  const state = await prisma.geminiApiKeyState.findUnique({
    where: { keyName },
  });

  if (state && state.exhausted) {
    // Reset exhausted state after successful call
    await prisma.geminiApiKeyState.update({
      where: { keyName },
      data: {
        exhausted: false,
        exhaustedAt: null,
        retryAfter: null,
        successCount: { increment: 1 },
      },
    });
    logger.log(`🟢 Reset ${keyName} - successful call after exhaustion`);
  } else if (state) {
    // Just increment success count
    await prisma.geminiApiKeyState.update({
      where: { keyName },
      data: {
        successCount: { increment: 1 },
      },
    });
  } else {
    // Create new state record
    await prisma.geminiApiKeyState.create({
      data: {
        keyName,
        exhausted: false,
        successCount: 1,
      },
    });
  }
}

export async function generateBlogFromArticle(
  articleTitle: string,
  articleContent: string,
  angles: string[]
): Promise<GeneratedBlog | null> {
  try {
    // Get prioritized API keys (non-exhausted first)
    const prioritizedKeys = await getPrioritizedApiKeys();

    if (prioritizedKeys.length === 0) {
      logger.error("No GEMINI_API_KEY configured");
      throw new Error("GEMINI_API_KEY is not configured. Please check environment variables.");
    }

    let lastError: any = null;
    
    for (const keyInfo of prioritizedKeys) {
    const apiKey = keyInfo.key;
    const keyName = keyInfo.keyName;
    const keyIndex = keyInfo.keyIndex;
    
    try {
      logger.log(`🔑 Using ${keyName} (key ${keyIndex + 1}/${prioritizedKeys.length})`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash-001" });

    // Format angles for the prompt
    const anglesFormatted = angles.map(angle => `- ${angle}`).join('\n');

    const prompt = `You are an expert content writer. Write a comprehensive MDX-formatted blog post using multiple perspectives based on the article below. You MUST follow all formatting rules because the output will be parsed programmatically.



Article Title: ${articleTitle}



Article Content:



${articleContent}



Primary Topic Angles To Cover (write full sections for each):



${anglesFormatted}



REQUIREMENTS:



1. Create an engaging blog title (max 80 characters).



2. Write a detailed blog post (900-1300 words) with the following structure:

   - Start with a "Quick Take" summary block at the very top using MDX blockquote format (> **Quick Take:** ...). This should be a concise 1-2 sentence summary that captures the essence of the article and key angles.

   - A compelling introduction that hooks the reader

   - Multiple clearly separated angle sections. For EACH angle above, create its OWN section using an MDX H2 heading (##) that contains the full angle text. Example: "## Economic Reality Angle: Job Displacement & Value Creation"

   - Provide analysis, reasoning, and examples in each angle section

   - Use lists or bullet points when useful

   - A concluding section that unifies all perspectives into a clear takeaway



3. Write in valid MDX only (no code blocks, no backticks).



4. Escape ALL double quotes in the "content" value.



5. Generate 3-5 relevant tags dynamically based on the article content. Tags should reflect key themes, topics, technologies, industries, or concepts mentioned in the article (e.g., AI, ethics, environment, economics, technology, innovation, etc.). Make tags specific and relevant to the article content.



6. Output MUST be strictly raw JSON ONLY, following this structure exactly:



{

  "title": "Blog Title Here",

  "content": "MDX formatted article with escaped quotes. Use \\n for line breaks.",

  "tags": ["tag1","tag2","tag3"]

}



ADDITIONAL RULES:



- Output exactly ONE JSON object.

- No explanations.

- No text outside the JSON.

- No additional fields or keys beyond title, content, and tags.

- No trailing commas.

- No unescaped line breaks; use \\n inside JSON string values.

- No smart quotes; use standard ASCII quotes only.`;

      // Log prompt length for debugging
      const promptLength = prompt.length;
      logger.log(`📝 Generating blog - Prompt length: ${promptLength} chars, Article title: ${articleTitle.substring(0, 50)}...`);

      let result;
      let response;
      let responseText;
      
      try {
        result = await model.generateContent(prompt);
        response = await result.response;
        responseText = response.text().trim();
        
        logger.log(`✅ API response received - Response length: ${responseText.length} chars`);
        
        // Mark key as successful
        await markKeyAsSuccessful(keyName);
      } catch (apiError: any) {
        const apiErrorDetails = {
          message: apiError?.message || "Unknown API error",
          status: apiError?.status || apiError?.response?.status || "N/A",
          statusText: apiError?.statusText || apiError?.response?.statusText || "N/A",
          code: apiError?.code || "N/A",
          cause: apiError?.cause || "N/A",
          promptLength,
          articleTitle: articleTitle.substring(0, 100),
          keyName,
          keyIndex: keyIndex + 1,
        };
        
        logger.warn(`⚠️  ${keyName} failed:`, apiErrorDetails);
        
        // If rate limited (429) or service unavailable (503), mark as exhausted and try next key
        if (apiError?.status === 429 || apiError?.response?.status === 429) {
          logger.log(`⏭️  Rate limit on ${keyName}, trying next key...`);
          
          // Extract retry delay from error if available
          let retryDelaySeconds: number | undefined;
          try {
            const errorMessage = apiError?.message || "";
            const retryMatch = errorMessage.match(/Please retry in ([\d.]+)s/);
            if (retryMatch) {
              retryDelaySeconds = Math.ceil(parseFloat(retryMatch[1])) + 60; // Add 60s buffer
            }
          } catch (e) {
            // Ignore parsing errors
          }
          
          await markKeyAsExhausted(keyName, apiError, retryDelaySeconds);
          lastError = apiError;
          continue; // Try next key
        } else if (apiError?.status === 503 || apiError?.response?.status === 503) {
          logger.log(`⏭️  Service unavailable on ${keyName}, trying next key...`);
          
          // Mark as exhausted for 1 hour for service unavailable
          await markKeyAsExhausted(keyName, apiError, 3600);
          lastError = apiError;
          continue; // Try next key
        } else {
          // For other errors (400, 401, etc.), throw immediately
          logger.error(`❌ ${keyName} failed with non-retryable error:`, apiErrorDetails);
          if (apiError?.status === 400 || apiError?.response?.status === 400) {
            throw new Error(`Bad request. Check prompt length (${promptLength} chars) or content. Status: 400`);
          } else if (apiError?.status === 401 || apiError?.response?.status === 401) {
            throw new Error(`Unauthorized. Check API key configuration. Status: 401`);
          } else {
            throw new Error(`API error: ${apiErrorDetails.message}. Status: ${apiErrorDetails.status}`);
          }
        }
      }
      
      // Check if response is empty
      if (!responseText || responseText.trim().length === 0) {
        logger.error("❌ API returned empty response", {
          responseLength: responseText?.length || 0,
          promptLength,
          articleTitle: articleTitle.substring(0, 100),
          keyName,
        });
        throw new Error("API returned empty response. This may indicate a content filtering issue or API error.");
      }

    // Try to extract JSON from the response
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = JSON.parse(responseText);
      }
    } catch (parseError) {
      // If JSON parsing fails, try regex extraction
      const parseErrorDetails = {
        message: parseError instanceof Error ? parseError.message : "Unknown parse error",
        responseTextLength: responseText.length,
        responseTextPreview: responseText.substring(0, 500),
        promptLength,
        articleTitle: articleTitle.substring(0, 100),
      };
      
      logger.warn("⚠️ Failed to parse AI response as JSON, trying regex extraction:", parseErrorDetails);
      
      const titleMatch = responseText.match(/"title":\s*"([^"]+)"/);
      const contentMatch = responseText.match(/"content":\s*"([^"]+)"/);
      const tagsMatch = responseText.match(/"tags":\s*\[([^\]]+)\]/);

      if (titleMatch && contentMatch) {
        logger.log("✅ Successfully extracted content using regex fallback");
        parsedResponse = {
          title: titleMatch[1],
          content: contentMatch[1].replace(/\\n/g, "\n"),
          tags: tagsMatch ? tagsMatch[1].split(",").map((t: string) => t.trim().replace(/"/g, "")) : [],
        };
      } else {
        logger.error("❌ Failed to extract content even with regex fallback", {
          hasTitleMatch: !!titleMatch,
          hasContentMatch: !!contentMatch,
          hasTagsMatch: !!tagsMatch,
          responseTextPreview: responseText.substring(0, 1000),
        });
        // Don't create fallback - throw error instead so we know something is wrong
        throw new Error(`Failed to parse AI response. JSON parsing failed: ${parseErrorDetails.message}. Response preview: ${responseText.substring(0, 200)}...`);
      }
    }

    // Validate and clean the response
    const title = parsedResponse.title || articleTitle;
    const content = parsedResponse.content || `# ${title}\n\n${articleContent}`;
    const tags = Array.isArray(parsedResponse.tags)
      ? parsedResponse.tags.slice(0, 5)
      : parsedResponse.tags
      ? parsedResponse.tags.split(",").map((t: string) => t.trim()).slice(0, 5)
      : [];

      return {
        title,
        content,
        tags,
      };
    } catch (parseError) {
      // JSON parsing errors - don't retry with different key, this is a response format issue
      logger.error(`❌ JSON parsing failed on ${keyName}:`, parseError);
      throw parseError;
    }
  }
  
  // If we get here, all keys failed with rate limits
  if (lastError) {
    const errorMessage = lastError?.status === 429 
      ? `All API keys rate limited. Please try again later. Last error: Rate limit exceeded (429)`
      : `All API keys failed. Last error: ${lastError?.message || "Unknown error"}`;
    logger.error("❌ All API keys exhausted:", {
      keysTried: prioritizedKeys.length,
      lastError: lastError?.message,
      lastStatus: lastError?.status,
    });
    throw new Error(errorMessage);
  }
  
  throw new Error("No API keys available");
} catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.constructor.name : "Unknown",
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined, // Limit stack trace
      articleTitle: articleTitle.substring(0, 100), // Truncate for logging
      articleContentLength: articleContent.length,
      anglesCount: angles.length,
      angles: angles,
    };
    logger.error("❌ Error generating blog from article:", errorDetails);
    
    // Re-throw the error so it can be caught and logged with more context upstream
    throw new Error(`Blog generation failed: ${errorDetails.message}. Article: "${articleTitle.substring(0, 50)}...", Content length: ${articleContent.length} chars, Angles: ${angles.length}`);
  }
}

/**
 * Send blog to webhook
 * Returns object with success status and response data (including articleUrl if available)
 */
export async function sendBlogToWebhook(
  webhook: string,
  blog: GeneratedBlog,
  day: number
): Promise<{ success: boolean; responseData?: any }> {
  try {
    // Validate webhook URL is provided
    if (!webhook || !webhook.trim()) {
      logger.warn("[Webhook] No webhook URL provided, skipping webhook send");
      return { success: false };
    }

    // Normalize webhook URL - add https:// if protocol is missing
    let webhookUrl = webhook.trim();
    if (!webhookUrl.startsWith("http://") && !webhookUrl.startsWith("https://")) {
      webhookUrl = `https://${webhookUrl}`;
    }

    logger.log(`[Webhook] Sending blog to webhook: ${webhookUrl}`);
    const response = await axios.post(webhookUrl, {
      day,
      blog: {
        title: blog.title,
        content: blog.content,
        tags: blog.tags,
      },
      timestamp: new Date().toISOString(),
    }, {
      timeout: 8000, // 8 second timeout to leave buffer for overall function timeout
    });

    const success = response.status >= 200 && response.status < 300;
    logger.log(`[Webhook] ${success ? 'Successfully' : 'Failed to'} send blog to webhook. Status: ${response.status}`);
    
    if (success && response.data) {
      logger.log(`[Webhook] Response data received:`, response.data);
      return {
        success: true,
        responseData: response.data,
      };
    }
    
    return { success };
  } catch (error) {
    logger.error("[Webhook] Error sending blog to webhook:", error);
    if (error instanceof Error) {
      logger.error("[Webhook] Error details:", error.message);
    }
    return { success: false };
  }
}

/**
 * Retry sending blog to webhook and update database status
 * This is a server action that can be called from client components
 */
export async function retrySendBlogToWebhook({
  webhook,
  blog,
  day,
  campaignId,
}: {
  webhook: string;
  blog: {
    title: string;
    content: string;
    tags: string[];
    sourceArticle?: any;
  };
  day: number;
  campaignId: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    logger.log(`[Webhook Retry] Starting retry for campaign ${campaignId}, day ${day}`);
    
    // Validate webhook URL is provided
    if (!webhook || !webhook.trim()) {
      return {
        success: false,
        message: "No webhook URL configured for this campaign",
      };
    }
    
    // Send to webhook
    const webhookResult = await sendBlogToWebhook(
      webhook,
      {
        title: blog.title,
        content: blog.content,
        tags: blog.tags,
      },
      day
    );

    const webhookSent = webhookResult.success;
    const webhookResponseData = webhookResult.responseData;
    
    // Extract articleUrl from webhook response if available
    const articleUrl = webhookResponseData?.data?.articleUrl || webhookResponseData?.articleUrl || null;
    
    if (articleUrl) {
      logger.log(`[Webhook Retry] Received article URL from webhook: ${articleUrl}`);
    }

    // Always update the blog content with webhook status (success or failure) and article URL
    const chat = await prisma.campaignChat.findFirst({
      where: {
        plannerId: campaignId,
        day: day,
      },
    });

    if (chat) {
      const contents = chat.contents as Record<string, any>;
      const updatedContents = {
        ...contents,
        blog: {
          ...contents.blog,
          webhookSent: webhookSent, // Update status (true or false)
          webhookUrl: webhook, // Ensure webhook URL is stored
          lastWebhookAttempt: new Date().toISOString(), // Track last attempt time
          articleUrl: articleUrl || contents.blog?.articleUrl || null, // Update article URL if received, otherwise keep existing
        },
      };

      await prisma.campaignChat.update({
        where: { id: chat.id },
        data: {
          contents: updatedContents,
        },
      });
      logger.log(`[Webhook Retry] Updated database: webhookSent=${webhookSent}, articleUrl=${articleUrl || 'none'} for campaign ${campaignId}, day ${day}`);
    } else {
      logger.warn(`[Webhook Retry] Chat not found for campaign ${campaignId}, day ${day}`);
    }

    return {
      success: webhookSent,
      message: webhookSent
        ? (articleUrl ? `Blog sent to webhook successfully. Article URL: ${articleUrl}` : "Blog sent to webhook successfully")
        : "Failed to send blog to webhook",
    };
  } catch (error) {
    logger.error("[Webhook Retry] Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to retry webhook",
    };
  }
}

/**
 * Generate blog content for a Blog News campaign day
 */
export async function generateBlogNewsContent({
  campaignId,
  day,
  topics,
  angles,
  webhook,
}: {
  campaignId: string;
  day: number;
  topics: string[];
  angles: string[];
  webhook: string;
}): Promise<{ success: boolean; message: string; blog?: GeneratedBlog; insufficientCoins?: boolean }> {
  try {
    // Get campaign to access project and userId
    const campaign = await prisma.campaignPlanner.findFirst({
      where: { id: campaignId },
      include: {
        project: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!campaign) {
      return {
        success: false,
        message: "Campaign not found",
      };
    }

    if (!campaign.project) {
      return {
        success: false,
        message: "Project not found for this campaign",
      };
    }

    // Get user to check coins
    const user = await prisma.user.findUnique({
      where: { id: campaign.project.userId },
    });

    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    // Check if user has enough coins (3 coins per blog generation)
    const requiredCoins = 3;
    if (user.remainingChatGenerations < requiredCoins) {
      return {
        success: false,
        message: `You need ${requiredCoins} coins to generate a blog post.`,
        insufficientCoins: true,
      };
    }

    // 1. Fetch article from Olive Drift API (with duplicate detection)
    logger.log(`📰 Fetching article for campaign ${campaignId}, day ${day}, topics: ${topics.join(", ")}`);
    const article = await fetchArticleForTopics(topics, campaignId);
    if (!article) {
      const errorMessage = `Failed to fetch article for topics: ${topics.join(", ")}. No articles found matching the criteria.`;
      logger.error(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    }
    logger.log(`✅ Article fetched: ${article.title.substring(0, 50)}...`);

    // 2. Generate blog from article with angles
    logger.log(`✍️ Generating blog from article with ${angles.length} angles`);
    let blog;
    try {
      blog = await generateBlogFromArticle(
        article.title,
        article.content,
        angles
      );
      if (blog) {
        logger.log(`✅ Blog generated: ${blog.title.substring(0, 50)}...`);
      }
    } catch (blogError) {
      const errorMessage = blogError instanceof Error 
        ? blogError.message 
        : `Failed to generate blog from article "${article.title.substring(0, 50)}...". Unknown error occurred.`;
      logger.error(`❌ Blog generation error:`, {
        error: errorMessage,
        articleTitle: article.title.substring(0, 100),
        articleContentLength: article.content.length,
        anglesCount: angles.length,
      });
      return {
        success: false,
        message: errorMessage,
      };
    }

    if (!blog) {
      const errorMessage = `Failed to generate blog from article "${article.title.substring(0, 50)}...". AI generation returned null. This should not happen - the function should throw an error instead of returning null.`;
      logger.error(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    }

    // Add source article info (including articleId for duplicate detection)
    blog.sourceArticle = {
      ...article,
      articleId: article.articleId, // Ensure articleId is included
    };

    // 3. Store blog in CampaignChat contents
    const chat = await prisma.campaignChat.findFirst({
      where: {
        plannerId: campaignId,
        day: day,
      },
    });

    if (!chat) {
      return {
        success: false,
        message: `No chat found for day ${day}`,
      };
    }

    // 4. Try to send to webhook (only if webhook URL is provided, don't fail if this fails)
    // Use Promise.race to timeout webhook after 8 seconds to avoid overall timeout
    let webhookSent = false;
    let articleUrl: string | null = null;
    
    if (webhook && webhook.trim()) {
      try {
        const webhookPromise = sendBlogToWebhook(webhook, blog, day);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Webhook timeout after 8 seconds")), 8000)
        );
        const webhookResult = await Promise.race([webhookPromise, timeoutPromise]) as Awaited<ReturnType<typeof sendBlogToWebhook>>;
      webhookSent = webhookResult.success;
      const webhookResponseData = webhookResult.responseData;
      
      // Extract articleUrl from webhook response if available
      // Response structure from sendNextResponse: { status, message, data: { ...idea, articleUrl } }
      // So axios response.data = { status, message, data: { ...idea, articleUrl } }
      // We need to access: response.data.data.articleUrl
      // The article is published FIRST, then the URL is generated and returned
      articleUrl = webhookResponseData?.data?.articleUrl || webhookResponseData?.articleUrl || null;
      
      // Debug logging
      if (webhookSent && webhookResponseData) {
        logger.log(`[Webhook] Full response data:`, JSON.stringify(webhookResponseData, null, 2));
        logger.log(`[Webhook] Response status:`, webhookResponseData?.status);
        logger.log(`[Webhook] Response message:`, webhookResponseData?.message);
        logger.log(`[Webhook] webhookResponseData.data:`, webhookResponseData?.data);
        logger.log(`[Webhook] webhookResponseData.data?.articleUrl:`, webhookResponseData?.data?.articleUrl);
        logger.log(`[Webhook] webhookResponseData?.articleUrl:`, webhookResponseData?.articleUrl);
        logger.log(`[Webhook] Extracted articleUrl:`, articleUrl);
        
        // Also check if articleUrl is nested differently
        if (!articleUrl && webhookResponseData?.data) {
          const data = webhookResponseData.data as any;
          logger.log(`[Webhook] Checking data object keys:`, Object.keys(data));
          logger.log(`[Webhook] data.articleUrl:`, data.articleUrl);
        }
      }
      
        if (!webhookSent) {
          logger.warn(`Failed to send blog to webhook for day ${day}, but blog was saved`);
        } else if (articleUrl) {
          logger.log(`[Webhook] Received article URL from webhook: ${articleUrl}`);
        } else {
          logger.warn(`[Webhook] Webhook sent successfully but no articleUrl found in response`);
        }
      } catch (webhookError) {
        logger.warn(`[Webhook] Webhook call failed or timed out for day ${day}:`, webhookError);
        // Continue without failing - blog is already saved
        webhookSent = false;
      }
    } else {
      logger.log(`[Webhook] No webhook URL configured for day ${day}, skipping webhook send`);
    }

    // Store blog in contents as JSON (including article ID for duplicate detection, webhook status, webhook URL, and article URL)
    const blogContent = {
      blog: {
        title: blog.title,
        content: blog.content,
        tags: blog.tags,
        sourceArticle: {
          ...blog.sourceArticle,
          articleId: article.articleId, // Store article ID for duplicate detection
        },
        generatedAt: new Date().toISOString(),
        webhookSent: webhookSent, // Store webhook status
        webhookUrl: webhook, // Store webhook URL so it's always available from campaign data
        articleUrl: articleUrl, // Store article URL from webhook response
      },
    };

    await prisma.campaignChat.update({
      where: { id: chat.id },
      data: {
        contents: blogContent,
        status: "GENERATED",
      },
    });

    // Deduct coins after successful blog generation and saving (3 coins per blog)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        remainingChatGenerations: {
          decrement: requiredCoins,
        },
      },
    });

    return {
      success: true,
      message: webhookSent
        ? (articleUrl ? `Blog generated and sent to webhook successfully. Article URL: ${articleUrl}` : "Blog generated and sent to webhook successfully")
        : "Blog generated successfully (webhook failed)",
      blog: {
        ...blog,
        webhookSent, // Include webhook status in response
        articleUrl, // Include article URL if available
      },
    };
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      type: error instanceof Error ? error.constructor.name : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
      campaignId,
      day,
      topics,
      anglesCount: angles.length,
    };
    logger.error("Error generating blog news content:", errorDetails);
    return {
      success: false,
      message: `Failed to generate blog content: ${error instanceof Error ? error.message : "Unknown error"}. Campaign: ${campaignId}, Day: ${day}`,
    };
  }
}

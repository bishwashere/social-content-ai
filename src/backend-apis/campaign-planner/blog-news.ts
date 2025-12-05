"use server";

import { fetchRedditPosts, fetchHackerNewsPosts } from "@/backend-apis/metrics/actions";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import axios from "axios";

export type BlogNewsMetadata = {
  topics: string[];
  angle: string;
  webhook: string;
};

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
    console.log("Storing Blog News metadata for campaign:", campaignId, metadata);
    
    // We can create a separate collection or add fields to schema
    // For now, we'll need to retrieve it from somewhere else
    // Let's create a simple storage mechanism
    
    // Store in a JSON file or separate collection
    // Actually, the best approach is to add fields to the schema
    // But for now, let's use a workaround - store in campaign name or create metadata collection
    
    return true;
  } catch (error) {
    console.error("Error storing Blog News metadata:", error);
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
    console.error("Error getting Blog News metadata:", error);
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
    url?: string;
    articleId?: string;
  };
  webhookSent?: boolean; // Track webhook status
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

    return usedIds;
  } catch (error) {
    console.error("Error getting used article IDs:", error);
    return new Set();
  }
}

/**
 * Check if an article is already used in the campaign
 */
function isArticleUsed(
  article: { id?: string | number; url?: string; source: "reddit" | "hackernews" },
  usedIds: Set<string>
): boolean {
  // Check by URL (most reliable - primary check)
  if (article.url && usedIds.has(article.url)) {
    return true;
  }
  
  // Check by article ID with source prefix
  if (article.id) {
    const articleId = String(article.id);
    const source = article.source || "unknown";
    
    // Check with source prefix (e.g., "reddit:abc123" or "hackernews:12345")
    if (usedIds.has(`${source}:${articleId}`)) {
      return true;
    }
    
    // Also check without prefix (fallback)
    if (usedIds.has(articleId)) {
      return true;
    }
  }
  
  // Additional check: Extract ID from URL if available
  if (article.url) {
    if (article.source === "reddit") {
      const redditMatch = article.url.match(/\/r\/\w+\/comments\/(\w+)/);
      if (redditMatch) {
        const extractedId = redditMatch[1];
        if (usedIds.has(`reddit:${extractedId}`) || usedIds.has(extractedId)) {
          return true;
        }
      }
    } else if (article.source === "hackernews") {
      const hnMatch = article.url.match(/item\?id=(\d+)/);
      if (hnMatch) {
        const extractedId = hnMatch[1];
        if (usedIds.has(`hackernews:${extractedId}`) || usedIds.has(extractedId)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Fetch one article from Olive Drift API for the given topics, avoiding duplicates
 */
async function fetchArticleForTopics(
  topics: string[],
  campaignId: string
): Promise<{
  title: string;
  content: string;
  source: "reddit" | "hackernews";
  url?: string;
  articleId?: string;
} | null> {
  try {
    // Get used article IDs for this campaign
    const usedIds = await getUsedArticleIds(campaignId);
    
    // Fetch more articles to have options if first one is duplicate
    const maxPosts = 10; // Fetch up to 10 to find an unused one
    
    // Try Reddit first
    const redditPosts = await fetchRedditPosts(topics, maxPosts);
    for (const post of redditPosts) {
      const article = {
        id: post.id,
        url: post.url,
        source: "reddit" as const,
      };
      
      if (!isArticleUsed(article, usedIds)) {
        return {
          title: post.title,
          content: post.selftext || post.title,
          source: "reddit" as const,
          url: post.url,
          articleId: post.id,
        };
      }
    }

    // Fallback to HackerNews
    const hackerNewsPosts = await fetchHackerNewsPosts(topics, maxPosts);
    for (const post of hackerNewsPosts) {
      const articleId = String(post.id);
      const article = {
        id: articleId,
        url: `https://news.ycombinator.com/item?id=${post.id}`,
        source: "hackernews" as const,
      };
      
      if (!isArticleUsed(article, usedIds)) {
        return {
          title: post.title,
          content: post.text || post.title,
          source: "hackernews" as const,
          url: `https://news.ycombinator.com/item?id=${post.id}`,
          articleId: articleId,
        };
      }
    }

    // All articles are duplicates - return null or the first one with a warning
    console.warn(`All fetched articles for campaign ${campaignId} are duplicates. Returning first available.`);
    if (redditPosts.length > 0) {
      const post = redditPosts[0];
      return {
        title: post.title,
        content: post.selftext || post.title,
        source: "reddit" as const,
        url: post.url,
        articleId: post.id,
      };
    }
    if (hackerNewsPosts.length > 0) {
      const post = hackerNewsPosts[0];
      return {
        title: post.title,
        content: post.text || post.title,
        source: "hackernews" as const,
        url: `https://news.ycombinator.com/item?id=${post.id}`,
        articleId: String(post.id),
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching article for topics:", error);
    return null;
  }
}

/**
 * Generate blog from article with angle
 */
async function generateBlogFromArticle(
  articleTitle: string,
  articleContent: string,
  angle: string
): Promise<GeneratedBlog | null> {
  // Get API keys (support multiple keys for rate limit handling)
  const apiKeys = [
    process.env.GEMINI_API_KEY || "",
    process.env.GEMINI_API_KEY_1 || "",
    process.env.GEMINI_API_KEY_2 || "",
  ].filter(key => key !== "");

  if (apiKeys.length === 0) {
    throw new Error("Gemini API key is not configured");
  }

  const maxRetries = 3;
  let currentApiKeyIndex = 0;
  let attempt = 0;

  while (currentApiKeyIndex < apiKeys.length && attempt < maxRetries) {
    try {
      const apiKey = apiKeys[currentApiKeyIndex];
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "models/gemini-2.0-flash-001",
      });

      const prompt = `You are a content creator assistant. Based on the following post content, generate a blog article with a specific angle.

Post Title: ${articleTitle || "Untitled"}

Post Content:

${articleContent}

Angle/Perspective: ${angle}

Please generate:

1. A compelling article title (max 80 characters) that incorporates the ${angle} perspective

2. A structured MDX article (at least 300 words) that:
   - Expands on the post content
   - Applies the ${angle} perspective/angle throughout
   - Adds insights and maintains thematic relevance
   - Do not include frontmatter (---)

3. 3-5 relevant tags (comma-separated, short words or phrases)

Output strictly in raw JSON only (no markdown, no backticks, no explanation):

{
  "title": "Article Title Here",
  "content": "MDX formatted article with proper headings, paragraphs, and lists. Escape all quotes so JSON remains valid.",
  "tags": ["tag1", "tag2", "tag3"]
}

Requirements:

- Keep the article engaging, coherent, and value-adding.
- Maintain alignment with the original post's theme.
- Apply the ${angle} angle consistently throughout the article.
- Avoid stray backticks or unescaped characters that break JSON.`;

      // Make a single API call
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();

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
        // If JSON parsing fails, create a fallback response
        console.error("Failed to parse AI response as JSON:", parseError);
        parsedResponse = {
          title: articleTitle || "New Article Idea",
          content: `# ${articleTitle || "New Article Idea"}\n\n${articleContent}\n\n## Key Takeaways\n\nThis post discusses important insights from a ${angle} perspective.`,
          tags: ["technology", "insights"],
        };
      }

      // Validate and clean the response
      const title = parsedResponse.title || articleTitle || "New Article Idea";
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
    } catch (error: unknown) {
      // Handle rate limit errors (429) and service unavailable (503)
      const isErrorWithStatus = (err: unknown): err is { status: number } => {
        return typeof err === "object" && err !== null && "status" in err;
      };

      if (isErrorWithStatus(error) && (error.status === 429 || error.status === 503)) {
        console.warn(
          `Rate limit or service unavailable (${error.status}) with API key index ${currentApiKeyIndex}. Trying next key...`
        );
        currentApiKeyIndex++;
        attempt++;
        
        // Add a small delay before retrying with next key
        if (currentApiKeyIndex < apiKeys.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          continue; // Try with next API key
        } else {
          console.error("All API keys exhausted or rate limited.");
          throw new Error(`API rate limit exceeded. Please try again later.`);
        }
      } else {
        // For other errors, log and throw
        console.error("Error generating blog from article:", error);
        throw error;
      }
    }
  }

  // If we get here, all retries failed
  console.error("Failed to generate blog after all retries");
  return null;
}

/**
 * Send blog to webhook
 */
export async function sendBlogToWebhook(
  webhook: string,
  blog: GeneratedBlog,
  day: number
): Promise<boolean> {
  try {
    const response = await axios.post(webhook, {
      day,
      blog: {
        title: blog.title,
        content: blog.content,
        tags: blog.tags,
        sourceArticle: blog.sourceArticle,
      },
      timestamp: new Date().toISOString(),
    }, {
      timeout: 10000, // 10 second timeout
    });

    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.error("Error sending blog to webhook:", error);
    return false;
  }
}

/**
 * Generate blog content for a Blog News campaign day
 */
export async function generateBlogNewsContent({
  campaignId,
  day,
  topics,
  angle,
  webhook,
}: {
  campaignId: string;
  day: number;
  topics: string[];
  angle: string;
  webhook: string;
}): Promise<{ success: boolean; message: string; blog?: GeneratedBlog }> {
  try {
    // 1. Fetch article from Olive Drift API (with duplicate detection)
    const article = await fetchArticleForTopics(topics, campaignId);
    if (!article) {
      return {
        success: false,
        message: "Failed to fetch article for the given topics",
      };
    }

    // 2. Generate blog from article with angle
    const blog = await generateBlogFromArticle(
      article.title,
      article.content,
      angle
    );

    if (!blog) {
      return {
        success: false,
        message: "Failed to generate blog from article",
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

    // 4. Try to send to webhook (don't fail if this fails)
    const webhookSent = await sendBlogToWebhook(webhook, blog, day);
    if (!webhookSent) {
      console.warn(`Failed to send blog to webhook for day ${day}, but blog was saved`);
    }

    // Store blog in contents as JSON (including article ID for duplicate detection and webhook status)
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
      },
    };

    await prisma.campaignChat.update({
      where: { id: chat.id },
      data: {
        contents: blogContent,
        status: "GENERATED",
      },
    });

    return {
      success: true,
      message: webhookSent
        ? "Blog generated and sent to webhook successfully"
        : "Blog generated successfully (webhook failed)",
      blog: {
        ...blog,
        webhookSent, // Include webhook status in response
      },
    };
  } catch (error) {
    console.error("Error generating blog news content:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate blog content",
    };
  }
}


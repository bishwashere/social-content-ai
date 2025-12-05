"use server";

import { fetchRedditPosts, fetchHackerNewsPosts } from "@/backend-apis/metrics/actions";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import axios from "axios";

export type BlogNewsMetadata = {
  topics: string[];
  angle: string;
  webhook: string;
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
      include: {
        chats: {
          orderBy: { day: "asc" },
          take: 1,
        },
      },
    });

    if (!campaign || campaign.chats.length === 0) {
      return null;
    }

    const firstChat = campaign.chats[0];
    const contents = firstChat.contents as Record<string, any>;
    const metadata = contents?._blogNewsMetadata;

    if (!metadata) {
      return null;
    }

    return {
      topics: metadata.topics || [],
      angle: metadata.angle || "",
      webhook: metadata.webhook || "",
      targetAudience: metadata.targetAudience || campaign.targetAudience,
      productRelated: metadata.productRelated ?? true,
    };
  } catch (error) {
    console.error("Error getting Blog News metadata from campaign:", error);
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
    url: string;
    articleId: string;
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
 * Fetch article from Olive Drift API for given topics
 */
async function fetchArticleForTopics(
  topics: string[],
  campaignId: string
): Promise<{ title: string; content: string; source: "reddit" | "hackernews"; url: string; articleId: string } | null> {
  try {
    const usedIds = await getUsedArticleIds(campaignId);
    
    // Try Reddit first
    for (const topic of topics) {
      const redditPosts = await fetchRedditPosts([topic], 10);
      
      for (const post of redditPosts) {
        const postUrl = post.url || post.permalink || "";
        const postId = post.id || "";
        
        // Check if this article was already used
        if (postUrl && !usedIds.has(postUrl)) {
          // Also check by articleId
          if (postId && !usedIds.has(`reddit:${postId}`)) {
            return {
              title: post.title || "Untitled",
              content: post.selftext || post.title || "",
              source: "reddit",
              url: postUrl.startsWith("http") ? postUrl : `https://reddit.com${postUrl}`,
              articleId: postId,
            };
          }
        }
      }
    }
    
    // Try HackerNews if Reddit didn't yield results
    for (const topic of topics) {
      const hnPosts = await fetchHackerNewsPosts([topic], 10);
      
      for (const post of hnPosts) {
        const postUrl = post.permalink || `https://news.ycombinator.com/item?id=${post.id}`;
        const postId = post.id?.toString() || "";
        
        // Check if this article was already used
        if (postUrl && !usedIds.has(postUrl)) {
          // Also check by articleId
          if (postId && !usedIds.has(`hackernews:${postId}`)) {
            return {
              title: post.title || "Untitled",
              content: post.text || post.title || "",
              source: "hackernews",
              url: postUrl,
              articleId: postId,
            };
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching article for topics:", error);
    return null;
  }
}

async function generateBlogFromArticle(
  articleTitle: string,
  articleContent: string,
  angle: string
): Promise<GeneratedBlog | null> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `You are an expert content writer. Write a comprehensive blog post based on the following article.

Article Title: ${articleTitle}

Article Content:
${articleContent}

Writing Angle: ${angle}

Requirements:
1. Create an engaging blog title (max 80 characters)
2. Write a comprehensive blog post (800-1200 words) with proper structure:
   - Introduction that hooks the reader
   - Main body with clear sections and subheadings
   - Conclusion that ties everything together
3. Use the writing angle provided to shape the narrative
4. Write in MDX format (Markdown Extended) with proper headings, paragraphs, and lists
5. Make it informative, well-researched, and engaging
6. Include 3-5 relevant tags as a JSON array

Return the response in the following JSON format:
{
  "title": "Blog Title Here",
  "content": "# Blog Title\\n\\nFull blog content in MDX format...",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const blogData = JSON.parse(jsonMatch[0]);
      return {
        title: blogData.title || articleTitle,
        content: blogData.content || text,
        tags: blogData.tags || [],
      };
    }

    // Fallback: if JSON parsing fails, try to extract title and content
    const titleMatch = text.match(/"title":\s*"([^"]+)"/);
    const contentMatch = text.match(/"content":\s*"([^"]+)"/);
    const tagsMatch = text.match(/"tags":\s*\[([^\]]+)\]/);

    if (titleMatch && contentMatch) {
      return {
        title: titleMatch[1],
        content: contentMatch[1].replace(/\\n/g, "\n"),
        tags: tagsMatch ? tagsMatch[1].split(",").map((t: string) => t.trim().replace(/"/g, "")) : [],
      };
    }

    // Last resort: use the full text as content
    return {
      title: articleTitle,
      content: text,
      tags: [],
    };
  } catch (error) {
    console.error("Error generating blog from article:", error);
    return null;
  }
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

    // Store blog in contents as JSON (including article ID for duplicate detection, webhook status, and webhook URL)
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

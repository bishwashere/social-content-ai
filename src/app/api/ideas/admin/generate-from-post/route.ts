import { NextRequest } from "next/server";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateIdeasAdminAuth } from "@/middlewares/validate-ideas-admin-auth";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { AI } from "@/lib/ai";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * POST /api/ideas/admin/generate-from-post
 * Generate idea content (title, MDX content, tags) from a post body using AI
 */
export const POST = applyMiddleware(
  validateIdeasAdminAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req: NextRequest) => {
    const body = await req.json();
    const { postTitle, postBody } = body;

    if (!postBody) {
      return sendNextResponse({
        status: 400,
        message: "Post body is required",
      });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        throw new Error("Gemini API key is not configured");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "models/gemini-2.0-flash-001",
      });

      const prompt = `You are a content creator assistant. Based on the following post content, generate a blog article idea.



Post Title: ${postTitle || "Untitled"}

Post Content:

${postBody}



Please generate:

1. A compelling article title (max 80 characters)

2. A structured MDX article (at least 300 words) that expands on the post content, adds insights, and maintains thematic relevance. Do not include frontmatter (---).

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

- Avoid stray backticks or unescaped characters that break JSON.`;

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
          title: postTitle || "New Article Idea",
          content: `# ${postTitle || "New Article Idea"}\n\n${postBody}\n\n## Key Takeaways\n\nThis post discusses important insights that can be expanded into a comprehensive article.`,
          tags: ["technology", "insights"],
        };
      }

      // Validate and clean the response
      const title = parsedResponse.title || postTitle || "New Article Idea";
      const content = parsedResponse.content || `# ${title}\n\n${postBody}`;
      const tags = Array.isArray(parsedResponse.tags)
        ? parsedResponse.tags.slice(0, 5)
        : parsedResponse.tags
        ? parsedResponse.tags.split(",").map((t: string) => t.trim()).slice(0, 5)
        : [];

      return sendNextResponse({
        status: 200,
        data: {
          title,
          content,
          tags,
        },
        message: "Idea content generated successfully",
      });
    } catch (error) {
      console.error("Error generating idea content:", error);
      return sendNextResponse({
        status: 500,
        message: error instanceof Error ? error.message : "Failed to generate idea content",
      });
    }
  })
);

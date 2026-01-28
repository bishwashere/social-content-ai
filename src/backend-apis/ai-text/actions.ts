"use server";

import { cleanAIGeneratedText } from "@/lib/clean-ai-text";
import { prisma } from "@/lib/prisma";

const CREDITS_PER_REWRITE = 1;

export const rewriteWithAI = async ({
  userId,
  content,
  prompt,
}: {
  userId: string;
  content: string;
  prompt?: string;
}): Promise<{ success: boolean; rewrittenContent?: string; error?: string }> => {
  try {
    // Check if user has enough credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.remainingChatGenerations < CREDITS_PER_REWRITE) {
      return {
        success: false,
        error: `You need ${CREDITS_PER_REWRITE} credit to rewrite content. You have ${user.remainingChatGenerations} credits.`,
      };
    }

    // Check for OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return { success: false, error: "OpenAI API key not configured" };
    }

    // Build the system and user messages
    let systemMessage: string;
    let userMessage: string;

    if (prompt && prompt.trim()) {
      // User provided a custom prompt - use it directly without the existing content
      systemMessage = "You are a professional content writer. Generate content based on the user's request.";
      userMessage = prompt.trim();
      console.log("[AI Text] Generating content from user prompt (ignoring existing content)");
    } else {
      // No prompt provided - rewrite the existing content
      systemMessage = "You are a professional content writer. Your task is to rewrite the given content to make it more engaging, clear, and impactful while maintaining its core message. Keep the same tone and style.";
      userMessage = `Please rewrite the following content:\n\n${content}`;
      console.log("[AI Text] Rewriting existing content (no custom prompt)");
    }

    // Call OpenAI Chat Completions API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      return { success: false, error: errorData.error?.message || "Failed to rewrite content" };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      return { success: false, error: "No content generated" };
    }

    // Clean the AI-generated text
    const rewrittenContent = cleanAIGeneratedText(rawContent);

    // Deduct credits
    await prisma.user.update({
      where: { id: userId },
      data: {
        remainingChatGenerations: {
          decrement: CREDITS_PER_REWRITE,
        },
      },
    });

    return { success: true, rewrittenContent };
  } catch (error) {
    console.error("Error rewriting content:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

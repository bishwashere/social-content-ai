import { GoogleGenerativeAI } from "@google/generative-ai";
import { PLATFORM_CHARACTER_LIMITS, PLATFORMS, prompt } from "./prompt";

/**
 * Utilities related to ai
 */
export class AI {
  private genAI: GoogleGenerativeAI;
  private maxRetries = 3;
  private apiKeys: string[];

  constructor() {
    this.apiKeys = [
      process.env.GEMINI_API_KEY || "",
      process.env.GEMINI_API_KEY_1 || "",
      process.env.GEMINI_API_KEY_2 || "",
    ];
    this.genAI = new GoogleGenerativeAI(this.apiKeys[0]);
  }

  private isErrorWithStatus(error: unknown): error is { status: number } {
    return typeof error === "object" && error !== null && "status" in error;
  }
  /**
   * Gives the name of the chat from ai
   */
  async generateChatName({
    content,
    prompt,
  }: GenerateChatNameProps): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: "models/gemini-2.0-flash-001",
    });

    const chatNamePrompt = `Generate a short, catchy title (max 5 words) for a social media content based on the following ${
      prompt ? "prompt" : "content"
    }:\n\n${
      prompt || JSON.stringify(content)
    }\n\nRespond with ONLY the title, nothing else.`;

    const result = await model.generateContent(chatNamePrompt);

    return result.response.text().trim();
  }

  /**
   * Generate platform wise content
   */
  async generateContent({
    projectDescription,
    projectName,
    userPrompt,
  }: GenerateContentProps) {
    const projectOverview =
      projectName && projectDescription
        ? `${projectName}: ${projectDescription}`
        : projectName || projectDescription;

    const corePrompt = prompt.generateCorePrompt(projectOverview);
    console.log("corePrompt: ", corePrompt);

    let currentApiKeyIndex = 0;
    let attempt = 0;
    let apiKey = this.apiKeys[currentApiKeyIndex];

    while (apiKey && currentApiKeyIndex !== null && attempt < this.maxRetries) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "models/gemini-2.0-flash-001",
        });

        const contentPromises = PLATFORMS.map(async (platform) => {
          const platformSpecificPrompt = prompt.addPlatformSpecifics({
            characterLimit: PLATFORM_CHARACTER_LIMITS[platform],
            corePrompt,
            platform: platform,
            userPrompt,
          });

          const result = await model.generateContent(platformSpecificPrompt);

          return { platform, content: result.response.text().trim() };
        });

        const generatedContent = await Promise.all(contentPromises);
        const content = generatedContent.reduce(
          (
            acc: Record<(typeof PLATFORMS)[number], string>,
            { platform, content }
          ) => {
            acc[platform] = content;

            return acc;
          },
          {} as Record<(typeof PLATFORMS)[number], string>
        );

        return content;
      } catch (error) {
        // Handle rate-limit error and other errors
        if (this.isErrorWithStatus(error) && error.status === 429) {
          console.warn(
            `Rate limit hit with key index ${currentApiKeyIndex}:`,
            error
          );
          currentApiKeyIndex++;
          apiKey = this.apiKeys[currentApiKeyIndex];

          if (!apiKey) {
            console.error("All API keys exhausted.");
            break;
          }
        } else {
          console.error("Unexpected error:", error);
          throw error; // Re-throw non-rate-limit errors
        }

        attempt++;
      }
    }
  }
}

export type GenerateChatNameProps = {
  prompt?: string;
  content?: string;
};

export type GenerateContentProps = {
  projectName: string;
  projectDescription: string;
  userPrompt: string;
};

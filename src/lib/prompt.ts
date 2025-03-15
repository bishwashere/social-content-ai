import { ProjectValidatorType } from "@/validators/projects";

export const PLATFORM_CHARACTER_LIMITS = {
  facebook: 280, // Short and engaging for better readability
  instagram: 500, // Captions that tell a story but stay concise
  x: 280, // Matches Twitter's limit for clarity
  tiktok: 150, // Short captions for quick engagement
} as const;

export const PLATFORM_CUSTOM_PROMPTS = {
  facebook: "",
  instagram:
    "Use a viral style, attention grabbing words in a single line sometime, to grap attention. No placeholders in final output.",
  x: "",
  linkedin: "",
} as const;

export const AVAILABLE_PLATFORMS = {
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
  X: "x",
  TIKTOK: "tiktok",
} as const;

export const PLATFORMS = Object.values(AVAILABLE_PLATFORMS);

export type Platform = (typeof PLATFORMS)[number];

export const PROPERTIES = {
  styles: ["witty", "inspirational", "professional", "casual"],
  tones: ["engaging", "captivating", "attention-grabbing", "compelling"],
  verbs: ["Generate", "Craft", "Compose", "Write"],
  goals: [
    "boosting engagement",
    "driving user interaction",
    "capturing attention",
    "highlighting value",
  ],
  themes: [
    "features",
    "inspiration",
    "user success stories",
    "thought-provoking questions",
    "fun facts",
    "community highlights",
  ],
} as const;

/**
 * Creates prompt
 */
class Prompt {
  private getRandomElement = <T>(arr: readonly T[]): T =>
    arr[Math.floor(Math.random() * arr.length)];

  private getRandomProperties(properties: typeof PROPERTIES = PROPERTIES) {
    return {
      style: this.getRandomElement(properties.styles),
      tone: this.getRandomElement(properties.tones),
      verb: this.getRandomElement(properties.verbs),
      goal: this.getRandomElement(properties.goals),
      theme: this.getRandomElement(properties.themes),
    };
  }

  /**
   *  Generate a core prompt for a content piece
   * @param projectOverview - A brief overview of the project to make the prompt project-related
   */
  generateCorePrompt(
    options: ProjectValidatorType["createChat"]["options"],
    projectOverview?: string
  ): string {
    const { verb, tone, style, goal, theme } =
      options || this.getRandomProperties();

    let themeContent = "";
    const isProjectRelated = projectOverview && Math.random() > 0.7;

    // Generate content for each theme
    switch (theme) {
      case "features":
        themeContent = isProjectRelated
          ? `describing key features of the product`
          : `highlighting interesting features of the project`;
        break;
      case "inspiration":
        themeContent = isProjectRelated
          ? `sharing inspirational ideas related to the project`
          : `inspiring others with motivational content`;
        break;
      case "user success stories":
        themeContent = isProjectRelated
          ? `showcasing user success stories related to the project`
          : `highlighting general success stories to inspire others`;
        break;
      case "thought-provoking questions":
        themeContent = isProjectRelated
          ? `posing questions that resonate with the audience's interests and the product's vision`
          : `asking broad, thought-provoking questions`;
        break;
      case "fun facts":
        themeContent = isProjectRelated
          ? `sharing interesting and relevant facts that connect to the product's domain`
          : `sharing curious and entertaining tidbits that spark engagement`;
        break;
      case "community highlights":
        themeContent = isProjectRelated
          ? `spotlighting contributions and stories from the community around the project`
          : `celebrating stories of human connection and collaboration`;
        break;
    }

    return `${verb} a ${tone} and ${style} piece of content ${themeContent}, focused on ${goal}. ${
      isProjectRelated
        ? `For the project: ${projectOverview}.`
        : `Create something universally engaging without specific reference to any project.`
    }`;
  }

  /**
   *  Combine platform-specific custom prompts with the core prompt
   */
  addPlatformSpecifics({
    characterLimit,
    corePrompt,
    platform,
    userPrompt,
  }: {
    characterLimit: number;
    corePrompt: string;
    platform: Platform;
    userPrompt?: string;
  }): string {
    const customPrompt =
      PLATFORM_CUSTOM_PROMPTS[platform as keyof typeof PLATFORM_CUSTOM_PROMPTS]; // Fetch the custom prompt for the platform

    // Combine custom prompt with the core prompt
    const finalPrompt = `${corePrompt} ${customPrompt}`;

    return `${finalPrompt} For ${platform}, ensure it fits within ${characterLimit} characters and aligns with the platform's style and audience. Do not give multiple options or choice. Also never mention the platform in the content, like: For ${platform}, or ${platform} (280 characters):, or any other heading, or footer other than the actual answer.${
      userPrompt ? ` Also ${userPrompt}` : ""
    }`;
  }
}

export const prompt = new Prompt();

// Example usage:
const tiktokPrompt = prompt.addPlatformSpecifics({
  characterLimit: PLATFORM_CHARACTER_LIMITS.tiktok,
  corePrompt: prompt.generateCorePrompt(null, "Our new app feature"),
  platform: "tiktok",
  userPrompt: "Use engaging emojis and hashtags.",
});

console.log(tiktokPrompt);

const instagramPrompt = prompt.addPlatformSpecifics({
  characterLimit: PLATFORM_CHARACTER_LIMITS.instagram,
  corePrompt: prompt.generateCorePrompt(
    null,
    "Launching a new feature for creators"
  ),
  platform: "instagram",
  userPrompt: "Include a call-to-action for followers.",
});

console.log(instagramPrompt);

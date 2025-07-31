import { ProjectValidatorType } from "@/validators/projects";

export const PLATFORM_CHARACTER_LIMITS = {
  facebook: 500,
  instagram: 500,
  x: 250,
  linkedin: 500,
  reddit: 1500,
  threads: 250,
} as const;

export const PLATFORM_CUSTOM_PROMPTS = {
  facebook:
    "Use a PIER style, without mentioning it. Multiple paragarphas. 1-3 lines per paragraph max. Add data points where possible. Minor icons like arrow, rocket, something good ones only. And clear call to action at the end.",
  instagram:
    "Use a PIER style, without mentioning it. Multiple paragarphas. 1-3 lines per paragraph max. Add data points where possible. Minor icons like arrow, rocket, something good ones only. And clear call to action at the end.",
  x: "",
  linkedin:
    "Use a PIER style, without mentioning it. Multiple paragarphas. 1-3 lines per paragraph max. Add data points where possible. Minor icons like arrow, rocket, something good ones only. And clear call to action at the end.",
  threads:
    "Use a conversational, engaging style with short, punchy phrasing. Add emojis sparingly and include a simple CTA. Avoid storytelling—focus on clarity and brevity. No multiple options.",
  reddit:
    "This is reddit post. Write one complete and direct answer. No greetings or filler. Use a personal tone. Avoid -, --, and :. Give a post title. Share either a personal journey, practical lessons, data-backed insights, beginner tips, or a clear step-by-step guide for gaining traction or simplifying social media with free or AI tools. Also mention a reason to share like helping others or going though the pain etc.",
} as const;

export const AVAILABLE_PLATFORMS = {
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
  X: "x",
  LINKEDIN: "linkedin",
  THREADS: "threads",
  REDDIT: "reddit",
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
    options: ProjectValidatorType["createChat"]["options"] | undefined,
    projectOverview?: string,
    isProjectRelated?: boolean | undefined | null
  ): string {
    const role = `
    You are a professional content creator. Your job is to generate content that is engaging, relevant, and unique.
    RULES: 
    - Only generate one piece of content, do not give multiple options, Only give the posts body
    - Never ever use any placeholder for missing data, only use the data provided.
     `;
    if (!options) {
      return role + isProjectRelated
        ? `Write a project-related content for: ${projectOverview}.`
        : `Write a generic piece of content without project-specific details.`;
    }

    const { verb, tone, style, goal, theme } =
      options || this.getRandomProperties();

    console.log("PROJECT RELATED", isProjectRelated);

    let themeContent = "";

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

    return (
      role +
      `${verb} a ${tone} and ${style} piece of content ${themeContent}, focused on ${goal}. ${
        isProjectRelated
          ? `For the project: ${projectOverview}.`
          : `Create something universally engaging without specific reference to any project.`
      }`
    );
  }

  /**
   *  Combine platform-specific custom prompts with the core prompt
   */
  async addPlatformSpecifics({
    characterLimit,
    corePrompt,
    platform,
    userPrompt,
    extraInformation,
  }: {
    characterLimit: number;
    corePrompt: string;
    platform: Platform;
    userPrompt?: string;
    extraInformation?: {
      reddit?: {
        popularPost?: string;
      };
    };
  }): Promise<string> {
    console.log("extraInformation", extraInformation);

    const customPrompt =
      PLATFORM_CUSTOM_PROMPTS[platform as keyof typeof PLATFORM_CUSTOM_PROMPTS]; // Fetch the custom prompt for the platform

    // Combine custom prompt with the core prompt
    const finalPrompt = `${corePrompt}\n\n${customPrompt}`;

    let finalfinalPrompt = `${finalPrompt} For ${platform}, ensure it is around ${characterLimit} characters. Direct one answer without choice. Never mention platform name.${
      userPrompt ? ` Also ${userPrompt}` : ""
    }`;

    console.log(
      `\nPLATFORM SPECIFIC PROMPT FOR [${platform}] : \n`,
      finalfinalPrompt
    );

    if (
      platform === AVAILABLE_PLATFORMS.REDDIT &&
      extraInformation?.reddit?.popularPost
    ) {
      console.log("Adding popular post to prompt for reddit");
      finalfinalPrompt += `[CRITICAL] Write this post in similar style as this post tasking as reference [POST]:  ${extraInformation?.reddit?.popularPost}`;
    }

    return finalfinalPrompt;
  }
}

export const prompt = new Prompt();

export const PLATFORM_CHARACTER_LIMITS = {
  facebook: 280, // Short and engaging for better readability
  instagram: 500, // Captions that tell a story but stay concise
  x: 280, // Matches Twitter's limit for clarity
  linkedin: 600, // Concise and professional posts
  tiktok: 150, // Short captions for quick engagement
  youtube: 1000, // Description for video context without overloading
  pinterest: 200, // Brief and visual-oriented descriptions
  snapchat: 80, // Snappy, quick-to-read messages
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
  generateCorePrompt(projectOverview?: string) {
    // Decide if the prompt will be project-related or general
    const { goal, style, theme, tone, verb } = this.getRandomProperties();
    const isProjectRelated = projectOverview && Math.random() > 0.7;

    let themeContent = "";

    switch (theme) {
      case "features":
        themeContent = isProjectRelated
          ? `based on the key features of the project`
          : `highlighting general trends in the industry`;
        break;
      case "inspiration":
        themeContent = isProjectRelated
          ? `to inspire and motivate the audience, drawing from the essence of the project`
          : `to inspire and uplift the audience with a universally relatable message`;
        break;
      case "user success stories":
        themeContent = isProjectRelated
          ? `highlighting real-world examples of how users benefit from the product`
          : `sharing inspiring stories of people achieving their goals`;
        break;
      case "thought-provoking questions":
        themeContent = `posing questions that resonate with ${
          isProjectRelated
            ? `the audience's interests and the product's vision`
            : `a broader societal or personal perspective`
        }`;
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
        ? `Ensure the content resonates with the audience while considering the project: ${projectOverview}.`
        : `Create something universally engaging without specific reference to any project.`
    }`;
  }

  /**
   *  Generate a user prompt for a content piece
   */
  addPlatformSpecifics({
    characterLimit,
    corePrompt,
    platform,
    userPrompt,
  }: AddPlatformSpecificsProps) {
    return `${corePrompt} For ${platform}, ensure it fits within ${characterLimit} characters and aligns with the platform's style and audience. Also give 1 answer not multiple answers. And no characters above or below like here is the answer. That is the answer. etc. Just direct the prompt itself.${
      userPrompt ? ` Give answer as specified here ${userPrompt}` : ""
    }`;
  }
}

export const prompt = new Prompt();

export type AddPlatformSpecificsProps = {
  corePrompt: string;
  platform: Platform;
  characterLimit: (typeof PLATFORM_CHARACTER_LIMITS)[(typeof PLATFORMS)[number]];
  userPrompt: string;
};

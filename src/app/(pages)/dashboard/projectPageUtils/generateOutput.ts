// utils/generateOutput.ts

export const generateOutput = ({
  prompt,
  projectName,
  description,
  style,
  tone,
  verb,
  goal,
  theme,
}: {
  prompt: string;
  projectName: string;
  description: string;
  style: string;
  tone: string;
  verb: string;
  goal: string;
  theme: string;
}) => {
  const baseOutput = `${prompt || "No prompt provided"}\n\nProject: ${projectName || "Unnamed"}\nDescription: ${description || "No description"}\nStyle: ${style}\nTone: ${tone}\nVerb: ${verb}\nGoal: ${goal}\nTheme: ${theme}\n\n`;

  return {
    facebook: `${baseOutput}Optimized for Facebook: Short, engaging post with a call-to-action.`,
    threads: `${baseOutput}Optimized for Threads: Concise, conversational thread starter.`,
    linkedin: `${baseOutput}Optimized for LinkedIn: Professional, detailed post for networking.`,
    x: `${baseOutput}Optimized for X: Brief, impactful tweet within 280 characters.`,
    reddit: `${baseOutput}Use a reflective and authentic tone. Structure it like a personal journey. Avoid using special characters like colon, dash, or abbreviations. No emojis. Focus on storytelling with vulnerability or insight. End with a question or thoughtful note to invite responses.`,
    instagram: `${baseOutput}Optimized for Instagram: Short, engaging post to fit inside post background.`,
  };
};
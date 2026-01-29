// Text card styles for Instagram text-to-image generation
// These styles rotate randomly when generating images

export interface TextCardStyle {
  id: string;
  name: string;
  background: string; // CSS gradient or color
  textColor: string;
  accentColor?: string;
}

export const TEXT_CARD_STYLES: TextCardStyle[] = [
  // Gradients
  {
    id: "purple-pink",
    name: "Purple Pink",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    textColor: "#ffffff",
  },
  {
    id: "pink-coral",
    name: "Pink Coral", 
    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    textColor: "#ffffff",
  },
  {
    id: "blue-cyan",
    name: "Blue Cyan",
    background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    textColor: "#1a1a2e",
  },
  {
    id: "green-teal",
    name: "Green Teal",
    background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    textColor: "#1a1a2e",
  },
  {
    id: "orange-yellow",
    name: "Orange Yellow",
    background: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
    textColor: "#1a1a2e",
  },
  {
    id: "deep-purple",
    name: "Deep Purple",
    background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
    textColor: "#ffffff",
  },
  {
    id: "sunset",
    name: "Sunset",
    background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    textColor: "#1a1a2e",
  },
  {
    id: "ocean",
    name: "Ocean",
    background: "linear-gradient(135deg, #0093E9 0%, #80D0C7 100%)",
    textColor: "#ffffff",
  },
  // Solid colors
  {
    id: "dark",
    name: "Dark",
    background: "#1a1a2e",
    textColor: "#ffffff",
  },
  {
    id: "light",
    name: "Light",
    background: "#fafafa",
    textColor: "#1a1a2e",
  },
  {
    id: "midnight",
    name: "Midnight",
    background: "#0f0f23",
    textColor: "#ffffff",
  },
  {
    id: "cream",
    name: "Cream",
    background: "#f5f0e8",
    textColor: "#2d2d2d",
  },
];

/**
 * Get a random text card style
 */
export function getRandomTextCardStyle(): TextCardStyle {
  return TEXT_CARD_STYLES[Math.floor(Math.random() * TEXT_CARD_STYLES.length)];
}

/**
 * Get a text card style by ID
 */
export function getTextCardStyleById(id: string): TextCardStyle | undefined {
  return TEXT_CARD_STYLES.find((style) => style.id === id);
}

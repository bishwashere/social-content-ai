/**
 * Clean AI-generated text with regex-based transformations
 * Used across all AI text generation to ensure consistent output
 */
export function cleanAIGeneratedText(text: string): string {
  let cleaned = text;

  // Step 1: Remove markdown bold markers (**)
  cleaned = cleaned.replace(/\*\*/g, "");

  // Step 2: Replace em dash (—) and en dash (–) with comma
  cleaned = cleaned.replace(/[—–]/g, ",");

  // Step 3: Remove multiple consecutive spaces
  cleaned = cleaned.replace(/  +/g, " ");

  // Step 4: Remove space before punctuation
  cleaned = cleaned.replace(/ ([,.:;!?])/g, "$1");

  // Step 5: Ensure space after punctuation (except at end of string and except for URLs)
  // Don't add space after : if followed by // (URL pattern)
  cleaned = cleaned.replace(/([,;!?])([^\s\n"'])/g, "$1 $2");
  cleaned = cleaned.replace(/:([^\s\n"'/])/g, ": $1");

  // Step 6: Remove multiple consecutive commas
  cleaned = cleaned.replace(/,+/g, ",");

  // Step 7: Trim whitespace from each line
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

  return cleaned.trim();
}

/**
 * Clean idea/article content for consistent display and storage.
 * Used before publish and when rendering, same as other cleaners (e.g. removeQuickTake).
 */

/** Replace em dash (—), en dash (–), and double dash (--) with single hyphen with spaces. */
export function cleanDashes(content: string): string {
  return content
    .replace(/—/g, " - ")   // em dash
    .replace(/–/g, " - ")   // en dash
    .replace(/\s*--\s*/g, " - ");  // double dash (with optional surrounding spaces)
}

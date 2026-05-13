/**
 * Clean idea/article content for consistent display and storage.
 * Used before publish and when rendering, same as other cleaners (e.g. removeQuickTake).
 */

/** All Unicode dash-like characters to normalize to " - " */
const DASH_CHARS = /[\u2014\u2013\u2212\u2010\u2011]/g; // em dash, en dash, minus sign, hyphen, non-breaking hyphen

/** Replace em dash (—), en dash (–), other dash chars, and double dash (--) with single hyphen with spaces. */
export function cleanDashes(content: string): string {
  return content
    .replace(DASH_CHARS, " - ")           // all Unicode dash variants
    .replace(/\s*--+\s*/g, " - ");       // two or more ASCII hyphens (with optional surrounding spaces)
}

/**
 * Strip the angle label prefix from MDX H2 section headings.
 * Converts "## Risk & Bubble Angle: Speculation & Systemic Impact"
 * into "## Speculation & Systemic Impact".
 * Matches any heading where the label ends with "Angle" followed by a colon.
 */
export function cleanAngleHeadings(content: string): string {
  return content.replace(/^(## ).+ Angle: (.+)$/gm, "$1$2");
}

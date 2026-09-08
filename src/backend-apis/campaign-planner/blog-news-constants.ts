export type SocialExcerptOptions = {
  maxLength?: number;
  maxSentences?: number;
  includeParagraphBreaks?: boolean;
};

/** Platform-specific excerpt sizes for blog-news social posts (Step 4). */
export const BLOG_NEWS_EXCERPT_BY_PLATFORM: Record<string, number | SocialExcerptOptions> = {
  linkedin: { maxLength: 1000, maxSentences: 8, includeParagraphBreaks: true },
  facebook: { maxLength: 400, maxSentences: 4, includeParagraphBreaks: true },
  reddit: { maxLength: 600, maxSentences: 6, includeParagraphBreaks: true },
  instagram: { maxLength: 300, maxSentences: 3 },
  threads: { maxLength: 220, maxSentences: 2 },
  twitter: { maxLength: 180, maxSentences: 2 },
  x: { maxLength: 180, maxSentences: 2 },
};

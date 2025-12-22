export type PlaceholderMap = Record<string, string>;

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeKey(key: string) {
  return key.trim().replace(/^\[|\]$/g, "");
}

export function getProjectPlaceholders(project: { platformUrls?: unknown } | null | undefined): PlaceholderMap {
  const platformUrls = (project as any)?.platformUrls;
  const placeholders = platformUrls && typeof platformUrls === "object" ? (platformUrls as any)._placeholders : undefined;
  if (!placeholders || typeof placeholders !== "object") return {};

  const out: PlaceholderMap = {};
  for (const [k, v] of Object.entries(placeholders as Record<string, unknown>)) {
    if (typeof k !== "string") continue;
    const key = normalizeKey(k);
    if (!key) continue;
    out[key] = typeof v === "string" ? v : String(v ?? "");
  }
  return out;
}

/**
 * Replaces tokens like [Address] (and also {{Address}}) using the provided map.
 * - Keys are matched case-insensitively
 * - Unknown placeholders are left unchanged
 */
export function applyPlaceholders(text: string, placeholders: PlaceholderMap | null | undefined) {
  if (!text) return text;
  if (!placeholders) return text;

  let out = text;
  for (const [rawKey, value] of Object.entries(placeholders)) {
    const key = normalizeKey(rawKey);
    if (!key) continue;
    const safe = escapeRegExp(key);
    // [Key]
    out = out.replace(new RegExp(`\\[\\s*${safe}\\s*\\]`, "gi"), value);
    // {{Key}}
    out = out.replace(new RegExp(`\\{\\{\\s*${safe}\\s*\\}\\}`, "gi"), value);
  }
  return out;
}



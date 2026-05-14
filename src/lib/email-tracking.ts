import { EmailTemplate } from "@/components/email-templates";

/**
 * Wraps a destination URL with the email-click tracking redirect endpoint.
 *
 * When a user clicks a link in an email, the request first hits
 * /api/email-click, which increments the click counter for the given
 * template, then immediately redirects to the original destination.
 *
 * Pass userId to also record a per-user click in EmailUserClick, which
 * enables suppression logic and per-user attribution.
 */
export function buildTrackedUrl(
  destination: string,
  template: EmailTemplate,
  userId?: string
): string {
  const base =
    process.env.NEXT_PUBLIC_APP_PRODUCTION_URL ?? "https://nextpostai.com";

  const url = new URL("/api/email-click", base);
  url.searchParams.set("t", template);
  url.searchParams.set("r", destination);
  if (userId) {
    url.searchParams.set("u", userId);
  }

  return url.toString();
}

import { EmailTemplate } from "@/components/email-templates";
import { APP_PRODUCTION_URL } from "@/constants/common";

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
  const url = new URL("/api/email-click", APP_PRODUCTION_URL);
  url.searchParams.set("t", template);
  url.searchParams.set("r", destination);
  if (userId) {
    url.searchParams.set("u", userId);
  }

  return url.toString();
}

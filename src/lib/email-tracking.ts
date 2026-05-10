import { EmailTemplate } from "@/components/email-templates";

/**
 * Wraps a destination URL with the email-click tracking redirect endpoint.
 *
 * When a user clicks a link in an email, the request first hits
 * /api/email-click, which increments the click counter for the given
 * template, then immediately redirects to the original destination.
 *
 * No user-level data is recorded — tracking is aggregate per template only.
 */
export function buildTrackedUrl(
  destination: string,
  template: EmailTemplate
): string {
  const base =
    process.env.NEXT_PUBLIC_APP_PRODUCTION_URL ?? "https://nextpostai.com";

  const url = new URL("/api/email-click", base);
  url.searchParams.set("t", template);
  url.searchParams.set("r", destination);

  return url.toString();
}

/**
 * Returns the base URL for internal server-to-server fetch calls.
 * Resolves in priority order: explicit app URL → Vercel deployment URL → localhost.
 */
export function getServerBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

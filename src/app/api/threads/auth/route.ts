import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.AUTH_THREADS_ID;
  const baseUrl = process.env.NEXTAUTH_URL;
  const scope = "threads_basic,threads_content_publish,threads_manage_insights";
  const state = Math.random().toString(36).substring(7);

  if (!clientId) {
    throw new Error("AUTH_THREADS_ID environment variable is not set");
  }

  // Build callback URL with return URL
  const callbackUrl = `${baseUrl}/api/threads/callback`;

  const authUrl =
    `https://threads.net/oauth/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `response_type=code&` +
    `state=${state}`;

  // Redirect to Threads authorization
  return Response.redirect(authUrl);
}

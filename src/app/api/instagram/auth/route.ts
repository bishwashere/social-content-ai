import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.AUTH_INSTAGRAM_ID;
  const baseUrl = process.env.NEXTAUTH_URL;
  // Instagram permissions - adjust based on your needs
  const scope = "instagram_business_basic,instagram_business_manage_comments,instagram_business_content_publish,2Cinstagram_business_manage_insights";
  const state = Math.random().toString(36).substring(7);

  if (!clientId) {
    throw new Error("AUTH_INSTAGRAM_ID environment variable is not set");
  }

  // Build callback URL
  const callbackUrl = `${baseUrl}/api/instagram/callback`;

  const authUrl =
    `https://www.instagram.com/oauth/authorize?` +
    'force_reauth=true&'+
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `response_type=code&` +
    `state=${state}`;

  // Redirect to Instagram authorization
  return Response.redirect(authUrl);
}
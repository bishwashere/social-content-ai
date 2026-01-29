import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.AUTH_INSTAGRAM_ID;
  const state = Math.random().toString(36).substring(7);

  if (!clientId) {
    throw new Error("AUTH_INSTAGRAM_ID environment variable is not set");
  }


  const authUrl = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=${clientId}&redirect_uri=https://www.nextpostai.com/api/instagram/callback&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights&state=${state}`

  // Redirect to Instagram authorization
  return Response.redirect(authUrl);
}
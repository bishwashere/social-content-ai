import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import { verifyJWT } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

interface ThreadsTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  user_id?: string;
  error?: string;
  error_description?: string;
}

interface ThreadsUserData {
  id: string;
  username: string;
  name?: string;
  threads_profile_picture_url?: string;
  error?: {
    message: string;
  };
}

export async function GET(request: NextRequest) {
  // Get the current user from your custom JWT token
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    console.error("No auth token found, user not logged in with Google");
    return false;
  }

  const payload = verifyJWT(token, process.env.JWT_SECRET as string);

  if (!payload) {
    console.error("Invalid token");
    return false;
  }

  // Find the Google-authenticated user
  const googleUser = await prisma.user.findUnique({
    where: {
      id: payload.id,
      email: payload.email,
    },
  });

  if (!googleUser) {
    console.error("Google user not found");
    return false;
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const returnUrl = searchParams.get("return_url") || "/";

  // Handle authorization errors
  if (error) {
    console.error("❌ Threads Auth Error:", errorDescription || error);
    const separator = returnUrl.includes("?") ? "&" : "?";
    return Response.redirect(
      new URL(
        `${returnUrl}${separator}threads_error=${encodeURIComponent(
          errorDescription || error
        )}`,
        request.url
      )
    );
  }

  // Check if code is present
  if (!code) {
    console.error("❌ No authorization code received");
    const separator = returnUrl.includes("?") ? "&" : "?";
    return Response.redirect(
      new URL(`${returnUrl}${separator}threads_error=no_code`, request.url)
    );
  }

  try {
    console.log("🔄 Exchanging authorization code for access token...");

    const baseUrl = process.env.NEXTAUTH_URL;

    // Exchange authorization code for access token
    const tokenResponse = await fetch(
      "https://graph.threads.net/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.AUTH_THREADS_ID!,
          client_secret: process.env.AUTH_THREADS_SECRET!,
          code: code,
          redirect_uri: `${baseUrl}/api/threads/callback`,
        }),
      }
    );

    const tokenData: ThreadsTokenResponse = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("❌ Token exchange failed:", tokenData);
      throw new Error(
        tokenData.error_description ||
          tokenData.error ||
          "Token exchange failed"
      );
    }

    // 🎉 SUCCESS - Log the access token
    console.log("\n" + "=".repeat(60));
    console.log("🎉 THREADS OAUTH SUCCESS!");
    console.log("=".repeat(60));
    console.log("✅ Access Token:", tokenData.access_token);
    console.log("📅 Token Type:", tokenData.token_type || "Bearer");
    console.log("⏰ Expires In:", tokenData.expires_in || "N/A", "seconds");
    console.log("👤 User ID:", tokenData.user_id || "N/A");
    console.log("🔑 Full Token Data:", JSON.stringify(tokenData, null, 2));
    console.log("=".repeat(60) + "\n");

    // Get user info

    if (!tokenData.access_token) {
      throw new Error("No access token found");
    }

    const userResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url&access_token=${tokenData.access_token}`
    );
    const userData: ThreadsUserData = await userResponse.json();

    if (userResponse.ok && !userData.error) {
      console.log("👤 User Info:", JSON.stringify(userData, null, 2));
    }

    // Redirect back to the original route with success
    const separator = returnUrl.includes("?") ? "&" : "?";

    // Update or create the oauth provider
    const existingProvider = await prisma.oauthProvider.findFirst({
      where: {
        userId: googleUser.id,
        platform: "threads",
      },
    });

    if (existingProvider) {
      await prisma.oauthProvider.update({
        where: {
          id: existingProvider.id,
        },
        data: {
          accessToken: tokenData.access_token,
          pageId: userData.id,
          pageName: userData.name,
          pageProfilePhoto: userData.threads_profile_picture_url,
          expiresAt: tokenData.expires_in
            ? new Date(
                Date.now() + (tokenData.expires_in || 3600) * 1000
              ).getTime()
            : undefined,
        },
      });
    } else {
      await prisma.oauthProvider.create({
        data: {
          userId: googleUser.id,
          platform: "threads",
          accessToken: tokenData.access_token,
          expiresAt: tokenData.expires_in
            ? new Date(
                Date.now() + (tokenData.expires_in || 3600) * 1000
              ).getTime()
            : undefined,
          pageId: userData.id,
          pageName: userData.name,
          pageProfilePhoto: userData.threads_profile_picture_url,
        },
      });
    }

    return Response.redirect(new URL(`${returnUrl}${separator}`, request.url));
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("❌ OAuth callback error:", errorMessage);
    const separator = returnUrl.includes("?") ? "&" : "?";
    return Response.redirect(
      new URL(
        `${returnUrl}${separator}threads_error=${encodeURIComponent(
          errorMessage
        )}`,
        request.url
      )
    );
  }
}

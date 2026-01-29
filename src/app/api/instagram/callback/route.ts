import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import { verifyJWT } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { autoLinkProviderToAllProjects } from "@/server-actions/auto-link-oauth-providers";
import { encryptToken } from "@/backend-apis/encryption";

interface InstagramTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  user_id?: string;
  error?: string;
  error_description?: string;
}

interface InstagramUserData {
  id: string;
  username: string;
  account_type?: string;
  media_count?: number;
  error?: {
    message: string;
  };
}

interface InstagramLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export async function GET(request: NextRequest) {
  // Get the current user from your custom JWT token
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value;
  const returnUrl = cookieStore.get("instagram_return_url")?.value || "/";

  if (!token) {
    console.error("No auth token found, user not logged in with Google");
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = verifyJWT(token, process.env.JWT_SECRET as string);

  if (!payload) {
    console.error("Invalid token");
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
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
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle authorization errors
  if (error) {
    console.error("❌ Instagram Auth Error:", errorDescription || error);
    const separator = returnUrl.includes("?") ? "&" : "?";
    return Response.redirect(
      new URL(
        `${returnUrl}${separator}instagram_error=${encodeURIComponent(
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
      new URL(`${returnUrl}${separator}instagram_error=no_code`, request.url)
    );
  }

  try {
    console.log("🔄 Exchanging authorization code for access token...");

    const baseUrl = process.env.NEXTAUTH_URL;

    // Step 1: Exchange authorization code for short-lived access token
    const tokenResponse = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.AUTH_INSTAGRAM_ID!,
          client_secret: process.env.AUTH_INSTAGRAM_SECRET!,
          grant_type: "authorization_code",
          redirect_uri: `${baseUrl}/api/instagram/callback`,
          code: code,
        }),
      }
    );

    const tokenData: InstagramTokenResponse = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("❌ Token exchange failed:", tokenData);
      throw new Error(
        tokenData.error_description ||
          tokenData.error ||
          "Token exchange failed"
      );
    }

    console.log("✅ Short-lived token obtained");

    // Step 2: Exchange short-lived token for long-lived token (60 days)
    let finalAccessToken = tokenData.access_token;
    let finalExpiresIn = tokenData.expires_in || 3600; // Default 1 hour for short-lived

    try {
      const longLivedTokenResponse = await fetch(
        `https://graph.instagram.com/access_token?` +
          `grant_type=ig_exchange_token&` +
          `client_secret=${process.env.AUTH_INSTAGRAM_SECRET}&` +
          `access_token=${tokenData.access_token}`
      );

      if (longLivedTokenResponse.ok) {
        const longLivedData: InstagramLongLivedTokenResponse =
          await longLivedTokenResponse.json();
        finalAccessToken = longLivedData.access_token;
        finalExpiresIn = longLivedData.expires_in;
        console.log("✅ Long-lived token obtained (60 days)");
      } else {
        console.warn("⚠️ Could not exchange for long-lived token, using short-lived");
      }
    } catch (exchangeError) {
      console.warn("⚠️ Long-lived token exchange failed:", exchangeError);
      // Continue with short-lived token
    }

    // 🎉 SUCCESS - Log the access token
    console.log("\n" + "=".repeat(60));
    console.log("🎉 INSTAGRAM OAUTH SUCCESS!");
    console.log("=".repeat(60));
    console.log("📅 Token Type:", tokenData.token_type || "Bearer");
    console.log("⏰ Expires In:", finalExpiresIn, "seconds");
    console.log("👤 User ID:", tokenData.user_id || "N/A");
    console.log("=".repeat(60) + "\n");

    // Step 3: Get user info
    if (!finalAccessToken) {
      throw new Error("No access token found");
    }

    const userResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${finalAccessToken}`
    );
    const userData: InstagramUserData = await userResponse.json();

    if (userResponse.ok && !userData.error) {
      console.log("👤 User Info:", JSON.stringify(userData, null, 2));
    }

    // Step 4: Get profile picture (requires separate call)
    let profilePictureUrl: string | undefined;
    try {
      const profileResponse = await fetch(
        `https://graph.instagram.com/${userData.id}?fields=profile_picture_url&access_token=${finalAccessToken}`
      );
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        profilePictureUrl = profileData.profile_picture_url;
      }
    } catch (profileError) {
      console.warn("⚠️ Could not fetch profile picture:", profileError);
    }

    // Step 5: Update or create the oauth provider
    // Check for existing provider with the SAME Instagram account (pageId)
    // This allows users to connect multiple different Instagram accounts
    const existingProvider = await prisma.oauthProvider.findFirst({
      where: {
        userId: googleUser.id,
        platform: "instagram",
        pageId: userData.id,
      },
    });

    let providerId: string;
    if (existingProvider) {
      const updated = await prisma.oauthProvider.update({
        where: {
          id: existingProvider.id,
        },
        data: {
          accessToken: encryptToken(finalAccessToken),
          pageId: userData.id,
          pageName: userData.username,
          pageProfilePhoto: profilePictureUrl,
          expiresAt: new Date(Date.now() + finalExpiresIn * 1000).getTime(),
        },
      });
      providerId = updated.id;
    } else {
      const created = await prisma.oauthProvider.create({
        data: {
          userId: googleUser.id,
          platform: "instagram",
          accessToken: encryptToken(finalAccessToken),
          expiresAt: new Date(Date.now() + finalExpiresIn * 1000).getTime(),
          pageId: userData.id,
          pageName: userData.username,
          pageProfilePhoto: profilePictureUrl,
          isStandalone: true,
        },
      });
      providerId = created.id;
    }

    // Auto-link this provider to matching projects (background operation)
    autoLinkProviderToAllProjects(providerId, googleUser.id).catch((err) => {
      console.error("Error auto-linking provider:", err);
    });

    // Redirect back to the original route with success
    const separator = returnUrl.includes("?") ? "&" : "?";
    return NextResponse.redirect(
      new URL(`${returnUrl}${separator}`, request.url)
    );
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("❌ OAuth callback error:", errorMessage);
    const separator = returnUrl.includes("?") ? "&" : "?";
    return NextResponse.redirect(
      new URL(
        `${returnUrl}${separator}instagram_error=${encodeURIComponent(
          errorMessage
        )}`,
        request.url
      )
    );
  }
}

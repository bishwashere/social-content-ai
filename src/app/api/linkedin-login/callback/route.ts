
import { Linkedin } from "@/lib/3rd-providers/linkedin";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
// import { AUTH_ERROR_CODES } from "@/constants/auth-error";
import { verifyJWT } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { OauthPlatform } from "@prisma/client";
import { autoLinkProviderToAllProjects } from "@/server-actions/auto-link-oauth-providers";
import { encryptTokenFields } from "@/backend-apis/encryption";


export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const redirectTo = url.searchParams.get("redirectTo") || `${process.env.NEXTAUTH_URL}/project`;

    if (!code) {
        return NextResponse.redirect(redirectTo);
        // return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/error/auth?code=${AUTH_ERROR_CODES.UNAUTHENTICATED}`);
    }

    const tokenParams = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/linkedin-login/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        client_id: process.env.AUTH_LINKEDIN_ID!,
        client_secret: process.env.AUTH_LINKEDIN_SECRET!,
    });

    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenParams,
    });

    const token = await tokenRes.json();

    const expiresAt = new Date().getTime() + token.expires_in! * 1000

    const encryptedTokens = encryptTokenFields({
        accessToken: token.access_token,
        refreshToken: token.refresh_token
    }, ["accessToken", "refreshToken"]);

    const l = new Linkedin({
        accessToken: encryptedTokens.accessToken,
        expiresAt: expiresAt
    });

    const linkedinPages = await l.getMyPages();

    if (!linkedinPages || !linkedinPages.length) {
        return NextResponse.redirect(redirectTo);
    }

    // Get the current user from your custom JWT token
    const cookieStore = cookies();
    const userToken = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value;
    if (!userToken) {
        return NextResponse.redirect(redirectTo);
        // return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/error/auth?code=${AUTH_ERROR_CODES.UNAUTHENTICATED}`);
    }
    const payload = verifyJWT(userToken, process.env.JWT_SECRET as string);
    if (!payload) {
        return NextResponse.redirect(redirectTo);
        // return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/error/auth?code=${AUTH_ERROR_CODES.UNAUTHENTICATED}`);
    }

    // Find the Google-authenticated user
    const googleUser = await prisma.user.findUnique({
        where: {
            id: payload.id,
            email: payload.email,
        },
    });
    if (!googleUser) {
        return NextResponse.redirect(redirectTo);
        // return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/error/auth?code=${AUTH_ERROR_CODES.UNAUTHENTICATED}`);
    }

    const pageData = linkedinPages.map((page) => ({
        userId: googleUser.id,
        platform: "linkedin" as OauthPlatform,
        pageId: page.id,
        accessToken: encryptedTokens.accessToken,
        refreshToken: encryptedTokens.refreshToken,
        expiresAt,
        pageName: page.name,
        pageProfilePhoto: page.logo,
        isStandalone: true,
    }));

    for (const item of pageData) {
        const result = await prisma.oauthProvider.upsert({
            where: {
                userId_pageId_platform: {
                    userId: item.userId,
                    pageId: item.pageId,
                    platform: item.platform,
                },
            },
            update: item,
            create: item,
        });

        // Auto-link this provider to matching projects
        await autoLinkProviderToAllProjects(result.id, googleUser.id);
    }

    // Redirect user back to the original page
    return NextResponse.redirect(redirectTo);
}


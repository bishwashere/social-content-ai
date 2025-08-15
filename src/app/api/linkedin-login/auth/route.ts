import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const redirectTo = url.searchParams.get("redirectTo") || "/";

    const clientId = process.env.AUTH_LINKEDIN_ID!;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/linkedin-login/callback?redirectTo=${encodeURIComponent(redirectTo)}`;

    const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope:
            "r_basicprofile r_organization_social_feed rw_organization_admin w_organization_social_feed w_organization_social r_organization_social w_member_social",
        state: Math.random().toString(36).substring(2),
    });

    return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
}


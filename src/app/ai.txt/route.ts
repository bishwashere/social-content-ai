import { NextResponse } from "next/server";
import { SITE_URL as siteUrl } from "@/constants/common";

export async function GET() {
  
  const aiTxtContent = `AI: allow
Sitemap: ${siteUrl}/sitemap.xml
Documentation: ${siteUrl}/ideas
`;

  return new NextResponse(aiTxtContent, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

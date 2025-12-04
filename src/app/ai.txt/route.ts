import { NextResponse } from "next/server";

export async function GET() {
  const siteUrl = "https://nextpostai.com";
  
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

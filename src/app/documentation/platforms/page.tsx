"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlatformsPage() {
  const platforms = [
    { name: "Facebook", href: "/documentation/platforms/facebook", description: "Connect Facebook Pages for automated posting" },
    { name: "Instagram", href: "/documentation/platforms/instagram", description: "Connect Instagram Business accounts via Facebook" },
    { name: "LinkedIn", href: "/documentation/platforms/linkedin", description: "Connect LinkedIn profiles and company pages" },
    { name: "Twitter / X", href: "/documentation/platforms/twitter", description: "Connect Twitter/X accounts for automated posting" },
    { name: "TikTok", href: "/documentation/platforms/tiktok", description: "Connect TikTok Business accounts for video posting" },
    { name: "Threads", href: "/documentation/platforms/threads", description: "Connect Threads accounts via Instagram" },
    { name: "Reddit", href: "/documentation/platforms/reddit", description: "Connect Reddit accounts for subreddit posting" },
  ];

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Platforms</h1>
        <p className="text-muted-foreground text-lg">
          Connect and manage your social media accounts
        </p>
      </div>

        <div className="grid md:grid-cols-2 gap-4">
          {platforms.map((platform) => (
            <Link key={platform.href} href={platform.href}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle>{platform.name}</CardTitle>
                  <CardDescription>{platform.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
    </div>
  );
}


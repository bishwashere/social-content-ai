"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Calendar, FileText, Clock, Video, BarChart3, LayoutTemplate, Zap as AutoIcon, Compass, Lightbulb, Users } from "lucide-react";

const featureMeta: Record<string, { description: string; icon: typeof Zap; color: string }> = {
  "Quick Generate": {
    description: "Instantly generate content for multiple social media platforms",
    icon: Zap,
    color: "text-yellow-600",
  },
  "Campaign Planner": {
    description: "Plan and schedule multi-day content campaigns",
    icon: Calendar,
    color: "text-blue-600",
  },
  "Persona Finder": {
    description: "Find the right buyer personas for your product with AI",
    icon: Users,
    color: "text-purple-600",
  },
  "Video Features": {
    description: "Create engaging videos with Quick Video Maker and templates",
    icon: Video,
    color: "text-pink-600",
  },
  "AI Campaign Suggestion": {
    description: "AI-generated campaign ideas based on your performance data",
    icon: BarChart3,
    color: "text-indigo-600",
  },
  "Platform Analytics + Suggestion": {
    description: "Best time to post and per-platform metrics",
    icon: BarChart3,
    color: "text-indigo-600",
  },
  "Consistency Tracking": {
    description: "Project Pulse, posting streaks, gap tracking, and consistency insights",
    icon: BarChart3,
    color: "text-indigo-600",
  },
  "Templates Library": {
    description: "Browse and use pre-built content templates",
    icon: LayoutTemplate,
    color: "text-purple-600",
  },
  "Auto post": {
    description: "Auto-posting, scheduled campaigns, and automated workflows",
    icon: AutoIcon,
    color: "text-orange-600",
  },
  "Content Discovery": {
    description: "Browse social feed, discover content, and explore posts",
    icon: Compass,
    color: "text-cyan-600",
  },
  "Brand Discovery & Creative Generation": {
    description: "Capture your brand story and generate 40+ ad concepts with AI",
    icon: Lightbulb,
    color: "text-amber-600",
  },
  "Blog News": {
    description: "Automated blog generation from trending news and articles",
    icon: FileText,
    color: "text-green-600",
  },
  "Scheduled Posts": {
    description: "Schedule content to be posted automatically at specific times",
    icon: Clock,
    color: "text-indigo-600",
  },
};

const featureHref: Record<string, string> = {
  "Quick Generate": "/documentation/features/quick-generate",
  "Campaign Planner": "/documentation/features/campaign-planner",
  "Persona Finder": "/documentation/features/persona-finder",
  "Video Features": "/documentation/features/video-features",
  "AI Campaign Suggestion": "/documentation/features/ai-campaign-suggestion",
  "Platform Analytics + Suggestion": "/documentation/features/platform-analytics",
  "Consistency Tracking": "/documentation/features/consistency-tracking",
  "Templates Library": "/documentation/features/templates-library",
  "Auto post": "/documentation/features/automation",
  "Content Discovery": "/documentation/features/content-discovery",
  "Brand Discovery & Creative Generation": "/documentation/features/brand-discovery",
  "Blog News": "/documentation/features/blog-news",
  "Scheduled Posts": "/documentation/features/scheduled-posts",
};

const featureGroups = [
  {
    title: "AI powered generation",
    description: "Generate and create content with AI: copy, concepts, video, auto post, and campaign planning.",
    features: [
      "Quick Generate",
      "Campaign Planner",
      "Persona Finder",
      "Brand Discovery & Creative Generation",
      "Auto post",
    ],
  },
  {
    title: "Data driven workflow",
    description: "Continuous learning from data: analytics, insights, templates, blog news, and content discovery.",
    features: [
      "AI Campaign Suggestion",
      "Platform Analytics + Suggestion",
      "Consistency Tracking",
      "Templates Library",
      "Blog News",
      "Content Discovery",
    ],
  },
  {
    title: "User personalization",
    description: "Create and customize visual content with image and video creation tools.",
    features: ["Video Features"],
  },
  {
    title: "Platform integration",
    description: "Connect and publish across social platforms.",
    features: ["Scheduled Posts"],
  },
];

export default function FeaturesPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Features</h1>
        <p className="text-muted-foreground text-lg">
          Explore all NextPost AI features and capabilities, grouped by how they help you work.
        </p>
      </div>

      <div className="space-y-10">
        {featureGroups.map((group) => (
          <section key={group.title}>
            <h2 className="text-2xl font-semibold mb-2 capitalize">{group.title}</h2>
            <p className="text-muted-foreground mb-4">{group.description}</p>
            <div className="grid md:grid-cols-2 gap-4">
              {group.features.map((name) => {
                const meta = featureMeta[name];
                const href = featureHref[name];
                if (!meta || !href) return null;
                const Icon = meta.icon;
                return (
                  <Link key={href} href={href}>
                    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`h-5 w-5 ${meta.color}`} />
                          <CardTitle>{name}</CardTitle>
                        </div>
                        <CardDescription>{meta.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

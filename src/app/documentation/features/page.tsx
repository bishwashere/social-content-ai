"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Calendar, FileText, Clock, Link2, Video, BarChart3, LayoutTemplate, Zap as AutoIcon, Compass } from "lucide-react";

export default function FeaturesPage() {
  const features = [
    { 
      name: "Quick Generate", 
      href: "/documentation/features/quick-generate", 
      description: "Instantly generate content for multiple social media platforms",
      icon: Zap,
      color: "text-yellow-600"
    },
    { 
      name: "Campaign Planner", 
      href: "/documentation/features/campaign-planner", 
      description: "Plan and schedule multi-day content campaigns",
      icon: Calendar,
      color: "text-blue-600"
    },
    { 
      name: "Video Features", 
      href: "/documentation/features/video-features", 
      description: "Create engaging videos with Quick Video Maker and templates",
      icon: Video,
      color: "text-pink-600"
    },
    { 
      name: "Analytics & Insights", 
      href: "/documentation/features/analytics-insights", 
      description: "Track performance with Project Pulse and platform analytics",
      icon: BarChart3,
      color: "text-indigo-600"
    },
    { 
      name: "Templates Library", 
      href: "/documentation/features/templates-library", 
      description: "Browse and use pre-built content templates",
      icon: LayoutTemplate,
      color: "text-purple-600"
    },
    { 
      name: "Automation", 
      href: "/documentation/features/automation", 
      description: "Auto-posting, scheduled campaigns, and automated workflows",
      icon: AutoIcon,
      color: "text-orange-600"
    },
    { 
      name: "Content Discovery", 
      href: "/documentation/features/content-discovery", 
      description: "Browse social feed, discover content, and explore posts",
      icon: Compass,
      color: "text-cyan-600"
    },
    { 
      name: "Blog News", 
      href: "/documentation/features/blog-news", 
      description: "Automated blog generation from trending news and articles",
      icon: FileText,
      color: "text-green-600"
    },
    { 
      name: "Scheduled Posts", 
      href: "/documentation/features/scheduled-posts", 
      description: "Schedule content to be posted automatically at specific times",
      icon: Clock,
      color: "text-indigo-600"
    },
    { 
      name: "Advanced Customization", 
      href: "/documentation/features/advanced-customization", 
      description: "Fine-tune content generation with advanced options",
      icon: Link2,
      color: "text-teal-600"
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Features</h1>
        <p className="text-muted-foreground text-lg">
          Explore all NextPost AI features and capabilities
        </p>
      </div>

        <div className="grid md:grid-cols-2 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.href} href={feature.href}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-5 w-5 ${feature.color}`} />
                      <CardTitle>{feature.name}</CardTitle>
                    </div>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
    </div>
  );
}


"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Calendar, FileText, Webhook, Clock, Link2 } from "lucide-react";

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
      name: "Blog News", 
      href: "/documentation/features/blog-news", 
      description: "Automated blog generation from trending news and articles",
      icon: FileText,
      color: "text-green-600"
    },
    { 
      name: "Webhooks", 
      href: "/documentation/features/webhooks", 
      description: "Receive blog posts via webhooks for external publishing",
      icon: Webhook,
      color: "text-purple-600"
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


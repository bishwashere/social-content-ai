"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function CampaignPlannerPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h1 className="text-4xl font-bold">Campaign Planner</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Plan and schedule multi-day content campaigns
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Campaign Planner helps you create structured, multi-day content campaigns with fully automated scheduling and content generation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Types</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li><strong>Standard Campaigns:</strong> Multi-day content plans with platform-specific posts</li>
                <li><strong>Blog News Campaigns:</strong> Fully automated blog generation from trending articles</li>
                <li>Customizable target audience intensity (Light to Aggressive)</li>
                <li>Platform-specific content generation</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Multi-day campaign timeline with day-by-day content</li>
                <li>Fully automated content generation for each day</li>
                <li>Auto-post scheduling with time-based triggers</li>
                <li>Campaign progress tracking and completion status</li>
                <li>Content editing and customization per day</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auto-Post Functionality</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Enable auto-post for fully automatic publishing at scheduled times:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Set a daily posting time for the campaign</li>
                <li>Select platforms for fully automated posting</li>
                <li>Content is generated and posted automatically at the scheduled time with no manual pipeline steps</li>
                <li>Failed posts are logged and can be retried</li>
              </ul>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}


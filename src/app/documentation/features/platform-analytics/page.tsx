"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Clock } from "lucide-react";

export default function PlatformAnalyticsPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-6 w-6 text-indigo-600" />
          <h1 className="text-4xl font-bold">Platform Analytics + Suggestion</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Best time to post and per-platform performance metrics
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              Best Time to Post
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Analytics surfaces when your content performs best so you can schedule smarter:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Best hour:</strong> Hour of the day with highest engagement</li>
              <li><strong>Best day of week:</strong> Day with highest engagement</li>
              <li><strong>Best platform:</strong> Platform that drives the most engagement for your project</li>
              <li>Recommendations are based on your actual campaign and project performance data</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Detailed metrics for each platform:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Impressions and reach</li>
              <li>Engagement rates</li>
              <li>Post performance trends</li>
              <li>Platform-specific insights</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

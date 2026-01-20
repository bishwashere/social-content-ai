"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Target, Activity } from "lucide-react";

export default function AnalyticsInsightsPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-6 w-6 text-indigo-600" />
          <h1 className="text-4xl font-bold">Analytics & Insights</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Track performance and gain insights into your content strategy
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Pulse</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Overall project health score (0-100%) based on:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Cadence (25%):</strong> Posting frequency consistency</li>
              <li><strong>OnTime (20%):</strong> Scheduled post timing accuracy</li>
              <li><strong>Engagement (20%):</strong> Content performance with trends</li>
              <li><strong>Consistency (15%):</strong> Posting streak tracking</li>
              <li><strong>Success Rate (10%):</strong> Scheduled posting reliability</li>
              <li><strong>Coverage (5%):</strong> Platform usage diversity</li>
              <li><strong>Platform Diversity (5%):</strong> Multi-platform usage</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Analytics</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Consistency Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Analyze your posting patterns:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Posting streak analysis</li>
              <li>Gap day tracking</li>
              <li>Consistency correlation with impressions</li>
              <li>Historical data analysis (30-day rolling windows)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

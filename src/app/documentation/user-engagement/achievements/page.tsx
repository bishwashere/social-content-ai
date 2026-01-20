"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Calendar, Video, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function AchievementsPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-6 w-6 text-green-600" />
          <h1 className="text-4xl font-bold">Achievements</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Track your progress across four key areas
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              NextPostAI tracks your progress across four areas, each with 5 achievement levels:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Campaigns</strong> — Your use of multi-day content campaigns</li>
              <li><strong>Scheduled posts</strong> — Your consistency in planning ahead</li>
              <li><strong>Videos</strong> — Your video content creation</li>
              <li><strong>Tracking</strong> — Your use of analytics and insights</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Each area has 5 levels. Progress is shown with green dots (●○○○○) and your current level (e.g., 3 / 5).
            </p>
            <p className="text-sm text-muted-foreground">
              Achievements unlock as you use features more consistently across your projects.
            </p>
          </CardContent>
        </Card>

        <div className="mt-4">
          <Link href="/documentation/user-engagement/achievement-levels" className="text-sm text-primary hover:underline">
            View detailed achievement levels →
          </Link>
        </div>
      </div>
    </div>
  );
}

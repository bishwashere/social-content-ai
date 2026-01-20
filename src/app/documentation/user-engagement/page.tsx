"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Calendar } from "lucide-react";

export default function UserEngagementPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-6 w-6 text-green-600" />
          <h1 className="text-4xl font-bold">User Engagement</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Track your progress, unlock achievements, and stay consistent
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/documentation/user-engagement/achievements">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-green-600" />
                <CardTitle>Achievements</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Unlock achievement levels across campaigns, consistency, videos, and insights
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/documentation/user-engagement/your-today">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                <CardTitle>Your Today</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Personalized daily tasks and recommendations to help you grow
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/documentation/user-engagement/achievement-levels">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-green-600" />
                <CardTitle>Achievement Levels</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Detailed breakdown of all achievement levels and requirements
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, Calendar } from "lucide-react";

export default function YourTodayPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-6 w-6 text-blue-600" />
          <h1 className="text-4xl font-bold">Your Today</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Personalized daily tasks and recommendations
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your Today provides personalized, actionable tasks based on your current progress and goals.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Personalized Tasks:</strong> AI-generated recommendations based on your activity</li>
              <li><strong>Growth Recommendations:</strong> Suggestions to unlock achievements</li>
              <li><strong>Consistency Insights:</strong> Analysis of your posting patterns</li>
              <li><strong>Project-Specific Tasks:</strong> Actionable items for each project</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Types</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Start your first campaign</li>
              <li>Schedule your first post</li>
              <li>Try your first video</li>
              <li>Connect social accounts</li>
              <li>Track project performance</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

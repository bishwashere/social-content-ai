"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Calendar, Video, BarChart3 } from "lucide-react";

export default function AchievementLevelsPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-6 w-6 text-green-600" />
          <h1 className="text-4xl font-bold">How Achievement Levels Work</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Track your progress across four key areas of content creation
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              NextPostAI tracks your progress across four areas:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Campaigns</strong> - Your use of multi-day content campaigns</li>
              <li><strong>Scheduled posts</strong> - Your consistency in planning ahead</li>
              <li><strong>Videos</strong> - Your video content creation</li>
              <li><strong>Tracking</strong> - Your use of analytics and insights</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              Each area has 5 levels. The green dots (●○○○○) show your current level, and the number (3 / 5) shows how far you are through the ladder.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <CardTitle>Campaign Levels</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Level 1 - Campaign Seed</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;ve started experimenting with campaigns.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 2 - Campaign Builder</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;re using campaigns regularly for a few projects.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 3 - Campaign Driver</h3>
              <p className="text-sm text-muted-foreground">
                Campaigns are a core part of how you plan content.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 4 - Campaign Strategist</h3>
              <p className="text-sm text-muted-foreground">
                Most projects use campaigns with clear goals and plans.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 5 - Campaign Architect</h3>
              <p className="text-sm text-muted-foreground">
                You run many campaigns in parallel and refine them over time.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <CardTitle>Consistency Levels (Scheduled Posts)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Level 1 - Consistency Starter</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;ve scheduled your first posts.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 2 - Consistency Builder</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;re scheduling posts for several projects.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 3 - Consistency Driver</h3>
              <p className="text-sm text-muted-foreground">
                Most projects have scheduled content in advance.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 4 - Consistency Pro</h3>
              <p className="text-sm text-muted-foreground">
                You keep a steady posting rhythm across projects.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 5 - Consistency Master</h3>
              <p className="text-sm text-muted-foreground">
                Your calendar is consistently full, far ahead of today.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-red-600" />
              <CardTitle>Video Levels</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Level 1 - First Cut</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;ve created at least one video.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 2 - Content Creator</h3>
              <p className="text-sm text-muted-foreground">
                You use videos for a few projects.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 3 - Storyteller</h3>
              <p className="text-sm text-muted-foreground">
                Videos are part of how you tell your product&apos;s story.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 4 - Video Producer</h3>
              <p className="text-sm text-muted-foreground">
                You publish video content regularly.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 5 - Content Director</h3>
              <p className="text-sm text-muted-foreground">
                You rely on video as a key channel across projects.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              <CardTitle>Tracking Levels</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Level 1 - Insight Beginner</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;ve turned on tracking for at least one project.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 2 - Insight Explorer</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;re tracking results for a few projects.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 3 - Insight Mapper</h3>
              <p className="text-sm text-muted-foreground">
                You regularly track what&apos;s working across projects.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 4 - Insight Analyst</h3>
              <p className="text-sm text-muted-foreground">
                You compare performance and adjust based on data.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Level 5 - Insight Visionary</h3>
              <p className="text-sm text-muted-foreground">
                You use insights to shape long-term strategy and experiments.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


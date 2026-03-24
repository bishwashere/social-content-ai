"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Clock, Calendar } from "lucide-react";

export default function AutomationPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-6 w-6 text-orange-600" />
          <h1 className="text-4xl font-bold">Auto post</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Fully automate your content creation and posting workflows end to end
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Auto-Post</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Fully automated posting for campaign content at scheduled times:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Set a daily posting time for campaigns</li>
              <li>Select platforms for fully automated posting</li>
              <li>Content is generated and posted automatically—no step-by-step handoff</li>
              <li>Failed posts are logged and can be retried</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blog News Automation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Fully automated 4-step pipeline (each step triggers the next):
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Fetch Article:</strong> Get trending articles from Reddit/HackerNews</li>
              <li><strong>Generate Blog:</strong> AI creates blog post from article</li>
              <li><strong>Send Webhook:</strong> Deliver blog to external publishing platform</li>
              <li><strong>Post to Social:</strong> Automatically create social posts from blog</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scheduled Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Schedule content for fully automatic posting at the chosen time:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Set specific date and time for posts</li>
              <li>Schedule multiple posts in advance</li>
              <li>Automatic posting at scheduled time</li>
              <li>Status tracking (pending/success/failed)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

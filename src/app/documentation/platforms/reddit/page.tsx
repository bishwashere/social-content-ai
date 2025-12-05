"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key } from "lucide-react";

export default function RedditPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-6 w-6 text-orange-600" />
            <h1 className="text-4xl font-bold">Reddit</h1>
            <Badge variant="secondary">OAuth 2.0</Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Connect Reddit accounts for subreddit posting
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Flow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Reddit OAuth 2.0 with permanent access tokens and subreddit moderation checks.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>OAuth 2.0 authorization flow</li>
                <li>Permanent access tokens (no expiration)</li>
                <li>Subreddit moderation verification before posting</li>
                <li>Support for multiple subreddit connections</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stored Credentials</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Access Token (encrypted)</li>
                <li>Refresh Token (encrypted, when available)</li>
                <li>User ID and Username</li>
                <li>Subreddit permissions and verification status</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Measures</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>All tokens encrypted before storage</li>
                <li>Subreddit moderation checks prevent unauthorized posting</li>
                <li>Scoped permissions for posting and reading only</li>
                <li>Users can revoke access through Reddit preferences</li>
              </ul>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}


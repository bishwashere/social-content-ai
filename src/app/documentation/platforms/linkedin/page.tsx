"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key } from "lucide-react";

export default function LinkedInPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-6 w-6 text-blue-700" />
            <h1 className="text-4xl font-bold">LinkedIn</h1>
            <Badge variant="secondary">OAuth 2.0</Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Connect LinkedIn profiles and company pages
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Flow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                LinkedIn OAuth 2.0 flow with support for both personal profiles and company pages.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>OAuth 2.0 authorization code flow</li>
                <li>Access tokens with refresh token support</li>
                <li>Separate connections for personal profiles and company pages</li>
                <li>Automatic token refresh using refresh tokens</li>
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
                <li>Refresh Token (encrypted)</li>
                <li>Token Expiration Timestamp</li>
                <li>Profile/Page ID and Name</li>
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
                <li>Minimal required permissions (posting only)</li>
                <li>Automatic token refresh mechanism</li>
                <li>Users can revoke access through LinkedIn settings</li>
              </ul>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}


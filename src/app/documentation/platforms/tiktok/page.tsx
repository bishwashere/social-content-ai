"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key } from "lucide-react";

export default function TikTokPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-6 w-6 text-black" />
            <h1 className="text-4xl font-bold">TikTok</h1>
            <Badge variant="secondary">OAuth 2.0</Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Connect TikTok Business accounts for video posting
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Flow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                TikTok OAuth 2.0 flow for Business accounts with video upload capabilities.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>OAuth 2.0 authorization flow</li>
                <li>Access tokens with refresh token support</li>
                <li>Automatic token refresh before expiration</li>
                <li>Support for video upload and posting</li>
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
                <li>Business Account ID</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Measures</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>All tokens encrypted using AES-256-CBC</li>
                <li>Automatic token refresh mechanism</li>
                <li>Scoped permissions for video upload and posting</li>
                <li>No access to user&apos;s personal TikTok data</li>
              </ul>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}


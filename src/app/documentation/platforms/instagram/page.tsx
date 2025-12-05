"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key } from "lucide-react";

export default function InstagramPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-6 w-6 text-pink-600" />
            <h1 className="text-4xl font-bold">Instagram</h1>
            <Badge variant="secondary">OAuth 2.0</Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Connect Instagram Business accounts via Facebook
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Flow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Instagram Business accounts are connected through Facebook's Graph API, as Instagram requires a linked Facebook Page.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Requires Facebook Page connection first</li>
                <li>Uses Facebook access tokens with Instagram permissions</li>
                <li>Instagram Business account must be linked to the Facebook Page</li>
                <li>Token refresh follows Facebook's token lifecycle</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stored Credentials</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Facebook Access Token (encrypted, with Instagram permissions)</li>
                <li>Instagram Business Account ID</li>
                <li>Linked Facebook Page ID</li>
                <li>Token Expiration Timestamp</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Measures</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Inherits Facebook's encryption and security measures</li>
                <li>Instagram-specific permissions are scoped to posting only</li>
                <li>No access to user's personal Instagram account data</li>
              </ul>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}


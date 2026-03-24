"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key } from "lucide-react";

export default function FacebookPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-6 w-6 text-blue-600" />
            <h1 className="text-4xl font-bold">Facebook</h1>
            <Badge variant="secondary">OAuth 2.0</Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Connect your Facebook Pages for fully automated posting
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Flow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Facebook uses OAuth 2.0 with long-lived access tokens. We request permissions for page management and posting capabilities.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Initial authorization redirects to Facebook&apos;s OAuth consent screen</li>
                <li>Short-lived access token is exchanged for a long-lived token (60 days)</li>
                <li>Long-lived tokens can be refreshed indefinitely using the refresh token</li>
                <li>Page-specific tokens are stored separately for each connected page</li>
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
                <li>Token Expiration Timestamp</li>
                <li>Page ID and Page Name (for page-specific connections)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Measures</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>All tokens encrypted using AES-256-CBC before database storage</li>
                <li>Automatic token refresh before expiration</li>
                <li>Page-level permissions ensure minimal required access</li>
                <li>Users can revoke access through Facebook Settings at any time</li>
              </ul>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}


"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key } from "lucide-react";

export default function TwitterPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-6 w-6 text-black" />
            <h1 className="text-4xl font-bold">Twitter / X</h1>
            <Badge variant="secondary">OAuth 2.0</Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Connect Twitter/X accounts for fully automated posting
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Flow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Twitter OAuth 2.0 with PKCE (Proof Key for Code Exchange) for enhanced security.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>OAuth 2.0 with PKCE flow for additional security</li>
                <li>Access tokens with refresh token support</li>
                <li>Token refresh before expiration</li>
                <li>Support for multiple Twitter accounts per user</li>
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
                <li>User ID and Username</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Measures</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>PKCE implementation adds extra security layer</li>
                <li>All tokens encrypted at rest</li>
                <li>Automatic token refresh</li>
                <li>Read and write permissions scoped to posting only</li>
              </ul>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}


"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Key } from "lucide-react";

export default function ThreadsPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-6 w-6 text-purple-600" />
            <h1 className="text-4xl font-bold">Threads</h1>
            <Badge variant="secondary">OAuth 2.0</Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Connect Threads accounts via Instagram
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Flow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Threads accounts are connected through Instagram&apos;s API, as Threads requires an Instagram account.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Requires Instagram Business account connection</li>
                <li>Uses Instagram access tokens with Threads permissions</li>
                <li>Threads account must be linked to Instagram</li>
                <li>Token refresh follows Instagram&apos;s token lifecycle</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stored Credentials</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Instagram Access Token (encrypted, with Threads permissions)</li>
                <li>Threads Account ID</li>
                <li>Linked Instagram Account ID</li>
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
                <li>Inherits Instagram&apos;s encryption and security measures</li>
                <li>Threads-specific permissions scoped to posting</li>
                <li>No access to user&apos;s personal Threads data beyond posting</li>
              </ul>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}


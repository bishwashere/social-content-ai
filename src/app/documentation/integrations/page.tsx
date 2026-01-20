"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Webhook, Code } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Code className="h-6 w-6 text-purple-600" />
          <h1 className="text-4xl font-bold">Integrations</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Connect NextPost AI with external services and APIs
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/documentation/integrations/webhooks">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-purple-600" />
                <CardTitle>Webhooks</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Receive blog posts via webhooks for external publishing platforms
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-blue-600" />
              <CardTitle>API Reference</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              API documentation and developer resources (Coming soon)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

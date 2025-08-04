"use client";

import { useSession } from "@/backend-apis/auth/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { OAuthProvidersList } from "./_components/oauth-providers-list";

export default function SettingsPage() {
  const { data: session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please sign in to access settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="oauth" className="w-full">
            <TabsList>
              <TabsTrigger value="oauth">Connected Accounts</TabsTrigger>
              {/* Add more tabs here as needed */}
            </TabsList>
            <TabsContent value="oauth" className="mt-4">
              <OAuthProvidersList />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
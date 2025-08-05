"use client";

import { useSession } from "@/backend-apis/auth/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useOAuthProviders } from "@/server-actions/oauth-providers/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { OauthProvider } from "@prisma/client";

type GroupedProviders = {
  [key: string]: OauthProvider[];
};

export function OAuthProvidersList() {
  const { data: session } = useSession();
  const { data: providers, isLoading } = useOAuthProviders();

  // Group providers by platform
  const groupedProviders = providers?.reduce((acc: GroupedProviders, provider: OauthProvider) => {
    const platform = provider.platform.toLowerCase();
    if (!acc[platform]) {
      acc[platform] = [];
    }
    acc[platform].push(provider);
    return acc;
  }, {}) ?? {};

  if (!session) return null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedProviders).map(([platform, providers]) => (
        <Card key={platform}>
          <CardHeader>
            <CardTitle className="capitalize">{platform}</CardTitle>
            <CardDescription>
              {providers.length} connected {platform} {providers.length === 1 ? 'account' : 'accounts'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {providers.map((provider, index) => (
                <div key={provider.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{provider.pageName || provider.pageId}</h4>
                      <p className="text-sm text-muted-foreground">
                        Connected on {new Date(provider.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {Object.keys(groupedProviders).length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Connected Accounts</CardTitle>
            <CardDescription>
              You haven&apos;t connected any social media accounts yet.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
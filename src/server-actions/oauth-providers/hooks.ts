'use client';

import { useQuery } from "@tanstack/react-query";
import { getOAuthProviders } from ".";
import { useSession } from "@/backend-apis/auth/hooks";

/**
 * Hook to fetch OAuth providers for the current user
 */
export function useOAuthProviders() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: ['oauth-providers'],
    queryFn: () => getOAuthProviders(session?.user.id as string),
    enabled: !!session?.user.id,
  });
}
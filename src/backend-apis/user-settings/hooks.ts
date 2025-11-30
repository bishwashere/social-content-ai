"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/backend-apis/auth/hooks";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import Cookie from "js-cookie";

interface UserSettings {
  guidedTourEnabled: boolean;
}

export function useUserSettings() {
  const { data: session } = useSession();

  return useQuery<UserSettings>({
    queryKey: ["userSettings", session?.user?.id],
    queryFn: async () => {
      const token = Cookie.get(AUTH_TOKEN_COOKIE_NAME);
      const response = await fetch("/api/user/settings", {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch user settings");
      }
      const result = await response.json();
      return result.data;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      const token = Cookie.get(AUTH_TOKEN_COOKIE_NAME);
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update settings");
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["userSettings", session?.user?.id],
      });
    },
  });
}


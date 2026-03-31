"use client";

import { useEffect } from "react";
import { useSession } from "@/backend-apis/auth/hooks";
import { markEverAuthenticated } from "@/lib/returning-visitor";

/**
 * Any successful session (including after refresh) marks this browser as having
 * authenticated, so the landing urgency offer stays hidden after logout.
 */
export function MarkReturningVisitorOnSession() {
  const { data, isSuccess } = useSession();

  useEffect(() => {
    if (isSuccess && data?.user) markEverAuthenticated();
  }, [isSuccess, data?.user]);

  return null;
}

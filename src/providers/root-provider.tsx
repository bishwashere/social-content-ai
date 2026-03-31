"use client";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import SessionProvider from "./session-provider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { FeatureRequestWidget } from "@/components/common/feature-request-widget";
import { NewsletterWidget } from "@/components/common/newsletter-widget";
import { WidgetVisibilityProvider } from "./widget-visibility-provider";
import { MarkReturningVisitorOnSession } from "@/components/common/mark-returning-visitor-on-session";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});

type Props = {
  children: React.ReactNode;
};
/**
 * Wraps the children into @tansctack/react-query QueryClientProvider and @react-oauth/google GoogleOAuthProvider
 */
const RootProvider = ({ children }: Props) => {
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider
        clientId={process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID as string}
      >
        <SessionProvider>
          <MarkReturningVisitorOnSession />
          <WidgetVisibilityProvider>
            {children}
            <FeatureRequestWidget />
            <NewsletterWidget />
            {process.env.NODE_ENV === "development" && <ReactQueryDevtools buttonPosition="bottom-left" />}
          </WidgetVisibilityProvider>
        </SessionProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  );
};

export default RootProvider;

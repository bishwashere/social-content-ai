"use client";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import SessionProvider from "./session-provider";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

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
          {children}

          {process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
        </SessionProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  );
};

export default RootProvider;

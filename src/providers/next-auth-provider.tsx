"use client"

import React from 'react'

import { SessionProvider } from 'next-auth/react'

type Props = {
  children: React.ReactNode
}

/**
 * NextAuthProvider wraps the app with SessionProvider.
 * This app uses custom JWT auth (not next-auth sessions), so we configure
 * SessionProvider to not continuously refetch sessions.
 * 
 * The SessionProvider is still needed for next-auth's signIn() function
 * which is used for OAuth account linking (Facebook, Instagram, Twitter, etc.)
 */
const NextAuthProvider = (props: Props) => {
  return (
    <SessionProvider
      // Don't refetch session - we use custom JWT auth
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      {props.children}
    </SessionProvider>
  )
}

export default NextAuthProvider
"use client"

import React from 'react'

import { SessionProvider } from 'next-auth/react'

type Props = {
  children: React.ReactNode
}

const NextAuthProvider = (props: Props) => {
  return (
    <SessionProvider>
      {props.children}
    </SessionProvider>
  )
}

export default NextAuthProvider
"use client"
import { useSession } from '@/backend-apis/auth/hooks'
import Loading from '@/components/common/loading'
import React from 'react'
import HomePage from '@/app/page' // Import the home page component

type Props = {
  children: React.ReactNode
}

const SessionProvider = ({ children }: Props) => {
  const { isLoading, isError } = useSession()

  if (isLoading) {
    return <Loading className='h-screen' />
  }

  if (isError) {
    return <HomePage /> // ✅ Show the home page instead of UnauthorizedError
  }

  return children
}

export default SessionProvider

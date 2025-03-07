"use client"
import { useSession } from '@/backend-apis/auth/hooks'
import UnauthorizedError from '@/components/error/unauthorized'
import Loading from '@/components/common/loading'
import React from 'react'

type Props = {
  children: React.ReactNode
}

const SessionProvider = ({ children }: Props) => {
  const { isLoading, isError } = useSession()

  if (isLoading) {
    return <Loading className='h-screen' />
  }

  if (isError) {
    return <UnauthorizedError />
  }

  return children
}

export default SessionProvider
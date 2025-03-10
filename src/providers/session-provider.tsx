"use client"
import { useSession } from '@/backend-apis/auth/hooks'
import Loading from '@/components/common/loading'
import React, { useEffect } from 'react'
import HomePage from '@/app/page' // Import the home page component
import { usePathname, useRouter } from 'next/navigation'

type Props = {
  children: React.ReactNode
}

/**
 *  SessionProvider is a component that checks if the user is authenticated or not.
 *  If the user is authenticated, it redirects to the dashboard page.
 *  If the user is not authenticated, it redirects to the home page.
 */
const SessionProvider = ({ children }: Props) => {
  const { isLoading, isError } = useSession()
  const path = usePathname()
  const router = useRouter()

  useEffect(() => {

    if (isLoading) return

    if (isError) {
      router.push('/') // ✅ Redirect to the home page
    } else {
      if (path === '/') {
        router.push('/project') // ✅ Redirect to the dashboard page, if the user is authenticated and tries to access the home page
      }
    }

  }, [isError, isLoading, path, router])

  if (isLoading) {
    return <Loading className='h-screen' />
  }

  if (isError) {
    return <HomePage /> // ✅ Show the home page instead of UnauthorizedError
  }

  return children
}

export default SessionProvider

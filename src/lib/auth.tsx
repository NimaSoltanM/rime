// lib/auth.ts
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useMutation as useConvexMutation } from 'convex/react'
import { setCookie, getCookie, deleteCookie } from './cookies'
import { api } from 'convex/_generated/api'

export function useAuthActions() {
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load session token from cookie on mount
  useEffect(() => {
    const token = getCookie('rime_session_token')
    setSessionToken(token)
    setIsInitialized(true)
  }, [])

  // Get current user if we have a session token
  const { data: user, isLoading: userLoading } = useQuery({
    ...convexQuery(api.auth.getCurrentUser, {
      sessionToken: sessionToken || '',
    }),
    enabled: !!sessionToken && isInitialized,
  })

  const signOutMutation = useConvexMutation(api.auth.signOut)

  const signIn = (token: string) => {
    setCookie('rime_session_token', token, 30) // 30 days
    setSessionToken(token)
  }

  const signOut = async () => {
    if (sessionToken) {
      try {
        await signOutMutation({ sessionToken })
      } catch (error) {
        console.error('Error signing out:', error)
      }
    }
    deleteCookie('rime_session_token')
    setSessionToken(null)
  }

  const isLoading = !isInitialized || (sessionToken && userLoading)
  const isAuthenticated = !!user && !!user.firstName && !!user.lastName
  const needsOnboarding = !!user && (!user.firstName || !user.lastName)

  return {
    isLoading,
    isAuthenticated,
    needsOnboarding,
    signIn,
    signOut,
    sessionToken,
  }
}

export function useCurrentUser() {
  const { sessionToken } = useAuthActions()

  const { data: user } = useQuery({
    ...convexQuery(api.auth.getCurrentUser, {
      sessionToken: sessionToken || '',
    }),
    enabled: !!sessionToken,
  })

  return user || null
}

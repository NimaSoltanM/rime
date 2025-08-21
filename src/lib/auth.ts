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
  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useQuery({
    ...convexQuery(api.auth.getCurrentUser, {
      sessionToken: sessionToken || '',
    }),
    enabled: !!sessionToken && isInitialized,
    retry: (failureCount, error) => {
      // Don't retry if it's an auth error
      if (
        error?.message?.includes('Not authenticated') ||
        error?.message?.includes('Invalid or expired session')
      ) {
        return false
      }
      return failureCount < 3
    },
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

  // Clear invalid session tokens
  useEffect(() => {
    if (isInitialized && sessionToken && userError) {
      if (
        userError.message?.includes('Not authenticated') ||
        userError.message?.includes('Invalid or expired session')
      ) {
        console.log('Clearing invalid session token')
        deleteCookie('rime_session_token')
        setSessionToken(null)
      }
    }
  }, [userError, sessionToken, isInitialized])

  // Comprehensive loading state
  const isLoading = !isInitialized || (sessionToken && userLoading)

  // User is authenticated if we have user data with complete profile
  const isAuthenticated = !!user && !!user.firstName && !!user.lastName

  // User exists but needs to complete profile
  const needsOnboarding = !!user && (!user.firstName || !user.lastName)

  // Has valid session token (for queries)
  const hasValidSession = !!sessionToken && isInitialized

  return {
    // Loading states
    isLoading,
    isInitialized,

    // Auth states
    isAuthenticated,
    needsOnboarding,
    hasValidSession,

    // Session data
    sessionToken,
    user,

    // Actions
    signIn,
    signOut,
  }
}

export function useCurrentUser() {
  const { sessionToken, isInitialized, hasValidSession } = useAuthActions()

  const { data: user } = useQuery({
    ...convexQuery(api.auth.getCurrentUser, {
      sessionToken: sessionToken || '',
    }),
    enabled: hasValidSession && !!sessionToken,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error?.message?.includes('Not authenticated')) {
        return false
      }
      return failureCount < 3
    },
  })

  return user || null
}

// Helper hook for components that need to wait for auth
export function useRequireAuth() {
  const { isLoading, isAuthenticated, hasValidSession, sessionToken } =
    useAuthActions()

  return {
    isLoading,
    isAuthenticated,
    hasValidSession,
    sessionToken,
    // Ready when we have either a valid session or confirmed no session
    isReady: !isLoading && (hasValidSession || (!sessionToken && !isLoading)),
  }
}

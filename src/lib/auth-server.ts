// lib/server-functions.ts
import { createServerFn } from '@tanstack/react-start'
import { getHeader } from '@tanstack/react-start/server'

export const getCurrentUserServer = createServerFn({
  method: 'GET',
}).handler(async () => {
  // Get cookies from request headers
  const cookieHeader = getHeader('cookie')

  if (!cookieHeader) {
    return null
  }

  // Parse the session token from cookies
  const sessionToken = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith('rime_session_token='))
    ?.split('=')[1]

  if (!sessionToken) {
    return null
  }

  try {
    // Call Convex API to get user
    const response = await fetch(`${process.env.VITE_CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: 'auth:getCurrentUser',
        args: { sessionToken },
      }),
    })

    if (!response.ok) {
      return null
    }

    const result = await response.json()

    // ✅ Include the sessionToken in the returned user object
    if (result.value) {
      return {
        ...result.value,
        sessionToken, // Add the token to the user object
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
})

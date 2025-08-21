// lib/cookies.ts
// Simple cookie utilities for client and server

export function setCookie(name: string, value: string, days = 30) {
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;secure;samesite=strict`
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null // Server-side
  }

  const nameEQ = name + '='
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

export function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
}

// Server-side cookie reading for beforeLoad
export function getCookieFromHeaders(
  headers: Headers,
  name: string,
): string | null {
  const cookies = headers.get('cookie')
  if (!cookies) return null

  const cookie = cookies.split(';').find((c) => c.trim().startsWith(`${name}=`))

  return cookie ? cookie.split('=')[1] : null
}

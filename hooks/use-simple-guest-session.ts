/**
 * Simple guest session hook that provides basic guest session functionality
 * without localStorage dependencies for SSR compatibility
 */

import { useState, useEffect } from 'react'

interface SimpleGuestSession {
  id: string
  isGuest: boolean
  userData: {
    name: string
  }
}

interface SimpleGuestLimits {
  maxPlans: number
  maxFlashcards: number
  maxSessions: number
}

export function useSimpleGuestSession() {
  const [session, setSession] = useState<SimpleGuestSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Create a simple guest session
    const guestSession: SimpleGuestSession = {
      id: `guest_${Date.now()}`,
      isGuest: true,
      userData: {
        name: 'Guest User'
      }
    }

    setSession(guestSession)
    setIsLoading(false)
  }, [])

  const limits: SimpleGuestLimits = {
    maxPlans: 3,
    maxFlashcards: 50,
    maxSessions: 10
  }

  return {
    session,
    isLoading,
    isGuest: session?.isGuest ?? true,
    isAuthenticated: session !== null,
    limits,
    hasReachedLimits: false,
    getCurrentLimits: () => limits,
    hasReachedLimits: () => false
  }
}

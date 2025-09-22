import { useState, useEffect, useCallback } from 'react'
import { 
  GuestSession, 
  GuestUserData, 
  GuestPlan, 
  GuestFlashcard, 
  GuestLimits 
} from '@/types/guest'
import { supabaseGuestSessionManager } from '@/lib/guest-session-supabase'

/**
 * React hook for managing guest user state with Supabase backend
 * Uses sessionStorage only for the session ID, all data stored in Supabase
 */
export function useSupabaseGuestSession() {
  const [session, setSession] = useState<GuestSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get session ID from sessionStorage (survives page refreshes but not browser restarts)
  const getSessionId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem('guest_session_id')
  }, [])

  // Set session ID in sessionStorage
  const setSessionId = useCallback((sessionId: string): void => {
    if (typeof window === 'undefined') return
    sessionStorage.setItem('guest_session_id', sessionId)
  }, [])

  // Clear session ID from sessionStorage
  const clearSessionId = useCallback((): void => {
    if (typeof window === 'undefined') return
    sessionStorage.removeItem('guest_session_id')
  }, [])

  // Initialize or restore guest session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true)
        
        // Try to get existing session ID
        const existingSessionId = getSessionId()
        let currentSession: GuestSession | null = null
        
        if (existingSessionId) {
          // Try to restore session from Supabase
          currentSession = await supabaseGuestSessionManager.getGuestSession(existingSessionId)
        }
        
        // If no valid session exists, create a new one
        if (!currentSession) {
          currentSession = await supabaseGuestSessionManager.createGuestSession()
          setSessionId(currentSession.id)
        }
        
        setSession(currentSession)
        setError(null)
      } catch (err) {
        console.error('Error initializing guest session:', err)
        setError('Failed to initialize guest session')
        // Clear any invalid session ID
        clearSessionId()
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()
  }, [getSessionId, setSessionId, clearSessionId])

  // Update session data
  const updateSession = useCallback(async (updates: Partial<GuestSession>): Promise<boolean> => {
    if (!session) return false

    try {
      const success = await supabaseGuestSessionManager.updateGuestSession(session.id, {
        ...session,
        ...updates,
        lastActiveAt: new Date().toISOString()
      })

      if (success) {
        setSession(prev => prev ? { ...prev, ...updates } : null)
      }

      return success
    } catch (error) {
      console.error('Error updating session:', error)
      return false
    }
  }, [session])

  // Update user data
  const updateUserData = useCallback(async (userData: Partial<GuestUserData>): Promise<boolean> => {
    if (!session) return false

    return updateSession({
      userData: { ...session.userData, ...userData }
    })
  }, [session, updateSession])

  // Add plan
  const addPlan = useCallback(async (plan: GuestPlan): Promise<boolean> => {
    if (!session) return false

    const updatedPlans = [...session.plans, plan]
    return updateSession({
      plans: updatedPlans,
      usage: {
        ...session.usage,
        plansCreated: session.usage.plansCreated + 1
      }
    })
  }, [session, updateSession])

  // Update plan
  const updatePlan = useCallback(async (planId: string, updates: Partial<GuestPlan>): Promise<boolean> => {
    if (!session) return false

    const updatedPlans = session.plans.map(plan =>
      plan.id === planId ? { ...plan, ...updates } : plan
    )

    return updateSession({ plans: updatedPlans })
  }, [session, updateSession])

  // Add flashcard
  const addFlashcard = useCallback(async (flashcard: GuestFlashcard): Promise<boolean> => {
    if (!session) return false

    const updatedFlashcards = [...session.flashcards, flashcard]
    return updateSession({
      flashcards: updatedFlashcards,
      usage: {
        ...session.usage,
        flashcardsCreated: session.usage.flashcardsCreated + 1
      }
    })
  }, [session, updateSession])

  // Update flashcard
  const updateFlashcard = useCallback(async (cardId: string, updates: Partial<GuestFlashcard>): Promise<boolean> => {
    if (!session) return false

    const updatedFlashcards = session.flashcards.map(card =>
      card.id === cardId ? { ...card, ...updates } : card
    )

    return updateSession({ flashcards: updatedFlashcards })
  }, [session, updateSession])

  // Clear session (for logout or reset)
  const clearSession = useCallback(async (): Promise<void> => {
    if (session) {
      await supabaseGuestSessionManager.deleteGuestSession(session.id)
    }
    clearSessionId()
    setSession(null)
  }, [session, clearSessionId])

  // Migrate to authenticated user
  const migrateToUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!session) return false

    try {
      const success = await supabaseGuestSessionManager.migrateToAuthenticatedUser(session.id, userId)
      if (success) {
        clearSessionId()
        setSession(null)
      }
      return success
    } catch (error) {
      console.error('Error migrating guest session:', error)
      return false
    }
  }, [session, clearSessionId])

  // Check if user is a guest
  const isGuest = session?.isGuest ?? false

  // Check if user is authenticated (for this hook, guests are considered "authenticated" locally)
  const isAuthenticated = session !== null

  // Get current usage limits
  const limits = supabaseGuestSessionManager.getCurrentLimits()
  const hasReachedLimits = session ? supabaseGuestSessionManager.hasReachedLimits(session) : false

  return {
    // Session state
    session,
    isLoading,
    error,
    isGuest,
    isAuthenticated,

    // Limits
    limits,
    hasReachedLimits,

    // Actions
    updateSession,
    updateUserData,
    addPlan,
    updatePlan,
    addFlashcard,
    updateFlashcard,
    clearSession,
    migrateToUser
  }
}

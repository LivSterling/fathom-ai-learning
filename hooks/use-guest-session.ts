import { useState, useEffect, useCallback } from 'react'
import { 
  GuestSession, 
  GuestUserData, 
  GuestPlan, 
  GuestFlashcard, 
  GuestLimits,
  UpgradePromptTrigger 
} from '@/types/guest'
import { guestSessionManager } from '@/lib/guest-session'

/**
 * React hook for managing guest user state and operations
 */
export function useGuestSession() {
  const [session, setSession] = useState<GuestSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize or restore guest session on mount
  useEffect(() => {
    try {
      setIsLoading(true)
      
      // Try to get existing session
      let currentSession = guestSessionManager.getCurrentSession()
      
      // If no session exists, create a new one
      if (!currentSession) {
        currentSession = guestSessionManager.initializeGuestSession()
      }
      
      setSession(currentSession)
      setError(null)
    } catch (err) {
      console.error('Error initializing guest session:', err)
      setError('Failed to initialize guest session')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Check if user is a guest
  const isGuest = session?.isGuest ?? false

  // Check if user is authenticated (for this hook, guests are considered "authenticated" locally)
  const isAuthenticated = session !== null

  // Get current usage limits
  const limits = guestSessionManager.getCurrentLimits()
  const hasReachedLimits = guestSessionManager.hasReachedLimits()

  // Add a new plan
  const addPlan = useCallback((plan: GuestPlan): boolean => {
    try {
      const success = guestSessionManager.addPlan(plan)
      if (success) {
        // Refresh session to get updated data
        const updatedSession = guestSessionManager.getCurrentSession()
        setSession(updatedSession)
      }
      return success
    } catch (err) {
      console.error('Error adding plan:', err)
      setError('Failed to add plan')
      return false
    }
  }, [])

  // Add a new flashcard
  const addFlashcard = useCallback((flashcard: GuestFlashcard): boolean => {
    try {
      const success = guestSessionManager.addFlashcard(flashcard)
      if (success) {
        // Refresh session to get updated data
        const updatedSession = guestSessionManager.getCurrentSession()
        setSession(updatedSession)
      }
      return success
    } catch (err) {
      console.error('Error adding flashcard:', err)
      setError('Failed to add flashcard')
      return false
    }
  }, [])

  // Complete a lesson
  const completeLesson = useCallback((planId: string, moduleId: string, lessonId: string): boolean => {
    try {
      const success = guestSessionManager.completeLesson(planId, moduleId, lessonId)
      if (success) {
        // Refresh session to get updated data
        const updatedSession = guestSessionManager.getCurrentSession()
        setSession(updatedSession)
      }
      return success
    } catch (err) {
      console.error('Error completing lesson:', err)
      setError('Failed to complete lesson')
      return false
    }
  }, [])

  // Update user data
  const updateUserData = useCallback((updater: (userData: GuestUserData) => GuestUserData): void => {
    try {
      guestSessionManager.updateUserData(updater)
      // Refresh session to get updated data
      const updatedSession = guestSessionManager.getCurrentSession()
      setSession(updatedSession)
      setError(null)
    } catch (err) {
      console.error('Error updating user data:', err)
      setError('Failed to update user data')
    }
  }, [])

  // Get all guest data for migration
  const getAllGuestData = useCallback((): GuestUserData | null => {
    try {
      return guestSessionManager.getAllGuestData()
    } catch (err) {
      console.error('Error getting guest data:', err)
      setError('Failed to get guest data')
      return null
    }
  }, [])

  // Clear guest session (for logout or upgrade)
  const clearSession = useCallback((): void => {
    try {
      guestSessionManager.clearSession()
      setSession(null)
      setError(null)
    } catch (err) {
      console.error('Error clearing session:', err)
      setError('Failed to clear session')
    }
  }, [])

  // Check if upgrade prompt should be shown
  const shouldShowUpgradePrompt = useCallback((trigger: UpgradePromptTrigger['type']): boolean => {
    if (!session) return false

    switch (trigger) {
      case 'first_lesson_complete':
        return session.userData.progress.completedLessons === 1
      
      case 'limit_reached':
        return hasReachedLimits.any
      
      case 'advanced_feature':
        // Show prompt when trying to access features that require account
        return true
      
      case 'time_based':
        // Show prompt after using the app for a certain time
        const sessionAge = Date.now() - new Date(session.createdAt).getTime()
        const oneDayMs = 24 * 60 * 60 * 1000
        return sessionAge > oneDayMs
      
      default:
        return false
    }
  }, [session, hasReachedLimits])

  // Get user progress summary
  const getProgressSummary = useCallback(() => {
    if (!session) return null

    const { progress } = session.userData
    const totalLessons = session.userData.plans.reduce((total, plan) => {
      return total + plan.modules.reduce((moduleTotal, module) => {
        return moduleTotal + module.lessons.length
      }, 0)
    }, 0)

    const completionRate = totalLessons > 0 ? (progress.completedLessons / totalLessons) * 100 : 0

    return {
      ...progress,
      totalLessons,
      completionRate: Math.round(completionRate)
    }
  }, [session])

  // Check if a specific limit is approaching (80% threshold)
  const isApproachingLimit = useCallback((type: keyof GuestLimits): boolean => {
    return limits.percentages[type] >= 80
  }, [limits])

  // Get remaining capacity for each limit type
  const getRemainingCapacity = useCallback(() => {
    return {
      flashcards: limits.max.maxFlashcards - limits.current.maxFlashcards,
      lessons: limits.max.maxLessons - limits.current.maxLessons,
      plans: limits.max.maxPlans - limits.current.maxPlans
    }
  }, [limits])

  // Refresh session data
  const refreshSession = useCallback((): void => {
    try {
      const currentSession = guestSessionManager.getCurrentSession()
      setSession(currentSession)
      setError(null)
    } catch (err) {
      console.error('Error refreshing session:', err)
      setError('Failed to refresh session')
    }
  }, [])

  return {
    // Session state
    session,
    isGuest,
    isAuthenticated,
    isLoading,
    error,

    // Limits and progress
    limits,
    hasReachedLimits,
    isApproachingLimit,
    getRemainingCapacity,
    getProgressSummary,

    // Actions
    addPlan,
    addFlashcard,
    completeLesson,
    updateUserData,
    getAllGuestData,
    clearSession,
    refreshSession,

    // Upgrade flow
    shouldShowUpgradePrompt,

    // Utility
    guestId: session?.id || null,
    userData: session?.userData || null
  }
}

export type UseGuestSessionReturn = ReturnType<typeof useGuestSession>

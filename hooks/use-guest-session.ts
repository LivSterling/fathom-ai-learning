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
import { guestAnalyticsTracker } from '@/lib/analytics/guest-events'

/**
 * React hook for managing guest user state and operations
 */
export function useGuestSession() {
  const [session, setSession] = useState<GuestSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize or restore guest session on mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true)
        
        // Try to get existing session
        let currentSession = guestSessionManager.getCurrentSession()
        const isNewSession = !currentSession
        
        // If no session exists, create a new one
        if (!currentSession) {
          currentSession = guestSessionManager.initializeGuestSession()
        }
        
        setSession(currentSession)
        setError(null)
        
        // Track session start for new sessions
        if (isNewSession && currentSession) {
          await guestAnalyticsTracker.trackGuestSessionStart(currentSession.id, {
            sessionAge: 0,
            totalSessions: 1
          })
        }
      } catch (err) {
        console.error('Error initializing guest session:', err)
        setError('Failed to initialize guest session')
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()
  }, [])

  // Check if user is a guest
  const isGuest = session?.isGuest ?? false

  // Check if user is authenticated (for this hook, guests are considered "authenticated" locally)
  const isAuthenticated = session !== null

  // Get current usage limits
  const limits = guestSessionManager.getCurrentLimits()
  const hasReachedLimits = guestSessionManager.hasReachedLimits()

  // Add a new plan
  const addPlan = useCallback(async (plan: GuestPlan): Promise<boolean> => {
    try {
      const success = guestSessionManager.addPlan(plan)
      if (success) {
        // Refresh session to get updated data
        const updatedSession = guestSessionManager.getCurrentSession()
        setSession(updatedSession)
        
        // Track content creation
        if (updatedSession) {
          await guestAnalyticsTracker.trackContentCreated(updatedSession.id, 'plan', {
            planId: plan.id,
            planTitle: plan.title,
            domain: plan.domain,
            moduleCount: plan.modules.length,
            totalLessons: plan.modules.reduce((sum, module) => sum + module.lessons.length, 0)
          })
        }
      }
      return success
    } catch (err) {
      console.error('Error adding plan:', err)
      setError('Failed to add plan')
      return false
    }
  }, [])

  // Add a new flashcard
  const addFlashcard = useCallback(async (flashcard: GuestFlashcard): Promise<boolean> => {
    try {
      const success = guestSessionManager.addFlashcard(flashcard)
      if (success) {
        // Refresh session to get updated data
        const updatedSession = guestSessionManager.getCurrentSession()
        setSession(updatedSession)
        
        // Track content creation
        if (updatedSession) {
          await guestAnalyticsTracker.trackContentCreated(updatedSession.id, 'flashcard', {
            flashcardId: flashcard.id,
            difficulty: flashcard.difficulty,
            tags: flashcard.tags,
            hasReviews: flashcard.reviewCount > 0
          })
        }
      }
      return success
    } catch (err) {
      console.error('Error adding flashcard:', err)
      setError('Failed to add flashcard')
      return false
    }
  }, [])

  // Complete a lesson
  const completeLesson = useCallback(async (planId: string, moduleId: string, lessonId: string): Promise<boolean> => {
    try {
      const success = guestSessionManager.completeLesson(planId, moduleId, lessonId)
      if (success) {
        // Refresh session to get updated data
        const updatedSession = guestSessionManager.getCurrentSession()
        setSession(updatedSession)
        
        // Track lesson completion
        if (updatedSession) {
          await guestAnalyticsTracker.trackLearningActivity(updatedSession.id, 'lesson_completed', {
            planId,
            moduleId,
            lessonId,
            totalCompletedLessons: updatedSession.userData.progress.completedLessons,
            studyStreak: updatedSession.userData.progress.streak
          })
        }
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
  const shouldShowUpgradePrompt = useCallback((trigger: UpgradePromptTrigger): boolean => {
    if (!session) return false

    // Check if this prompt was recently dismissed
    const dismissalKey = `upgrade-prompt-dismissed-${trigger}`
    const dismissedAt = localStorage.getItem(dismissalKey)
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt)
      const hoursSinceDismissal = (Date.now() - dismissedTime) / (1000 * 60 * 60)
      
      // Don't show again for different time periods based on trigger
      const cooldownHours = {
        'first_lesson_complete': 24, // 1 day
        'approaching_limits': 4,     // 4 hours
        'limit_reached': 1,          // 1 hour (more urgent)
        'advanced_feature_access': 8, // 8 hours
        'time_based': 48,            // 2 days
        'engagement_milestone': 12   // 12 hours
      }
      
      if (hoursSinceDismissal < cooldownHours[trigger]) {
        return false
      }
    }

    switch (trigger) {
      case 'first_lesson_complete':
        return session.userData.progress.completedLessons === 1
      
      case 'approaching_limits':
        // Show when any limit reaches 80%
        return limits.percentages.maxFlashcards >= 80 || 
               limits.percentages.maxLessons >= 80 || 
               limits.percentages.maxPlans >= 80
      
      case 'limit_reached':
        return hasReachedLimits.any
      
      case 'advanced_feature_access':
        // This will be triggered programmatically when user tries to access premium features
        return true
      
      case 'time_based':
        // Show prompt after using the app for 3+ days
        const sessionAge = Date.now() - new Date(session.createdAt).getTime()
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000
        return sessionAge > threeDaysMs
      
      case 'engagement_milestone':
        // Show after completing 5+ lessons or creating 20+ flashcards
        return session.userData.progress.completedLessons >= 5 || 
               session.userData.flashcards.length >= 20
      
      default:
        return false
    }
  }, [session, hasReachedLimits, limits])

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

import { 
  GuestSession, 
  GuestUserData, 
  GuestProgress, 
  GuestPreferences,
  GuestPlan,
  GuestFlashcard,
  GuestLimits,
  GUEST_LIMITS,
  GUEST_STORAGE_KEYS,
  GuestAnalyticsEvent
} from '@/types/guest'

/**
 * Core guest session management utilities and local storage operations
 */
export class GuestSessionManager {
  private static instance: GuestSessionManager
  
  static getInstance(): GuestSessionManager {
    if (!GuestSessionManager.instance) {
      GuestSessionManager.instance = new GuestSessionManager()
    }
    return GuestSessionManager.instance
  }

  /**
   * Generate a unique guest user ID
   */
  generateGuestId(): string {
    const timestamp = Date.now().toString(36)
    const randomStr = Math.random().toString(36).substring(2, 15)
    return `guest_${timestamp}_${randomStr}`
  }

  /**
   * Initialize a new guest session
   */
  initializeGuestSession(): GuestSession {
    const guestId = this.generateGuestId()
    const now = new Date().toISOString()
    
    const session: GuestSession = {
      id: guestId,
      createdAt: now,
      lastActiveAt: now,
      isGuest: true,
      userData: this.getDefaultUserData()
    }

    this.saveSession(session)
    this.trackEvent({
      eventType: 'guest_session_start',
      guestId,
      timestamp: now
    })

    return session
  }

  /**
   * Get current guest session from local storage
   */
  getCurrentSession(): GuestSession | null {
    try {
      const sessionData = localStorage.getItem(GUEST_STORAGE_KEYS.SESSION)
      if (!sessionData) return null

      const session: GuestSession = JSON.parse(sessionData)
      
      // Validate session structure
      if (!this.isValidSession(session)) {
        this.clearSession()
        return null
      }

      // Update last active time
      session.lastActiveAt = new Date().toISOString()
      this.saveSession(session)

      return session
    } catch (error) {
      console.error('Error retrieving guest session:', error)
      this.clearSession()
      return null
    }
  }

  /**
   * Save session to local storage
   */
  saveSession(session: GuestSession): void {
    try {
      localStorage.setItem(GUEST_STORAGE_KEYS.SESSION, JSON.stringify(session))
    } catch (error) {
      console.error('Error saving guest session:', error)
      // Handle storage quota exceeded
      if (error instanceof DOMException && error.code === 22) {
        this.cleanupOldData()
        // Try saving again after cleanup
        try {
          localStorage.setItem(GUEST_STORAGE_KEYS.SESSION, JSON.stringify(session))
        } catch (retryError) {
          console.error('Failed to save session after cleanup:', retryError)
        }
      }
    }
  }

  /**
   * Update user data in current session
   */
  updateUserData(updater: (userData: GuestUserData) => GuestUserData): void {
    const session = this.getCurrentSession()
    if (!session) return

    session.userData = updater(session.userData)
    session.lastActiveAt = new Date().toISOString()
    this.saveSession(session)
  }

  /**
   * Add a new plan to guest data
   */
  addPlan(plan: GuestPlan): boolean {
    const session = this.getCurrentSession()
    if (!session) return false

    // Check limits
    if (session.userData.plans.length >= GUEST_LIMITS.maxPlans) {
      return false
    }

    session.userData.plans.push(plan)
    session.userData.progress.totalPlans = session.userData.plans.length
    session.lastActiveAt = new Date().toISOString()
    
    this.saveSession(session)
    this.trackEvent({
      eventType: 'content_created',
      guestId: session.id,
      timestamp: new Date().toISOString(),
      metadata: { contentType: 'plan', planId: plan.id }
    })

    return true
  }

  /**
   * Add a new flashcard to guest data
   */
  addFlashcard(flashcard: GuestFlashcard): boolean {
    const session = this.getCurrentSession()
    if (!session) return false

    // Check limits
    if (session.userData.flashcards.length >= GUEST_LIMITS.maxFlashcards) {
      return false
    }

    session.userData.flashcards.push(flashcard)
    session.userData.progress.totalFlashcards = session.userData.flashcards.length
    session.lastActiveAt = new Date().toISOString()
    
    this.saveSession(session)
    this.trackEvent({
      eventType: 'content_created',
      guestId: session.id,
      timestamp: new Date().toISOString(),
      metadata: { contentType: 'flashcard', flashcardId: flashcard.id }
    })

    return true
  }

  /**
   * Mark a lesson as completed
   */
  completeLesson(planId: string, moduleId: string, lessonId: string): boolean {
    const session = this.getCurrentSession()
    if (!session) return false

    const plan = session.userData.plans.find(p => p.id === planId)
    if (!plan) return false

    const module = plan.modules.find(m => m.id === moduleId)
    if (!module) return false

    const lesson = module.lessons.find(l => l.id === lessonId)
    if (!lesson) return false

    lesson.completed = true
    lesson.completedAt = new Date().toISOString()
    
    // Update progress
    session.userData.progress.completedLessons = this.countCompletedLessons(session.userData)
    session.lastActiveAt = new Date().toISOString()
    
    this.saveSession(session)
    this.trackEvent({
      eventType: 'lesson_completed',
      guestId: session.id,
      timestamp: new Date().toISOString(),
      metadata: { planId, moduleId, lessonId }
    })

    return true
  }

  /**
   * Get current usage against limits
   */
  getCurrentLimits(): { current: GuestLimits; max: GuestLimits; percentages: GuestLimits } {
    const session = this.getCurrentSession()
    if (!session) {
      return {
        current: { maxFlashcards: 0, maxLessons: 0, maxPlans: 0 },
        max: GUEST_LIMITS,
        percentages: { maxFlashcards: 0, maxLessons: 0, maxPlans: 0 }
      }
    }

    const current = {
      maxFlashcards: session.userData.flashcards.length,
      maxLessons: this.countTotalLessons(session.userData),
      maxPlans: session.userData.plans.length
    }

    const percentages = {
      maxFlashcards: Math.round((current.maxFlashcards / GUEST_LIMITS.maxFlashcards) * 100),
      maxLessons: Math.round((current.maxLessons / GUEST_LIMITS.maxLessons) * 100),
      maxPlans: Math.round((current.maxPlans / GUEST_LIMITS.maxPlans) * 100)
    }

    return { current, max: GUEST_LIMITS, percentages }
  }

  /**
   * Check if any limits are reached
   */
  hasReachedLimits(): { flashcards: boolean; lessons: boolean; plans: boolean; any: boolean } {
    const { current, max } = this.getCurrentLimits()
    
    const limits = {
      flashcards: current.maxFlashcards >= max.maxFlashcards,
      lessons: current.maxLessons >= max.maxLessons,
      plans: current.maxPlans >= max.maxPlans
    }

    return {
      ...limits,
      any: limits.flashcards || limits.lessons || limits.plans
    }
  }

  /**
   * Clear guest session and all data
   */
  clearSession(): void {
    try {
      localStorage.removeItem(GUEST_STORAGE_KEYS.SESSION)
      localStorage.removeItem(GUEST_STORAGE_KEYS.USER_DATA)
      localStorage.removeItem(GUEST_STORAGE_KEYS.PREFERENCES)
      localStorage.removeItem(GUEST_STORAGE_KEYS.ANALYTICS)
    } catch (error) {
      console.error('Error clearing guest session:', error)
    }
  }

  /**
   * Get all guest data for migration
   */
  getAllGuestData(): GuestUserData | null {
    const session = this.getCurrentSession()
    return session?.userData || null
  }

  /**
   * Track analytics event
   */
  private trackEvent(event: GuestAnalyticsEvent): void {
    try {
      const existingEvents = localStorage.getItem(GUEST_STORAGE_KEYS.ANALYTICS)
      const events: GuestAnalyticsEvent[] = existingEvents ? JSON.parse(existingEvents) : []
      
      events.push(event)
      
      // Keep only last 100 events to manage storage
      const recentEvents = events.slice(-100)
      
      localStorage.setItem(GUEST_STORAGE_KEYS.ANALYTICS, JSON.stringify(recentEvents))
    } catch (error) {
      console.error('Error tracking guest event:', error)
    }
  }

  /**
   * Get default user data structure
   */
  private getDefaultUserData(): GuestUserData {
    return {
      plans: [],
      flashcards: [],
      progress: {
        totalPlans: 0,
        totalLessons: 0,
        totalFlashcards: 0,
        completedLessons: 0,
        studyMinutes: 0,
        streak: 0
      },
      preferences: {
        theme: 'system',
        notifications: true,
        soundEffects: true
      }
    }
  }

  /**
   * Validate session structure
   */
  private isValidSession(session: any): session is GuestSession {
    return (
      session &&
      typeof session.id === 'string' &&
      typeof session.createdAt === 'string' &&
      typeof session.lastActiveAt === 'string' &&
      session.isGuest === true &&
      session.userData &&
      Array.isArray(session.userData.plans) &&
      Array.isArray(session.userData.flashcards) &&
      session.userData.progress &&
      session.userData.preferences
    )
  }

  /**
   * Count total lessons across all plans
   */
  private countTotalLessons(userData: GuestUserData): number {
    return userData.plans.reduce((total, plan) => {
      return total + plan.modules.reduce((moduleTotal, module) => {
        return moduleTotal + module.lessons.length
      }, 0)
    }, 0)
  }

  /**
   * Count completed lessons across all plans
   */
  private countCompletedLessons(userData: GuestUserData): number {
    return userData.plans.reduce((total, plan) => {
      return total + plan.modules.reduce((moduleTotal, module) => {
        return moduleTotal + module.lessons.filter(lesson => lesson.completed).length
      }, 0)
    }, 0)
  }

  /**
   * Clean up old data to free storage space
   */
  private cleanupOldData(): void {
    try {
      // Remove old analytics events
      const events = localStorage.getItem(GUEST_STORAGE_KEYS.ANALYTICS)
      if (events) {
        const parsedEvents: GuestAnalyticsEvent[] = JSON.parse(events)
        const recentEvents = parsedEvents.slice(-50) // Keep only 50 most recent
        localStorage.setItem(GUEST_STORAGE_KEYS.ANALYTICS, JSON.stringify(recentEvents))
      }
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }
}

// Export singleton instance
export const guestSessionManager = GuestSessionManager.getInstance()

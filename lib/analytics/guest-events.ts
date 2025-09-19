import { GuestAnalyticsEvent, GuestSession } from '@/types/guest'
import { supabaseGuestManager } from '@/lib/supabase'

export type ConversionFunnelEvent = 
  | 'guest_session_start'
  | 'content_created'
  | 'upgrade_prompt_shown'
  | 'upgrade_prompt_clicked'
  | 'upgrade_prompt_dismissed'
  | 'upgrade_flow_started'
  | 'account_creation_attempted'
  | 'account_creation_completed'
  | 'data_migration_started'
  | 'data_migration_completed'
  | 'conversion_completed'
  | 'lesson_completed'
  | 'flashcard_reviewed'
  | 'plan_created'
  | 'limit_reached'
  | 'advanced_feature_attempted'

export interface ConversionFunnelData {
  event: ConversionFunnelEvent
  guestId: string
  sessionId?: string
  timestamp: string
  properties: {
    // Session context
    sessionAge?: number // days since guest account created
    totalSessions?: number
    
    // User behavior
    completedLessons?: number
    totalFlashcards?: number
    totalPlans?: number
    studyStreak?: number
    studyMinutes?: number
    
    // Conversion funnel specific
    promptTrigger?: string
    promptVariant?: string
    abTestVariant?: string
    upgradeReason?: string
    migrationDuration?: number
    migrationSuccess?: boolean
    
    // Performance metrics
    pageLoadTime?: number
    actionDuration?: number
    errorMessage?: string
    
    // Context
    currentPage?: string
    referrer?: string
    userAgent?: string
    deviceType?: 'mobile' | 'tablet' | 'desktop'
    
    // Engagement metrics
    timeOnPage?: number
    clickDepth?: number
    scrollDepth?: number
  }
}

/**
 * Comprehensive analytics system for tracking guest user conversion funnel
 * Provides detailed insights into user behavior, conversion rates, and optimization opportunities
 */
export class GuestAnalyticsTracker {
  private static instance: GuestAnalyticsTracker
  private eventQueue: ConversionFunnelData[] = []
  private sessionStartTime: number = Date.now()
  private pageStartTime: number = Date.now()
  private isOnline: boolean = navigator.onlineStatus !== false

  static getInstance(): GuestAnalyticsTracker {
    if (!GuestAnalyticsTracker.instance) {
      GuestAnalyticsTracker.instance = new GuestAnalyticsTracker()
    }
    return GuestAnalyticsTracker.instance
  }

  constructor() {
    this.setupEventListeners()
    this.loadQueuedEvents()
  }

  /**
   * Track a conversion funnel event
   */
  async trackEvent(
    event: ConversionFunnelEvent, 
    guestId: string, 
    additionalProperties: Partial<ConversionFunnelData['properties']> = {}
  ): Promise<void> {
    try {
      const eventData: ConversionFunnelData = {
        event,
        guestId,
        sessionId: this.generateSessionId(),
        timestamp: new Date().toISOString(),
        properties: {
          ...this.getBaseProperties(),
          ...additionalProperties
        }
      }

      // Add to queue for batch processing
      this.eventQueue.push(eventData)

      // Try to send immediately if online
      if (this.isOnline) {
        await this.flushEvents()
      }

      // Store locally as backup
      this.persistEventLocally(eventData)

      console.log('Analytics Event Tracked:', eventData)
    } catch (error) {
      console.error('Failed to track analytics event:', error)
    }
  }

  /**
   * Track guest session initiation
   */
  async trackGuestSessionStart(guestId: string, sessionData?: any): Promise<void> {
    await this.trackEvent('guest_session_start', guestId, {
      sessionAge: 0,
      totalSessions: 1,
      currentPage: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      deviceType: this.getDeviceType(),
      ...sessionData
    })
  }

  /**
   * Track content creation events
   */
  async trackContentCreated(
    guestId: string, 
    contentType: 'plan' | 'lesson' | 'flashcard',
    contentData?: any
  ): Promise<void> {
    await this.trackEvent('content_created', guestId, {
      contentType,
      currentPage: window.location.pathname,
      timeOnPage: Date.now() - this.pageStartTime,
      ...contentData
    })
  }

  /**
   * Track upgrade prompt interactions
   */
  async trackUpgradePrompt(
    guestId: string,
    action: 'shown' | 'clicked' | 'dismissed',
    promptData: {
      trigger: string
      variant?: string
      abTestVariant?: string
      message?: string
    }
  ): Promise<void> {
    const eventMap = {
      shown: 'upgrade_prompt_shown' as ConversionFunnelEvent,
      clicked: 'upgrade_prompt_clicked' as ConversionFunnelEvent,
      dismissed: 'upgrade_prompt_dismissed' as ConversionFunnelEvent
    }

    await this.trackEvent(eventMap[action], guestId, {
      promptTrigger: promptData.trigger,
      promptVariant: promptData.variant,
      abTestVariant: promptData.abTestVariant,
      currentPage: window.location.pathname,
      timeOnPage: Date.now() - this.pageStartTime
    })
  }

  /**
   * Track upgrade flow progression
   */
  async trackUpgradeFlow(
    guestId: string,
    stage: 'started' | 'account_attempted' | 'account_completed' | 'migration_started' | 'migration_completed' | 'completed',
    flowData?: any
  ): Promise<void> {
    const eventMap = {
      started: 'upgrade_flow_started',
      account_attempted: 'account_creation_attempted',
      account_completed: 'account_creation_completed',
      migration_started: 'data_migration_started',
      migration_completed: 'data_migration_completed',
      completed: 'conversion_completed'
    } as const

    await this.trackEvent(eventMap[stage], guestId, {
      upgradeReason: flowData?.reason,
      migrationDuration: flowData?.duration,
      migrationSuccess: flowData?.success,
      errorMessage: flowData?.error,
      currentPage: window.location.pathname
    })
  }

  /**
   * Track learning activity
   */
  async trackLearningActivity(
    guestId: string,
    activity: 'lesson_completed' | 'flashcard_reviewed' | 'plan_created',
    activityData?: any
  ): Promise<void> {
    await this.trackEvent(activity, guestId, {
      currentPage: window.location.pathname,
      timeOnPage: Date.now() - this.pageStartTime,
      ...activityData
    })
  }

  /**
   * Track limit-related events
   */
  async trackLimitEvent(
    guestId: string,
    limitType: 'flashcard' | 'lesson' | 'plan',
    limitData?: any
  ): Promise<void> {
    await this.trackEvent('limit_reached', guestId, {
      limitType,
      currentUsage: limitData?.current,
      maxAllowed: limitData?.max,
      currentPage: window.location.pathname
    })
  }

  /**
   * Track advanced feature access attempts
   */
  async trackAdvancedFeatureAttempt(
    guestId: string,
    feature: string,
    featureData?: any
  ): Promise<void> {
    await this.trackEvent('advanced_feature_attempted', guestId, {
      featureName: feature,
      currentPage: window.location.pathname,
      ...featureData
    })
  }

  /**
   * Get conversion funnel analytics
   */
  async getConversionFunnelAnalytics(guestId?: string): Promise<{
    funnelSteps: Record<ConversionFunnelEvent, number>
    conversionRates: Record<string, number>
    dropoffPoints: Array<{ step: string; dropoffRate: number }>
    avgTimeToConvert: number
  }> {
    try {
      const events = await this.getStoredEvents(guestId)
      
      // Count events by type
      const funnelSteps: Record<ConversionFunnelEvent, number> = {} as any
      events.forEach(event => {
        funnelSteps[event.event] = (funnelSteps[event.event] || 0) + 1
      })

      // Calculate conversion rates
      const totalSessions = funnelSteps.guest_session_start || 0
      const conversionRates = {
        promptShownRate: ((funnelSteps.upgrade_prompt_shown || 0) / totalSessions) * 100,
        promptClickRate: ((funnelSteps.upgrade_prompt_clicked || 0) / (funnelSteps.upgrade_prompt_shown || 1)) * 100,
        upgradeStartRate: ((funnelSteps.upgrade_flow_started || 0) / (funnelSteps.upgrade_prompt_clicked || 1)) * 100,
        accountCreationRate: ((funnelSteps.account_creation_completed || 0) / (funnelSteps.account_creation_attempted || 1)) * 100,
        migrationSuccessRate: ((funnelSteps.data_migration_completed || 0) / (funnelSteps.data_migration_started || 1)) * 100,
        overallConversionRate: ((funnelSteps.conversion_completed || 0) / totalSessions) * 100
      }

      // Calculate dropoff points
      const funnelOrder: ConversionFunnelEvent[] = [
        'guest_session_start',
        'upgrade_prompt_shown',
        'upgrade_prompt_clicked',
        'upgrade_flow_started',
        'account_creation_attempted',
        'account_creation_completed',
        'data_migration_started',
        'data_migration_completed',
        'conversion_completed'
      ]

      const dropoffPoints = funnelOrder.slice(0, -1).map((step, index) => {
        const currentCount = funnelSteps[step] || 0
        const nextCount = funnelSteps[funnelOrder[index + 1]] || 0
        const dropoffRate = currentCount > 0 ? ((currentCount - nextCount) / currentCount) * 100 : 0
        
        return {
          step,
          dropoffRate
        }
      })

      // Calculate average time to convert
      const conversionEvents = events.filter(e => e.event === 'conversion_completed')
      const avgTimeToConvert = conversionEvents.length > 0 
        ? conversionEvents.reduce((sum, event) => {
            const sessionStartEvent = events.find(e => 
              e.guestId === event.guestId && e.event === 'guest_session_start'
            )
            if (sessionStartEvent) {
              const timeDiff = new Date(event.timestamp).getTime() - new Date(sessionStartEvent.timestamp).getTime()
              return sum + timeDiff
            }
            return sum
          }, 0) / conversionEvents.length
        : 0

      return {
        funnelSteps,
        conversionRates,
        dropoffPoints,
        avgTimeToConvert
      }
    } catch (error) {
      console.error('Failed to get conversion funnel analytics:', error)
      return {
        funnelSteps: {} as any,
        conversionRates: {},
        dropoffPoints: [],
        avgTimeToConvert: 0
      }
    }
  }

  /**
   * Get base properties for all events
   */
  private getBaseProperties(): Partial<ConversionFunnelData['properties']> {
    return {
      sessionAge: Math.floor((Date.now() - this.sessionStartTime) / (1000 * 60 * 60 * 24)),
      currentPage: window.location.pathname,
      userAgent: navigator.userAgent,
      deviceType: this.getDeviceType(),
      pageLoadTime: Date.now() - this.pageStartTime
    }
  }

  /**
   * Determine device type based on user agent
   */
  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const userAgent = navigator.userAgent.toLowerCase()
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/.test(userAgent)) {
      return 'mobile'
    } else if (/tablet|ipad|playbook|silk/.test(userAgent)) {
      return 'tablet'
    }
    return 'desktop'
  }

  /**
   * Generate a session ID for tracking
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Setup event listeners for automatic tracking
   */
  private setupEventListeners(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.pageStartTime = Date.now()
      }
    })

    // Track online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true
      this.flushEvents()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.flushEvents()
    })
  }

  /**
   * Flush queued events to the server
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return

    try {
      const eventsToSend = [...this.eventQueue]
      this.eventQueue = []

      // Send to Supabase
      for (const eventData of eventsToSend) {
        await supabaseGuestManager.trackGuestEvent(
          eventData.guestId,
          eventData.event,
          {
            ...eventData.properties,
            timestamp: eventData.timestamp,
            sessionId: eventData.sessionId
          },
          eventData.sessionId
        )
      }

      // Clear from local storage after successful send
      this.clearLocalEvents(eventsToSend.map(e => e.timestamp))
    } catch (error) {
      console.error('Failed to flush events:', error)
      // Re-add events to queue for retry
      this.eventQueue.unshift(...this.eventQueue)
    }
  }

  /**
   * Persist event locally for offline support
   */
  private persistEventLocally(event: ConversionFunnelData): void {
    try {
      const key = 'fathom_guest_analytics_queue'
      const existingEvents = JSON.parse(localStorage.getItem(key) || '[]')
      existingEvents.push(event)
      
      // Keep only last 1000 events to prevent storage bloat
      if (existingEvents.length > 1000) {
        existingEvents.splice(0, existingEvents.length - 1000)
      }
      
      localStorage.setItem(key, JSON.stringify(existingEvents))
    } catch (error) {
      console.error('Failed to persist event locally:', error)
    }
  }

  /**
   * Load queued events from local storage
   */
  private loadQueuedEvents(): void {
    try {
      const key = 'fathom_guest_analytics_queue'
      const queuedEvents = JSON.parse(localStorage.getItem(key) || '[]')
      this.eventQueue.push(...queuedEvents)
    } catch (error) {
      console.error('Failed to load queued events:', error)
    }
  }

  /**
   * Get stored events for analysis
   */
  private async getStoredEvents(guestId?: string): Promise<ConversionFunnelData[]> {
    try {
      // Get from local storage
      const localEvents = JSON.parse(localStorage.getItem('fathom_guest_analytics_queue') || '[]')
      
      // Filter by guest ID if provided
      if (guestId) {
        return localEvents.filter((event: ConversionFunnelData) => event.guestId === guestId)
      }
      
      return localEvents
    } catch (error) {
      console.error('Failed to get stored events:', error)
      return []
    }
  }

  /**
   * Clear local events after successful send
   */
  private clearLocalEvents(timestamps: string[]): void {
    try {
      const key = 'fathom_guest_analytics_queue'
      const existingEvents = JSON.parse(localStorage.getItem(key) || '[]')
      const filteredEvents = existingEvents.filter(
        (event: ConversionFunnelData) => !timestamps.includes(event.timestamp)
      )
      localStorage.setItem(key, JSON.stringify(filteredEvents))
    } catch (error) {
      console.error('Failed to clear local events:', error)
    }
  }
}

// Export singleton instance
export const guestAnalyticsTracker = GuestAnalyticsTracker.getInstance()

/**
 * React hook for easy analytics tracking in components
 */
export function useGuestAnalytics(guestId?: string) {
  const trackEvent = async (
    event: ConversionFunnelEvent,
    properties?: Partial<ConversionFunnelData['properties']>
  ) => {
    if (guestId) {
      await guestAnalyticsTracker.trackEvent(event, guestId, properties)
    }
  }

  const trackUpgradePrompt = async (
    action: 'shown' | 'clicked' | 'dismissed',
    promptData: Parameters<typeof guestAnalyticsTracker.trackUpgradePrompt>[2]
  ) => {
    if (guestId) {
      await guestAnalyticsTracker.trackUpgradePrompt(guestId, action, promptData)
    }
  }

  const trackContentCreated = async (
    contentType: 'plan' | 'lesson' | 'flashcard',
    contentData?: any
  ) => {
    if (guestId) {
      await guestAnalyticsTracker.trackContentCreated(guestId, contentType, contentData)
    }
  }

  const trackLearningActivity = async (
    activity: 'lesson_completed' | 'flashcard_reviewed' | 'plan_created',
    activityData?: any
  ) => {
    if (guestId) {
      await guestAnalyticsTracker.trackLearningActivity(guestId, activity, activityData)
    }
  }

  return {
    trackEvent,
    trackUpgradePrompt,
    trackContentCreated,
    trackLearningActivity,
    getAnalytics: () => guestAnalyticsTracker.getConversionFunnelAnalytics(guestId)
  }
}

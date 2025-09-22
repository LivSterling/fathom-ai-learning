/**
 * Concept Intake Analytics Service
 * Handles tracking and monitoring of user interactions with the concept-first intake feature
 */

import { 
  ConceptIntakeAnalyticsEvent, 
  AnalyticsService, 
  AnalyticsConfig, 
  EventQueue,
  BaseAnalyticsEvent,
  DeviceInfo,
  EventBuilder,
  EventType,
  EventData
} from '@/types/concept-intake'

// Default configuration
const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  bufferSize: 50,
  flushInterval: 30000, // 30 seconds
  debug: process.env.NODE_ENV === 'development',
  enabledEvents: [
    'concept_input',
    'concept_chip_interaction', 
    'file_upload',
    'url_processing',
    'api_performance',
    'flow_step',
    'onboarding_completion',
    'concept_processing',
    'error'
  ],
  sampling: {
    enabled: false,
    rate: 1.0
  },
  privacy: {
    anonymizeIPs: true,
    respectDoNotTrack: true,
    cookieConsent: true
  }
}

/**
 * Event Queue Implementation
 */
class ConceptIntakeEventQueue implements EventQueue {
  public events: ConceptIntakeAnalyticsEvent[] = []
  private flushTimer?: NodeJS.Timeout

  constructor(
    public maxSize: number = 50,
    public flushInterval: number = 30000,
    private flushCallback: (events: ConceptIntakeAnalyticsEvent[]) => Promise<void>
  ) {
    this.startFlushTimer()
  }

  add(event: ConceptIntakeAnalyticsEvent): void {
    this.events.push(event)
    
    if (this.events.length >= this.maxSize) {
      this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.events.length === 0) return

    const eventsToFlush = [...this.events]
    this.events = []

    try {
      await this.flushCallback(eventsToFlush)
    } catch (error) {
      console.error('Failed to flush analytics events:', error)
      // Re-add events to queue for retry (up to a limit)
      if (eventsToFlush.length < 100) {
        this.events.unshift(...eventsToFlush)
      }
    }
  }

  size(): number {
    return this.events.length
  }

  clear(): void {
    this.events = []
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.clear()
  }
}

/**
 * Main Analytics Service
 */
export class ConceptIntakeAnalyticsService implements AnalyticsService {
  private config: AnalyticsConfig
  private eventQueue: ConceptIntakeEventQueue
  private sessionId: string
  private userId?: string
  private deviceInfo: DeviceInfo

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.sessionId = this.generateSessionId()
    this.deviceInfo = this.getDeviceInfo()
    
    this.eventQueue = new ConceptIntakeEventQueue(
      this.config.bufferSize,
      this.config.flushInterval,
      this.sendEvents.bind(this)
    )

    // Initialize session tracking only in browser environment
    if (typeof window !== 'undefined') {
      this.trackPageView('concept-intake-onboarding')
    }
  }

  async track(event: ConceptIntakeAnalyticsEvent): Promise<void> {
    if (!this.config.enabled) return
    if (!this.config.enabledEvents.includes(event.eventType)) return
    if (this.shouldSkipDueToSampling()) return
    if (this.shouldRespectDoNotTrack()) return

    // Enrich event with base information
    const enrichedEvent: ConceptIntakeAnalyticsEvent = {
      ...event,
      eventId: event.eventId || this.generateEventId(),
      timestamp: event.timestamp || new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      device: this.deviceInfo
    }

    if (this.config.debug) {
      console.log('[Analytics] Tracking event:', enrichedEvent)
    }

    this.eventQueue.add(enrichedEvent)
  }

  async identify(userId: string, properties?: Record<string, any>): Promise<void> {
    this.userId = userId
    
    if (this.config.debug) {
      console.log('[Analytics] User identified:', userId, properties)
    }

    // Track identification event
    await this.track({
      eventType: 'engagement',
      eventId: this.generateEventId(),
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId,
      device: this.deviceInfo,
      data: {
        action: 'click',
        element: 'user_identification',
        timeSpent: 0,
        interactionCount: 1,
        bounced: false
      }
    })
  }

  async page(pageName: string, properties?: Record<string, any>): Promise<void> {
    if (this.config.debug) {
      console.log('[Analytics] Page view:', pageName, properties)
    }

    await this.track({
      eventType: 'flow_step',
      eventId: this.generateEventId(),
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      device: this.deviceInfo,
      data: {
        step: pageName as any,
        action: 'enter',
        timeOnStep: 0
      }
    })
  }

  async flush(): Promise<void> {
    await this.eventQueue.flush()
  }

  // Event builder helpers
  createConceptInputEvent = (data: EventData<'concept_input'>): void => {
    this.track({
      eventType: 'concept_input',
      eventId: this.generateEventId(),
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      device: this.deviceInfo,
      data
    })
  }

  createChipInteractionEvent = (data: EventData<'concept_chip_interaction'>): void => {
    this.track({
      eventType: 'concept_chip_interaction',
      eventId: this.generateEventId(),
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      device: this.deviceInfo,
      data
    })
  }

  createFileUploadEvent = (data: EventData<'file_upload'>): void => {
    this.track({
      eventType: 'file_upload',
      eventId: this.generateEventId(),
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      device: this.deviceInfo,
      data
    })
  }

  createAPIPerformanceEvent = (data: EventData<'api_performance'>): void => {
    this.track({
      eventType: 'api_performance',
      eventId: this.generateEventId(),
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      device: this.deviceInfo,
      data
    })
  }

  createFlowStepEvent = (data: EventData<'flow_step'>): void => {
    this.track({
      eventType: 'flow_step',
      eventId: this.generateEventId(),
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      device: this.deviceInfo,
      data
    })
  }

  createErrorEvent = (data: EventData<'error'>): void => {
    this.track({
      eventType: 'error',
      eventId: this.generateEventId(),
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      device: this.deviceInfo,
      data
    })
  }

  // Performance tracking helpers
  async trackAPICall<T>(
    apiCall: () => Promise<T>,
    endpoint: string,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<T> {
    const startTime = performance.now()
    let success = false
    let statusCode = 0
    let errorCode: string | undefined
    let responseSize = 0

    try {
      const result = await apiCall()
      success = true
      statusCode = 200
      
      // Estimate response size (rough approximation)
      responseSize = JSON.stringify(result).length
      
      return result
    } catch (error) {
      statusCode = error instanceof Error && 'status' in error ? (error as any).status : 500
      errorCode = error instanceof Error ? error.message : 'Unknown error'
      throw error
    } finally {
      const responseTime = performance.now() - startTime
      
      this.createAPIPerformanceEvent({
        endpoint: endpoint as any,
        method,
        requestSize: 0, // Could be calculated if needed
        responseSize,
        responseTime,
        statusCode,
        success,
        errorCode,
        cached: false, // Could be determined from response headers
        retryCount: 0
      })
    }
  }

  // Utility methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getDeviceInfo(): DeviceInfo {
    // Return default values for SSR
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        type: 'desktop',
        os: 'Unknown',
        browser: 'Unknown',
        screenResolution: '1920x1080',
        viewportSize: '1920x1080'
      }
    }

    const userAgent = navigator.userAgent
    const screen = window.screen
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    return {
      type: this.getDeviceType(),
      os: this.getOS(userAgent),
      browser: this.getBrowser(userAgent),
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${viewport.width}x${viewport.height}`
    }
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop'
    
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  private getOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows'
    if (userAgent.includes('Mac')) return 'macOS'
    if (userAgent.includes('Linux')) return 'Linux'
    if (userAgent.includes('Android')) return 'Android'
    if (userAgent.includes('iOS')) return 'iOS'
    return 'Unknown'
  }

  private getBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    return 'Unknown'
  }

  private shouldSkipDueToSampling(): boolean {
    if (!this.config.sampling.enabled) return false
    return Math.random() > this.config.sampling.rate
  }

  private shouldRespectDoNotTrack(): boolean {
    if (!this.config.privacy.respectDoNotTrack) return false
    if (typeof navigator === 'undefined') return false
    return navigator.doNotTrack === '1'
  }

  private async sendEvents(events: ConceptIntakeAnalyticsEvent[]): Promise<void> {
    if (this.config.debug) {
      console.log('[Analytics] Sending events batch:', events.length)
    }

    // In a real implementation, this would send to your analytics service
    // For now, we'll log to console and could send to a custom endpoint
    
    if (this.config.apiEndpoint) {
      try {
        await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          },
          body: JSON.stringify({
            events,
            sessionId: this.sessionId,
            userId: this.userId
          })
        })
      } catch (error) {
        console.error('Failed to send analytics events:', error)
        throw error
      }
    } else {
      // Development logging
      console.log('[Analytics] Events batch:', events)
    }
  }

  private trackPageView(pageName: string): void {
    this.createFlowStepEvent({
      step: 'concept_input',
      action: 'enter',
      timeOnStep: 0
    })
  }

  // Cleanup method
  destroy(): void {
    this.eventQueue.destroy()
  }
}

// Singleton instance
export const conceptIntakeAnalytics = new ConceptIntakeAnalyticsService({
  enabled: true,
  debug: process.env.NODE_ENV === 'development'
})

// Export types for external usage
export type { ConceptIntakeAnalyticsEvent, AnalyticsConfig } from '@/types/concept-intake'

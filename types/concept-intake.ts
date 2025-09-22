/**
 * Comprehensive type definitions for concept intake analytics and performance tracking
 */

// Base event structure
export interface BaseAnalyticsEvent {
  eventId: string
  timestamp: Date
  sessionId: string
  userId?: string
  userAgent?: string
  device: DeviceInfo
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop'
  os: string
  browser: string
  screenResolution: string
  viewportSize: string
}

// Concept input tracking events
export interface ConceptInputEvent extends BaseAnalyticsEvent {
  eventType: 'concept_input'
  data: {
    concept: string
    inputMethod: 'typing' | 'chip_selection' | 'paste'
    conceptLength: number
    conceptCategory?: string
    conceptComplexity?: 'simple' | 'moderate' | 'complex'
    timeToInput: number // milliseconds from component mount
    hasTypos?: boolean
    language?: string
  }
}

export interface ConceptChipInteractionEvent extends BaseAnalyticsEvent {
  eventType: 'concept_chip_interaction'
  data: {
    chipId: string
    chipLabel: string
    categoryId: string
    categoryName: string
    action: 'click' | 'hover' | 'focus'
    position: number // position in the list
    timeOnPage: number // milliseconds since page load
    previousConcept?: string // if user had typed something before
  }
}

// File upload analytics events
export interface FileUploadEvent extends BaseAnalyticsEvent {
  eventType: 'file_upload'
  data: {
    fileName: string
    fileSize: number
    fileType: string
    uploadMethod: 'drag_drop' | 'click_upload'
    processingTime: number
    success: boolean
    errorType?: 'size_limit' | 'invalid_type' | 'parsing_error' | 'network_error'
    errorMessage?: string
    wordCount?: number
    pageCount?: number
  }
}

export interface FileValidationEvent extends BaseAnalyticsEvent {
  eventType: 'file_validation'
  data: {
    fileName: string
    fileSize: number
    fileType: string
    validationResult: 'valid' | 'invalid'
    rejectionReason?: 'size_too_large' | 'unsupported_type' | 'corrupted_file'
    userAction?: 'retry' | 'cancel' | 'replace'
  }
}

// URL processing analytics
export interface URLProcessingEvent extends BaseAnalyticsEvent {
  eventType: 'url_processing'
  data: {
    url: string
    domain: string
    contentType: 'article' | 'video' | 'course' | 'documentation' | 'pdf'
    processingTime: number
    success: boolean
    errorType?: 'invalid_url' | 'network_error' | 'parsing_error' | 'timeout'
    errorMessage?: string
    wordCount?: number
    extractedTitle?: string
  }
}

// API performance tracking
export interface APIPerformanceEvent extends BaseAnalyticsEvent {
  eventType: 'api_performance'
  data: {
    endpoint: '/api/concept/process' | '/api/upload/parse'
    method: 'GET' | 'POST'
    requestSize: number // bytes
    responseSize: number // bytes
    responseTime: number // milliseconds
    statusCode: number
    success: boolean
    errorCode?: string
    cached: boolean
    retryCount?: number
  }
}

// User flow and drop-off tracking
export interface FlowStepEvent extends BaseAnalyticsEvent {
  eventType: 'flow_step'
  data: {
    step: 'concept_input' | 'file_upload' | 'url_paste' | 'plan_config' | 'plan_generation' | 'plan_display'
    action: 'enter' | 'exit' | 'complete' | 'abandon'
    timeOnStep: number // milliseconds
    completionRate?: number // 0-100 for partial completions
    exitReason?: 'user_navigation' | 'error' | 'timeout' | 'close_browser'
  }
}

export interface OnboardingCompletionEvent extends BaseAnalyticsEvent {
  eventType: 'onboarding_completion'
  data: {
    totalTime: number // milliseconds from start to finish
    completedSteps: string[]
    skippedSteps: string[]
    finalConcept: string
    planConfig: {
      minutesPerDay: number
      weeks: number
      level: string
      format: string
    }
    hasUploadedFile: boolean
    hasPastedUrl: boolean
    generatedPlanModules: number
    userSatisfaction?: number // 1-5 rating if collected
  }
}

// Concept processing analytics
export interface ConceptProcessingEvent extends BaseAnalyticsEvent {
  eventType: 'concept_processing'
  data: {
    concept: string
    conceptType: 'technology' | 'business' | 'science' | 'language' | 'creative' | 'social-science' | 'general'
    processingTime: number
    success: boolean
    planGenerated: boolean
    modulesGenerated: number
    resourcesGenerated: number
    errorType?: 'validation_error' | 'processing_error' | 'timeout' | 'rate_limit'
    complexity: 'beginner' | 'intermediate' | 'advanced'
  }
}

// Error tracking
export interface ErrorEvent extends BaseAnalyticsEvent {
  eventType: 'error'
  data: {
    errorType: 'validation' | 'network' | 'processing' | 'ui' | 'api'
    errorCode: string
    errorMessage: string
    stackTrace?: string
    component?: string
    userAction?: string
    recoverable: boolean
    userRecoveryAction?: 'retry' | 'skip' | 'refresh' | 'contact_support'
  }
}

// Performance metrics
export interface PerformanceMetrics extends BaseAnalyticsEvent {
  eventType: 'performance'
  data: {
    metric: 'page_load' | 'component_render' | 'api_call' | 'file_processing'
    value: number // milliseconds or bytes
    threshold?: number // expected/target value
    performanceGrade: 'excellent' | 'good' | 'fair' | 'poor'
    context?: string // additional context about the measurement
  }
}

// User engagement metrics
export interface EngagementEvent extends BaseAnalyticsEvent {
  eventType: 'engagement'
  data: {
    action: 'scroll' | 'click' | 'hover' | 'focus' | 'blur' | 'resize'
    element?: string
    timeSpent: number // milliseconds
    scrollDepth?: number // percentage
    interactionCount: number
    bounced: boolean
  }
}

// A/B testing events
export interface ABTestEvent extends BaseAnalyticsEvent {
  eventType: 'ab_test'
  data: {
    testName: string
    variant: string
    action: 'assigned' | 'converted' | 'dropped_off'
    conversionMetric?: string
    conversionValue?: number
  }
}

// Union type for all analytics events
export type ConceptIntakeAnalyticsEvent = 
  | ConceptInputEvent
  | ConceptChipInteractionEvent
  | FileUploadEvent
  | FileValidationEvent
  | URLProcessingEvent
  | APIPerformanceEvent
  | FlowStepEvent
  | OnboardingCompletionEvent
  | ConceptProcessingEvent
  | ErrorEvent
  | PerformanceMetrics
  | EngagementEvent
  | ABTestEvent

// Analytics service interface
export interface AnalyticsService {
  track(event: ConceptIntakeAnalyticsEvent): Promise<void>
  identify(userId: string, properties?: Record<string, any>): Promise<void>
  page(pageName: string, properties?: Record<string, any>): Promise<void>
  flush(): Promise<void>
}

// Configuration for analytics
export interface AnalyticsConfig {
  enabled: boolean
  apiEndpoint?: string
  apiKey?: string
  bufferSize: number
  flushInterval: number // milliseconds
  debug: boolean
  enabledEvents: string[] // event types to track
  sampling: {
    enabled: boolean
    rate: number // 0-1, percentage of events to track
  }
  privacy: {
    anonymizeIPs: boolean
    respectDoNotTrack: boolean
    cookieConsent: boolean
  }
}

// Aggregated metrics for dashboard/reporting
export interface ConceptIntakeMetrics {
  period: {
    start: Date
    end: Date
  }
  totalSessions: number
  completionRate: number
  averageCompletionTime: number
  dropOffPoints: {
    step: string
    dropOffRate: number
  }[]
  popularConcepts: {
    concept: string
    count: number
    category: string
  }[]
  fileUploadStats: {
    totalUploads: number
    successRate: number
    averageFileSize: number
    popularFileTypes: { type: string; count: number }[]
  }
  urlProcessingStats: {
    totalUrls: number
    successRate: number
    averageProcessingTime: number
    popularDomains: { domain: string; count: number }[]
  }
  apiPerformance: {
    averageResponseTime: number
    successRate: number
    errorRate: number
    cacheHitRate: number
  }
  userEngagement: {
    averageTimeOnPage: number
    averageScrollDepth: number
    interactionRate: number
  }
}

// Event queue for batching
export interface EventQueue {
  events: ConceptIntakeAnalyticsEvent[]
  maxSize: number
  flushInterval: number
  add(event: ConceptIntakeAnalyticsEvent): void
  flush(): Promise<void>
  size(): number
  clear(): void
}

// Utility types for filtering and querying
export type EventType = ConceptIntakeAnalyticsEvent['eventType']
export type EventData<T extends EventType> = Extract<ConceptIntakeAnalyticsEvent, { eventType: T }>['data']

// Helper type for creating analytics event builders
export type EventBuilder<T extends EventType> = (
  data: EventData<T>,
  baseInfo?: Partial<BaseAnalyticsEvent>
) => Extract<ConceptIntakeAnalyticsEvent, { eventType: T }>

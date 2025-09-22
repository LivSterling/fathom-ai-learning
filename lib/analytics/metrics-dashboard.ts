/**
 * Basic metrics dashboard and logging for concept intake analytics
 */

import { ConceptIntakeMetrics, ConceptIntakeAnalyticsEvent } from '@/types/concept-intake'

/**
 * Metrics aggregator for concept intake analytics
 */
export class ConceptIntakeMetricsAggregator {
  private events: ConceptIntakeAnalyticsEvent[] = []

  constructor(events: ConceptIntakeAnalyticsEvent[] = []) {
    this.events = events
  }

  /**
   * Add new events to the aggregator
   */
  addEvents(events: ConceptIntakeAnalyticsEvent[]): void {
    this.events.push(...events)
  }

  /**
   * Generate comprehensive metrics for a given time period
   */
  generateMetrics(startDate: Date, endDate: Date): ConceptIntakeMetrics {
    const periodEvents = this.events.filter(event => 
      event.timestamp >= startDate && event.timestamp <= endDate
    )

    const sessions = this.getUniqueSessions(periodEvents)
    const completionStats = this.calculateCompletionStats(periodEvents)
    const dropOffPoints = this.calculateDropOffPoints(periodEvents)
    const popularConcepts = this.getPopularConcepts(periodEvents)
    const fileUploadStats = this.calculateFileUploadStats(periodEvents)
    const urlProcessingStats = this.calculateUrlProcessingStats(periodEvents)
    const apiPerformance = this.calculateApiPerformance(periodEvents)
    const userEngagement = this.calculateUserEngagement(periodEvents)

    return {
      period: {
        start: startDate,
        end: endDate
      },
      totalSessions: sessions.length,
      completionRate: completionStats.completionRate,
      averageCompletionTime: completionStats.averageTime,
      dropOffPoints,
      popularConcepts,
      fileUploadStats,
      urlProcessingStats,
      apiPerformance,
      userEngagement
    }
  }

  /**
   * Get real-time metrics for current session
   */
  getRealTimeMetrics(): Partial<ConceptIntakeMetrics> {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    
    return this.generateMetrics(oneHourAgo, now)
  }

  /**
   * Export metrics data for external analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    const metrics = this.getRealTimeMetrics()
    
    if (format === 'json') {
      return JSON.stringify(metrics, null, 2)
    }
    
    // Simple CSV export for basic metrics
    const csvLines = [
      'Metric,Value',
      `Total Sessions,${metrics.totalSessions || 0}`,
      `Completion Rate,${(metrics.completionRate || 0).toFixed(2)}%`,
      `Average Completion Time,${(metrics.averageCompletionTime || 0).toFixed(0)}ms`,
      `API Success Rate,${(metrics.apiPerformance?.successRate || 0).toFixed(2)}%`,
      `Average Response Time,${(metrics.apiPerformance?.averageResponseTime || 0).toFixed(0)}ms`
    ]
    
    return csvLines.join('\n')
  }

  private getUniqueSessions(events: ConceptIntakeAnalyticsEvent[]): string[] {
    return Array.from(new Set(events.map(event => event.sessionId)))
  }

  private calculateCompletionStats(events: ConceptIntakeAnalyticsEvent[]) {
    const completionEvents = events.filter(event => 
      event.eventType === 'onboarding_completion'
    )
    
    const flowStepEvents = events.filter(event => 
      event.eventType === 'flow_step'
    )
    
    const totalSessions = this.getUniqueSessions(events).length
    const completedSessions = completionEvents.length
    const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0
    
    const averageTime = completionEvents.reduce((sum, event) => {
      return sum + (event.data as any).totalTime || 0
    }, 0) / Math.max(completionEvents.length, 1)

    return {
      completionRate,
      averageTime
    }
  }

  private calculateDropOffPoints(events: ConceptIntakeAnalyticsEvent[]) {
    const flowEvents = events.filter(event => event.eventType === 'flow_step')
    const stepCounts: Record<string, { entered: number; abandoned: number }> = {}

    flowEvents.forEach(event => {
      const step = (event.data as any).step
      const action = (event.data as any).action

      if (!stepCounts[step]) {
        stepCounts[step] = { entered: 0, abandoned: 0 }
      }

      if (action === 'enter') {
        stepCounts[step].entered++
      } else if (action === 'abandon') {
        stepCounts[step].abandoned++
      }
    })

    return Object.entries(stepCounts).map(([step, counts]) => ({
      step,
      dropOffRate: counts.entered > 0 ? (counts.abandoned / counts.entered) * 100 : 0
    })).sort((a, b) => b.dropOffRate - a.dropOffRate)
  }

  private getPopularConcepts(events: ConceptIntakeAnalyticsEvent[]) {
    const conceptEvents = events.filter(event => event.eventType === 'concept_input')
    const conceptCounts: Record<string, { count: number; category: string }> = {}

    conceptEvents.forEach(event => {
      const concept = (event.data as any).concept
      const category = (event.data as any).conceptCategory || 'unknown'
      
      if (!conceptCounts[concept]) {
        conceptCounts[concept] = { count: 0, category }
      }
      conceptCounts[concept].count++
    })

    return Object.entries(conceptCounts)
      .map(([concept, data]) => ({
        concept: concept.length > 50 ? concept.substring(0, 47) + '...' : concept,
        count: data.count,
        category: data.category
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  private calculateFileUploadStats(events: ConceptIntakeAnalyticsEvent[]) {
    const fileEvents = events.filter(event => event.eventType === 'file_upload')
    
    const totalUploads = fileEvents.length
    const successfulUploads = fileEvents.filter(event => (event.data as any).success).length
    const successRate = totalUploads > 0 ? (successfulUploads / totalUploads) * 100 : 0
    
    const totalFileSize = fileEvents.reduce((sum, event) => 
      sum + ((event.data as any).fileSize || 0), 0
    )
    const averageFileSize = totalUploads > 0 ? totalFileSize / totalUploads : 0

    const fileTypeCounts: Record<string, number> = {}
    fileEvents.forEach(event => {
      const fileType = (event.data as any).fileType || 'unknown'
      fileTypeCounts[fileType] = (fileTypeCounts[fileType] || 0) + 1
    })

    const popularFileTypes = Object.entries(fileTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)

    return {
      totalUploads,
      successRate,
      averageFileSize,
      popularFileTypes
    }
  }

  private calculateUrlProcessingStats(events: ConceptIntakeAnalyticsEvent[]) {
    const urlEvents = events.filter(event => event.eventType === 'url_processing')
    
    const totalUrls = urlEvents.length
    const successfulUrls = urlEvents.filter(event => (event.data as any).success).length
    const successRate = totalUrls > 0 ? (successfulUrls / totalUrls) * 100 : 0
    
    const totalProcessingTime = urlEvents.reduce((sum, event) => 
      sum + ((event.data as any).processingTime || 0), 0
    )
    const averageProcessingTime = totalUrls > 0 ? totalProcessingTime / totalUrls : 0

    const domainCounts: Record<string, number> = {}
    urlEvents.forEach(event => {
      const domain = (event.data as any).domain || 'unknown'
      domainCounts[domain] = (domainCounts[domain] || 0) + 1
    })

    const popularDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalUrls,
      successRate,
      averageProcessingTime,
      popularDomains
    }
  }

  private calculateApiPerformance(events: ConceptIntakeAnalyticsEvent[]) {
    const apiEvents = events.filter(event => event.eventType === 'api_performance')
    
    if (apiEvents.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 0,
        errorRate: 0,
        cacheHitRate: 0
      }
    }

    const totalResponseTime = apiEvents.reduce((sum, event) => 
      sum + ((event.data as any).responseTime || 0), 0
    )
    const averageResponseTime = totalResponseTime / apiEvents.length

    const successfulCalls = apiEvents.filter(event => (event.data as any).success).length
    const successRate = (successfulCalls / apiEvents.length) * 100
    const errorRate = 100 - successRate

    const cachedCalls = apiEvents.filter(event => (event.data as any).cached).length
    const cacheHitRate = (cachedCalls / apiEvents.length) * 100

    return {
      averageResponseTime,
      successRate,
      errorRate,
      cacheHitRate
    }
  }

  private calculateUserEngagement(events: ConceptIntakeAnalyticsEvent[]) {
    const engagementEvents = events.filter(event => event.eventType === 'engagement')
    
    if (engagementEvents.length === 0) {
      return {
        averageTimeOnPage: 0,
        averageScrollDepth: 0,
        interactionRate: 0
      }
    }

    const totalTimeSpent = engagementEvents.reduce((sum, event) => 
      sum + ((event.data as any).timeSpent || 0), 0
    )
    const averageTimeOnPage = totalTimeSpent / engagementEvents.length

    const totalScrollDepth = engagementEvents.reduce((sum, event) => 
      sum + ((event.data as any).scrollDepth || 0), 0
    )
    const averageScrollDepth = totalScrollDepth / engagementEvents.length

    const interactiveEvents = engagementEvents.filter(event => 
      (event.data as any).interactionCount > 0
    ).length
    const interactionRate = (interactiveEvents / engagementEvents.length) * 100

    return {
      averageTimeOnPage,
      averageScrollDepth,
      interactionRate
    }
  }
}

/**
 * Simple console logger for development monitoring
 */
export class ConceptIntakeLogger {
  private static instance: ConceptIntakeLogger
  private logLevel: 'debug' | 'info' | 'warn' | 'error'

  constructor(logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.logLevel = logLevel
  }

  static getInstance(): ConceptIntakeLogger {
    if (!ConceptIntakeLogger.instance) {
      ConceptIntakeLogger.instance = new ConceptIntakeLogger()
    }
    return ConceptIntakeLogger.instance
  }

  logEvent(event: ConceptIntakeAnalyticsEvent): void {
    if (process.env.NODE_ENV !== 'development') return

    const timestamp = event.timestamp.toISOString()
    const eventInfo = `[${timestamp}] ${event.eventType} - ${event.sessionId}`
    
    switch (event.eventType) {
      case 'concept_input':
        this.info(`${eventInfo} - Concept: "${(event.data as any).concept.substring(0, 50)}..."`)
        break
      case 'concept_chip_interaction':
        this.info(`${eventInfo} - Chip: ${(event.data as any).chipLabel}`)
        break
      case 'file_upload':
        const fileData = event.data as any
        this.info(`${eventInfo} - File: ${fileData.fileName} (${fileData.success ? 'success' : 'failed'})`)
        break
      case 'api_performance':
        const apiData = event.data as any
        this.info(`${eventInfo} - ${apiData.endpoint} - ${apiData.responseTime}ms (${apiData.statusCode})`)
        break
      case 'error':
        const errorData = event.data as any
        this.error(`${eventInfo} - ${errorData.errorCode}: ${errorData.errorMessage}`)
        break
      default:
        this.debug(`${eventInfo} - ${JSON.stringify(event.data)}`)
    }
  }

  logMetrics(metrics: ConceptIntakeMetrics): void {
    if (process.env.NODE_ENV !== 'development') return

    console.group('📊 Concept Intake Metrics')
    console.log(`📅 Period: ${metrics.period.start.toISOString()} - ${metrics.period.end.toISOString()}`)
    console.log(`👥 Total Sessions: ${metrics.totalSessions}`)
    console.log(`✅ Completion Rate: ${metrics.completionRate.toFixed(2)}%`)
    console.log(`⏱️ Average Completion Time: ${(metrics.averageCompletionTime / 1000).toFixed(1)}s`)
    console.log(`🔄 API Success Rate: ${metrics.apiPerformance.successRate.toFixed(2)}%`)
    console.log(`⚡ Average Response Time: ${metrics.apiPerformance.averageResponseTime.toFixed(0)}ms`)
    
    if (metrics.popularConcepts.length > 0) {
      console.log('🔥 Top Concepts:')
      metrics.popularConcepts.slice(0, 5).forEach((concept, index) => {
        console.log(`  ${index + 1}. ${concept.concept} (${concept.count} times)`)
      })
    }
    
    console.groupEnd()
  }

  private debug(message: string): void {
    if (this.shouldLog('debug')) console.debug(`🐛 ${message}`)
  }

  private info(message: string): void {
    if (this.shouldLog('info')) console.info(`ℹ️ ${message}`)
  }

  private warn(message: string): void {
    if (this.shouldLog('warn')) console.warn(`⚠️ ${message}`)
  }

  private error(message: string): void {
    if (this.shouldLog('error')) console.error(`❌ ${message}`)
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }
}

// Export singleton instances
export const metricsAggregator = new ConceptIntakeMetricsAggregator()
export const conceptIntakeLogger = ConceptIntakeLogger.getInstance()

/**
 * Comprehensive error logging for debugging and monitoring
 */

import { conceptIntakeAnalytics } from '@/lib/analytics/concept-intake-analytics'

export interface LogEntry {
  id: string
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  message: string
  component?: string
  userAction?: string
  context?: Record<string, any>
  error?: {
    name: string
    message: string
    stack?: string
  }
  sessionId: string
  userId?: string
  environment: string
}

export interface ErrorLoggerConfig {
  maxLogEntries: number
  enableConsoleLogging: boolean
  enableRemoteLogging: boolean
  logLevels: ('debug' | 'info' | 'warn' | 'error' | 'fatal')[]
  remoteEndpoint?: string
  apiKey?: string
}

const DEFAULT_CONFIG: ErrorLoggerConfig = {
  maxLogEntries: 1000,
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  enableRemoteLogging: process.env.NODE_ENV === 'production',
  logLevels: process.env.NODE_ENV === 'development' 
    ? ['debug', 'info', 'warn', 'error', 'fatal']
    : ['warn', 'error', 'fatal'],
  remoteEndpoint: process.env.NEXT_PUBLIC_LOG_ENDPOINT,
  apiKey: process.env.NEXT_PUBLIC_LOG_API_KEY
}

/**
 * Comprehensive error logger for the concept intake system
 */
export class ConceptIntakeErrorLogger {
  private static instance: ConceptIntakeErrorLogger
  private config: ErrorLoggerConfig
  private logEntries: LogEntry[] = []
  private sessionId: string
  private logQueue: LogEntry[] = []
  private flushTimer?: NodeJS.Timeout

  constructor(config: Partial<ErrorLoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.sessionId = this.generateSessionId()
    this.startFlushTimer()
  }

  static getInstance(): ConceptIntakeErrorLogger {
    if (!ConceptIntakeErrorLogger.instance) {
      ConceptIntakeErrorLogger.instance = new ConceptIntakeErrorLogger()
    }
    return ConceptIntakeErrorLogger.instance
  }

  /**
   * Log debug information
   */
  debug(message: string, context?: Record<string, any>, component?: string): void {
    this.log('debug', message, context, component)
  }

  /**
   * Log general information
   */
  info(message: string, context?: Record<string, any>, component?: string): void {
    this.log('info', message, context, component)
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: Record<string, any>, component?: string): void {
    this.log('warn', message, context, component)
  }

  /**
   * Log errors
   */
  error(message: string, error?: Error, context?: Record<string, any>, component?: string): void {
    this.log('error', message, context, component, error)
  }

  /**
   * Log fatal errors
   */
  fatal(message: string, error?: Error, context?: Record<string, any>, component?: string): void {
    this.log('fatal', message, context, component, error)
  }

  /**
   * Log user actions for debugging
   */
  logUserAction(
    action: string, 
    component: string, 
    context?: Record<string, any>,
    success: boolean = true
  ): void {
    this.log(
      success ? 'info' : 'warn',
      `User action: ${action}`,
      { ...context, success },
      component,
      undefined,
      action
    )
  }

  /**
   * Log API calls and responses
   */
  logAPICall(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    error?: Error,
    context?: Record<string, any>
  ): void {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info'
    const message = `API ${method} ${endpoint} - ${statusCode} (${responseTime}ms)`
    
    this.log(level, message, {
      endpoint,
      method,
      statusCode,
      responseTime,
      ...context
    }, 'API_CLIENT', error)
  }

  /**
   * Log validation errors
   */
  logValidationError(
    field: string,
    value: any,
    errors: string[],
    component: string,
    context?: Record<string, any>
  ): void {
    this.log('warn', `Validation failed for ${field}`, {
      field,
      value: this.sanitizeValue(value),
      errors,
      ...context
    }, component)
  }

  /**
   * Log performance metrics
   */
  logPerformance(
    metric: string,
    value: number,
    threshold?: number,
    component?: string,
    context?: Record<string, any>
  ): void {
    const level = threshold && value > threshold ? 'warn' : 'info'
    const message = `Performance: ${metric} = ${value}${threshold ? ` (threshold: ${threshold})` : ''}`
    
    this.log(level, message, {
      metric,
      value,
      threshold,
      ...context
    }, component)
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(limit: number = 100): LogEntry[] {
    return this.logEntries.slice(-limit)
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logEntries.filter(entry => entry.level === level)
  }

  /**
   * Get logs by component
   */
  getLogsByComponent(component: string): LogEntry[] {
    return this.logEntries.filter(entry => entry.component === component)
  }

  /**
   * Export logs for analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logEntries, null, 2)
    }
    
    // CSV format
    const headers = ['timestamp', 'level', 'component', 'message', 'userAction', 'error']
    const csvLines = [headers.join(',')]
    
    this.logEntries.forEach(entry => {
      const row = [
        entry.timestamp.toISOString(),
        entry.level,
        entry.component || '',
        `"${entry.message.replace(/"/g, '""')}"`,
        entry.userAction || '',
        entry.error ? `"${entry.error.message.replace(/"/g, '""')}"` : ''
      ]
      csvLines.push(row.join(','))
    })
    
    return csvLines.join('\n')
  }

  /**
   * Clear all log entries
   */
  clearLogs(): void {
    this.logEntries = []
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number
    errorsByLevel: Record<string, number>
    errorsByComponent: Record<string, number>
    recentErrors: LogEntry[]
  } {
    const errorsByLevel: Record<string, number> = {}
    const errorsByComponent: Record<string, number> = {}
    
    this.logEntries.forEach(entry => {
      errorsByLevel[entry.level] = (errorsByLevel[entry.level] || 0) + 1
      if (entry.component) {
        errorsByComponent[entry.component] = (errorsByComponent[entry.component] || 0) + 1
      }
    })
    
    const recentErrors = this.logEntries
      .filter(entry => ['error', 'fatal'].includes(entry.level))
      .slice(-10)
    
    return {
      totalErrors: this.logEntries.filter(entry => ['error', 'fatal'].includes(entry.level)).length,
      errorsByLevel,
      errorsByComponent,
      recentErrors
    }
  }

  private log(
    level: LogEntry['level'],
    message: string,
    context?: Record<string, any>,
    component?: string,
    error?: Error,
    userAction?: string
  ): void {
    if (!this.config.logLevels.includes(level)) {
      return
    }

    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      message,
      component,
      userAction,
      context: context ? this.sanitizeContext(context) : undefined,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      sessionId: this.sessionId,
      environment: process.env.NODE_ENV || 'unknown'
    }

    // Add to local storage
    this.logEntries.push(logEntry)
    
    // Maintain max log entries
    if (this.logEntries.length > this.config.maxLogEntries) {
      this.logEntries.shift()
    }

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(logEntry)
    }

    // Queue for remote logging
    if (this.config.enableRemoteLogging) {
      this.logQueue.push(logEntry)
    }

    // Send to analytics if it's an error
    if (['error', 'fatal'].includes(level) && error) {
      conceptIntakeAnalytics.createErrorEvent({
        errorType: 'ui',
        errorCode: `LOG_${level.toUpperCase()}`,
        errorMessage: error.message,
        stackTrace: error.stack,
        component: component || 'unknown',
        userAction: userAction || 'unknown',
        recoverable: level !== 'fatal'
      })
    }
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString()
    const prefix = `[${timestamp}] ${entry.level.toUpperCase()}`
    const componentInfo = entry.component ? ` [${entry.component}]` : ''
    const message = `${prefix}${componentInfo} ${entry.message}`

    switch (entry.level) {
      case 'debug':
        console.debug(message, entry.context)
        break
      case 'info':
        console.info(message, entry.context)
        break
      case 'warn':
        console.warn(message, entry.context, entry.error)
        break
      case 'error':
      case 'fatal':
        console.error(message, entry.context, entry.error)
        break
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushRemoteLogs()
    }, 10000) // Flush every 10 seconds
  }

  private async flushRemoteLogs(): Promise<void> {
    if (!this.config.enableRemoteLogging || this.logQueue.length === 0 || !this.config.remoteEndpoint) {
      return
    }

    const logsToSend = [...this.logQueue]
    this.logQueue = []

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          logs: logsToSend,
          sessionId: this.sessionId,
          environment: process.env.NODE_ENV
        })
      })

      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.status}`)
      }
    } catch (error) {
      // Re-queue logs for retry (up to a limit)
      if (logsToSend.length < 500) {
        this.logQueue.unshift(...logsToSend)
      }
      
      if (this.config.enableConsoleLogging) {
        console.error('Failed to send logs to remote endpoint:', error)
      }
    }
  }

  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(context)) {
      sanitized[key] = this.sanitizeValue(value)
    }
    
    return sanitized
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Limit string length and remove sensitive patterns
      let sanitized = value.length > 1000 ? value.substring(0, 1000) + '...' : value
      
      // Remove potential passwords, tokens, etc.
      sanitized = sanitized.replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
      sanitized = sanitized.replace(/token[=:]\s*\S+/gi, 'token=[REDACTED]')
      sanitized = sanitized.replace(/key[=:]\s*\S+/gi, 'key=[REDACTED]')
      
      return sanitized
    }
    
    if (typeof value === 'object' && value !== null) {
      // Limit object depth and size
      return JSON.parse(JSON.stringify(value, null, 0).substring(0, 500))
    }
    
    return value
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flushRemoteLogs()
  }
}

// Export singleton instance
export const errorLogger = ConceptIntakeErrorLogger.getInstance()

// Utility functions for common logging scenarios
export const logError = (
  message: string,
  error?: Error,
  component?: string,
  context?: Record<string, any>
) => {
  errorLogger.error(message, error, context, component)
}

export const logWarning = (
  message: string,
  component?: string,
  context?: Record<string, any>
) => {
  errorLogger.warn(message, context, component)
}

export const logInfo = (
  message: string,
  component?: string,
  context?: Record<string, any>
) => {
  errorLogger.info(message, context, component)
}

export const logUserAction = (
  action: string,
  component: string,
  success: boolean = true,
  context?: Record<string, any>
) => {
  errorLogger.logUserAction(action, component, context, success)
}

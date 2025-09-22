/**
 * Comprehensive error handling and recovery management
 */

import { conceptIntakeAnalytics } from '@/lib/analytics/concept-intake-analytics'

export interface ErrorContext {
  component?: string
  userAction?: string
  additionalInfo?: Record<string, any>
  timestamp?: Date
  sessionId?: string
  userId?: string
}

export interface ErrorRecoveryOptions {
  retryable: boolean
  maxRetries: number
  retryDelay: number
  fallbackAction?: () => void
  userMessage?: string
  technicalMessage?: string
}

export interface ErrorHandlingResult {
  handled: boolean
  userMessage: string
  technicalMessage: string
  recoveryOptions: {
    canRetry: boolean
    canSkip: boolean
    canFallback: boolean
    retryAction?: () => Promise<void>
    skipAction?: () => void
    fallbackAction?: () => void
  }
  errorId: string
}

/**
 * Centralized error manager for the concept intake flow
 */
export class ConceptIntakeErrorManager {
  private static instance: ConceptIntakeErrorManager
  private errorCounts: Map<string, number> = new Map()
  private lastErrors: Map<string, Date> = new Map()

  static getInstance(): ConceptIntakeErrorManager {
    if (!ConceptIntakeErrorManager.instance) {
      ConceptIntakeErrorManager.instance = new ConceptIntakeErrorManager()
    }
    return ConceptIntakeErrorManager.instance
  }

  /**
   * Handle any error with comprehensive recovery options
   */
  handleError(
    error: Error | string,
    context: ErrorContext = {},
    recoveryOptions: Partial<ErrorRecoveryOptions> = {}
  ): ErrorHandlingResult {
    const errorMessage = typeof error === 'string' ? error : error.message
    const errorStack = typeof error === 'string' ? undefined : error.stack
    const errorId = this.generateErrorId()
    
    const fullContext: ErrorContext = {
      ...context,
      timestamp: new Date(),
      sessionId: this.getSessionId()
    }

    const defaultRecoveryOptions: ErrorRecoveryOptions = {
      retryable: true,
      maxRetries: 3,
      retryDelay: 1000,
      userMessage: 'Something went wrong. Please try again.',
      technicalMessage: errorMessage,
      ...recoveryOptions
    }

    // Track error occurrence
    this.trackErrorOccurrence(errorMessage, fullContext)

    // Log to analytics
    conceptIntakeAnalytics.createErrorEvent({
      errorType: this.categorizeError(error),
      errorCode: this.generateErrorCode(error, context),
      errorMessage: errorMessage,
      stackTrace: errorStack,
      component: context.component || 'unknown',
      userAction: context.userAction || 'unknown',
      recoverable: defaultRecoveryOptions.retryable
    })

    // Determine recovery options
    const recoveryResult = this.determineRecoveryOptions(
      errorMessage,
      fullContext,
      defaultRecoveryOptions
    )

    return {
      handled: true,
      userMessage: this.generateUserFriendlyMessage(error, context),
      technicalMessage: defaultRecoveryOptions.technicalMessage!,
      recoveryOptions: recoveryResult,
      errorId
    }
  }

  /**
   * Handle specific API errors with tailored recovery
   */
  handleAPIError(
    error: any,
    endpoint: string,
    context: ErrorContext = {}
  ): ErrorHandlingResult {
    const statusCode = error.status || error.statusCode || 0
    const errorMessage = error.message || 'API request failed'
    
    let userMessage = 'We encountered a problem processing your request.'
    let retryable = true
    let fallbackAction: (() => void) | undefined

    // Handle specific status codes
    switch (statusCode) {
      case 400:
        userMessage = 'The information provided seems to be invalid. Please check and try again.'
        retryable = false
        break
      case 401:
        userMessage = 'You need to sign in to continue.'
        retryable = false
        break
      case 403:
        userMessage = 'You don\'t have permission to perform this action.'
        retryable = false
        break
      case 404:
        userMessage = 'The requested resource wasn\'t found.'
        retryable = false
        break
      case 408:
      case 504:
        userMessage = 'The request timed out. Please check your connection and try again.'
        retryable = true
        break
      case 429:
        userMessage = 'Too many requests. Please wait a moment and try again.'
        retryable = true
        break
      case 500:
      case 502:
      case 503:
        userMessage = 'Our servers are experiencing issues. Please try again in a few moments.'
        retryable = true
        break
      default:
        if (statusCode >= 500) {
          userMessage = 'Server error occurred. Please try again later.'
          retryable = true
        } else if (statusCode >= 400) {
          userMessage = 'There was a problem with your request. Please check and try again.'
          retryable = false
        }
    }

    return this.handleError(
      new Error(`API Error ${statusCode}: ${errorMessage}`),
      {
        ...context,
        component: context.component || 'API_CLIENT',
        userAction: context.userAction || `api_call_${endpoint}`,
        additionalInfo: {
          endpoint,
          statusCode,
          ...context.additionalInfo
        }
      },
      {
        retryable,
        maxRetries: retryable ? 3 : 0,
        retryDelay: this.calculateRetryDelay(statusCode),
        userMessage,
        fallbackAction
      }
    )
  }

  /**
   * Handle file upload errors
   */
  handleFileUploadError(
    error: Error,
    fileName: string,
    fileSize: number,
    context: ErrorContext = {}
  ): ErrorHandlingResult {
    let userMessage = 'There was a problem uploading your file.'
    let retryable = true
    
    if (error.message.includes('size') || error.message.includes('large')) {
      userMessage = `The file "${fileName}" is too large. Please choose a smaller file or compress it.`
      retryable = false
    } else if (error.message.includes('type') || error.message.includes('format')) {
      userMessage = `The file type for "${fileName}" is not supported. Please choose a PDF, TXT, or Markdown file.`
      retryable = false
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      userMessage = 'Upload failed due to connection issues. Please check your internet and try again.'
      retryable = true
    } else if (error.message.includes('corrupted') || error.message.includes('invalid')) {
      userMessage = `The file "${fileName}" appears to be corrupted or invalid. Please try a different file.`
      retryable = false
    }

    return this.handleError(
      error,
      {
        ...context,
        component: context.component || 'FILE_UPLOAD',
        userAction: context.userAction || 'file_upload',
        additionalInfo: {
          fileName,
          fileSize,
          ...context.additionalInfo
        }
      },
      {
        retryable,
        userMessage,
        maxRetries: retryable ? 2 : 0
      }
    )
  }

  /**
   * Handle URL processing errors
   */
  handleURLError(
    error: Error,
    url: string,
    context: ErrorContext = {}
  ): ErrorHandlingResult {
    let userMessage = 'There was a problem processing the URL.'
    let retryable = true

    if (error.message.includes('invalid') || error.message.includes('format')) {
      userMessage = 'The URL format is invalid. Please check the URL and try again.'
      retryable = false
    } else if (error.message.includes('blocked') || error.message.includes('not allowed')) {
      userMessage = 'This URL is not supported. Please try a different URL.'
      retryable = false
    } else if (error.message.includes('timeout') || error.message.includes('unreachable')) {
      userMessage = 'The URL took too long to respond or is unreachable. Please try again or use a different URL.'
      retryable = true
    } else if (error.message.includes('access') || error.message.includes('403')) {
      userMessage = 'The URL is not accessible. It might be private or require authentication.'
      retryable = false
    }

    return this.handleError(
      error,
      {
        ...context,
        component: context.component || 'URL_PROCESSOR',
        userAction: context.userAction || 'url_processing',
        additionalInfo: {
          url: this.sanitizeUrl(url),
          ...context.additionalInfo
        }
      },
      {
        retryable,
        userMessage,
        maxRetries: retryable ? 2 : 0
      }
    )
  }

  /**
   * Create retry function with exponential backoff
   */
  createRetryFunction(
    originalFunction: () => Promise<any>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): () => Promise<any> {
    return async () => {
      let lastError: Error
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await originalFunction()
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          
          if (attempt === maxRetries) {
            throw lastError
          }
          
          // Exponential backoff with jitter
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
      
      throw lastError!
    }
  }

  /**
   * Get fallback suggestions for failed operations
   */
  getFallbackSuggestions(errorType: string, context: ErrorContext): string[] {
    const suggestions: string[] = []

    switch (errorType) {
      case 'concept_processing':
        suggestions.push(
          'Try a simpler, more general concept',
          'Use common educational terms',
          'Check your spelling and try again',
          'Browse our suggested topics instead'
        )
        break
      case 'file_upload':
        suggestions.push(
          'Try a smaller file (under 10MB)',
          'Convert to PDF, TXT, or Markdown format',
          'Check your internet connection',
          'Try uploading from a different device'
        )
        break
      case 'url_processing':
        suggestions.push(
          'Make sure the URL is publicly accessible',
          'Try a different URL from the same site',
          'Copy the URL directly from your browser',
          'Use a different learning resource'
        )
        break
      case 'api_error':
        suggestions.push(
          'Check your internet connection',
          'Try again in a few moments',
          'Refresh the page and start over',
          'Contact support if the problem persists'
        )
        break
      default:
        suggestions.push(
          'Refresh the page and try again',
          'Check your internet connection',
          'Try using a different browser',
          'Contact support if issues continue'
        )
    }

    return suggestions
  }

  private trackErrorOccurrence(error: string, context: ErrorContext): void {
    const errorKey = `${context.component || 'unknown'}_${error}`
    const currentCount = this.errorCounts.get(errorKey) || 0
    this.errorCounts.set(errorKey, currentCount + 1)
    this.lastErrors.set(errorKey, new Date())
  }

  private categorizeError(error: Error | string): 'validation' | 'network' | 'processing' | 'ui' | 'api' {
    const errorMessage = typeof error === 'string' ? error : error.message
    const lowerMessage = errorMessage.toLowerCase()

    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
      return 'validation'
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('timeout')) {
      return 'network'
    }
    if (lowerMessage.includes('processing') || lowerMessage.includes('parse')) {
      return 'processing'
    }
    if (lowerMessage.includes('api') || lowerMessage.includes('status')) {
      return 'api'
    }
    return 'ui'
  }

  private generateErrorCode(error: Error | string, context: ErrorContext): string {
    const component = context.component || 'UNKNOWN'
    const action = context.userAction || 'UNKNOWN'
    const errorType = this.categorizeError(error).toUpperCase()
    return `${component}_${action}_${errorType}`
  }

  private generateUserFriendlyMessage(error: Error | string, context: ErrorContext): string {
    const errorMessage = typeof error === 'string' ? error : error.message
    
    // Return specific user-friendly messages based on context
    if (context.component === 'FILE_UPLOAD') {
      return 'We had trouble uploading your file. Please try again or choose a different file.'
    }
    if (context.component === 'URL_PROCESSOR') {
      return 'We couldn\'t access that URL. Please check the link and try again.'
    }
    if (context.component === 'CONCEPT_PROCESSOR') {
      return 'We had trouble processing your concept. Please try rephrasing it or try again.'
    }
    
    // Generic fallback
    return 'Something went wrong. Please try again, and contact support if the problem continues.'
  }

  private determineRecoveryOptions(
    error: string,
    context: ErrorContext,
    options: ErrorRecoveryOptions
  ) {
    const errorKey = `${context.component || 'unknown'}_${error}`
    const errorCount = this.errorCounts.get(errorKey) || 0
    const canRetry = options.retryable && errorCount < options.maxRetries

    return {
      canRetry,
      canSkip: true, // Usually users can skip problematic steps
      canFallback: !!options.fallbackAction,
      retryAction: canRetry ? this.createRetryAction(error, context) : undefined,
      skipAction: this.createSkipAction(context),
      fallbackAction: options.fallbackAction
    }
  }

  private createRetryAction(error: string, context: ErrorContext): () => Promise<void> {
    return async () => {
      // Add delay before retry
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Track retry attempt
      conceptIntakeAnalytics.createErrorEvent({
        errorType: 'ui',
        errorCode: 'USER_RETRY_ATTEMPT',
        errorMessage: `User retried after error: ${error}`,
        component: context.component || 'unknown',
        userAction: 'retry_button_click',
        recoverable: true,
        userRecoveryAction: 'retry'
      })
    }
  }

  private createSkipAction(context: ErrorContext): () => void {
    return () => {
      conceptIntakeAnalytics.createErrorEvent({
        errorType: 'ui',
        errorCode: 'USER_SKIP_ERROR',
        errorMessage: 'User chose to skip after error',
        component: context.component || 'unknown',
        userAction: 'skip_button_click',
        recoverable: true,
        userRecoveryAction: 'skip'
      })
    }
  }

  private calculateRetryDelay(statusCode: number): number {
    // Longer delays for server errors and rate limits
    if (statusCode === 429) return 5000 // 5 seconds for rate limit
    if (statusCode >= 500) return 3000 // 3 seconds for server errors
    if (statusCode === 408 || statusCode === 504) return 2000 // 2 seconds for timeouts
    return 1000 // 1 second default
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getSessionId(): string {
    // This would typically come from your session management
    return `session_${Date.now()}`
  }

  private sanitizeUrl(url: string): string {
    // Remove sensitive information from URLs for logging
    try {
      const urlObj = new URL(url)
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`
    } catch {
      return 'invalid_url'
    }
  }
}

// Export singleton instance
export const errorManager = ConceptIntakeErrorManager.getInstance()

// Utility functions for common error scenarios
export const handleAsyncError = async <T>(
  asyncFunction: () => Promise<T>,
  context: ErrorContext = {}
): Promise<T> => {
  try {
    return await asyncFunction()
  } catch (error) {
    const result = errorManager.handleError(
      error instanceof Error ? error : new Error(String(error)),
      context
    )
    throw new Error(result.userMessage)
  }
}

export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: ErrorContext = {}
) => {
  return async (...args: T): Promise<R> => {
    return handleAsyncError(() => fn(...args), context)
  }
}

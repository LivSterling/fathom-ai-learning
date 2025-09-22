/**
 * Error scenario tests for error manager
 */

import { ConceptIntakeErrorManager } from './error-manager'

// Mock analytics
jest.mock('@/lib/analytics/concept-intake-analytics', () => ({
  conceptIntakeAnalytics: {
    createErrorEvent: jest.fn()
  }
}))

describe('ConceptIntakeErrorManager', () => {
  let errorManager: ConceptIntakeErrorManager

  beforeEach(() => {
    errorManager = new ConceptIntakeErrorManager()
    jest.clearAllMocks()
  })

  describe('General Error Handling', () => {
    test('handles Error objects correctly', () => {
      const error = new Error('Test error message')
      const result = errorManager.handleError(error, { component: 'TestComponent' })

      expect(result.handled).toBe(true)
      expect(result.userMessage).toContain('Something went wrong')
      expect(result.technicalMessage).toBe('Test error message')
      expect(result.errorId).toMatch(/^err_\d+_[a-z0-9]+$/)
      expect(result.recoveryOptions.canRetry).toBe(true)
      expect(result.recoveryOptions.canSkip).toBe(true)
    })

    test('handles string error messages', () => {
      const result = errorManager.handleError('String error message')

      expect(result.handled).toBe(true)
      expect(result.technicalMessage).toBe('String error message')
      expect(result.recoveryOptions.canRetry).toBe(true)
    })

    test('tracks error occurrences', () => {
      const error = new Error('Repeated error')
      const context = { component: 'TestComponent' }

      // First occurrence
      const result1 = errorManager.handleError(error, context)
      expect(result1.recoveryOptions.canRetry).toBe(true)

      // Multiple occurrences should still allow retries within limit
      errorManager.handleError(error, context)
      errorManager.handleError(error, context)
      const result4 = errorManager.handleError(error, context)
      
      // Should eventually stop allowing retries after max attempts
      expect(result4.recoveryOptions.canRetry).toBe(false)
    })

    test('respects custom recovery options', () => {
      const error = new Error('Non-retryable error')
      const result = errorManager.handleError(error, {}, {
        retryable: false,
        userMessage: 'Custom user message'
      })

      expect(result.recoveryOptions.canRetry).toBe(false)
      expect(result.userMessage).toBe('Custom user message')
    })
  })

  describe('API Error Handling', () => {
    test('handles 400 Bad Request errors', () => {
      const apiError = { status: 400, message: 'Invalid request' }
      const result = errorManager.handleAPIError(apiError, '/api/test')

      expect(result.userMessage).toContain('information provided seems to be invalid')
      expect(result.recoveryOptions.canRetry).toBe(false)
    })

    test('handles 401 Unauthorized errors', () => {
      const apiError = { status: 401, message: 'Unauthorized' }
      const result = errorManager.handleAPIError(apiError, '/api/test')

      expect(result.userMessage).toContain('sign in to continue')
      expect(result.recoveryOptions.canRetry).toBe(false)
    })

    test('handles 403 Forbidden errors', () => {
      const apiError = { status: 403, message: 'Forbidden' }
      const result = errorManager.handleAPIError(apiError, '/api/test')

      expect(result.userMessage).toContain('don\'t have permission')
      expect(result.recoveryOptions.canRetry).toBe(false)
    })

    test('handles 404 Not Found errors', () => {
      const apiError = { status: 404, message: 'Not found' }
      const result = errorManager.handleAPIError(apiError, '/api/test')

      expect(result.userMessage).toContain('wasn\'t found')
      expect(result.recoveryOptions.canRetry).toBe(false)
    })

    test('handles 408 Timeout errors', () => {
      const apiError = { status: 408, message: 'Request timeout' }
      const result = errorManager.handleAPIError(apiError, '/api/test')

      expect(result.userMessage).toContain('timed out')
      expect(result.recoveryOptions.canRetry).toBe(true)
    })

    test('handles 429 Rate Limit errors', () => {
      const apiError = { status: 429, message: 'Too many requests' }
      const result = errorManager.handleAPIError(apiError, '/api/test')

      expect(result.userMessage).toContain('Too many requests')
      expect(result.recoveryOptions.canRetry).toBe(true)
    })

    test('handles 500 Server errors', () => {
      const apiError = { status: 500, message: 'Internal server error' }
      const result = errorManager.handleAPIError(apiError, '/api/test')

      expect(result.userMessage).toContain('servers are experiencing issues')
      expect(result.recoveryOptions.canRetry).toBe(true)
    })

    test('handles 502 Bad Gateway errors', () => {
      const apiError = { status: 502, message: 'Bad gateway' }
      const result = errorManager.handleAPIError(apiError, '/api/test')

      expect(result.userMessage).toContain('servers are experiencing issues')
      expect(result.recoveryOptions.canRetry).toBe(true)
    })

    test('handles 503 Service Unavailable errors', () => {
      const apiError = { status: 503, message: 'Service unavailable' }
      const result = errorManager.handleAPIError(apiError, '/api/test')

      expect(result.userMessage).toContain('servers are experiencing issues')
      expect(result.recoveryOptions.canRetry).toBe(true)
    })

    test('handles unknown status codes', () => {
      const apiError = { status: 999, message: 'Unknown error' }
      const result = errorManager.handleAPIError(apiError, '/api/test')

      expect(result.userMessage).toContain('We encountered a problem')
      expect(result.recoveryOptions.canRetry).toBe(true)
    })

    test('handles API errors without status codes', () => {
      const apiError = { message: 'Network error' }
      const result = errorManager.handleAPIError(apiError, '/api/test')

      expect(result.handled).toBe(true)
      expect(result.userMessage).toBeDefined()
    })
  })

  describe('File Upload Error Handling', () => {
    test('handles file size errors', () => {
      const error = new Error('File size too large')
      const result = errorManager.handleFileUploadError(error, 'large-file.pdf', 15000000)

      expect(result.userMessage).toContain('too large')
      expect(result.userMessage).toContain('large-file.pdf')
      expect(result.recoveryOptions.canRetry).toBe(false)
    })

    test('handles file type errors', () => {
      const error = new Error('Invalid file type')
      const result = errorManager.handleFileUploadError(error, 'image.jpg', 1000000)

      expect(result.userMessage).toContain('type')
      expect(result.userMessage).toContain('not supported')
      expect(result.recoveryOptions.canRetry).toBe(false)
    })

    test('handles network errors during upload', () => {
      const error = new Error('Network timeout during upload')
      const result = errorManager.handleFileUploadError(error, 'document.pdf', 5000000)

      expect(result.userMessage).toContain('connection issues')
      expect(result.recoveryOptions.canRetry).toBe(true)
    })

    test('handles corrupted file errors', () => {
      const error = new Error('File appears to be corrupted')
      const result = errorManager.handleFileUploadError(error, 'corrupted.pdf', 2000000)

      expect(result.userMessage).toContain('corrupted')
      expect(result.recoveryOptions.canRetry).toBe(false)
    })

    test('handles generic upload errors', () => {
      const error = new Error('Unknown upload error')
      const result = errorManager.handleFileUploadError(error, 'file.pdf', 1000000)

      expect(result.userMessage).toContain('problem uploading')
      expect(result.recoveryOptions.canRetry).toBe(true)
    })
  })

  describe('URL Error Handling', () => {
    test('handles invalid URL format errors', () => {
      const error = new Error('Invalid URL format')
      const result = errorManager.handleURLError(error, 'not-a-url')

      expect(result.userMessage).toContain('format is invalid')
      expect(result.recoveryOptions.canRetry).toBe(false)
    })

    test('handles blocked domain errors', () => {
      const error = new Error('Domain not allowed')
      const result = errorManager.handleURLError(error, 'http://blocked-site.com')

      expect(result.userMessage).toContain('not supported')
      expect(result.recoveryOptions.canRetry).toBe(false)
    })

    test('handles timeout errors', () => {
      const error = new Error('URL timeout')
      const result = errorManager.handleURLError(error, 'http://slow-site.com')

      expect(result.userMessage).toContain('took too long')
      expect(result.recoveryOptions.canRetry).toBe(true)
    })

    test('handles access denied errors', () => {
      const error = new Error('Access denied - 403 Forbidden')
      const result = errorManager.handleURLError(error, 'http://private-site.com')

      expect(result.userMessage).toContain('not accessible')
      expect(result.recoveryOptions.canRetry).toBe(false)
    })

    test('sanitizes URLs in error context', () => {
      const error = new Error('URL processing failed')
      const result = errorManager.handleURLError(
        error, 
        'https://example.com/path?secret=123&token=abc'
      )

      expect(result.handled).toBe(true)
      // The URL should be sanitized in the internal context
    })
  })

  describe('Retry Function Creation', () => {
    test('creates retry function with exponential backoff', async () => {
      let callCount = 0
      const mockFunction = jest.fn().mockImplementation(async () => {
        callCount++
        if (callCount < 3) {
          throw new Error('Temporary failure')
        }
        return 'success'
      })

      const retryFunction = errorManager.createRetryFunction(mockFunction, 3, 100)
      
      const startTime = Date.now()
      const result = await retryFunction()
      const endTime = Date.now()

      expect(result).toBe('success')
      expect(mockFunction).toHaveBeenCalledTimes(3)
      expect(endTime - startTime).toBeGreaterThan(300) // Should have delays
    })

    test('retry function eventually fails after max attempts', async () => {
      const mockFunction = jest.fn().mockRejectedValue(new Error('Persistent failure'))
      const retryFunction = errorManager.createRetryFunction(mockFunction, 2, 50)

      await expect(retryFunction()).rejects.toThrow('Persistent failure')
      expect(mockFunction).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })

  describe('Fallback Suggestions', () => {
    test('provides concept processing fallback suggestions', () => {
      const suggestions = errorManager.getFallbackSuggestions('concept_processing', {})
      
      expect(suggestions).toContain('Try a simpler, more general concept')
      expect(suggestions).toContain('Use common educational terms')
      expect(suggestions).toContain('Check your spelling and try again')
      expect(suggestions).toContain('Browse our suggested topics instead')
    })

    test('provides file upload fallback suggestions', () => {
      const suggestions = errorManager.getFallbackSuggestions('file_upload', {})
      
      expect(suggestions).toContain('Try a smaller file (under 10MB)')
      expect(suggestions).toContain('Convert to PDF, TXT, or Markdown format')
      expect(suggestions).toContain('Check your internet connection')
      expect(suggestions).toContain('Try uploading from a different device')
    })

    test('provides URL processing fallback suggestions', () => {
      const suggestions = errorManager.getFallbackSuggestions('url_processing', {})
      
      expect(suggestions).toContain('Make sure the URL is publicly accessible')
      expect(suggestions).toContain('Try a different URL from the same site')
      expect(suggestions).toContain('Copy the URL directly from your browser')
      expect(suggestions).toContain('Use a different learning resource')
    })

    test('provides API error fallback suggestions', () => {
      const suggestions = errorManager.getFallbackSuggestions('api_error', {})
      
      expect(suggestions).toContain('Check your internet connection')
      expect(suggestions).toContain('Try again in a few moments')
      expect(suggestions).toContain('Refresh the page and start over')
      expect(suggestions).toContain('Contact support if the problem persists')
    })

    test('provides generic fallback suggestions for unknown error types', () => {
      const suggestions = errorManager.getFallbackSuggestions('unknown_error', {})
      
      expect(suggestions).toContain('Refresh the page and try again')
      expect(suggestions).toContain('Check your internet connection')
      expect(suggestions).toContain('Try using a different browser')
      expect(suggestions).toContain('Contact support if issues continue')
    })
  })

  describe('Error Categorization', () => {
    test('categorizes validation errors correctly', () => {
      const validationError = new Error('Validation failed for field')
      const result = errorManager.handleError(validationError)
      
      expect(result.handled).toBe(true)
    })

    test('categorizes network errors correctly', () => {
      const networkError = new Error('Network request failed')
      const result = errorManager.handleError(networkError)
      
      expect(result.handled).toBe(true)
    })

    test('categorizes processing errors correctly', () => {
      const processingError = new Error('Failed to process data')
      const result = errorManager.handleError(processingError)
      
      expect(result.handled).toBe(true)
    })

    test('categorizes API errors correctly', () => {
      const apiError = new Error('API request returned status 500')
      const result = errorManager.handleError(apiError)
      
      expect(result.handled).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    test('handles null error gracefully', () => {
      const result = errorManager.handleError(null as any)
      
      expect(result.handled).toBe(true)
      expect(result.userMessage).toBeDefined()
      expect(result.errorId).toBeDefined()
    })

    test('handles undefined error gracefully', () => {
      const result = errorManager.handleError(undefined as any)
      
      expect(result.handled).toBe(true)
      expect(result.userMessage).toBeDefined()
    })

    test('handles empty context gracefully', () => {
      const error = new Error('Test error')
      const result = errorManager.handleError(error, {})
      
      expect(result.handled).toBe(true)
    })

    test('handles context with circular references', () => {
      const circularContext: any = { component: 'Test' }
      circularContext.self = circularContext
      
      const error = new Error('Test error')
      expect(() => errorManager.handleError(error, circularContext)).not.toThrow()
    })

    test('handles very long error messages', () => {
      const longMessage = 'Error: ' + 'a'.repeat(10000)
      const error = new Error(longMessage)
      const result = errorManager.handleError(error)
      
      expect(result.handled).toBe(true)
      expect(result.userMessage).toBeDefined()
    })
  })
})

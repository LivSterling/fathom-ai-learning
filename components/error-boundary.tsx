/**
 * Error boundary components for graceful error handling in React
 */

"use client"

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { conceptIntakeAnalytics } from '@/lib/analytics/concept-intake-analytics'

interface ErrorInfo {
  componentStack: string
  errorBoundary?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  context?: string
}

/**
 * Main error boundary for the concept intake flow
 */
export class ConceptIntakeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo
    })

    // Log error to analytics
    conceptIntakeAnalytics.createErrorEvent({
      errorType: 'ui',
      errorCode: 'REACT_ERROR_BOUNDARY',
      errorMessage: error.message,
      stackTrace: error.stack,
      component: this.props.context || 'ConceptIntakeErrorBoundary',
      userAction: 'component_render',
      recoverable: true
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 React Error Boundary')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })

    // Track recovery attempt
    conceptIntakeAnalytics.createErrorEvent({
      errorType: 'ui',
      errorCode: 'ERROR_BOUNDARY_RETRY',
      errorMessage: 'User attempted to recover from error',
      component: this.props.context || 'ConceptIntakeErrorBoundary',
      userAction: 'retry_button_click',
      recoverable: true,
      userRecoveryAction: 'retry'
    })
  }

  handleGoHome = () => {
    // Track navigation away from error
    conceptIntakeAnalytics.createErrorEvent({
      errorType: 'ui',
      errorCode: 'ERROR_BOUNDARY_NAVIGATE',
      errorMessage: 'User navigated away from error',
      component: this.props.context || 'ConceptIntakeErrorBoundary',
      userAction: 'home_button_click',
      recoverable: true,
      userRecoveryAction: 'skip'
    })

    // Navigate to home page
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-xl text-destructive">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                We encountered an unexpected error while processing your request. 
                Don't worry - your progress has been saved and you can try again.
              </p>

              {this.props.showDetails && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono">
                    <p><strong>Error:</strong> {this.state.error.message}</p>
                    <p><strong>Error ID:</strong> {this.state.errorId}</p>
                    {this.state.error.stack && (
                      <p><strong>Stack:</strong> {this.state.error.stack.split('\n')[0]}</p>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={this.handleRetry}
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">
                  Error ID: {this.state.errorId}
                </p>
                <p className="text-xs text-muted-foreground">
                  If this problem persists, please contact support with the error ID above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Lightweight error boundary for smaller components
 */
export class ComponentErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `comp_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Log error to analytics
    conceptIntakeAnalytics.createErrorEvent({
      errorType: 'ui',
      errorCode: 'COMPONENT_ERROR_BOUNDARY',
      errorMessage: error.message,
      stackTrace: error.stack,
      component: this.props.context || 'ComponentErrorBoundary',
      userAction: 'component_render',
      recoverable: true
    })

    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-4 border border-destructive/20 rounded-md bg-destructive/5">
          <div className="flex items-center gap-2 mb-2">
            <Bug className="w-4 h-4 text-destructive" />
            <h3 className="text-sm font-medium text-destructive">
              Component Error
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            This component encountered an error and couldn't load properly.
          </p>
          <Button
            onClick={this.handleRetry}
            size="sm"
            variant="outline"
            className="h-8"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook for handling async errors in functional components
 */
export function useErrorHandler() {
  const handleError = (error: Error, context?: string) => {
    // Log error to analytics
    conceptIntakeAnalytics.createErrorEvent({
      errorType: 'ui',
      errorCode: 'ASYNC_ERROR',
      errorMessage: error.message,
      stackTrace: error.stack,
      component: context || 'useErrorHandler',
      userAction: 'async_operation',
      recoverable: true
    })

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('Async Error:', error)
    }

    // You could also throw the error to let an error boundary catch it
    // throw error
  }

  return { handleError }
}

/**
 * Higher-order component for adding error boundaries
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ComponentErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ComponentErrorBoundary>
  )

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`

  return WithErrorBoundaryComponent
}

/**
 * Error fallback components for specific scenarios
 */
export const FileUploadErrorFallback = ({ onRetry }: { onRetry: () => void }) => (
  <div className="p-4 border border-destructive/20 rounded-md bg-destructive/5">
    <div className="flex items-center gap-2 mb-2">
      <AlertTriangle className="w-4 h-4 text-destructive" />
      <h3 className="text-sm font-medium text-destructive">File Upload Error</h3>
    </div>
    <p className="text-xs text-muted-foreground mb-3">
      There was a problem uploading your file. Please try again or choose a different file.
    </p>
    <Button onClick={onRetry} size="sm" variant="outline" className="h-8">
      <RefreshCw className="w-3 h-3 mr-1" />
      Try Again
    </Button>
  </div>
)

export const ConceptProcessingErrorFallback = ({ onRetry }: { onRetry: () => void }) => (
  <div className="p-4 border border-destructive/20 rounded-md bg-destructive/5">
    <div className="flex items-center gap-2 mb-2">
      <AlertTriangle className="w-4 h-4 text-destructive" />
      <h3 className="text-sm font-medium text-destructive">Processing Error</h3>
    </div>
    <p className="text-xs text-muted-foreground mb-3">
      We couldn't process your concept right now. This might be temporary - please try again.
    </p>
    <Button onClick={onRetry} size="sm" variant="outline" className="h-8">
      <RefreshCw className="w-3 h-3 mr-1" />
      Retry Processing
    </Button>
  </div>
)

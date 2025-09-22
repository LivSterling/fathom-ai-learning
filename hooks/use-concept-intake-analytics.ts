/**
 * React hooks for concept intake analytics integration
 */

import { useEffect, useRef, useCallback } from 'react'
import { conceptIntakeAnalytics } from '@/lib/analytics/concept-intake-analytics'
import type { EventData } from '@/types/concept-intake'

/**
 * Main hook for concept intake analytics
 */
export function useConceptIntakeAnalytics() {
  const sessionStartTime = useRef<number>(Date.now())

  useEffect(() => {
    // Track session start
    conceptIntakeAnalytics.createFlowStepEvent({
      step: 'concept_input',
      action: 'enter',
      timeOnStep: 0
    })

    // Cleanup on unmount
    return () => {
      const sessionDuration = Date.now() - sessionStartTime.current
      conceptIntakeAnalytics.createFlowStepEvent({
        step: 'concept_input',
        action: 'exit',
        timeOnStep: sessionDuration
      })
      
      conceptIntakeAnalytics.flush()
    }
  }, [])

  // Event tracking methods
  const trackConceptInput = useCallback((data: EventData<'concept_input'>) => {
    conceptIntakeAnalytics.createConceptInputEvent(data)
  }, [])

  const trackChipInteraction = useCallback((data: EventData<'concept_chip_interaction'>) => {
    conceptIntakeAnalytics.createChipInteractionEvent(data)
  }, [])

  const trackFileUpload = useCallback((data: EventData<'file_upload'>) => {
    conceptIntakeAnalytics.createFileUploadEvent(data)
  }, [])

  const trackFlowStep = useCallback((data: EventData<'flow_step'>) => {
    conceptIntakeAnalytics.createFlowStepEvent(data)
  }, [])

  const trackError = useCallback((data: EventData<'error'>) => {
    conceptIntakeAnalytics.createErrorEvent(data)
  }, [])

  const trackAPICall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    endpoint: string,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<T> => {
    return conceptIntakeAnalytics.trackAPICall(apiCall, endpoint, method)
  }, [])

  return {
    trackConceptInput,
    trackChipInteraction,
    trackFileUpload,
    trackFlowStep,
    trackError,
    trackAPICall
  }
}

/**
 * Hook for tracking concept input with debouncing
 */
export function useConceptInputTracking(debounceMs: number = 1000) {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const inputStartTime = useRef<number>()
  const { trackConceptInput } = useConceptIntakeAnalytics()

  const trackInput = useCallback((
    concept: string,
    inputMethod: 'typing' | 'chip_selection' | 'paste' = 'typing'
  ) => {
    if (!inputStartTime.current) {
      inputStartTime.current = Date.now()
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout for debounced tracking
    timeoutRef.current = setTimeout(() => {
      const timeToInput = Date.now() - (inputStartTime.current || Date.now())
      
      trackConceptInput({
        concept: concept.substring(0, 100), // Limit for privacy
        inputMethod,
        conceptLength: concept.length,
        conceptCategory: detectConceptCategory(concept),
        conceptComplexity: detectConceptComplexity(concept),
        timeToInput,
        hasTypos: detectTypos(concept),
        language: detectLanguage(concept)
      })
    }, debounceMs)
  }, [trackConceptInput, debounceMs])

  const resetInputTracking = useCallback(() => {
    inputStartTime.current = Date.now()
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { trackInput, resetInputTracking }
}

/**
 * Hook for tracking file upload progress and metrics
 */
export function useFileUploadTracking() {
  const uploadStartTime = useRef<number>()
  const { trackFileUpload } = useConceptIntakeAnalytics()

  const trackUploadStart = useCallback((fileName: string, fileSize: number, method: 'drag_drop' | 'click_upload') => {
    uploadStartTime.current = Date.now()
    
    // Track upload initiation
    trackFileUpload({
      fileName,
      fileSize,
      fileType: getFileExtension(fileName),
      uploadMethod: method,
      processingTime: 0,
      success: false, // Will be updated on completion
    })
  }, [trackFileUpload])

  const trackUploadComplete = useCallback((
    fileName: string,
    fileSize: number,
    success: boolean,
    wordCount?: number,
    pageCount?: number,
    errorType?: string,
    errorMessage?: string
  ) => {
    const processingTime = uploadStartTime.current ? Date.now() - uploadStartTime.current : 0
    
    trackFileUpload({
      fileName,
      fileSize,
      fileType: getFileExtension(fileName),
      uploadMethod: 'click_upload', // Default, should be tracked from start
      processingTime,
      success,
      wordCount,
      pageCount,
      errorType: errorType as any,
      errorMessage
    })
  }, [trackFileUpload])

  return { trackUploadStart, trackUploadComplete }
}

/**
 * Hook for tracking user engagement metrics
 */
export function useEngagementTracking() {
  const pageStartTime = useRef<number>(Date.now())
  const interactionCount = useRef<number>(0)
  const maxScrollDepth = useRef<number>(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollDepth = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      maxScrollDepth.current = Math.max(maxScrollDepth.current, scrollDepth)
    }

    const handleInteraction = () => {
      interactionCount.current += 1
    }

    // Add event listeners
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('click', handleInteraction)
    window.addEventListener('keydown', handleInteraction)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)

      // Track final engagement metrics
      const timeSpent = Date.now() - pageStartTime.current
      conceptIntakeAnalytics.track({
        eventType: 'engagement',
        eventId: `engagement_${Date.now()}`,
        timestamp: new Date(),
        sessionId: '',
        device: conceptIntakeAnalytics['deviceInfo'],
        data: {
          action: 'blur',
          timeSpent,
          scrollDepth: maxScrollDepth.current,
          interactionCount: interactionCount.current,
          bounced: interactionCount.current < 3
        }
      })
    }
  }, [])

  return {
    getTimeSpent: () => Date.now() - pageStartTime.current,
    getInteractionCount: () => interactionCount.current,
    getMaxScrollDepth: () => maxScrollDepth.current
  }
}

/**
 * Hook for tracking drop-off points in the onboarding flow
 */
export function useDropOffTracking(stepName: string) {
  const stepStartTime = useRef<number>(Date.now())
  const { trackFlowStep } = useConceptIntakeAnalytics()

  useEffect(() => {
    // Track step entry
    trackFlowStep({
      step: stepName as any,
      action: 'enter',
      timeOnStep: 0
    })

    return () => {
      // Track step exit
      const timeOnStep = Date.now() - stepStartTime.current
      trackFlowStep({
        step: stepName as any,
        action: 'exit',
        timeOnStep
      })
    }
  }, [stepName, trackFlowStep])

  const trackStepCompletion = useCallback((completionRate: number = 100) => {
    const timeOnStep = Date.now() - stepStartTime.current
    trackFlowStep({
      step: stepName as any,
      action: 'complete',
      timeOnStep,
      completionRate
    })
  }, [stepName, trackFlowStep])

  const trackStepAbandonment = useCallback((reason?: string) => {
    const timeOnStep = Date.now() - stepStartTime.current
    trackFlowStep({
      step: stepName as any,
      action: 'abandon',
      timeOnStep,
      exitReason: reason as any
    })
  }, [stepName, trackFlowStep])

  return { trackStepCompletion, trackStepAbandonment }
}

// Utility functions
function detectConceptCategory(concept: string): string {
  const lowerConcept = concept.toLowerCase()
  
  if (lowerConcept.includes('react') || lowerConcept.includes('javascript') || lowerConcept.includes('programming')) {
    return 'technology'
  }
  if (lowerConcept.includes('business') || lowerConcept.includes('marketing') || lowerConcept.includes('finance')) {
    return 'business'
  }
  if (lowerConcept.includes('biology') || lowerConcept.includes('chemistry') || lowerConcept.includes('physics')) {
    return 'science'
  }
  if (lowerConcept.includes('spanish') || lowerConcept.includes('french') || lowerConcept.includes('language')) {
    return 'language'
  }
  if (lowerConcept.includes('art') || lowerConcept.includes('design') || lowerConcept.includes('creative')) {
    return 'creative'
  }
  if (lowerConcept.includes('psychology') || lowerConcept.includes('history') || lowerConcept.includes('sociology')) {
    return 'social-science'
  }
  
  return 'general'
}

function detectConceptComplexity(concept: string): 'simple' | 'moderate' | 'complex' {
  const wordCount = concept.split(' ').length
  const hasAdvancedTerms = /advanced|expert|deep|comprehensive|complex/.test(concept.toLowerCase())
  
  if (wordCount > 10 || hasAdvancedTerms) return 'complex'
  if (wordCount > 5) return 'moderate'
  return 'simple'
}

function detectTypos(concept: string): boolean {
  // Simple heuristic: check for common typos or unusual character patterns
  const hasRepeatedChars = /(.)\1{2,}/.test(concept)
  const hasUnusualSpacing = /\s{2,}/.test(concept)
  return hasRepeatedChars || hasUnusualSpacing
}

function detectLanguage(concept: string): string {
  // Simple language detection - in a real app you might use a library
  const hasNonEnglish = /[^\x00-\x7F]/.test(concept)
  return hasNonEnglish ? 'non-english' : 'english'
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || 'unknown'
}

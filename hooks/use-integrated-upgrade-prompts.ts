'use client'

import { useState, useCallback, useEffect } from 'react'
import { UpgradePromptTrigger } from '@/types/guest'
import { useSimpleGuestSession } from './use-simple-guest-session'
import { useUpgradePromptScheduler } from './use-upgrade-prompt-scheduler'
import { useUpgradePromptABTest } from '@/lib/upgrade-prompt-ab-testing'
import { upgradeMessageGenerator } from '@/lib/upgrade-message-generator'

interface UpgradePromptState {
  isVisible: boolean
  trigger: UpgradePromptTrigger | null
  variant: any | null
  contextualMessage: any | null
}

/**
 * Comprehensive hook that integrates all upgrade prompt functionality
 * Handles scheduling, A/B testing, contextual messaging, and display logic
 */
export function useIntegratedUpgradePrompts() {
  const guestSession = useSimpleGuestSession()
  const scheduler = useUpgradePromptScheduler()
  const [promptState, setPromptState] = useState<UpgradePromptState>({
    isVisible: false,
    trigger: null,
    variant: null,
    contextualMessage: null
  })

  // Get A/B test variant for current prompt
  const { variant: abVariant, recordEvent, isInExperiment } = useUpgradePromptABTest(
    guestSession.guestId || 'anonymous',
    promptState.trigger || 'time_based'
  )

  // Check for prompts to show based on current context
  const checkForPrompts = useCallback(() => {
    if (!guestSession.isGuest || !guestSession.session) return

    const nextPrompt = scheduler.getNextPrompt()
    if (nextPrompt && !promptState.isVisible) {
      // Generate contextual message
      const contextualMessage = upgradeMessageGenerator.getContextualMessage(nextPrompt, guestSession)
      
      setPromptState({
        isVisible: true,
        trigger: nextPrompt,
        variant: abVariant,
        contextualMessage
      })

      // Record that prompt was shown
      scheduler.recordPromptShown(nextPrompt)
      recordEvent('shown', {
        sessionAge: Math.ceil((Date.now() - new Date(guestSession.session.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        completedLessons: guestSession.session.userData.progress.completedLessons,
        totalFlashcards: guestSession.session.userData.flashcards.length
      })
    }
  }, [guestSession, scheduler, promptState.isVisible, abVariant, recordEvent])

  // Auto-check for prompts on session changes
  useEffect(() => {
    const interval = setInterval(checkForPrompts, 30000) // Check every 30 seconds
    checkForPrompts() // Check immediately

    return () => clearInterval(interval)
  }, [checkForPrompts])

  // Handle prompt dismissal
  const dismissPrompt = useCallback(() => {
    if (promptState.trigger) {
      scheduler.recordPromptDismissed(promptState.trigger)
      recordEvent('dismissed')
    }
    
    setPromptState({
      isVisible: false,
      trigger: null,
      variant: null,
      contextualMessage: null
    })
  }, [promptState.trigger, scheduler, recordEvent])

  // Handle upgrade click
  const handleUpgradeClick = useCallback(() => {
    if (promptState.trigger) {
      recordEvent('clicked')
      // Note: Actual upgrade conversion will be recorded elsewhere when account is created
    }
    
    setPromptState({
      isVisible: false,
      trigger: null,
      variant: null,
      contextualMessage: null
    })
  }, [promptState.trigger, recordEvent])

  // Manually trigger a specific prompt (for testing or specific scenarios)
  const triggerPrompt = useCallback((trigger: UpgradePromptTrigger, force = false) => {
    if (!guestSession.isGuest) return

    if (force || scheduler.shouldShowPrompt(trigger)) {
      const contextualMessage = upgradeMessageGenerator.getContextualMessage(trigger, guestSession)
      
      setPromptState({
        isVisible: true,
        trigger,
        variant: abVariant,
        contextualMessage
      })

      if (!force) {
        scheduler.recordPromptShown(trigger)
        recordEvent('shown')
      }
    }
  }, [guestSession, scheduler, abVariant, recordEvent])

  // Check if a specific trigger should show
  const shouldShowTrigger = useCallback((trigger: UpgradePromptTrigger): boolean => {
    return scheduler.shouldShowPrompt(trigger)
  }, [scheduler])

  // Get prompt configuration based on A/B test variant or contextual message
  const getPromptConfig = useCallback(() => {
    if (!promptState.trigger || !promptState.contextualMessage) return null

    // Use A/B test variant config if available, otherwise use contextual message
    const config = abVariant?.config || {
      variant: 'banner',
      showBenefits: true,
      isDismissible: true
    }

    return {
      ...config,
      trigger: promptState.trigger,
      customMessage: promptState.contextualMessage.message,
      title: promptState.contextualMessage.title,
      benefits: promptState.contextualMessage.benefits,
      ctaText: promptState.contextualMessage.ctaText,
      urgencyLevel: promptState.contextualMessage.urgencyLevel
    }
  }, [promptState, abVariant])

  return {
    // Current prompt state
    isVisible: promptState.isVisible,
    trigger: promptState.trigger,
    promptConfig: getPromptConfig(),
    contextualMessage: promptState.contextualMessage,
    
    // Actions
    dismissPrompt,
    handleUpgradeClick,
    triggerPrompt,
    checkForPrompts,
    
    // Utilities
    shouldShowTrigger,
    isInExperiment,
    
    // Stats and debugging
    schedulerStats: scheduler.getPromptStats(),
    canShowPrompts: scheduler.canShowPrompt,
    hasReachedLimits: scheduler.hasReachedFrequencyLimits
  }
}

/**
 * Simplified hook for page components that just need basic upgrade prompt functionality
 */
export function usePageUpgradePrompts(pageType: 'dashboard' | 'library' | 'plan' | 'review' | 'tutor') {
  const integrated = useIntegratedUpgradePrompts()
  const guestSession = useSimpleGuestSession()

  // Page-specific trigger logic
  useEffect(() => {
    if (!guestSession.isGuest) return

    // Check for page-specific triggers
    switch (pageType) {
      case 'dashboard':
        // Show engagement milestone on dashboard
        if (integrated.shouldShowTrigger('engagement_milestone')) {
          integrated.triggerPrompt('engagement_milestone')
        }
        break
        
      case 'library':
        // Show advanced feature access when accessing library
        if (integrated.shouldShowTrigger('advanced_feature_access')) {
          integrated.triggerPrompt('advanced_feature_access')
        }
        break
        
      case 'plan':
        // Show approaching limits when creating plans
        if (integrated.shouldShowTrigger('approaching_limits')) {
          integrated.triggerPrompt('approaching_limits')
        }
        break
        
      case 'review':
        // Show first lesson complete after review sessions
        if (integrated.shouldShowTrigger('first_lesson_complete')) {
          integrated.triggerPrompt('first_lesson_complete')
        }
        break
        
      case 'tutor':
        // Show time-based prompts in tutor
        if (integrated.shouldShowTrigger('time_based')) {
          integrated.triggerPrompt('time_based')
        }
        break
    }
  }, [pageType, integrated, guestSession.isGuest])

  return {
    isVisible: integrated.isVisible,
    promptConfig: integrated.promptConfig,
    onDismiss: integrated.dismissPrompt,
    onUpgrade: integrated.handleUpgradeClick,
    isGuest: guestSession.isGuest
  }
}

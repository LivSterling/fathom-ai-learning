'use client'

import { useState, useEffect, useCallback } from 'react'
import { UpgradePromptTrigger } from '@/types/guest'
import { useGuestSession } from './use-guest-session'

interface PromptSchedule {
  trigger: UpgradePromptTrigger
  lastShown?: number
  shownCount: number
  dismissed?: boolean
  dismissedAt?: number
}

interface SchedulerConfig {
  maxPromptsPerDay: number
  maxPromptsPerWeek: number
  cooldownBetweenPrompts: number // minutes
  respectDismissals: boolean
}

const DEFAULT_CONFIG: SchedulerConfig = {
  maxPromptsPerDay: 3,
  maxPromptsPerWeek: 10,
  cooldownBetweenPrompts: 30, // 30 minutes between any prompts
  respectDismissals: true
}

/**
 * Hook for managing upgrade prompt scheduling to prevent overwhelming users
 * Implements smart scheduling with cooldowns, frequency limits, and dismissal tracking
 */
export function useUpgradePromptScheduler(config: Partial<SchedulerConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const { session, shouldShowUpgradePrompt } = useGuestSession()
  const [promptHistory, setPromptHistory] = useState<Record<UpgradePromptTrigger, PromptSchedule>>({} as any)
  const [lastPromptShown, setLastPromptShown] = useState<number>(0)

  // Load prompt history from localStorage
  useEffect(() => {
    if (!session) return

    try {
      const historyKey = `upgrade-prompt-history-${session.id}`
      const savedHistory = localStorage.getItem(historyKey)
      if (savedHistory) {
        setPromptHistory(JSON.parse(savedHistory))
      }
    } catch (error) {
      console.error('Error loading prompt history:', error)
    }
  }, [session])

  // Save prompt history to localStorage
  const savePromptHistory = useCallback((history: Record<UpgradePromptTrigger, PromptSchedule>) => {
    if (!session) return

    try {
      const historyKey = `upgrade-prompt-history-${session.id}`
      localStorage.setItem(historyKey, JSON.stringify(history))
      setPromptHistory(history)
    } catch (error) {
      console.error('Error saving prompt history:', error)
    }
  }, [session])

  // Check if we've hit daily/weekly limits
  const hasReachedFrequencyLimits = useCallback((): boolean => {
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    const oneWeekMs = 7 * oneDayMs

    const promptsToday = Object.values(promptHistory).filter(schedule => 
      schedule.lastShown && (now - schedule.lastShown) < oneDayMs
    ).length

    const promptsThisWeek = Object.values(promptHistory).filter(schedule => 
      schedule.lastShown && (now - schedule.lastShown) < oneWeekMs
    ).length

    return promptsToday >= finalConfig.maxPromptsPerDay || 
           promptsThisWeek >= finalConfig.maxPromptsPerWeek
  }, [promptHistory, finalConfig])

  // Check if enough time has passed since last prompt
  const hasEnoughCooldownPassed = useCallback((): boolean => {
    const now = Date.now()
    const cooldownMs = finalConfig.cooldownBetweenPrompts * 60 * 1000
    return (now - lastPromptShown) >= cooldownMs
  }, [lastPromptShown, finalConfig.cooldownBetweenPrompts])

  // Check if a specific trigger should show a prompt
  const shouldShowPrompt = useCallback((trigger: UpgradePromptTrigger): boolean => {
    // Basic checks
    if (!session || !shouldShowUpgradePrompt(trigger)) {
      return false
    }

    // Check frequency limits
    if (hasReachedFrequencyLimits()) {
      return false
    }

    // Check cooldown between prompts
    if (!hasEnoughCooldownPassed()) {
      return false
    }

    // Check dismissal status for this specific trigger
    const schedule = promptHistory[trigger]
    if (schedule && finalConfig.respectDismissals) {
      // If dismissed, check if enough time has passed based on trigger urgency
      if (schedule.dismissed && schedule.dismissedAt) {
        const dismissalCooldowns = {
          'first_lesson_complete': 24 * 60 * 60 * 1000,    // 1 day
          'approaching_limits': 4 * 60 * 60 * 1000,        // 4 hours
          'limit_reached': 60 * 60 * 1000,                 // 1 hour (urgent)
          'advanced_feature_access': 8 * 60 * 60 * 1000,   // 8 hours
          'time_based': 48 * 60 * 60 * 1000,               // 2 days
          'engagement_milestone': 12 * 60 * 60 * 1000      // 12 hours
        }

        const cooldownPeriod = dismissalCooldowns[trigger]
        const timeSinceDismissal = Date.now() - schedule.dismissedAt
        
        if (timeSinceDismissal < cooldownPeriod) {
          return false
        }
      }

      // Reduce frequency for triggers that have been shown multiple times
      if (schedule.shownCount >= 3) {
        // After 3 shows, only show once per day
        if (schedule.lastShown && (Date.now() - schedule.lastShown) < 24 * 60 * 60 * 1000) {
          return false
        }
      }
    }

    return true
  }, [session, shouldShowUpgradePrompt, hasReachedFrequencyLimits, hasEnoughCooldownPassed, promptHistory, finalConfig.respectDismissals])

  // Record that a prompt was shown
  const recordPromptShown = useCallback((trigger: UpgradePromptTrigger) => {
    const now = Date.now()
    setLastPromptShown(now)

    const updatedHistory = {
      ...promptHistory,
      [trigger]: {
        trigger,
        lastShown: now,
        shownCount: (promptHistory[trigger]?.shownCount || 0) + 1,
        dismissed: false
      }
    }

    savePromptHistory(updatedHistory)
  }, [promptHistory, savePromptHistory])

  // Record that a prompt was dismissed
  const recordPromptDismissed = useCallback((trigger: UpgradePromptTrigger) => {
    const now = Date.now()
    
    const updatedHistory = {
      ...promptHistory,
      [trigger]: {
        ...promptHistory[trigger],
        trigger,
        dismissed: true,
        dismissedAt: now
      }
    }

    savePromptHistory(updatedHistory)
  }, [promptHistory, savePromptHistory])

  // Get the next best prompt to show (prioritized)
  const getNextPrompt = useCallback((): UpgradePromptTrigger | null => {
    // Priority order (high to low urgency)
    const triggerPriority: UpgradePromptTrigger[] = [
      'limit_reached',
      'approaching_limits',
      'advanced_feature_access',
      'first_lesson_complete',
      'engagement_milestone',
      'time_based'
    ]

    for (const trigger of triggerPriority) {
      if (shouldShowPrompt(trigger)) {
        return trigger
      }
    }

    return null
  }, [shouldShowPrompt])

  // Get statistics about prompt history
  const getPromptStats = useCallback(() => {
    const totalShown = Object.values(promptHistory).reduce((sum, schedule) => sum + schedule.shownCount, 0)
    const totalDismissed = Object.values(promptHistory).filter(schedule => schedule.dismissed).length
    const dismissalRate = totalShown > 0 ? (totalDismissed / totalShown) * 100 : 0

    return {
      totalShown,
      totalDismissed,
      dismissalRate: Math.round(dismissalRate),
      hasReachedLimits: hasReachedFrequencyLimits(),
      canShowPrompt: hasEnoughCooldownPassed() && !hasReachedFrequencyLimits()
    }
  }, [promptHistory, hasReachedFrequencyLimits, hasEnoughCooldownPassed])

  // Reset all prompt history (useful for testing or user preference)
  const resetPromptHistory = useCallback(() => {
    if (!session) return

    try {
      const historyKey = `upgrade-prompt-history-${session.id}`
      localStorage.removeItem(historyKey)
      setPromptHistory({} as any)
      setLastPromptShown(0)
    } catch (error) {
      console.error('Error resetting prompt history:', error)
    }
  }, [session])

  return {
    // Core scheduling functions
    shouldShowPrompt,
    getNextPrompt,
    recordPromptShown,
    recordPromptDismissed,
    
    // Utility functions
    getPromptStats,
    resetPromptHistory,
    
    // State
    promptHistory,
    hasReachedFrequencyLimits: hasReachedFrequencyLimits(),
    canShowPrompt: hasEnoughCooldownPassed() && !hasReachedFrequencyLimits()
  }
}

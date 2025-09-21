'use client'

import { useState, useCallback, useEffect } from 'react'
import { UpgradePromptTrigger } from '@/types/guest'

interface PromptStats {
  totalShown: number
  totalDismissed: number
  totalClicked: number
  lastShown: Record<UpgradePromptTrigger, number | null>
  dismissedCount: Record<UpgradePromptTrigger, number>
}

/**
 * Hook for scheduling and managing upgrade prompt frequency
 */
export function useUpgradePromptScheduler() {
  const [stats, setStats] = useState<PromptStats>(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem('upgrade-prompt-stats')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // If parsing fails, use default
      }
    }
    
    return {
      totalShown: 0,
      totalDismissed: 0,
      totalClicked: 0,
      lastShown: {
        'first_lesson_complete': null,
        'approaching_limits': null,
        'limit_reached': null,
        'advanced_feature_access': null,
        'time_based': null,
        'engagement_milestone': null
      },
      dismissedCount: {
        'first_lesson_complete': 0,
        'approaching_limits': 0,
        'limit_reached': 0,
        'advanced_feature_access': 0,
        'time_based': 0,
        'engagement_milestone': 0
      }
    }
  })

  // Save stats to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('upgrade-prompt-stats', JSON.stringify(stats))
  }, [stats])

  // Check if we should show a prompt based on frequency limits
  const shouldShowPrompt = useCallback((trigger: UpgradePromptTrigger): boolean => {
    const now = Date.now()
    const lastShown = stats.lastShown[trigger]
    const dismissedCount = stats.dismissedCount[trigger]
    
    // Don't show if dismissed too many times
    if (dismissedCount >= 3) return false
    
    // Different cooldown periods based on trigger type
    const cooldownMs = {
      'first_lesson_complete': 24 * 60 * 60 * 1000,  // 24 hours
      'approaching_limits': 4 * 60 * 60 * 1000,      // 4 hours
      'limit_reached': 1 * 60 * 60 * 1000,           // 1 hour
      'advanced_feature_access': 8 * 60 * 60 * 1000, // 8 hours
      'time_based': 48 * 60 * 60 * 1000,             // 48 hours
      'engagement_milestone': 12 * 60 * 60 * 1000    // 12 hours
    }
    
    if (lastShown && (now - lastShown) < cooldownMs[trigger]) {
      return false
    }
    
    return true
  }, [stats])

  // Get the next prompt that should be shown
  const getNextPrompt = useCallback((): UpgradePromptTrigger | null => {
    // Priority order for prompts
    const triggers: UpgradePromptTrigger[] = [
      'limit_reached',
      'approaching_limits', 
      'first_lesson_complete',
      'engagement_milestone',
      'advanced_feature_access',
      'time_based'
    ]
    
    for (const trigger of triggers) {
      if (shouldShowPrompt(trigger)) {
        return trigger
      }
    }
    
    return null
  }, [shouldShowPrompt])

  // Record that a prompt was shown
  const recordPromptShown = useCallback((trigger: UpgradePromptTrigger) => {
    setStats(prev => ({
      ...prev,
      totalShown: prev.totalShown + 1,
      lastShown: {
        ...prev.lastShown,
        [trigger]: Date.now()
      }
    }))
  }, [])

  // Record that a prompt was dismissed
  const recordPromptDismissed = useCallback((trigger: UpgradePromptTrigger) => {
    setStats(prev => ({
      ...prev,
      totalDismissed: prev.totalDismissed + 1,
      dismissedCount: {
        ...prev.dismissedCount,
        [trigger]: prev.dismissedCount[trigger] + 1
      }
    }))
  }, [])

  // Record that a prompt was clicked
  const recordPromptClicked = useCallback((trigger: UpgradePromptTrigger) => {
    setStats(prev => ({
      ...prev,
      totalClicked: prev.totalClicked + 1
    }))
  }, [])

  // Check if we can show any prompts (not rate limited)
  const canShowPrompt = stats.totalShown < 10 // Max 10 prompts per session

  // Check if we've reached frequency limits
  const hasReachedFrequencyLimits = stats.totalDismissed >= 5 // Stop after 5 dismissals

  // Get prompt statistics
  const getPromptStats = useCallback(() => stats, [stats])

  // Reset stats (for testing or new sessions)
  const resetStats = useCallback(() => {
    setStats({
      totalShown: 0,
      totalDismissed: 0,
      totalClicked: 0,
      lastShown: {
        'first_lesson_complete': null,
        'approaching_limits': null,
        'limit_reached': null,
        'advanced_feature_access': null,
        'time_based': null,
        'engagement_milestone': null
      },
      dismissedCount: {
        'first_lesson_complete': 0,
        'approaching_limits': 0,
        'limit_reached': 0,
        'advanced_feature_access': 0,
        'time_based': 0,
        'engagement_milestone': 0
      }
    })
  }, [])

  return {
    shouldShowPrompt,
    getNextPrompt,
    recordPromptShown,
    recordPromptDismissed,
    recordPromptClicked,
    getPromptStats,
    canShowPrompt,
    hasReachedFrequencyLimits,
    resetStats
  }
}
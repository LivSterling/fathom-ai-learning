import { useMemo } from 'react'
import { useGuestSession } from './use-guest-session'
import { 
  guestProgressTracker, 
  DetailedProgressStats, 
  ProgressMilestone 
} from '@/lib/guest-progress-tracker'

/**
 * React hook for accessing guest user progress tracking
 */
export function useGuestProgress() {
  const { session, isGuest, isLoading } = useGuestSession()

  const progressStats = useMemo((): DetailedProgressStats | null => {
    if (!isGuest || !session?.userData) return null
    return guestProgressTracker.calculateDetailedStats(session.userData)
  }, [session?.userData, isGuest])

  const milestones = useMemo((): ProgressMilestone[] => {
    if (!isGuest || !session?.userData) return []
    return guestProgressTracker.getProgressMilestones(session.userData)
  }, [session?.userData, isGuest])

  const remainingCapacity = useMemo(() => {
    if (!isGuest || !session?.userData) return null
    return guestProgressTracker.calculateRemainingCapacity(session.userData)
  }, [session?.userData, isGuest])

  const upgradeSuggestions = useMemo((): string[] => {
    if (!isGuest || !session?.userData) return []
    return guestProgressTracker.getUpgradeSuggestions(session.userData)
  }, [session?.userData, isGuest])

  // Achievement helpers
  const recentAchievements = useMemo((): ProgressMilestone[] => {
    return milestones.filter(milestone => {
      if (!milestone.achieved || !milestone.achievedAt) return false
      
      const achievedDate = new Date(milestone.achievedAt)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      return achievedDate >= weekAgo
    })
  }, [milestones])

  const nextMilestone = useMemo((): ProgressMilestone | null => {
    const unachieved = milestones
      .filter(m => !m.achieved)
      .sort((a, b) => b.progress - a.progress) // Sort by closest to completion
    
    return unachieved[0] || null
  }, [milestones])

  // Progress insights
  const insights = useMemo(() => {
    if (!progressStats) return []

    const insights: string[] = []

    // Learning velocity insights
    if (progressStats.lessons.completionRate > 80) {
      insights.push('You\'re completing lessons at an excellent rate!')
    } else if (progressStats.lessons.completionRate > 50) {
      insights.push('Good progress on your lessons. Keep it up!')
    }

    // Flashcard insights
    if (progressStats.flashcards.correctRate > 80) {
      insights.push('Your flashcard accuracy is impressive!')
    } else if (progressStats.flashcards.correctRate > 60) {
      insights.push('Your flashcard skills are improving!')
    }

    // Streak insights
    if (progressStats.streaks.current >= 7) {
      insights.push('Amazing streak! You\'re building a strong learning habit.')
    } else if (progressStats.streaks.current >= 3) {
      insights.push('Great consistency! Keep up the learning streak.')
    }

    // Usage insights
    if (progressStats.overall.overallProgress > 60) {
      insights.push('You\'re making great use of the platform!')
    }

    if (progressStats.plans.recentlyCreated > 0) {
      insights.push(`You've created ${progressStats.plans.recentlyCreated} new plan${progressStats.plans.recentlyCreated > 1 ? 's' : ''} this week!`)
    }

    return insights
  }, [progressStats])

  // Warning helpers
  const warnings = useMemo(() => {
    if (!progressStats) return []

    const warnings: string[] = []

    if (progressStats.overall.limitsReached) {
      warnings.push('You\'ve reached your creation limits.')
    } else if (progressStats.overall.nearingLimits) {
      warnings.push('You\'re approaching your creation limits.')
    }

    if (progressStats.plans.percentage >= 80) {
      warnings.push(`You've used ${progressStats.plans.percentage}% of your plan limit.`)
    }

    if (progressStats.lessons.percentage >= 80) {
      warnings.push(`You've used ${progressStats.lessons.percentage}% of your lesson limit.`)
    }

    if (progressStats.flashcards.percentage >= 80) {
      warnings.push(`You've used ${progressStats.flashcards.percentage}% of your flashcard limit.`)
    }

    return warnings
  }, [progressStats])

  return {
    // Core data
    progressStats,
    milestones,
    remainingCapacity,
    upgradeSuggestions,
    
    // Achievements and goals
    recentAchievements,
    nextMilestone,
    
    // Insights and warnings
    insights,
    warnings,
    
    // State
    isGuest,
    isLoading,
    hasData: !!progressStats
  }
}

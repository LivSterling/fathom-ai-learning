import { GuestUserData, GuestProgress, GuestLimits, GUEST_LIMITS } from '@/types/guest'

export interface DetailedProgressStats {
  plans: {
    total: number
    limit: number
    remaining: number
    percentage: number
    recentlyCreated: number // Created in last 7 days
  }
  lessons: {
    total: number
    completed: number
    limit: number
    remaining: number
    percentage: number
    completionRate: number
  }
  flashcards: {
    total: number
    limit: number
    remaining: number
    percentage: number
    reviewed: number
    correctRate: number
  }
  overall: {
    totalItems: number
    totalLimits: number
    overallProgress: number
    nearingLimits: boolean
    limitsReached: boolean
  }
  streaks: {
    current: number
    longest: number
    lastStudyDate: string | null
  }
  timeSpent: {
    total: number // in minutes
    thisWeek: number
    average: number // per day
  }
}

export interface ProgressMilestone {
  id: string
  title: string
  description: string
  achieved: boolean
  achievedAt?: string
  progress: number // 0-100
  requirement: number
  current: number
}

/**
 * Utility class for tracking and calculating guest user progress
 */
export class GuestProgressTracker {
  private static instance: GuestProgressTracker

  static getInstance(): GuestProgressTracker {
    if (!GuestProgressTracker.instance) {
      GuestProgressTracker.instance = new GuestProgressTracker()
    }
    return GuestProgressTracker.instance
  }

  /**
   * Calculate detailed progress statistics
   */
  calculateDetailedStats(userData: GuestUserData): DetailedProgressStats {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Plan statistics
    const totalPlans = userData.plans.length
    const recentPlans = userData.plans.filter(plan => 
      new Date(plan.createdAt) >= weekAgo
    ).length

    // Lesson statistics
    const allLessons = userData.plans.flatMap(plan => 
      plan.modules.flatMap(module => module.lessons)
    )
    const totalLessons = allLessons.length
    const completedLessons = allLessons.filter(lesson => lesson.completed).length
    const lessonCompletionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

    // Flashcard statistics
    const totalFlashcards = userData.flashcards.length
    const reviewedFlashcards = userData.flashcards.filter(card => card.reviewCount > 0).length
    const totalReviews = userData.flashcards.reduce((sum, card) => sum + card.reviewCount, 0)
    const correctReviews = userData.flashcards.reduce((sum, card) => sum + card.correctCount, 0)
    const correctRate = totalReviews > 0 ? (correctReviews / totalReviews) * 100 : 0

    // Calculate percentages against limits
    const planPercentage = (totalPlans / GUEST_LIMITS.maxPlans) * 100
    const lessonPercentage = (totalLessons / GUEST_LIMITS.maxLessons) * 100
    const flashcardPercentage = (totalFlashcards / GUEST_LIMITS.maxFlashcards) * 100

    // Overall progress
    const totalItems = totalPlans + totalLessons + totalFlashcards
    const totalLimits = GUEST_LIMITS.maxPlans + GUEST_LIMITS.maxLessons + GUEST_LIMITS.maxFlashcards
    const overallProgress = totalLimits > 0 ? (totalItems / totalLimits) * 100 : 0
    const nearingLimits = overallProgress >= 80
    const limitsReached = planPercentage >= 100 || lessonPercentage >= 100 || flashcardPercentage >= 100

    // Time and streak calculations
    const currentStreak = userData.progress.streak
    const studyMinutes = userData.progress.studyMinutes
    const averageMinutesPerDay = studyMinutes / Math.max(1, this.getDaysSinceCreation(userData))

    return {
      plans: {
        total: totalPlans,
        limit: GUEST_LIMITS.maxPlans,
        remaining: Math.max(0, GUEST_LIMITS.maxPlans - totalPlans),
        percentage: Math.round(planPercentage),
        recentlyCreated: recentPlans
      },
      lessons: {
        total: totalLessons,
        completed: completedLessons,
        limit: GUEST_LIMITS.maxLessons,
        remaining: Math.max(0, GUEST_LIMITS.maxLessons - totalLessons),
        percentage: Math.round(lessonPercentage),
        completionRate: Math.round(lessonCompletionRate)
      },
      flashcards: {
        total: totalFlashcards,
        limit: GUEST_LIMITS.maxFlashcards,
        remaining: Math.max(0, GUEST_LIMITS.maxFlashcards - totalFlashcards),
        percentage: Math.round(flashcardPercentage),
        reviewed: reviewedFlashcards,
        correctRate: Math.round(correctRate)
      },
      overall: {
        totalItems,
        totalLimits,
        overallProgress: Math.round(overallProgress),
        nearingLimits,
        limitsReached
      },
      streaks: {
        current: currentStreak,
        longest: this.calculateLongestStreak(userData),
        lastStudyDate: userData.progress.lastStudyDate || null
      },
      timeSpent: {
        total: studyMinutes,
        thisWeek: this.calculateWeeklyStudyTime(userData),
        average: Math.round(averageMinutesPerDay)
      }
    }
  }

  /**
   * Get progress milestones and achievements
   */
  getProgressMilestones(userData: GuestUserData): ProgressMilestone[] {
    const stats = this.calculateDetailedStats(userData)
    
    const milestones: ProgressMilestone[] = [
      {
        id: 'first-plan',
        title: 'First Learning Plan',
        description: 'Create your first learning plan',
        achieved: stats.plans.total >= 1,
        achievedAt: stats.plans.total >= 1 ? userData.plans[0]?.createdAt : undefined,
        progress: Math.min(100, (stats.plans.total / 1) * 100),
        requirement: 1,
        current: stats.plans.total
      },
      {
        id: 'ten-flashcards',
        title: 'Flashcard Collector',
        description: 'Create 10 flashcards',
        achieved: stats.flashcards.total >= 10,
        achievedAt: stats.flashcards.total >= 10 ? this.getAchievementDate(userData.flashcards, 10) : undefined,
        progress: Math.min(100, (stats.flashcards.total / 10) * 100),
        requirement: 10,
        current: stats.flashcards.total
      },
      {
        id: 'first-lesson',
        title: 'Learning Started',
        description: 'Complete your first lesson',
        achieved: stats.lessons.completed >= 1,
        achievedAt: stats.lessons.completed >= 1 ? this.getFirstCompletedLessonDate(userData) : undefined,
        progress: Math.min(100, (stats.lessons.completed / 1) * 100),
        requirement: 1,
        current: stats.lessons.completed
      },
      {
        id: 'five-lessons',
        title: 'Knowledge Builder',
        description: 'Complete 5 lessons',
        achieved: stats.lessons.completed >= 5,
        achievedAt: stats.lessons.completed >= 5 ? this.getNthCompletedLessonDate(userData, 5) : undefined,
        progress: Math.min(100, (stats.lessons.completed / 5) * 100),
        requirement: 5,
        current: stats.lessons.completed
      },
      {
        id: 'seven-day-streak',
        title: 'Consistent Learner',
        description: 'Maintain a 7-day learning streak',
        achieved: stats.streaks.current >= 7,
        achievedAt: stats.streaks.current >= 7 ? this.getStreakAchievementDate(userData, 7) : undefined,
        progress: Math.min(100, (stats.streaks.current / 7) * 100),
        requirement: 7,
        current: stats.streaks.current
      },
      {
        id: 'power-user',
        title: 'Power User',
        description: 'Use 80% of your guest limits',
        achieved: stats.overall.overallProgress >= 80,
        achievedAt: stats.overall.overallProgress >= 80 ? new Date().toISOString() : undefined,
        progress: Math.min(100, stats.overall.overallProgress),
        requirement: 80,
        current: Math.round(stats.overall.overallProgress)
      }
    ]

    return milestones
  }

  /**
   * Calculate remaining capacity for each content type
   */
  calculateRemainingCapacity(userData: GuestUserData): {
    plans: { remaining: number; percentage: number }
    lessons: { remaining: number; percentage: number }
    flashcards: { remaining: number; percentage: number }
  } {
    const totalPlans = userData.plans.length
    const totalLessons = userData.plans.flatMap(plan => 
      plan.modules.flatMap(module => module.lessons)
    ).length
    const totalFlashcards = userData.flashcards.length

    return {
      plans: {
        remaining: Math.max(0, GUEST_LIMITS.maxPlans - totalPlans),
        percentage: Math.round(((GUEST_LIMITS.maxPlans - totalPlans) / GUEST_LIMITS.maxPlans) * 100)
      },
      lessons: {
        remaining: Math.max(0, GUEST_LIMITS.maxLessons - totalLessons),
        percentage: Math.round(((GUEST_LIMITS.maxLessons - totalLessons) / GUEST_LIMITS.maxLessons) * 100)
      },
      flashcards: {
        remaining: Math.max(0, GUEST_LIMITS.maxFlashcards - totalFlashcards),
        percentage: Math.round(((GUEST_LIMITS.maxFlashcards - totalFlashcards) / GUEST_LIMITS.maxFlashcards) * 100)
      }
    }
  }

  /**
   * Get upgrade suggestions based on current usage
   */
  getUpgradeSuggestions(userData: GuestUserData): string[] {
    const stats = this.calculateDetailedStats(userData)
    const suggestions: string[] = []

    if (stats.overall.limitsReached) {
      suggestions.push('You\'ve reached your creation limits. Upgrade to continue building your learning library.')
    }

    if (stats.overall.nearingLimits) {
      suggestions.push('You\'re approaching your limits. Upgrade now to avoid interruptions in your learning.')
    }

    if (stats.flashcards.total >= 30) {
      suggestions.push('With 30+ flashcards, upgrade to unlock advanced spaced repetition algorithms and analytics.')
    }

    if (stats.lessons.completed >= 5) {
      suggestions.push('Great progress! Upgrade to access unlimited lessons and sync across all your devices.')
    }

    if (stats.streaks.current >= 3) {
      suggestions.push('You\'re building a great learning habit! Upgrade to track detailed analytics and maintain your progress.')
    }

    if (suggestions.length === 0) {
      suggestions.push('Upgrade to unlock unlimited content creation and premium features.')
    }

    return suggestions
  }

  /**
   * Private helper methods
   */
  private getDaysSinceCreation(userData: GuestUserData): number {
    if (userData.plans.length === 0) return 1
    
    const oldestPlan = userData.plans.reduce((oldest, plan) => 
      new Date(plan.createdAt) < new Date(oldest.createdAt) ? plan : oldest
    )
    
    const daysDiff = Math.ceil((Date.now() - new Date(oldestPlan.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(1, daysDiff)
  }

  private calculateLongestStreak(userData: GuestUserData): number {
    // For now, return current streak as we don't store historical streak data
    // In a full implementation, this would analyze historical data
    return userData.progress.streak
  }

  private calculateWeeklyStudyTime(userData: GuestUserData): number {
    // For now, return a portion of total study time
    // In a full implementation, this would track time by date
    return Math.round(userData.progress.studyMinutes * 0.3) // Rough estimate
  }

  private getAchievementDate(items: any[], targetCount: number): string | undefined {
    if (items.length < targetCount) return undefined
    return items[targetCount - 1]?.createdAt
  }

  private getFirstCompletedLessonDate(userData: GuestUserData): string | undefined {
    for (const plan of userData.plans) {
      for (const module of plan.modules) {
        for (const lesson of module.lessons) {
          if (lesson.completed && lesson.completedAt) {
            return lesson.completedAt
          }
        }
      }
    }
    return undefined
  }

  private getNthCompletedLessonDate(userData: GuestUserData, n: number): string | undefined {
    const completedLessons = []
    for (const plan of userData.plans) {
      for (const module of plan.modules) {
        for (const lesson of module.lessons) {
          if (lesson.completed && lesson.completedAt) {
            completedLessons.push(lesson)
          }
        }
      }
    }
    
    completedLessons.sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime())
    return completedLessons[n - 1]?.completedAt
  }

  private getStreakAchievementDate(userData: GuestUserData, targetStreak: number): string | undefined {
    // For now, return current date if streak is achieved
    // In a full implementation, this would track when the streak was first achieved
    return userData.progress.streak >= targetStreak ? new Date().toISOString() : undefined
  }
}

// Export singleton instance
export const guestProgressTracker = GuestProgressTracker.getInstance()

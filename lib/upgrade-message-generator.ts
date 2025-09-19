import { UpgradePromptTrigger } from '@/types/guest'
import { UseGuestSessionReturn } from '@/hooks/use-guest-session'

interface ContextualMessage {
  title: string
  message: string
  benefits: string[]
  ctaText: string
  urgencyLevel: 'low' | 'medium' | 'high'
  personalizedElements: string[]
}

interface UserContext {
  completedLessons: number
  totalFlashcards: number
  totalPlans: number
  studyStreak: number
  studyMinutes: number
  sessionAge: number // days since account creation
  currentLimits: {
    flashcards: { current: number; max: number; percentage: number }
    lessons: { current: number; max: number; percentage: number }
    plans: { current: number; max: number; percentage: number }
  }
  recentActivity: {
    lastStudyDate?: string
    mostActiveTime?: 'morning' | 'afternoon' | 'evening'
    preferredContentType?: 'flashcards' | 'lessons' | 'plans'
  }
}

/**
 * Generates contextual upgrade messages based on user behavior and current activity
 */
export class UpgradeMessageGenerator {
  private static instance: UpgradeMessageGenerator

  static getInstance(): UpgradeMessageGenerator {
    if (!UpgradeMessageGenerator.instance) {
      UpgradeMessageGenerator.instance = new UpgradeMessageGenerator()
    }
    return UpgradeMessageGenerator.instance
  }

  /**
   * Generate a contextual upgrade message based on trigger and user context
   */
  generateMessage(trigger: UpgradePromptTrigger, context: UserContext): ContextualMessage {
    switch (trigger) {
      case 'first_lesson_complete':
        return this.generateFirstLessonMessage(context)
      
      case 'approaching_limits':
        return this.generateApproachingLimitsMessage(context)
      
      case 'limit_reached':
        return this.generateLimitReachedMessage(context)
      
      case 'advanced_feature_access':
        return this.generateAdvancedFeatureMessage(context)
      
      case 'time_based':
        return this.generateTimeBasedMessage(context)
      
      case 'engagement_milestone':
        return this.generateEngagementMilestoneMessage(context)
      
      default:
        return this.generateDefaultMessage(context)
    }
  }

  private generateFirstLessonMessage(context: UserContext): ContextualMessage {
    const personalizedElements = []
    
    if (context.studyMinutes > 0) {
      personalizedElements.push(`${context.studyMinutes} minutes of focused learning`)
    }

    const messages = [
      "🎉 Congratulations on completing your first lesson!",
      "🌟 Great start! You've taken the first step in your learning journey.",
      "🚀 Awesome! You're off to a fantastic start."
    ]

    const benefits = [
      "Unlimited lessons and flashcards",
      "Sync your progress across all devices",
      "Advanced AI-powered learning insights",
      "Priority customer support"
    ]

    return {
      title: messages[Math.floor(Math.random() * messages.length)],
      message: `You've shown you're serious about learning. Upgrade now to unlock unlimited content and never lose your progress again.`,
      benefits,
      ctaText: "Unlock Full Access",
      urgencyLevel: 'low',
      personalizedElements
    }
  }

  private generateApproachingLimitsMessage(context: UserContext): ContextualMessage {
    const personalizedElements = []
    
    // Find which limit is being approached
    const approachingLimit = Object.entries(context.currentLimits)
      .find(([_, limit]) => limit.percentage >= 80)

    if (approachingLimit) {
      const [limitType, limitData] = approachingLimit
      personalizedElements.push(`${limitData.current}/${limitData.max} ${limitType} used`)
    }

    // Contextual messaging based on most used content type
    let contentFocus = "content"
    let specificBenefit = "unlimited creation"
    
    if (context.recentActivity.preferredContentType === 'flashcards') {
      contentFocus = "flashcards"
      specificBenefit = "unlimited flashcard decks with spaced repetition"
    } else if (context.recentActivity.preferredContentType === 'lessons') {
      contentFocus = "lessons"
      specificBenefit = "unlimited lesson creation with progress tracking"
    } else if (context.recentActivity.preferredContentType === 'plans') {
      contentFocus = "learning plans"
      specificBenefit = "unlimited personalized learning paths"
    }

    const messages = [
      `You're almost at your ${contentFocus} limit!`,
      `Running low on ${contentFocus} space?`,
      `Don't let limits slow your progress`
    ]

    return {
      title: messages[0],
      message: `You're clearly engaged with your learning. Upgrade now to continue creating ${contentFocus} without restrictions.`,
      benefits: [
        `Unlimited ${contentFocus} creation`,
        "Advanced progress analytics",
        "Cross-device synchronization",
        "Export and backup your data"
      ],
      ctaText: "Remove Limits",
      urgencyLevel: 'medium',
      personalizedElements
    }
  }

  private generateLimitReachedMessage(context: UserContext): ContextualMessage {
    const personalizedElements = []
    
    // Find which limit was reached
    const reachedLimits = Object.entries(context.currentLimits)
      .filter(([_, limit]) => limit.percentage >= 100)
      .map(([type, _]) => type)

    if (reachedLimits.length > 0) {
      personalizedElements.push(`${reachedLimits.join(', ')} limit${reachedLimits.length > 1 ? 's' : ''} reached`)
    }

    const urgentMessages = [
      "🚫 Creation limit reached!",
      "⚠️ You've hit your guest limits",
      "🛑 Can't create more content"
    ]

    return {
      title: urgentMessages[0],
      message: `You're clearly passionate about learning! Don't let limits stop your momentum. Upgrade now to continue your journey.`,
      benefits: [
        "Immediately unlock unlimited creation",
        "Never lose your progress again",
        "Advanced learning features",
        "Priority support when you need help"
      ],
      ctaText: "Upgrade Right Now",
      urgencyLevel: 'high',
      personalizedElements
    }
  }

  private generateAdvancedFeatureMessage(context: UserContext): ContextualMessage {
    const personalizedElements = []
    
    if (context.completedLessons > 0) {
      personalizedElements.push(`${context.completedLessons} lessons completed`)
    }
    
    if (context.studyStreak > 1) {
      personalizedElements.push(`${context.studyStreak}-day study streak`)
    }

    return {
      title: "🔓 Unlock Premium Features",
      message: `This advanced feature is designed for serious learners like you. Join thousands who've upgraded to accelerate their learning.`,
      benefits: [
        "Advanced AI tutoring and insights",
        "Collaborative learning tools",
        "Detailed performance analytics",
        "Custom learning algorithms"
      ],
      ctaText: "Unlock Advanced Features",
      urgencyLevel: 'medium',
      personalizedElements
    }
  }

  private generateTimeBasedMessage(context: UserContext): ContextualMessage {
    const personalizedElements = [`${context.sessionAge} days of learning`]
    
    if (context.studyMinutes > 0) {
      personalizedElements.push(`${Math.round(context.studyMinutes / 60)} hours studied`)
    }

    const timeBasedMessages = [
      `After ${context.sessionAge} days, you're clearly committed to learning!`,
      `${context.sessionAge} days of progress deserves unlimited access`,
      `You've been learning for ${context.sessionAge} days - time to level up!`
    ]

    return {
      title: "🗓️ Ready to Level Up?",
      message: timeBasedMessages[Math.floor(Math.random() * timeBasedMessages.length)],
      benefits: [
        "Unlimited content creation",
        "Advanced progress tracking",
        "Cross-device synchronization",
        "Achievement system and badges"
      ],
      ctaText: "Upgrade My Account",
      urgencyLevel: 'low',
      personalizedElements
    }
  }

  private generateEngagementMilestoneMessage(context: UserContext): ContextualMessage {
    const personalizedElements = []
    
    if (context.completedLessons >= 5) {
      personalizedElements.push(`${context.completedLessons} lessons mastered`)
    }
    
    if (context.totalFlashcards >= 20) {
      personalizedElements.push(`${context.totalFlashcards} flashcards created`)
    }

    if (context.studyStreak > 3) {
      personalizedElements.push(`${context.studyStreak}-day streak maintained`)
    }

    const milestoneMessages = [
      "🔥 You're on fire!",
      "⭐ Outstanding progress!",
      "🎯 Milestone achieved!",
      "💪 Learning champion!"
    ]

    const achievements = []
    if (context.completedLessons >= 5) achievements.push("lesson completion")
    if (context.totalFlashcards >= 20) achievements.push("flashcard creation")
    if (context.studyStreak > 3) achievements.push("consistent studying")

    return {
      title: milestoneMessages[Math.floor(Math.random() * milestoneMessages.length)],
      message: `Your dedication to ${achievements.join(' and ')} shows you're serious about learning. Upgrade to unlock your full potential!`,
      benefits: [
        "Unlimited everything you love",
        "Advanced achievement system",
        "Detailed progress insights",
        "Learning streak rewards"
      ],
      ctaText: "Unlock Full Potential",
      urgencyLevel: 'low',
      personalizedElements
    }
  }

  private generateDefaultMessage(context: UserContext): ContextualMessage {
    const personalizedElements = []
    
    if (context.completedLessons > 0) {
      personalizedElements.push(`${context.completedLessons} lessons completed`)
    }

    return {
      title: "🚀 Upgrade Your Learning",
      message: "Take your learning to the next level with unlimited access to all features and content.",
      benefits: [
        "Unlimited content creation",
        "Sync across all devices",
        "Advanced learning tools",
        "Priority support"
      ],
      ctaText: "Upgrade Now",
      urgencyLevel: 'medium',
      personalizedElements
    }
  }

  /**
   * Get a contextual message based on current user session data
   */
  getContextualMessage(trigger: UpgradePromptTrigger, sessionData: UseGuestSessionReturn): ContextualMessage {
    if (!sessionData.session) {
      return this.generateDefaultMessage({} as UserContext)
    }

    const { session, limits, getProgressSummary } = sessionData
    const progress = getProgressSummary()
    
    const context: UserContext = {
      completedLessons: session.userData.progress.completedLessons,
      totalFlashcards: session.userData.flashcards.length,
      totalPlans: session.userData.plans.length,
      studyStreak: session.userData.progress.streak,
      studyMinutes: session.userData.progress.studyMinutes,
      sessionAge: Math.ceil((Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      currentLimits: {
        flashcards: {
          current: limits.current.maxFlashcards,
          max: limits.max.maxFlashcards,
          percentage: limits.percentages.maxFlashcards
        },
        lessons: {
          current: limits.current.maxLessons,
          max: limits.max.maxLessons,
          percentage: limits.percentages.maxLessons
        },
        plans: {
          current: limits.current.maxPlans,
          max: limits.max.maxPlans,
          percentage: limits.percentages.maxPlans
        }
      },
      recentActivity: {
        lastStudyDate: session.userData.progress.lastStudyDate,
        // Determine preferred content type based on what they create most
        preferredContentType: session.userData.flashcards.length > session.userData.plans.length * 5 
          ? 'flashcards' 
          : session.userData.plans.length > 0 
            ? 'plans' 
            : 'lessons'
      }
    }

    return this.generateMessage(trigger, context)
  }
}

// Export singleton instance
export const upgradeMessageGenerator = UpgradeMessageGenerator.getInstance()

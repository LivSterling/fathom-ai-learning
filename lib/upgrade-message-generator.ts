import { UpgradePromptTrigger } from '@/types/guest'
// Simple guest session type for compatibility
interface SimpleGuestSession {
  session: any
  isGuest: boolean
}

export interface ContextualMessage {
  title: string
  message: string
  benefits: string[]
  ctaText: string
  urgencyLevel: 'low' | 'medium' | 'high'
}

/**
 * Generates contextual upgrade messages based on user behavior and progress
 */
export class UpgradeMessageGenerator {
  /**
   * Get contextual message for a specific trigger
   */
  getContextualMessage(trigger: UpgradePromptTrigger, guestSession: SimpleGuestSession): ContextualMessage {
    // Simplified implementation
    return this.getDefaultMessage(trigger)

    switch (trigger) {
      case 'first_lesson_complete':
        return {
          title: '🎉 Great start!',
          message: 'You completed your first lesson! Keep your progress safe and unlock unlimited learning.',
          benefits: [
            'Never lose your progress',
            'Sync across all devices', 
            'Unlimited lessons & flashcards'
          ],
          ctaText: 'Save My Progress',
          urgencyLevel: 'low'
        }

      case 'approaching_limits':
        const approaching = this.getApproachingLimitType(guestSession)
        return {
          title: `Almost at your ${approaching} limit`,
          message: `You're doing great! You've created ${this.getCurrentCount(approaching, guestSession)} ${approaching}s. Upgrade to continue without limits.`,
          benefits: [
            `Unlimited ${approaching}s`,
            'Advanced learning features',
            'Priority support'
          ],
          ctaText: 'Remove Limits',
          urgencyLevel: 'medium'
        }

      case 'limit_reached':
        const limitType = this.getReachedLimitType(guestSession)
        return {
          title: 'You\'ve hit your limit!',
          message: `You've created the maximum ${limitType}s for guest users. Upgrade now to continue your learning journey.`,
          benefits: [
            'Unlimited everything',
            'Advanced AI features',
            'Cross-device sync'
          ],
          ctaText: 'Upgrade Now',
          urgencyLevel: 'high'
        }

      case 'engagement_milestone':
        const milestoneText = this.getMilestoneText(progress)
        return {
          title: 'You\'re on fire! 🔥',
          message: `${milestoneText} You're clearly serious about learning. Unlock your full potential!`,
          benefits: [
            'Unlimited content creation',
            'Advanced progress tracking',
            'Achievement system'
          ],
          ctaText: 'Unlock Potential',
          urgencyLevel: 'low'
        }

      case 'time_based':
        const daysActive = Math.ceil((Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        return {
          title: 'Ready to level up?',
          message: `You've been learning with us for ${daysActive} day${daysActive === 1 ? '' : 's'}. Time to unlock premium features!`,
          benefits: [
            'Unlimited content creation',
            'Detailed progress analytics',
            'Priority customer support'
          ],
          ctaText: 'Level Up',
          urgencyLevel: 'low'
        }

      case 'advanced_feature_access':
        return {
          title: 'Unlock premium features',
          message: 'This advanced feature is available with an upgraded account. Join thousands of learners already benefiting!',
          benefits: [
            'Advanced AI tutoring',
            'Personalized insights',
            'Collaboration tools'
          ],
          ctaText: 'Unlock Features',
          urgencyLevel: 'medium'
        }

      default:
        return this.getDefaultMessage(trigger)
    }
  }

  private getDefaultMessage(trigger: UpgradePromptTrigger): ContextualMessage {
    return {
      title: 'Upgrade your learning',
      message: 'Get unlimited access to all features and accelerate your learning journey.',
      benefits: [
        'Unlimited content',
        'Sync everywhere', 
        'Premium support'
      ],
      ctaText: 'Upgrade Now',
      urgencyLevel: 'medium'
    }
  }

  private getApproachingLimitType(guestSession: UseGuestSessionReturn): string {
    const { limits } = guestSession
    
    if (limits.percentages.maxFlashcards >= 80) return 'flashcard'
    if (limits.percentages.maxPlans >= 80) return 'plan'
    if (limits.percentages.maxLessons >= 80) return 'lesson'
    
    return 'content'
  }

  private getReachedLimitType(guestSession: UseGuestSessionReturn): string {
    const { hasReachedLimits } = guestSession
    
    if (hasReachedLimits.flashcards) return 'flashcard'
    if (hasReachedLimits.plans) return 'plan'  
    if (hasReachedLimits.lessons) return 'lesson'
    
    return 'content'
  }

  private getCurrentCount(type: string, guestSession: UseGuestSessionReturn): number {
    const { limits } = guestSession
    
    switch (type) {
      case 'flashcard':
        return limits.current.maxFlashcards
      case 'plan':
        return limits.current.maxPlans
      case 'lesson':
        return limits.current.maxLessons
      default:
        return 0
    }
  }

  private getMilestoneText(progress: any): string {
    if (progress.completedLessons >= 10) {
      return `${progress.completedLessons} lessons completed!`
    }
    if (progress.streak >= 5) {
      return `${progress.streak} day learning streak!`
    }
    if (progress.completedLessons >= 5) {
      return `${progress.completedLessons} lessons down!`
    }
    
    return 'You\'re making great progress!'
  }
}

// Export singleton instance
export const upgradeMessageGenerator = new UpgradeMessageGenerator()
import { useGuestSession } from '@/hooks/use-guest-session'
import { GUEST_LIMITS } from '@/types/guest'

export type ContentType = 'plan' | 'lesson' | 'flashcard'

export interface LimitCheckResult {
  allowed: boolean
  limitReached: boolean
  current: number
  max: number
  remaining: number
  message: string
  upgradeRequired: boolean
}

/**
 * Utility class for enforcing guest user creation limits
 */
export class GuestLimitEnforcer {
  private static instance: GuestLimitEnforcer

  static getInstance(): GuestLimitEnforcer {
    if (!GuestLimitEnforcer.instance) {
      GuestLimitEnforcer.instance = new GuestLimitEnforcer()
    }
    return GuestLimitEnforcer.instance
  }

  /**
   * Check if guest user can create content of specified type
   */
  checkLimit(
    contentType: ContentType,
    limits: { current: any; max: any },
    hasReachedLimits: any,
    isGuest: boolean
  ): LimitCheckResult {
    // Non-guest users have no limits
    if (!isGuest) {
      return {
        allowed: true,
        limitReached: false,
        current: 0,
        max: Infinity,
        remaining: Infinity,
        message: '',
        upgradeRequired: false
      }
    }

    let current: number
    let max: number
    let limitReached: boolean

    switch (contentType) {
      case 'plan':
        current = limits.current.maxPlans
        max = limits.max.maxPlans
        limitReached = hasReachedLimits.plans
        break
      case 'lesson':
        current = limits.current.maxLessons
        max = limits.max.maxLessons
        limitReached = hasReachedLimits.lessons
        break
      case 'flashcard':
        current = limits.current.maxFlashcards
        max = limits.max.maxFlashcards
        limitReached = hasReachedLimits.flashcards
        break
      default:
        throw new Error(`Unknown content type: ${contentType}`)
    }

    const remaining = Math.max(0, max - current)
    const allowed = !limitReached

    let message = ''
    if (limitReached) {
      message = `You've reached your ${contentType} limit (${max}). Upgrade to create unlimited content.`
    } else if (remaining <= 2) {
      message = `Only ${remaining} ${contentType}${remaining === 1 ? '' : 's'} remaining. Consider upgrading for unlimited access.`
    }

    return {
      allowed,
      limitReached,
      current,
      max,
      remaining,
      message,
      upgradeRequired: limitReached
    }
  }

  /**
   * Get warning threshold for showing upgrade prompts
   */
  shouldShowWarning(contentType: ContentType, current: number, max: number): boolean {
    const percentage = (current / max) * 100
    return percentage >= 80 // Show warning when 80% or more of limit is used
  }

  /**
   * Get contextual upgrade message based on content type and usage
   */
  getUpgradeMessage(contentType: ContentType, current: number, max: number): string {
    const remaining = max - current
    
    if (remaining === 0) {
      switch (contentType) {
        case 'plan':
          return 'You\'ve created the maximum number of learning plans. Upgrade to create unlimited plans and sync across devices.'
        case 'lesson':
          return 'You\'ve reached your lesson limit. Upgrade to access unlimited lessons and advanced features.'
        case 'flashcard':
          return 'You\'ve created the maximum number of flashcards. Upgrade for unlimited flashcards and spaced repetition analytics.'
        default:
          return 'You\'ve reached your creation limit. Upgrade for unlimited access.'
      }
    }

    if (remaining <= 2) {
      return `You have ${remaining} ${contentType}${remaining === 1 ? '' : 's'} remaining. Upgrade now to continue creating without limits.`
    }

    return `Upgrade to unlock unlimited ${contentType}s and premium features.`
  }

  /**
   * Get limit enforcement error for API responses
   */
  getLimitError(contentType: ContentType, current: number, max: number): Error {
    return new Error(`Guest user limit reached: ${current}/${max} ${contentType}s created. Upgrade required.`)
  }
}

/**
 * React hook for limit enforcement in components
 */
export function useGuestLimitEnforcement() {
  const { limits, hasReachedLimits, isGuest } = useGuestSession()
  const enforcer = GuestLimitEnforcer.getInstance()

  const checkLimit = (contentType: ContentType): LimitCheckResult => {
    return enforcer.checkLimit(contentType, limits, hasReachedLimits, isGuest)
  }

  const shouldShowWarning = (contentType: ContentType): boolean => {
    if (!isGuest) return false
    
    let current: number
    let max: number

    switch (contentType) {
      case 'plan':
        current = limits.current.maxPlans
        max = limits.max.maxPlans
        break
      case 'lesson':
        current = limits.current.maxLessons
        max = limits.max.maxLessons
        break
      case 'flashcard':
        current = limits.current.maxFlashcards
        max = limits.max.maxFlashcards
        break
      default:
        return false
    }

    return enforcer.shouldShowWarning(contentType, current, max)
  }

  const getUpgradeMessage = (contentType: ContentType): string => {
    if (!isGuest) return ''

    let current: number
    let max: number

    switch (contentType) {
      case 'plan':
        current = limits.current.maxPlans
        max = limits.max.maxPlans
        break
      case 'lesson':
        current = limits.current.maxLessons
        max = limits.max.maxLessons
        break
      case 'flashcard':
        current = limits.current.maxFlashcards
        max = limits.max.maxFlashcards
        break
      default:
        return ''
    }

    return enforcer.getUpgradeMessage(contentType, current, max)
  }

  return {
    checkLimit,
    shouldShowWarning,
    getUpgradeMessage,
    isGuest,
    limits,
    hasReachedLimits
  }
}

// Export singleton instance
export const guestLimitEnforcer = GuestLimitEnforcer.getInstance()

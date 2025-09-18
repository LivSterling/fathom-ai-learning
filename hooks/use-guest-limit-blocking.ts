import { useState, useCallback } from 'react'
import { useGuestLimitEnforcement, ContentType } from '@/lib/guest-limit-enforcer'

export interface BlockingState {
  isBlocked: boolean
  contentType: ContentType | null
  attemptedAction: string | null
  showModal: boolean
}

/**
 * React hook for managing guest limit blocking with modal display
 */
export function useGuestLimitBlocking() {
  const { checkLimit, isGuest } = useGuestLimitEnforcement()
  const [blockingState, setBlockingState] = useState<BlockingState>({
    isBlocked: false,
    contentType: null,
    attemptedAction: null,
    showModal: false
  })

  /**
   * Check if an action should be blocked and show modal if necessary
   */
  const checkAndBlock = useCallback((
    contentType: ContentType,
    attemptedAction: string,
    onUpgrade?: () => void
  ): boolean => {
    if (!isGuest) return false

    const limitCheck = checkLimit(contentType)
    
    if (limitCheck.limitReached) {
      setBlockingState({
        isBlocked: true,
        contentType,
        attemptedAction,
        showModal: true
      })
      return true
    }
    
    return false
  }, [checkLimit, isGuest])

  /**
   * Close the blocking modal
   */
  const closeModal = useCallback(() => {
    setBlockingState(prev => ({
      ...prev,
      showModal: false
    }))
  }, [])

  /**
   * Clear all blocking state
   */
  const clearBlocking = useCallback(() => {
    setBlockingState({
      isBlocked: false,
      contentType: null,
      attemptedAction: null,
      showModal: false
    })
  }, [])

  /**
   * Check if content creation is allowed without showing modal
   */
  const isCreationAllowed = useCallback((contentType: ContentType): boolean => {
    if (!isGuest) return true
    const limitCheck = checkLimit(contentType)
    return limitCheck.allowed
  }, [checkLimit, isGuest])

  /**
   * Get blocking message for a content type
   */
  const getBlockingMessage = useCallback((contentType: ContentType): string => {
    if (!isGuest) return ''
    
    const limitCheck = checkLimit(contentType)
    if (!limitCheck.limitReached) return ''
    
    switch (contentType) {
      case 'plan':
        return 'You\'ve reached your learning plan limit. Upgrade to create unlimited plans.'
      case 'lesson':
        return 'You\'ve reached your lesson limit. Upgrade to access unlimited lessons.'
      case 'flashcard':
        return 'You\'ve reached your flashcard limit. Upgrade to create unlimited flashcards.'
      default:
        return 'You\'ve reached your creation limit. Upgrade for unlimited access.'
    }
  }, [checkLimit, isGuest])

  /**
   * Attempt to perform an action with automatic blocking
   */
  const attemptAction = useCallback(<T extends any[]>(
    contentType: ContentType,
    actionName: string,
    action: (...args: T) => void | Promise<void>,
    onBlocked?: () => void
  ) => {
    return async (...args: T) => {
      if (checkAndBlock(contentType, actionName)) {
        onBlocked?.()
        return false
      }
      
      try {
        await action(...args)
        return true
      } catch (error) {
        console.error(`Error performing action "${actionName}":`, error)
        return false
      }
    }
  }, [checkAndBlock])

  /**
   * Create a wrapper function that blocks based on limits
   */
  const withLimitCheck = useCallback(<T extends any[], R>(
    contentType: ContentType,
    actionName: string,
    fn: (...args: T) => R
  ) => {
    return (...args: T): R | null => {
      if (checkAndBlock(contentType, actionName)) {
        return null
      }
      return fn(...args)
    }
  }, [checkAndBlock])

  return {
    // State
    blockingState,
    isGuest,
    
    // Actions
    checkAndBlock,
    closeModal,
    clearBlocking,
    
    // Utilities
    isCreationAllowed,
    getBlockingMessage,
    attemptAction,
    withLimitCheck
  }
}

/**
 * Higher-order component for wrapping actions with limit checking
 */
export function withGuestLimitCheck<T extends any[]>(
  contentType: ContentType,
  actionName: string,
  action: (...args: T) => void | Promise<void>
) {
  return function useWrappedAction() {
    const { attemptAction } = useGuestLimitBlocking()
    return attemptAction(contentType, actionName, action)
  }
}

/**
 * Utility function to create limit-aware event handlers
 */
export function createLimitAwareHandler<T extends any[]>(
  contentType: ContentType,
  actionName: string,
  handler: (...args: T) => void,
  checkAndBlock: (contentType: ContentType, actionName: string) => boolean
) {
  return (...args: T) => {
    if (!checkAndBlock(contentType, actionName)) {
      handler(...args)
    }
  }
}

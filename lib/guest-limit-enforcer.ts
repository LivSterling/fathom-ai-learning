/**
 * Simple guest limit enforcer stub
 */

export class GuestLimitEnforcer {
  private static instance: GuestLimitEnforcer

  static getInstance(): GuestLimitEnforcer {
    if (!GuestLimitEnforcer.instance) {
      GuestLimitEnforcer.instance = new GuestLimitEnforcer()
    }
    return GuestLimitEnforcer.instance
  }

  checkLimits(): boolean {
    return false // No limits reached
  }

  canCreatePlan(): boolean {
    return true
  }

  canCreateFlashcard(): boolean {
    return true
  }

  canStartSession(): boolean {
    return true
  }
}

export const guestLimitEnforcer = GuestLimitEnforcer.getInstance()

// Hook for React components
export function useGuestLimitEnforcement() {
  return {
    hasReachedLimits: false,
    limits: {
      maxPlans: 3,
      maxFlashcards: 50,
      maxSessions: 10
    },
    isGuest: true,
    canCreatePlan: () => true,
    canCreateFlashcard: () => true,
    canStartSession: () => true
  }
}
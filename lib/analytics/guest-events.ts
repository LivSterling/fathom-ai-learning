/**
 * Simple guest analytics stub for SSR compatibility
 * This replaces the complex localStorage-dependent analytics system
 */

export class GuestAnalyticsTracker {
  private static instance: GuestAnalyticsTracker

  static getInstance(): GuestAnalyticsTracker {
    if (!GuestAnalyticsTracker.instance) {
      GuestAnalyticsTracker.instance = new GuestAnalyticsTracker()
    }
    return GuestAnalyticsTracker.instance
  }

  // Stub methods to maintain API compatibility
  async trackGuestSessionStart(sessionId: string, metadata?: any): Promise<void> {
    // No-op for now, can be implemented with Supabase later
  }

  async trackGuestAction(action: string, metadata?: any): Promise<void> {
    // No-op for now
  }

  async trackUpgradePromptShown(trigger: string, metadata?: any): Promise<void> {
    // No-op for now
  }

  async trackUpgradePromptClicked(trigger: string, metadata?: any): Promise<void> {
    // No-op for now
  }

  async trackUpgradePromptDismissed(trigger: string, metadata?: any): Promise<void> {
    // No-op for now
  }

  async flushEvents(): Promise<void> {
    // No-op for now
  }
}

// Export singleton instance
export const guestAnalyticsTracker = GuestAnalyticsTracker.getInstance()

// Hook for React components
export function useGuestAnalytics(sessionId?: string) {
  return {
    trackUpgradePrompt: async (action: string, data?: any) => {
      // No-op for now
    },
    trackGuestAction: async (action: string, data?: any) => {
      // No-op for now
    },
    trackSessionStart: async (data?: any) => {
      // No-op for now
    },
    trackSessionEnd: async (data?: any) => {
      // No-op for now
    }
  }
}

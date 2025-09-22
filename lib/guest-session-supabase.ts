/**
 * Supabase-based Guest Session Manager
 * Manages guest user sessions using Supabase instead of localStorage
 * This eliminates SSR issues and provides better persistence
 */

import { supabase } from '@/lib/supabase'
import { 
  GuestSession, 
  GuestUserData, 
  GuestLimits, 
  GuestPlan, 
  GuestFlashcard 
} from '@/types/guest'

// Default limits for guest users
const DEFAULT_GUEST_LIMITS: GuestLimits = {
  maxPlans: 3,
  maxFlashcards: 50,
  maxSessions: 10,
  maxUploadSize: 5 * 1024 * 1024, // 5MB
  dailyAPIRequests: 100
}

export class SupabaseGuestSessionManager {
  private static instance: SupabaseGuestSessionManager

  static getInstance(): SupabaseGuestSessionManager {
    if (!SupabaseGuestSessionManager.instance) {
      SupabaseGuestSessionManager.instance = new SupabaseGuestSessionManager()
    }
    return SupabaseGuestSessionManager.instance
  }

  /**
   * Create a new guest session in Supabase
   */
  async createGuestSession(): Promise<GuestSession> {
    const now = new Date().toISOString()
    const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const userData: GuestUserData = {
      name: 'Guest User',
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        studyReminders: false,
        voiceEnabled: true
      },
      progress: {
        totalStudyTime: 0,
        totalCards: 0,
        totalSessions: 0,
        streakDays: 0,
        lastStudyDate: null,
        completedPlans: [],
        achievements: []
      }
    }

    const session: GuestSession = {
      id: sessionId,
      isGuest: true,
      userData,
      createdAt: now,
      lastActiveAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      plans: [],
      flashcards: [],
      usage: {
        plansCreated: 0,
        flashcardsCreated: 0,
        sessionsCompleted: 0,
        apiRequestsToday: 0,
        lastAPIRequestDate: now
      }
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('guest_sessions')
      .insert([{
        id: session.id,
        session_data: session,
        created_at: now,
        last_active_at: now,
        expires_at: session.expiresAt
      }])
      .select()
      .single()

    if (error) {
      console.error('Failed to create guest session:', error)
      throw new Error('Failed to create guest session')
    }

    return session
  }

  /**
   * Get guest session from Supabase by ID
   */
  async getGuestSession(sessionId: string): Promise<GuestSession | null> {
    if (!sessionId) return null

    try {
      const { data, error } = await supabase
        .from('guest_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error || !data) {
        return null
      }

      // Check if session is expired
      if (new Date(data.expires_at) < new Date()) {
        await this.deleteGuestSession(sessionId)
        return null
      }

      // Update last active time
      await this.updateLastActive(sessionId)

      return data.session_data as GuestSession
    } catch (error) {
      console.error('Error retrieving guest session:', error)
      return null
    }
  }

  /**
   * Update guest session data
   */
  async updateGuestSession(sessionId: string, updates: Partial<GuestSession>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('guest_sessions')
        .update({
          session_data: updates,
          last_active_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      return !error
    } catch (error) {
      console.error('Error updating guest session:', error)
      return false
    }
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(sessionId: string): Promise<void> {
    try {
      await supabase
        .from('guest_sessions')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', sessionId)
    } catch (error) {
      console.error('Error updating last active:', error)
    }
  }

  /**
   * Delete guest session
   */
  async deleteGuestSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('guest_sessions')
        .delete()
        .eq('id', sessionId)

      return !error
    } catch (error) {
      console.error('Error deleting guest session:', error)
      return false
    }
  }

  /**
   * Get current guest limits
   */
  getCurrentLimits(): GuestLimits {
    return DEFAULT_GUEST_LIMITS
  }

  /**
   * Check if guest has reached limits
   */
  hasReachedLimits(session: GuestSession): boolean {
    const limits = this.getCurrentLimits()
    const usage = session.usage

    return (
      usage.plansCreated >= limits.maxPlans ||
      usage.flashcardsCreated >= limits.maxFlashcards ||
      usage.sessionsCompleted >= limits.maxSessions ||
      usage.apiRequestsToday >= limits.dailyAPIRequests
    )
  }

  /**
   * Clean up expired guest sessions (should be run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('guest_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id')

      if (error) {
        console.error('Error cleaning up expired sessions:', error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error)
      return 0
    }
  }

  /**
   * Migrate guest session to authenticated user
   */
  async migrateToAuthenticatedUser(sessionId: string, userId: string): Promise<boolean> {
    try {
      // Get guest session data
      const guestSession = await this.getGuestSession(sessionId)
      if (!guestSession) return false

      // Create user profile with guest data
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: userId,
          name: guestSession.userData.name,
          preferences: guestSession.userData.preferences,
          progress: guestSession.userData.progress,
          is_guest: false,
          migrated_from_guest: sessionId,
          created_at: new Date().toISOString()
        }])

      if (profileError) {
        console.error('Error creating user profile:', profileError)
        return false
      }

      // Migrate plans
      if (guestSession.plans.length > 0) {
        const { error: plansError } = await supabase
          .from('plans')
          .insert(
            guestSession.plans.map(plan => ({
              ...plan,
              user_id: userId,
              created_at: plan.createdAt,
              updated_at: plan.updatedAt || plan.createdAt
            }))
          )

        if (plansError) {
          console.error('Error migrating plans:', plansError)
        }
      }

      // Migrate flashcards
      if (guestSession.flashcards.length > 0) {
        const { error: flashcardsError } = await supabase
          .from('flashcards')
          .insert(
            guestSession.flashcards.map(card => ({
              ...card,
              user_id: userId,
              created_at: card.createdAt,
              updated_at: card.updatedAt || card.createdAt
            }))
          )

        if (flashcardsError) {
          console.error('Error migrating flashcards:', flashcardsError)
        }
      }

      // Delete guest session after successful migration
      await this.deleteGuestSession(sessionId)

      return true
    } catch (error) {
      console.error('Error migrating guest session:', error)
      return false
    }
  }
}

// Export singleton instance
export const supabaseGuestSessionManager = SupabaseGuestSessionManager.getInstance()

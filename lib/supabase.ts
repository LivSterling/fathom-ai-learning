import { createClient } from '@supabase/supabase-js'
import { GuestUserData, GuestPlan, GuestFlashcard } from '@/types/guest'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Supabase client configuration and guest user database operations
 */
export class SupabaseGuestManager {
  private static instance: SupabaseGuestManager

  static getInstance(): SupabaseGuestManager {
    if (!SupabaseGuestManager.instance) {
      SupabaseGuestManager.instance = new SupabaseGuestManager()
    }
    return SupabaseGuestManager.instance
  }

  /**
   * Set guest context for RLS policies
   */
  async setGuestContext(guestId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('set_guest_context', {
        guest_user_id: guestId
      })

      if (error) {
        console.error('Failed to set guest context:', error)
        throw error
      }
    } catch (error) {
      console.error('Error setting guest context:', error)
      throw error
    }
  }

  /**
   * Clear guest context
   */
  async clearGuestContext(): Promise<void> {
    try {
      const { error } = await supabase.rpc('clear_guest_context')

      if (error) {
        console.error('Failed to clear guest context:', error)
        throw error
      }
    } catch (error) {
      console.error('Error clearing guest context:', error)
      throw error
    }
  }

  /**
   * Create guest profile in database
   */
  async createGuestProfile(guestId: string, sessionData?: any): Promise<{ success: boolean; profile?: any; error?: string }> {
    try {
      // Set guest context first
      await this.setGuestContext(guestId)

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: guestId,
          is_guest: true,
          guest_id: guestId,
          guest_session_data: sessionData,
          guest_created_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create guest profile:', error)
        return { success: false, error: error.message }
      }

      return { success: true, profile: data }
    } catch (error) {
      console.error('Error creating guest profile:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Get guest profile from database
   */
  async getGuestProfile(guestId: string): Promise<{ success: boolean; profile?: any; error?: string }> {
    try {
      await this.setGuestContext(guestId)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('guest_id', guestId)
        .eq('is_guest', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - guest doesn't exist
          return { success: false, error: 'Guest profile not found' }
        }
        console.error('Failed to get guest profile:', error)
        return { success: false, error: error.message }
      }

      return { success: true, profile: data }
    } catch (error) {
      console.error('Error getting guest profile:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Update guest profile
   */
  async updateGuestProfile(guestId: string, updates: any): Promise<{ success: boolean; profile?: any; error?: string }> {
    try {
      await this.setGuestContext(guestId)

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('guest_id', guestId)
        .eq('is_guest', true)
        .select()
        .single()

      if (error) {
        console.error('Failed to update guest profile:', error)
        return { success: false, error: error.message }
      }

      return { success: true, profile: data }
    } catch (error) {
      console.error('Error updating guest profile:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Create guest curriculum (plan)
   */
  async createGuestCurriculum(guestId: string, plan: GuestPlan): Promise<{ success: boolean; curriculum?: any; error?: string }> {
    try {
      await this.setGuestContext(guestId)

      const { data, error } = await supabase
        .from('curricula')
        .insert({
          id: plan.id,
          title: plan.title,
          domain: plan.domain,
          is_guest_content: true,
          guest_owner_id: guestId,
          created_at: plan.createdAt,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create guest curriculum:', error)
        return { success: false, error: error.message }
      }

      // Create modules and lessons
      for (const module of plan.modules) {
        const moduleResult = await this.createGuestModule(guestId, plan.id, module)
        if (!moduleResult.success) {
          console.error('Failed to create module:', moduleResult.error)
          // Continue with other modules rather than failing completely
        }
      }

      return { success: true, curriculum: data }
    } catch (error) {
      console.error('Error creating guest curriculum:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Create guest module
   */
  async createGuestModule(guestId: string, curriculumId: string, module: any): Promise<{ success: boolean; module?: any; error?: string }> {
    try {
      await this.setGuestContext(guestId)

      const { data, error } = await supabase
        .from('modules')
        .insert({
          id: module.id,
          curriculum_id: curriculumId,
          title: module.title,
          is_guest_content: true,
          guest_owner_id: guestId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create guest module:', error)
        return { success: false, error: error.message }
      }

      // Create lessons
      for (const lesson of module.lessons) {
        const lessonResult = await this.createGuestLesson(guestId, module.id, lesson)
        if (!lessonResult.success) {
          console.error('Failed to create lesson:', lessonResult.error)
          // Continue with other lessons
        }
      }

      return { success: true, module: data }
    } catch (error) {
      console.error('Error creating guest module:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Create guest lesson
   */
  async createGuestLesson(guestId: string, moduleId: string, lesson: any): Promise<{ success: boolean; lesson?: any; error?: string }> {
    try {
      await this.setGuestContext(guestId)

      const { data, error } = await supabase
        .from('lessons')
        .insert({
          id: lesson.id,
          module_id: moduleId,
          title: lesson.title,
          duration: lesson.duration,
          completed: lesson.completed || false,
          completed_at: lesson.completedAt,
          is_guest_content: true,
          guest_owner_id: guestId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create guest lesson:', error)
        return { success: false, error: error.message }
      }

      return { success: true, lesson: data }
    } catch (error) {
      console.error('Error creating guest lesson:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Create guest flashcard
   */
  async createGuestFlashcard(guestId: string, flashcard: GuestFlashcard): Promise<{ success: boolean; flashcard?: any; error?: string }> {
    try {
      await this.setGuestContext(guestId)

      const { data, error } = await supabase
        .from('flashcards')
        .insert({
          id: flashcard.id,
          front: flashcard.front,
          back: flashcard.back,
          tags: flashcard.tags,
          difficulty: flashcard.difficulty,
          review_count: flashcard.reviewCount,
          correct_count: flashcard.correctCount,
          last_reviewed_at: flashcard.lastReviewedAt,
          is_guest_content: true,
          guest_owner_id: guestId,
          created_at: flashcard.createdAt,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create guest flashcard:', error)
        return { success: false, error: error.message }
      }

      return { success: true, flashcard: data }
    } catch (error) {
      console.error('Error creating guest flashcard:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Get guest usage statistics
   */
  async getGuestUsageStats(guestId: string): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      await this.setGuestContext(guestId)

      const { data, error } = await supabase.rpc('get_guest_usage_stats', {
        p_guest_id: guestId
      })

      if (error) {
        console.error('Failed to get guest usage stats:', error)
        return { success: false, error: error.message }
      }

      return { success: true, stats: data }
    } catch (error) {
      console.error('Error getting guest usage stats:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Track guest analytics event
   */
  async trackGuestEvent(guestId: string, eventType: string, eventData?: any, sessionId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.setGuestContext(guestId)

      const { error } = await supabase
        .from('guest_analytics')
        .insert({
          guest_id: guestId,
          event_type: eventType,
          event_data: eventData,
          session_id: sessionId,
          timestamp: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to track guest event:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error tracking guest event:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Migrate guest data to registered user
   */
  async migrateGuestToUser(guestId: string, userId: string): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      await this.setGuestContext(guestId)

      const { data, error } = await supabase.rpc('migrate_guest_to_user', {
        p_guest_id: guestId,
        p_user_id: userId
      })

      if (error) {
        console.error('Failed to migrate guest data:', error)
        return { success: false, error: error.message }
      }

      // Clear guest context after migration
      await this.clearGuestContext()

      return { success: true, result: data }
    } catch (error) {
      console.error('Error migrating guest data:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Get guest curricula
   */
  async getGuestCurricula(guestId: string): Promise<{ success: boolean; curricula?: any[]; error?: string }> {
    try {
      await this.setGuestContext(guestId)

      const { data, error } = await supabase
        .from('curricula')
        .select(`
          *,
          modules (
            *,
            lessons (*)
          )
        `)
        .eq('is_guest_content', true)
        .eq('guest_owner_id', guestId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to get guest curricula:', error)
        return { success: false, error: error.message }
      }

      return { success: true, curricula: data }
    } catch (error) {
      console.error('Error getting guest curricula:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Get guest flashcards
   */
  async getGuestFlashcards(guestId: string): Promise<{ success: boolean; flashcards?: any[]; error?: string }> {
    try {
      await this.setGuestContext(guestId)

      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('is_guest_content', true)
        .eq('guest_owner_id', guestId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to get guest flashcards:', error)
        return { success: false, error: error.message }
      }

      return { success: true, flashcards: data }
    } catch (error) {
      console.error('Error getting guest flashcards:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Update lesson completion status
   */
  async completeGuestLesson(guestId: string, lessonId: string): Promise<{ success: boolean; lesson?: any; error?: string }> {
    try {
      await this.setGuestContext(guestId)

      const { data, error } = await supabase
        .from('lessons')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', lessonId)
        .eq('is_guest_content', true)
        .eq('guest_owner_id', guestId)
        .select()
        .single()

      if (error) {
        console.error('Failed to complete guest lesson:', error)
        return { success: false, error: error.message }
      }

      return { success: true, lesson: data }
    } catch (error) {
      console.error('Error completing guest lesson:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Update flashcard review
   */
  async updateGuestFlashcardReview(guestId: string, flashcardId: string, correct: boolean): Promise<{ success: boolean; flashcard?: any; error?: string }> {
    try {
      await this.setGuestContext(guestId)

      const { data, error } = await supabase
        .from('flashcards')
        .update({
          review_count: supabase.raw('review_count + 1'),
          correct_count: correct ? supabase.raw('correct_count + 1') : supabase.raw('correct_count'),
          last_reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', flashcardId)
        .eq('is_guest_content', true)
        .eq('guest_owner_id', guestId)
        .select()
        .single()

      if (error) {
        console.error('Failed to update guest flashcard review:', error)
        return { success: false, error: error.message }
      }

      return { success: true, flashcard: data }
    } catch (error) {
      console.error('Error updating guest flashcard review:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Delete guest data (for cleanup)
   */
  async deleteGuestData(guestId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.setGuestContext(guestId)

      // Delete in reverse dependency order
      await supabase.from('guest_analytics').delete().eq('guest_id', guestId)
      await supabase.from('guest_limits').delete().eq('guest_id', guestId)
      await supabase.from('reviews').delete().eq('guest_owner_id', guestId).eq('is_guest_review', true)
      await supabase.from('sessions').delete().eq('guest_owner_id', guestId).eq('is_guest_session', true)
      await supabase.from('flashcards').delete().eq('guest_owner_id', guestId).eq('is_guest_content', true)
      await supabase.from('lessons').delete().eq('guest_owner_id', guestId).eq('is_guest_content', true)
      await supabase.from('modules').delete().eq('guest_owner_id', guestId).eq('is_guest_content', true)
      await supabase.from('curricula').delete().eq('guest_owner_id', guestId).eq('is_guest_content', true)
      await supabase.from('profiles').delete().eq('guest_id', guestId).eq('is_guest', true)

      await this.clearGuestContext()

      return { success: true }
    } catch (error) {
      console.error('Error deleting guest data:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

// Export singleton instance
export const supabaseGuestManager = SupabaseGuestManager.getInstance()

// Export types for better TypeScript support
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          is_guest: boolean
          guest_id: string | null
          guest_session_data: any | null
          guest_created_at: string | null
          upgraded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          is_guest?: boolean
          guest_id?: string | null
          guest_session_data?: any | null
          guest_created_at?: string | null
          upgraded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          is_guest?: boolean
          guest_id?: string | null
          guest_session_data?: any | null
          guest_created_at?: string | null
          upgraded_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      guest_analytics: {
        Row: {
          id: string
          guest_id: string
          event_type: string
          event_data: any | null
          timestamp: string
          session_id: string | null
          user_agent: string | null
          ip_address: string | null
        }
        Insert: {
          id?: string
          guest_id: string
          event_type: string
          event_data?: any | null
          timestamp?: string
          session_id?: string | null
          user_agent?: string | null
          ip_address?: string | null
        }
        Update: {
          id?: string
          guest_id?: string
          event_type?: string
          event_data?: any | null
          timestamp?: string
          session_id?: string | null
          user_agent?: string | null
          ip_address?: string | null
        }
      }
      guest_limits: {
        Row: {
          id: string
          guest_id: string
          flashcards_count: number
          lessons_count: number
          plans_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          guest_id: string
          flashcards_count?: number
          lessons_count?: number
          plans_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          guest_id?: string
          flashcards_count?: number
          lessons_count?: number
          plans_count?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

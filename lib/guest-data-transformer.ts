import { GuestUserData, GuestPlan, GuestFlashcard, GuestModule, GuestLesson } from '@/types/guest'

/**
 * Data transformation utilities to convert local storage format to database schema format
 * Handles mapping between guest data structures and Supabase database tables
 */
export class GuestDataTransformer {
  private static instance: GuestDataTransformer

  static getInstance(): GuestDataTransformer {
    if (!GuestDataTransformer.instance) {
      GuestDataTransformer.instance = new GuestDataTransformer()
    }
    return GuestDataTransformer.instance
  }

  /**
   * Transform guest plan to database curriculum format
   */
  transformPlanToCurriculum(plan: GuestPlan, guestId: string, userId: string): DatabaseCurriculum {
    return {
      id: plan.id,
      title: plan.title,
      description: `Imported from guest session - ${plan.domain}`,
      domain: plan.domain,
      user_id: userId,
      guest_id: guestId,
      created_at: plan.createdAt,
      updated_at: new Date().toISOString(),
      is_public: false,
      difficulty_level: 'beginner', // Default for guest plans
      estimated_duration: this.calculatePlanDuration(plan),
      tags: [plan.domain],
      modules: plan.modules.map((module, index) => this.transformModuleToDatabase(module, plan.id, index))
    }
  }

  /**
   * Transform guest module to database format
   */
  transformModuleToDatabase(module: GuestModule, curriculumId: string, order: number): DatabaseModule {
    return {
      id: module.id,
      curriculum_id: curriculumId,
      title: module.title,
      description: `Module imported from guest session`,
      order_index: order,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      lessons: module.lessons.map((lesson, index) => this.transformLessonToDatabase(lesson, module.id, index))
    }
  }

  /**
   * Transform guest lesson to database format
   */
  transformLessonToDatabase(lesson: GuestLesson, moduleId: string, order: number): DatabaseLesson {
    return {
      id: lesson.id,
      module_id: moduleId,
      title: lesson.title,
      content: `Lesson imported from guest session`,
      order_index: order,
      duration: lesson.duration,
      lesson_type: 'text', // Default type for guest lessons
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed: lesson.completed,
      completed_at: lesson.completedAt || null
    }
  }

  /**
   * Transform guest flashcard to database format
   */
  transformFlashcardToDatabase(flashcard: GuestFlashcard, guestId: string, userId: string): DatabaseFlashcard {
    return {
      id: flashcard.id,
      user_id: userId,
      guest_id: guestId,
      front: flashcard.front,
      back: flashcard.back,
      tags: flashcard.tags,
      created_at: flashcard.createdAt,
      updated_at: new Date().toISOString(),
      last_reviewed_at: flashcard.lastReviewedAt || null,
      difficulty: flashcard.difficulty,
      review_count: flashcard.reviewCount,
      correct_count: flashcard.correctCount,
      ease_factor: this.calculateEaseFactor(flashcard),
      interval_days: this.calculateInterval(flashcard),
      next_review_date: this.calculateNextReviewDate(flashcard)
    }
  }

  /**
   * Transform guest progress to database format
   */
  transformProgressToDatabase(progress: any, guestId: string, userId: string): DatabaseProgress {
    return {
      user_id: userId,
      guest_id: guestId,
      total_plans: progress.totalPlans,
      total_lessons: progress.totalLessons,
      total_flashcards: progress.totalFlashcards,
      completed_lessons: progress.completedLessons,
      study_minutes: progress.studyMinutes,
      current_streak: progress.streak,
      last_study_date: progress.lastStudyDate || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Transform guest preferences to database format
   */
  transformPreferencesToDatabase(preferences: any, guestId: string, userId: string): DatabasePreferences {
    return {
      user_id: userId,
      guest_id: guestId,
      theme: preferences.theme || 'system',
      notifications_enabled: preferences.notifications || true,
      sound_effects_enabled: preferences.soundEffects || true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Transform complete guest user data for database migration
   */
  transformGuestDataForMigration(guestData: GuestUserData, guestId: string, userId: string): TransformedMigrationData {
    return {
      curricula: guestData.plans.map(plan => this.transformPlanToCurriculum(plan, guestId, userId)),
      flashcards: guestData.flashcards.map(card => this.transformFlashcardToDatabase(card, guestId, userId)),
      progress: this.transformProgressToDatabase(guestData.progress, guestId, userId),
      preferences: this.transformPreferencesToDatabase(guestData.preferences, guestId, userId),
      migration_metadata: {
        guest_id: guestId,
        user_id: userId,
        migrated_at: new Date().toISOString(),
        source_version: '1.0.0',
        total_items: guestData.plans.length + guestData.flashcards.length
      }
    }
  }

  /**
   * Reverse transformation: database format back to guest format
   * Used for rollback scenarios
   */
  transformDatabaseToGuestFormat(dbData: any): GuestUserData {
    return {
      plans: dbData.curricula?.map((curriculum: any) => this.transformCurriculumToPlan(curriculum)) || [],
      flashcards: dbData.flashcards?.map((card: any) => this.transformDatabaseToFlashcard(card)) || [],
      progress: this.transformDatabaseToProgress(dbData.progress),
      preferences: this.transformDatabaseToPreferences(dbData.preferences)
    }
  }

  /**
   * Validate transformed data before migration
   */
  validateTransformedData(transformedData: TransformedMigrationData): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate curricula
    transformedData.curricula.forEach((curriculum, index) => {
      if (!curriculum.id || !curriculum.title || !curriculum.user_id) {
        errors.push(`Curriculum ${index}: Missing required fields`)
      }
      if (!curriculum.modules || curriculum.modules.length === 0) {
        warnings.push(`Curriculum ${curriculum.title}: No modules found`)
      }
    })

    // Validate flashcards
    transformedData.flashcards.forEach((card, index) => {
      if (!card.id || !card.front || !card.back || !card.user_id) {
        errors.push(`Flashcard ${index}: Missing required fields`)
      }
    })

    // Validate progress
    if (!transformedData.progress.user_id) {
      errors.push('Progress: Missing user_id')
    }

    // Validate preferences
    if (!transformedData.preferences.user_id) {
      errors.push('Preferences: Missing user_id')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalItems: transformedData.curricula.length + transformedData.flashcards.length
    }
  }

  /**
   * Create migration summary for logging and tracking
   */
  createMigrationSummary(transformedData: TransformedMigrationData): MigrationSummary {
    const totalLessons = transformedData.curricula.reduce((total, curriculum) => 
      total + curriculum.modules.reduce((moduleTotal, module) => moduleTotal + module.lessons.length, 0), 0)

    const totalModules = transformedData.curricula.reduce((total, curriculum) => total + curriculum.modules.length, 0)

    return {
      guest_id: transformedData.migration_metadata.guest_id,
      user_id: transformedData.migration_metadata.user_id,
      transformation_completed_at: new Date().toISOString(),
      items: {
        curricula: transformedData.curricula.length,
        modules: totalModules,
        lessons: totalLessons,
        flashcards: transformedData.flashcards.length
      },
      data_integrity: {
        has_progress: !!transformedData.progress,
        has_preferences: !!transformedData.preferences,
        total_size_bytes: JSON.stringify(transformedData).length
      }
    }
  }

  // Private helper methods

  private calculatePlanDuration(plan: GuestPlan): string {
    const totalLessons = plan.modules.reduce((total, module) => total + module.lessons.length, 0)
    const estimatedMinutes = totalLessons * 15 // Assume 15 minutes per lesson
    return `${estimatedMinutes} minutes`
  }

  private calculateEaseFactor(flashcard: GuestFlashcard): number {
    // Calculate ease factor based on review performance
    if (flashcard.reviewCount === 0) return 2.5 // Default ease factor

    const successRate = flashcard.correctCount / flashcard.reviewCount
    if (successRate >= 0.9) return 2.8
    if (successRate >= 0.8) return 2.6
    if (successRate >= 0.7) return 2.5
    if (successRate >= 0.6) return 2.3
    return 2.1
  }

  private calculateInterval(flashcard: GuestFlashcard): number {
    // Calculate spaced repetition interval
    if (flashcard.reviewCount === 0) return 1
    if (flashcard.reviewCount === 1) return 3
    
    const easeFactor = this.calculateEaseFactor(flashcard)
    return Math.round(Math.pow(easeFactor, flashcard.reviewCount - 1))
  }

  private calculateNextReviewDate(flashcard: GuestFlashcard): string {
    const interval = this.calculateInterval(flashcard)
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + interval)
    return nextDate.toISOString()
  }

  private transformCurriculumToPlan(curriculum: any): GuestPlan {
    return {
      id: curriculum.id,
      title: curriculum.title,
      domain: curriculum.domain || 'general',
      createdAt: curriculum.created_at,
      modules: curriculum.modules?.map((module: any) => this.transformDatabaseToModule(module)) || []
    }
  }

  private transformDatabaseToModule(module: any): GuestModule {
    return {
      id: module.id,
      title: module.title,
      lessons: module.lessons?.map((lesson: any) => this.transformDatabaseToLesson(lesson)) || []
    }
  }

  private transformDatabaseToLesson(lesson: any): GuestLesson {
    return {
      id: lesson.id,
      title: lesson.title,
      duration: lesson.duration || '15 minutes',
      completed: lesson.completed || false,
      completedAt: lesson.completed_at || undefined
    }
  }

  private transformDatabaseToFlashcard(card: any): GuestFlashcard {
    return {
      id: card.id,
      front: card.front,
      back: card.back,
      tags: card.tags || [],
      createdAt: card.created_at,
      lastReviewedAt: card.last_reviewed_at || undefined,
      difficulty: card.difficulty || 'medium',
      reviewCount: card.review_count || 0,
      correctCount: card.correct_count || 0
    }
  }

  private transformDatabaseToProgress(progress: any): any {
    if (!progress) {
      return {
        totalPlans: 0,
        totalLessons: 0,
        totalFlashcards: 0,
        completedLessons: 0,
        studyMinutes: 0,
        streak: 0
      }
    }

    return {
      totalPlans: progress.total_plans || 0,
      totalLessons: progress.total_lessons || 0,
      totalFlashcards: progress.total_flashcards || 0,
      completedLessons: progress.completed_lessons || 0,
      studyMinutes: progress.study_minutes || 0,
      streak: progress.current_streak || 0,
      lastStudyDate: progress.last_study_date
    }
  }

  private transformDatabaseToPreferences(preferences: any): any {
    if (!preferences) {
      return {
        theme: 'system',
        notifications: true,
        soundEffects: true
      }
    }

    return {
      theme: preferences.theme || 'system',
      notifications: preferences.notifications_enabled !== false,
      soundEffects: preferences.sound_effects_enabled !== false
    }
  }
}

// Type definitions for database schema
interface DatabaseCurriculum {
  id: string
  title: string
  description: string
  domain: string
  user_id: string
  guest_id: string
  created_at: string
  updated_at: string
  is_public: boolean
  difficulty_level: string
  estimated_duration: string
  tags: string[]
  modules: DatabaseModule[]
}

interface DatabaseModule {
  id: string
  curriculum_id: string
  title: string
  description: string
  order_index: number
  created_at: string
  updated_at: string
  lessons: DatabaseLesson[]
}

interface DatabaseLesson {
  id: string
  module_id: string
  title: string
  content: string
  order_index: number
  duration: string
  lesson_type: string
  created_at: string
  updated_at: string
  completed: boolean
  completed_at: string | null
}

interface DatabaseFlashcard {
  id: string
  user_id: string
  guest_id: string
  front: string
  back: string
  tags: string[]
  created_at: string
  updated_at: string
  last_reviewed_at: string | null
  difficulty: string
  review_count: number
  correct_count: number
  ease_factor: number
  interval_days: number
  next_review_date: string
}

interface DatabaseProgress {
  user_id: string
  guest_id: string
  total_plans: number
  total_lessons: number
  total_flashcards: number
  completed_lessons: number
  study_minutes: number
  current_streak: number
  last_study_date: string | null
  created_at: string
  updated_at: string
}

interface DatabasePreferences {
  user_id: string
  guest_id: string
  theme: string
  notifications_enabled: boolean
  sound_effects_enabled: boolean
  created_at: string
  updated_at: string
}

interface TransformedMigrationData {
  curricula: DatabaseCurriculum[]
  flashcards: DatabaseFlashcard[]
  progress: DatabaseProgress
  preferences: DatabasePreferences
  migration_metadata: {
    guest_id: string
    user_id: string
    migrated_at: string
    source_version: string
    total_items: number
  }
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  totalItems: number
}

interface MigrationSummary {
  guest_id: string
  user_id: string
  transformation_completed_at: string
  items: {
    curricula: number
    modules: number
    lessons: number
    flashcards: number
  }
  data_integrity: {
    has_progress: boolean
    has_preferences: boolean
    total_size_bytes: number
  }
}

// Export singleton instance
export const guestDataTransformer = GuestDataTransformer.getInstance()

// Export types for use in other modules
export type {
  DatabaseCurriculum,
  DatabaseModule,
  DatabaseLesson,
  DatabaseFlashcard,
  DatabaseProgress,
  DatabasePreferences,
  TransformedMigrationData,
  ValidationResult,
  MigrationSummary
}
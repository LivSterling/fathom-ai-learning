import { GuestUserData, GuestPlan, GuestFlashcard } from '@/types/guest'

export interface TransformationResult {
  success: boolean
  transformedData?: any
  error?: string
  warnings?: string[]
}

/**
 * Transforms guest data to match database schema
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
   * Transform guest plan to curriculum format
   */
  transformPlanToCurriculum(plan: GuestPlan, userId: string): any {
    return {
      user_id: userId,
      title: plan.title,
      domain: plan.domain,
      description: plan.description || null,
      is_guest_content: false,
      guest_owner_id: null,
      modules: plan.modules.map((module, moduleIndex) => ({
        title: module.title,
        description: module.description || null,
        order_index: moduleIndex,
        is_guest_content: false,
        guest_owner_id: null,
        lessons: module.lessons.map((lesson, lessonIndex) => ({
          title: lesson.title,
          content: lesson.content || null,
          duration: lesson.duration || null,
          order_index: lessonIndex,
          completed: lesson.completed || false,
          completed_at: lesson.completed ? new Date().toISOString() : null,
          is_guest_content: false,
          guest_owner_id: null
        }))
      }))
    }
  }

  /**
   * Transform guest flashcard to database format
   */
  transformFlashcard(flashcard: GuestFlashcard, userId: string): any {
    return {
      user_id: userId,
      front: flashcard.front,
      back: flashcard.back,
      tags: flashcard.tags || [],
      difficulty: flashcard.difficulty || 'medium',
      review_count: flashcard.reviewCount || 0,
      correct_count: flashcard.correctCount || 0,
      last_reviewed_at: flashcard.lastReviewedAt ? new Date(flashcard.lastReviewedAt).toISOString() : null,
      is_guest_content: false,
      guest_owner_id: null
    }
  }

  /**
   * Transform complete guest data
   */
  transformGuestData(guestData: GuestUserData, userId: string): TransformationResult {
    try {
      const warnings: string[] = []
      
      const transformedData = {
        curricula: guestData.plans.map(plan => {
          try {
            return this.transformPlanToCurriculum(plan, userId)
          } catch (error) {
            warnings.push(`Failed to transform plan "${plan.title}": ${error}`)
            return null
          }
        }).filter(Boolean),
        
        flashcards: guestData.flashcards.map(flashcard => {
          try {
            return this.transformFlashcard(flashcard, userId)
          } catch (error) {
            warnings.push(`Failed to transform flashcard "${flashcard.front}": ${error}`)
            return null
          }
        }).filter(Boolean)
      }

      return {
        success: true,
        transformedData,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    } catch (error) {
      return {
        success: false,
        error: `Data transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Validate transformed data before database insertion
   */
  validateTransformedData(transformedData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate curricula
    if (transformedData.curricula) {
      transformedData.curricula.forEach((curriculum: any, index: number) => {
        if (!curriculum.title) {
          errors.push(`Curriculum ${index}: Missing title`)
        }
        if (!curriculum.user_id) {
          errors.push(`Curriculum ${index}: Missing user_id`)
        }
      })
    }

    // Validate flashcards
    if (transformedData.flashcards) {
      transformedData.flashcards.forEach((flashcard: any, index: number) => {
        if (!flashcard.front) {
          errors.push(`Flashcard ${index}: Missing front content`)
        }
        if (!flashcard.back) {
          errors.push(`Flashcard ${index}: Missing back content`)
        }
        if (!flashcard.user_id) {
          errors.push(`Flashcard ${index}: Missing user_id`)
        }
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Export singleton instance
export const guestDataTransformer = GuestDataTransformer.getInstance()
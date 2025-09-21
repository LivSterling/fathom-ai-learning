export type ConflictResolutionStrategy = 
  | 'merge_with_preference' 
  | 'guest_priority' 
  | 'existing_priority' 
  | 'create_duplicate'

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy
  action: 'merge' | 'skip' | 'duplicate' | 'replace'
  reason: string
}

/**
 * Resolves conflicts when migrating guest data to existing user accounts
 */
export class GuestConflictResolver {
  private static instance: GuestConflictResolver

  static getInstance(): GuestConflictResolver {
    if (!GuestConflictResolver.instance) {
      GuestConflictResolver.instance = new GuestConflictResolver()
    }
    return GuestConflictResolver.instance
  }

  /**
   * Resolve conflicts for curricula
   */
  resolveCurriculumConflicts(
    guestCurricula: any[],
    existingCurricula: any[],
    strategy: ConflictResolutionStrategy
  ): { curricula: any[]; resolutions: ConflictResolution[] } {
    const resolutions: ConflictResolution[] = []
    const resolvedCurricula: any[] = []

    for (const guestCurriculum of guestCurricula) {
      const conflict = existingCurricula.find(existing => 
        existing.title.toLowerCase() === guestCurriculum.title.toLowerCase()
      )

      if (!conflict) {
        // No conflict, add as-is
        resolvedCurricula.push(guestCurriculum)
        resolutions.push({
          strategy,
          action: 'merge',
          reason: `No conflict found for curriculum "${guestCurriculum.title}"`
        })
        continue
      }

      const resolution = this.resolveConflict(strategy, 'curriculum')
      resolutions.push({
        ...resolution,
        reason: `Curriculum "${guestCurriculum.title}" conflicts with existing curriculum`
      })

      switch (resolution.action) {
        case 'merge':
          // Merge modules and lessons
          const mergedCurriculum = {
            ...conflict,
            modules: [...conflict.modules, ...guestCurriculum.modules]
          }
          resolvedCurricula.push(mergedCurriculum)
          break
          
        case 'duplicate':
          // Create with modified title
          resolvedCurricula.push({
            ...guestCurriculum,
            title: `${guestCurriculum.title} (Guest)`
          })
          break
          
        case 'replace':
          resolvedCurricula.push(guestCurriculum)
          break
          
        case 'skip':
          // Don't add the guest curriculum
          break
      }
    }

    return { curricula: resolvedCurricula, resolutions }
  }

  /**
   * Resolve conflicts for flashcards
   */
  resolveFlashcardConflicts(
    guestFlashcards: any[],
    existingFlashcards: any[],
    strategy: ConflictResolutionStrategy
  ): { flashcards: any[]; resolutions: ConflictResolution[] } {
    const resolutions: ConflictResolution[] = []
    const resolvedFlashcards: any[] = []

    for (const guestFlashcard of guestFlashcards) {
      const conflict = existingFlashcards.find(existing => 
        existing.front.toLowerCase() === guestFlashcard.front.toLowerCase()
      )

      if (!conflict) {
        // No conflict, add as-is
        resolvedFlashcards.push(guestFlashcard)
        resolutions.push({
          strategy,
          action: 'merge',
          reason: `No conflict found for flashcard "${guestFlashcard.front}"`
        })
        continue
      }

      const resolution = this.resolveConflict(strategy, 'flashcard')
      resolutions.push({
        ...resolution,
        reason: `Flashcard "${guestFlashcard.front}" conflicts with existing flashcard`
      })

      switch (resolution.action) {
        case 'merge':
          // Keep the one with better stats
          const betterFlashcard = guestFlashcard.review_count > conflict.review_count 
            ? guestFlashcard 
            : conflict
          resolvedFlashcards.push(betterFlashcard)
          break
          
        case 'duplicate':
          // Create both (guest one gets modified front)
          resolvedFlashcards.push({
            ...guestFlashcard,
            front: `${guestFlashcard.front} (Guest)`
          })
          break
          
        case 'replace':
          resolvedFlashcards.push(guestFlashcard)
          break
          
        case 'skip':
          // Don't add the guest flashcard
          break
      }
    }

    return { flashcards: resolvedFlashcards, resolutions }
  }

  /**
   * Get resolution action based on strategy
   */
  private resolveConflict(
    strategy: ConflictResolutionStrategy, 
    contentType: 'curriculum' | 'flashcard'
  ): ConflictResolution {
    switch (strategy) {
      case 'guest_priority':
        return {
          strategy,
          action: 'replace',
          reason: 'Guest data takes priority'
        }
        
      case 'existing_priority':
        return {
          strategy,
          action: 'skip',
          reason: 'Existing data takes priority'
        }
        
      case 'create_duplicate':
        return {
          strategy,
          action: 'duplicate',
          reason: 'Creating duplicate to preserve both'
        }
        
      case 'merge_with_preference':
      default:
        return {
          strategy,
          action: contentType === 'curriculum' ? 'merge' : 'duplicate',
          reason: contentType === 'curriculum' 
            ? 'Merging curriculum content'
            : 'Creating duplicate flashcard'
        }
    }
  }

  /**
   * Generate conflict report
   */
  generateConflictReport(resolutions: ConflictResolution[]): {
    totalConflicts: number
    actionsSummary: Record<string, number>
    details: ConflictResolution[]
  } {
    const actionsSummary = resolutions.reduce((acc, resolution) => {
      acc[resolution.action] = (acc[resolution.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalConflicts: resolutions.filter(r => r.action !== 'merge').length,
      actionsSummary,
      details: resolutions
    }
  }
}

// Export singleton instance
export const guestConflictResolver = GuestConflictResolver.getInstance()
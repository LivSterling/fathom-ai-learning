import { GuestUserData, GuestPlan, GuestFlashcard } from '@/types/guest'
import { DatabaseCurriculum, DatabaseFlashcard, TransformedMigrationData } from './guest-data-transformer'

/**
 * Conflict resolution system for merging guest data with existing registered user data
 * Handles duplicate detection, merging strategies, and data deduplication
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
   * Resolve conflicts between guest data and existing user data
   */
  async resolveDataConflicts(
    guestData: TransformedMigrationData,
    existingUserData: ExistingUserData,
    strategy: ConflictResolutionStrategy = 'merge_with_preference'
  ): Promise<ConflictResolutionResult> {
    const result: ConflictResolutionResult = {
      strategy,
      conflicts: [],
      resolutions: [],
      finalData: {
        curricula: [...existingUserData.curricula],
        flashcards: [...existingUserData.flashcards],
        progress: { ...existingUserData.progress },
        preferences: { ...existingUserData.preferences }
      },
      statistics: {
        totalConflicts: 0,
        resolvedConflicts: 0,
        mergedItems: 0,
        skippedItems: 0,
        newItems: 0
      }
    }

    try {
      // 1. Resolve curriculum conflicts
      const curriculumResult = await this.resolveCurriculumConflicts(
        guestData.curricula,
        existingUserData.curricula,
        strategy
      )
      result.conflicts.push(...curriculumResult.conflicts)
      result.resolutions.push(...curriculumResult.resolutions)
      result.finalData.curricula = curriculumResult.resolvedData

      // 2. Resolve flashcard conflicts
      const flashcardResult = await this.resolveFlashcardConflicts(
        guestData.flashcards,
        existingUserData.flashcards,
        strategy
      )
      result.conflicts.push(...flashcardResult.conflicts)
      result.resolutions.push(...flashcardResult.resolutions)
      result.finalData.flashcards = flashcardResult.resolvedData

      // 3. Resolve progress conflicts
      const progressResult = await this.resolveProgressConflicts(
        guestData.progress,
        existingUserData.progress,
        strategy
      )
      if (progressResult.conflict) {
        result.conflicts.push(progressResult.conflict)
        result.resolutions.push(progressResult.resolution!)
      }
      result.finalData.progress = progressResult.resolvedData

      // 4. Resolve preference conflicts
      const preferencesResult = await this.resolvePreferencesConflicts(
        guestData.preferences,
        existingUserData.preferences,
        strategy
      )
      if (preferencesResult.conflict) {
        result.conflicts.push(preferencesResult.conflict)
        result.resolutions.push(preferencesResult.resolution!)
      }
      result.finalData.preferences = preferencesResult.resolvedData

      // Calculate statistics
      result.statistics.totalConflicts = result.conflicts.length
      result.statistics.resolvedConflicts = result.resolutions.length
      result.statistics.mergedItems = result.resolutions.filter(r => r.action === 'merge').length
      result.statistics.skippedItems = result.resolutions.filter(r => r.action === 'skip').length
      result.statistics.newItems = result.resolutions.filter(r => r.action === 'add').length

      console.log('Conflict resolution completed:', result.statistics)
      return result

    } catch (error) {
      console.error('Conflict resolution failed:', error)
      throw new Error(`Conflict resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Resolve curriculum conflicts
   */
  private async resolveCurriculumConflicts(
    guestCurricula: DatabaseCurriculum[],
    existingCurricula: DatabaseCurriculum[],
    strategy: ConflictResolutionStrategy
  ): Promise<ItemConflictResult<DatabaseCurriculum>> {
    const conflicts: DataConflict[] = []
    const resolutions: ConflictResolution[] = []
    const resolvedData: DatabaseCurriculum[] = [...existingCurricula]

    for (const guestCurriculum of guestCurricula) {
      const conflict = this.detectCurriculumConflict(guestCurriculum, existingCurricula)
      
      if (conflict) {
        conflicts.push(conflict)
        const resolution = await this.resolveCurriculumConflict(guestCurriculum, conflict.existingItem as DatabaseCurriculum, strategy)
        resolutions.push(resolution)

        if (resolution.action === 'merge') {
          const existingIndex = resolvedData.findIndex(c => c.id === conflict.existingItem.id)
          if (existingIndex !== -1) {
            resolvedData[existingIndex] = resolution.resolvedItem as DatabaseCurriculum
          }
        } else if (resolution.action === 'add') {
          // Generate new ID to avoid conflicts
          const newCurriculum = { ...guestCurriculum, id: this.generateUniqueId('curriculum') }
          resolvedData.push(newCurriculum)
        }
        // 'skip' action means we don't add the guest curriculum
      } else {
        // No conflict, add guest curriculum
        resolvedData.push(guestCurriculum)
        resolutions.push({
          type: 'curriculum',
          action: 'add',
          reason: 'No conflict detected',
          guestItem: guestCurriculum,
          resolvedItem: guestCurriculum
        })
      }
    }

    return { conflicts, resolutions, resolvedData }
  }

  /**
   * Resolve flashcard conflicts
   */
  private async resolveFlashcardConflicts(
    guestFlashcards: DatabaseFlashcard[],
    existingFlashcards: DatabaseFlashcard[],
    strategy: ConflictResolutionStrategy
  ): Promise<ItemConflictResult<DatabaseFlashcard>> {
    const conflicts: DataConflict[] = []
    const resolutions: ConflictResolution[] = []
    const resolvedData: DatabaseFlashcard[] = [...existingFlashcards]

    for (const guestFlashcard of guestFlashcards) {
      const conflict = this.detectFlashcardConflict(guestFlashcard, existingFlashcards)
      
      if (conflict) {
        conflicts.push(conflict)
        const resolution = await this.resolveFlashcardConflict(guestFlashcard, conflict.existingItem as DatabaseFlashcard, strategy)
        resolutions.push(resolution)

        if (resolution.action === 'merge') {
          const existingIndex = resolvedData.findIndex(f => f.id === conflict.existingItem.id)
          if (existingIndex !== -1) {
            resolvedData[existingIndex] = resolution.resolvedItem as DatabaseFlashcard
          }
        } else if (resolution.action === 'add') {
          // Generate new ID to avoid conflicts
          const newFlashcard = { ...guestFlashcard, id: this.generateUniqueId('flashcard') }
          resolvedData.push(newFlashcard)
        }
        // 'skip' action means we don't add the guest flashcard
      } else {
        // No conflict, add guest flashcard
        resolvedData.push(guestFlashcard)
        resolutions.push({
          type: 'flashcard',
          action: 'add',
          reason: 'No conflict detected',
          guestItem: guestFlashcard,
          resolvedItem: guestFlashcard
        })
      }
    }

    return { conflicts, resolutions, resolvedData }
  }

  /**
   * Resolve progress conflicts
   */
  private async resolveProgressConflicts(
    guestProgress: any,
    existingProgress: any,
    strategy: ConflictResolutionStrategy
  ): Promise<SingleItemConflictResult<any>> {
    const conflict = this.detectProgressConflict(guestProgress, existingProgress)
    
    if (!conflict) {
      return { resolvedData: { ...existingProgress, ...guestProgress } }
    }

    const resolution = await this.resolveProgressConflict(guestProgress, existingProgress, strategy)
    
    return {
      conflict,
      resolution,
      resolvedData: resolution.resolvedItem
    }
  }

  /**
   * Resolve preferences conflicts
   */
  private async resolvePreferencesConflicts(
    guestPreferences: any,
    existingPreferences: any,
    strategy: ConflictResolutionStrategy
  ): Promise<SingleItemConflictResult<any>> {
    const conflict = this.detectPreferencesConflict(guestPreferences, existingPreferences)
    
    if (!conflict) {
      return { resolvedData: { ...existingPreferences, ...guestPreferences } }
    }

    const resolution = await this.resolvePreferencesConflict(guestPreferences, existingPreferences, strategy)
    
    return {
      conflict,
      resolution,
      resolvedData: resolution.resolvedItem
    }
  }

  // Conflict detection methods

  private detectCurriculumConflict(guestCurriculum: DatabaseCurriculum, existingCurricula: DatabaseCurriculum[]): DataConflict | null {
    // Check for exact ID match
    const exactMatch = existingCurricula.find(c => c.id === guestCurriculum.id)
    if (exactMatch) {
      return {
        type: 'curriculum',
        conflictType: 'id_collision',
        guestItem: guestCurriculum,
        existingItem: exactMatch,
        description: `Curriculum with ID ${guestCurriculum.id} already exists`
      }
    }

    // Check for similar title and domain
    const similarMatch = existingCurricula.find(c => 
      this.calculateSimilarity(c.title, guestCurriculum.title) > 0.8 && 
      c.domain === guestCurriculum.domain
    )
    if (similarMatch) {
      return {
        type: 'curriculum',
        conflictType: 'content_similarity',
        guestItem: guestCurriculum,
        existingItem: similarMatch,
        description: `Similar curriculum found: "${similarMatch.title}" in ${similarMatch.domain}`
      }
    }

    return null
  }

  private detectFlashcardConflict(guestFlashcard: DatabaseFlashcard, existingFlashcards: DatabaseFlashcard[]): DataConflict | null {
    // Check for exact ID match
    const exactMatch = existingFlashcards.find(f => f.id === guestFlashcard.id)
    if (exactMatch) {
      return {
        type: 'flashcard',
        conflictType: 'id_collision',
        guestItem: guestFlashcard,
        existingItem: exactMatch,
        description: `Flashcard with ID ${guestFlashcard.id} already exists`
      }
    }

    // Check for identical content
    const contentMatch = existingFlashcards.find(f => 
      f.front.trim().toLowerCase() === guestFlashcard.front.trim().toLowerCase() &&
      f.back.trim().toLowerCase() === guestFlashcard.back.trim().toLowerCase()
    )
    if (contentMatch) {
      return {
        type: 'flashcard',
        conflictType: 'content_duplicate',
        guestItem: guestFlashcard,
        existingItem: contentMatch,
        description: 'Identical flashcard content found'
      }
    }

    // Check for similar content
    const similarMatch = existingFlashcards.find(f => 
      this.calculateSimilarity(f.front, guestFlashcard.front) > 0.9 &&
      this.calculateSimilarity(f.back, guestFlashcard.back) > 0.8
    )
    if (similarMatch) {
      return {
        type: 'flashcard',
        conflictType: 'content_similarity',
        guestItem: guestFlashcard,
        existingItem: similarMatch,
        description: 'Very similar flashcard content found'
      }
    }

    return null
  }

  private detectProgressConflict(guestProgress: any, existingProgress: any): DataConflict | null {
    // Progress conflicts are rare, but can occur with timing or streak data
    const hasSignificantDifference = 
      Math.abs(guestProgress.study_minutes - existingProgress.study_minutes) > 60 ||
      Math.abs(guestProgress.current_streak - existingProgress.current_streak) > 7

    if (hasSignificantDifference) {
      return {
        type: 'progress',
        conflictType: 'data_inconsistency',
        guestItem: guestProgress,
        existingItem: existingProgress,
        description: 'Significant differences in progress data detected'
      }
    }

    return null
  }

  private detectPreferencesConflict(guestPreferences: any, existingPreferences: any): DataConflict | null {
    // Check for conflicting preference values
    const conflicts = []
    
    if (guestPreferences.theme !== existingPreferences.theme) {
      conflicts.push('theme')
    }
    if (guestPreferences.notifications_enabled !== existingPreferences.notifications_enabled) {
      conflicts.push('notifications')
    }
    if (guestPreferences.sound_effects_enabled !== existingPreferences.sound_effects_enabled) {
      conflicts.push('sound_effects')
    }

    if (conflicts.length > 0) {
      return {
        type: 'preferences',
        conflictType: 'setting_mismatch',
        guestItem: guestPreferences,
        existingItem: existingPreferences,
        description: `Conflicting preferences: ${conflicts.join(', ')}`
      }
    }

    return null
  }

  // Conflict resolution methods

  private async resolveCurriculumConflict(
    guestCurriculum: DatabaseCurriculum,
    existingCurriculum: DatabaseCurriculum,
    strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolution> {
    switch (strategy) {
      case 'guest_priority':
        return {
          type: 'curriculum',
          action: 'merge',
          reason: 'Guest data takes priority',
          guestItem: guestCurriculum,
          existingItem: existingCurriculum,
          resolvedItem: { ...existingCurriculum, ...guestCurriculum, updated_at: new Date().toISOString() }
        }

      case 'existing_priority':
        return {
          type: 'curriculum',
          action: 'skip',
          reason: 'Existing data takes priority',
          guestItem: guestCurriculum,
          existingItem: existingCurriculum,
          resolvedItem: existingCurriculum
        }

      case 'merge_with_preference':
      default:
        // Merge keeping the best of both
        const mergedCurriculum = this.mergeCurricula(guestCurriculum, existingCurriculum)
        return {
          type: 'curriculum',
          action: 'merge',
          reason: 'Merged with intelligent preference',
          guestItem: guestCurriculum,
          existingItem: existingCurriculum,
          resolvedItem: mergedCurriculum
        }

      case 'create_duplicate':
        return {
          type: 'curriculum',
          action: 'add',
          reason: 'Creating duplicate with new ID',
          guestItem: guestCurriculum,
          existingItem: existingCurriculum,
          resolvedItem: { ...guestCurriculum, id: this.generateUniqueId('curriculum') }
        }
    }
  }

  private async resolveFlashcardConflict(
    guestFlashcard: DatabaseFlashcard,
    existingFlashcard: DatabaseFlashcard,
    strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolution> {
    switch (strategy) {
      case 'guest_priority':
        return {
          type: 'flashcard',
          action: 'merge',
          reason: 'Guest data takes priority',
          guestItem: guestFlashcard,
          existingItem: existingFlashcard,
          resolvedItem: { ...existingFlashcard, ...guestFlashcard, updated_at: new Date().toISOString() }
        }

      case 'existing_priority':
        return {
          type: 'flashcard',
          action: 'skip',
          reason: 'Existing data takes priority',
          guestItem: guestFlashcard,
          existingItem: existingFlashcard,
          resolvedItem: existingFlashcard
        }

      case 'merge_with_preference':
      default:
        // Merge keeping the best review data
        const mergedFlashcard = this.mergeFlashcards(guestFlashcard, existingFlashcard)
        return {
          type: 'flashcard',
          action: 'merge',
          reason: 'Merged with intelligent preference',
          guestItem: guestFlashcard,
          existingItem: existingFlashcard,
          resolvedItem: mergedFlashcard
        }

      case 'create_duplicate':
        return {
          type: 'flashcard',
          action: 'add',
          reason: 'Creating duplicate with new ID',
          guestItem: guestFlashcard,
          existingItem: existingFlashcard,
          resolvedItem: { ...guestFlashcard, id: this.generateUniqueId('flashcard') }
        }
    }
  }

  private async resolveProgressConflict(
    guestProgress: any,
    existingProgress: any,
    strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolution> {
    const mergedProgress = this.mergeProgress(guestProgress, existingProgress)
    
    return {
      type: 'progress',
      action: 'merge',
      reason: 'Merged progress data with additive approach',
      guestItem: guestProgress,
      existingItem: existingProgress,
      resolvedItem: mergedProgress
    }
  }

  private async resolvePreferencesConflict(
    guestPreferences: any,
    existingPreferences: any,
    strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolution> {
    let resolvedPreferences: any

    switch (strategy) {
      case 'guest_priority':
        resolvedPreferences = { ...existingPreferences, ...guestPreferences }
        break
      case 'existing_priority':
        resolvedPreferences = existingPreferences
        break
      case 'merge_with_preference':
      default:
        resolvedPreferences = this.mergePreferences(guestPreferences, existingPreferences)
        break
    }

    return {
      type: 'preferences',
      action: 'merge',
      reason: `Applied ${strategy} strategy`,
      guestItem: guestPreferences,
      existingItem: existingPreferences,
      resolvedItem: resolvedPreferences
    }
  }

  // Merge utility methods

  private mergeCurricula(guest: DatabaseCurriculum, existing: DatabaseCurriculum): DatabaseCurriculum {
    return {
      ...existing,
      title: existing.title, // Keep existing title
      description: guest.description || existing.description,
      domain: existing.domain, // Keep existing domain
      tags: [...new Set([...existing.tags, ...guest.tags])], // Merge tags
      modules: this.mergeModules(guest.modules, existing.modules),
      updated_at: new Date().toISOString()
    }
  }

  private mergeModules(guestModules: any[], existingModules: any[]): any[] {
    const mergedModules = [...existingModules]
    
    guestModules.forEach(guestModule => {
      const existingIndex = mergedModules.findIndex(m => m.id === guestModule.id)
      if (existingIndex === -1) {
        // Add new module
        mergedModules.push(guestModule)
      } else {
        // Merge existing module
        mergedModules[existingIndex] = {
          ...mergedModules[existingIndex],
          lessons: this.mergeLessons(guestModule.lessons, mergedModules[existingIndex].lessons)
        }
      }
    })

    return mergedModules
  }

  private mergeLessons(guestLessons: any[], existingLessons: any[]): any[] {
    const mergedLessons = [...existingLessons]
    
    guestLessons.forEach(guestLesson => {
      const existingIndex = mergedLessons.findIndex(l => l.id === guestLesson.id)
      if (existingIndex === -1) {
        // Add new lesson
        mergedLessons.push(guestLesson)
      } else {
        // Keep existing lesson but update completion status if guest has completed it
        if (guestLesson.completed && !mergedLessons[existingIndex].completed) {
          mergedLessons[existingIndex].completed = true
          mergedLessons[existingIndex].completed_at = guestLesson.completed_at
        }
      }
    })

    return mergedLessons
  }

  private mergeFlashcards(guest: DatabaseFlashcard, existing: DatabaseFlashcard): DatabaseFlashcard {
    return {
      ...existing,
      // Keep existing content
      front: existing.front,
      back: existing.back,
      // Merge tags
      tags: [...new Set([...existing.tags, ...guest.tags])],
      // Use better review statistics
      review_count: Math.max(guest.review_count, existing.review_count),
      correct_count: Math.max(guest.correct_count, existing.correct_count),
      // Use more recent review date
      last_reviewed_at: this.getMoreRecentDate(guest.last_reviewed_at, existing.last_reviewed_at),
      // Keep better difficulty assessment
      difficulty: this.getBetterDifficulty(guest, existing),
      updated_at: new Date().toISOString()
    }
  }

  private mergeProgress(guest: any, existing: any): any {
    return {
      ...existing,
      // Use additive approach for counters
      total_plans: Math.max(guest.total_plans, existing.total_plans),
      total_lessons: Math.max(guest.total_lessons, existing.total_lessons),
      total_flashcards: Math.max(guest.total_flashcards, existing.total_flashcards),
      completed_lessons: Math.max(guest.completed_lessons, existing.completed_lessons),
      study_minutes: guest.study_minutes + existing.study_minutes,
      // Use better streak
      current_streak: Math.max(guest.current_streak, existing.current_streak),
      // Use more recent study date
      last_study_date: this.getMoreRecentDate(guest.last_study_date, existing.last_study_date),
      updated_at: new Date().toISOString()
    }
  }

  private mergePreferences(guest: any, existing: any): any {
    // For preferences, we generally keep existing user's choices
    // but can make intelligent decisions
    return {
      ...existing,
      // Keep existing theme unless guest has a more specific preference
      theme: existing.theme === 'system' ? guest.theme : existing.theme,
      // Keep more permissive notification setting
      notifications_enabled: existing.notifications_enabled || guest.notifications_enabled,
      // Keep more permissive sound setting
      sound_effects_enabled: existing.sound_effects_enabled || guest.sound_effects_enabled,
      updated_at: new Date().toISOString()
    }
  }

  // Utility methods

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation using Levenshtein distance
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        )
      }
    }

    return matrix[str2.length][str1.length]
  }

  private generateUniqueId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getMoreRecentDate(date1: string | null, date2: string | null): string | null {
    if (!date1) return date2
    if (!date2) return date1
    return new Date(date1) > new Date(date2) ? date1 : date2
  }

  private getBetterDifficulty(guest: DatabaseFlashcard, existing: DatabaseFlashcard): string {
    // Use difficulty from the flashcard with more reviews
    return guest.review_count > existing.review_count ? guest.difficulty : existing.difficulty
  }

  /**
   * Generate conflict resolution report
   */
  generateConflictReport(result: ConflictResolutionResult): string {
    const report = [
      '# Guest Data Migration Conflict Resolution Report',
      `Generated: ${new Date().toISOString()}`,
      `Strategy: ${result.strategy}`,
      '',
      '## Summary',
      `- Total Conflicts: ${result.statistics.totalConflicts}`,
      `- Resolved Conflicts: ${result.statistics.resolvedConflicts}`,
      `- Merged Items: ${result.statistics.mergedItems}`,
      `- Skipped Items: ${result.statistics.skippedItems}`,
      `- New Items: ${result.statistics.newItems}`,
      '',
      '## Conflicts Detected'
    ]

    result.conflicts.forEach((conflict, index) => {
      report.push(`### Conflict ${index + 1}: ${conflict.type}`)
      report.push(`- Type: ${conflict.conflictType}`)
      report.push(`- Description: ${conflict.description}`)
      report.push('')
    })

    report.push('## Resolutions Applied')
    result.resolutions.forEach((resolution, index) => {
      report.push(`### Resolution ${index + 1}: ${resolution.type}`)
      report.push(`- Action: ${resolution.action}`)
      report.push(`- Reason: ${resolution.reason}`)
      report.push('')
    })

    return report.join('\n')
  }
}

// Type definitions

type ConflictResolutionStrategy = 'merge_with_preference' | 'guest_priority' | 'existing_priority' | 'create_duplicate'

interface ExistingUserData {
  curricula: DatabaseCurriculum[]
  flashcards: DatabaseFlashcard[]
  progress: any
  preferences: any
}

interface DataConflict {
  type: 'curriculum' | 'flashcard' | 'progress' | 'preferences'
  conflictType: 'id_collision' | 'content_duplicate' | 'content_similarity' | 'data_inconsistency' | 'setting_mismatch'
  guestItem: any
  existingItem: any
  description: string
}

interface ConflictResolution {
  type: 'curriculum' | 'flashcard' | 'progress' | 'preferences'
  action: 'merge' | 'skip' | 'add'
  reason: string
  guestItem: any
  existingItem?: any
  resolvedItem: any
}

interface ConflictResolutionResult {
  strategy: ConflictResolutionStrategy
  conflicts: DataConflict[]
  resolutions: ConflictResolution[]
  finalData: {
    curricula: DatabaseCurriculum[]
    flashcards: DatabaseFlashcard[]
    progress: any
    preferences: any
  }
  statistics: {
    totalConflicts: number
    resolvedConflicts: number
    mergedItems: number
    skippedItems: number
    newItems: number
  }
}

interface ItemConflictResult<T> {
  conflicts: DataConflict[]
  resolutions: ConflictResolution[]
  resolvedData: T[]
}

interface SingleItemConflictResult<T> {
  conflict?: DataConflict
  resolution?: ConflictResolution
  resolvedData: T
}

// Export singleton instance
export const guestConflictResolver = GuestConflictResolver.getInstance()

// Export types
export type {
  ConflictResolutionStrategy,
  ExistingUserData,
  DataConflict,
  ConflictResolution,
  ConflictResolutionResult
}
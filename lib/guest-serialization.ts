import { 
  GuestPlan, 
  GuestFlashcard, 
  GuestUserData, 
  GuestSession,
  GuestModule,
  GuestLesson,
  GuestProgress 
} from '@/types/guest'

/**
 * Advanced serialization/deserialization utilities for complex guest objects
 * Handles nested structures, data validation, and format conversion
 */
export class GuestSerializationManager {
  private static instance: GuestSerializationManager

  static getInstance(): GuestSerializationManager {
    if (!GuestSerializationManager.instance) {
      GuestSerializationManager.instance = new GuestSerializationManager()
    }
    return GuestSerializationManager.instance
  }

  /**
   * Serialize guest plan with nested modules and lessons
   */
  serializePlan(plan: GuestPlan): string {
    try {
      const serializedPlan = {
        ...plan,
        _type: 'GuestPlan',
        _version: '1.0',
        _serializedAt: new Date().toISOString(),
        modules: plan.modules.map(module => this.serializeModule(module))
      }
      
      return JSON.stringify(serializedPlan, null, 2)
    } catch (error) {
      console.error('Failed to serialize plan:', error)
      throw new Error('Plan serialization failed')
    }
  }

  /**
   * Deserialize guest plan with validation
   */
  deserializePlan(serializedData: string): GuestPlan {
    try {
      const data = JSON.parse(serializedData)
      
      if (!this.validateSerializedPlan(data)) {
        throw new Error('Invalid plan data structure')
      }

      const plan: GuestPlan = {
        id: data.id,
        title: data.title,
        domain: data.domain,
        createdAt: data.createdAt,
        modules: data.modules.map((moduleData: any) => this.deserializeModule(moduleData))
      }

      return plan
    } catch (error) {
      console.error('Failed to deserialize plan:', error)
      throw new Error('Plan deserialization failed')
    }
  }

  /**
   * Serialize flashcard collection with metadata
   */
  serializeFlashcards(flashcards: GuestFlashcard[]): string {
    try {
      const serializedData = {
        flashcards: flashcards.map(card => ({
          ...card,
          _serializedAt: new Date().toISOString()
        })),
        _type: 'GuestFlashcardCollection',
        _version: '1.0',
        _count: flashcards.length,
        _totalSize: JSON.stringify(flashcards).length
      }

      return JSON.stringify(serializedData)
    } catch (error) {
      console.error('Failed to serialize flashcards:', error)
      throw new Error('Flashcard serialization failed')
    }
  }

  /**
   * Deserialize flashcard collection with validation
   */
  deserializeFlashcards(serializedData: string): GuestFlashcard[] {
    try {
      const data = JSON.parse(serializedData)
      
      if (!this.validateSerializedFlashcards(data)) {
        throw new Error('Invalid flashcard data structure')
      }

      return data.flashcards.map((cardData: any) => ({
        id: cardData.id,
        front: cardData.front,
        back: cardData.back,
        tags: cardData.tags || [],
        createdAt: cardData.createdAt,
        lastReviewedAt: cardData.lastReviewedAt,
        difficulty: cardData.difficulty || 'medium',
        reviewCount: cardData.reviewCount || 0,
        correctCount: cardData.correctCount || 0
      }))
    } catch (error) {
      console.error('Failed to deserialize flashcards:', error)
      throw new Error('Flashcard deserialization failed')
    }
  }

  /**
   * Serialize complete user data with integrity checks
   */
  serializeUserData(userData: GuestUserData): string {
    try {
      const serializedData = {
        plans: userData.plans.map(plan => JSON.parse(this.serializePlan(plan))),
        flashcards: userData.flashcards,
        progress: this.serializeProgress(userData.progress),
        preferences: userData.preferences,
        _type: 'GuestUserData',
        _version: '1.0',
        _serializedAt: new Date().toISOString(),
        _checksum: this.calculateChecksum(userData)
      }

      return JSON.stringify(serializedData)
    } catch (error) {
      console.error('Failed to serialize user data:', error)
      throw new Error('User data serialization failed')
    }
  }

  /**
   * Deserialize complete user data with integrity verification
   */
  deserializeUserData(serializedData: string): GuestUserData {
    try {
      const data = JSON.parse(serializedData)
      
      if (!this.validateSerializedUserData(data)) {
        throw new Error('Invalid user data structure')
      }

      const userData: GuestUserData = {
        plans: data.plans.map((planData: any) => this.deserializePlanFromObject(planData)),
        flashcards: data.flashcards.map((cardData: any) => this.normalizeFlashcard(cardData)),
        progress: this.deserializeProgress(data.progress),
        preferences: data.preferences
      }

      // Verify data integrity
      const expectedChecksum = this.calculateChecksum(userData)
      if (data._checksum && data._checksum !== expectedChecksum) {
        console.warn('Data integrity check failed, data may be corrupted')
      }

      return userData
    } catch (error) {
      console.error('Failed to deserialize user data:', error)
      throw new Error('User data deserialization failed')
    }
  }

  /**
   * Export user data to portable format
   */
  exportToPortableFormat(userData: GuestUserData): string {
    try {
      const exportData = {
        formatVersion: '1.0',
        exportedAt: new Date().toISOString(),
        source: 'fathom-guest-mode',
        data: {
          plans: userData.plans.map(plan => ({
            ...plan,
            modules: plan.modules.map(module => ({
              ...module,
              lessons: module.lessons.map(lesson => ({
                ...lesson,
                // Add export-specific metadata
                exportMetadata: {
                  originalId: lesson.id,
                  exportedAt: new Date().toISOString()
                }
              }))
            }))
          })),
          flashcards: userData.flashcards.map(card => ({
            ...card,
            exportMetadata: {
              originalId: card.id,
              exportedAt: new Date().toISOString()
            }
          })),
          progress: userData.progress,
          preferences: userData.preferences
        },
        statistics: {
          totalPlans: userData.plans.length,
          totalModules: userData.plans.reduce((sum, plan) => sum + plan.modules.length, 0),
          totalLessons: userData.plans.reduce((sum, plan) => 
            sum + plan.modules.reduce((moduleSum, module) => moduleSum + module.lessons.length, 0), 0),
          totalFlashcards: userData.flashcards.length,
          completedLessons: userData.progress.completedLessons
        }
      }

      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      console.error('Failed to export user data:', error)
      throw new Error('User data export failed')
    }
  }

  /**
   * Import user data from portable format
   */
  importFromPortableFormat(exportedData: string): GuestUserData {
    try {
      const data = JSON.parse(exportedData)
      
      if (!this.validateExportedData(data)) {
        throw new Error('Invalid exported data format')
      }

      // Convert back to internal format
      const userData: GuestUserData = {
        plans: data.data.plans.map((planData: any) => ({
          id: planData.id,
          title: planData.title,
          domain: planData.domain,
          createdAt: planData.createdAt,
          modules: planData.modules.map((moduleData: any) => ({
            id: moduleData.id,
            title: moduleData.title,
            lessons: moduleData.lessons.map((lessonData: any) => ({
              id: lessonData.id,
              title: lessonData.title,
              duration: lessonData.duration,
              completed: lessonData.completed,
              completedAt: lessonData.completedAt
            }))
          }))
        })),
        flashcards: data.data.flashcards.map((cardData: any) => ({
          id: cardData.id,
          front: cardData.front,
          back: cardData.back,
          tags: cardData.tags || [],
          createdAt: cardData.createdAt,
          lastReviewedAt: cardData.lastReviewedAt,
          difficulty: cardData.difficulty || 'medium',
          reviewCount: cardData.reviewCount || 0,
          correctCount: cardData.correctCount || 0
        })),
        progress: data.data.progress,
        preferences: data.data.preferences
      }

      return userData
    } catch (error) {
      console.error('Failed to import user data:', error)
      throw new Error('User data import failed')
    }
  }

  /**
   * Create data diff for incremental updates
   */
  createDataDiff(oldData: GuestUserData, newData: GuestUserData): any {
    const diff = {
      timestamp: new Date().toISOString(),
      changes: {
        plans: this.createArrayDiff(oldData.plans, newData.plans, 'id'),
        flashcards: this.createArrayDiff(oldData.flashcards, newData.flashcards, 'id'),
        progress: this.createObjectDiff(oldData.progress, newData.progress),
        preferences: this.createObjectDiff(oldData.preferences, newData.preferences)
      }
    }

    return diff
  }

  /**
   * Apply data diff to existing data
   */
  applyDataDiff(baseData: GuestUserData, diff: any): GuestUserData {
    const updatedData = JSON.parse(JSON.stringify(baseData)) // Deep clone

    // Apply plan changes
    if (diff.changes.plans) {
      updatedData.plans = this.applyArrayDiff(updatedData.plans, diff.changes.plans, 'id')
    }

    // Apply flashcard changes
    if (diff.changes.flashcards) {
      updatedData.flashcards = this.applyArrayDiff(updatedData.flashcards, diff.changes.flashcards, 'id')
    }

    // Apply progress changes
    if (diff.changes.progress) {
      Object.assign(updatedData.progress, diff.changes.progress)
    }

    // Apply preference changes
    if (diff.changes.preferences) {
      Object.assign(updatedData.preferences, diff.changes.preferences)
    }

    return updatedData
  }

  // Private helper methods

  private serializeModule(module: GuestModule): any {
    return {
      ...module,
      lessons: module.lessons.map(lesson => ({
        ...lesson,
        _serializedAt: new Date().toISOString()
      }))
    }
  }

  private deserializeModule(moduleData: any): GuestModule {
    return {
      id: moduleData.id,
      title: moduleData.title,
      lessons: moduleData.lessons.map((lessonData: any) => ({
        id: lessonData.id,
        title: lessonData.title,
        duration: lessonData.duration,
        completed: lessonData.completed,
        completedAt: lessonData.completedAt
      }))
    }
  }

  private deserializePlanFromObject(planData: any): GuestPlan {
    return {
      id: planData.id,
      title: planData.title,
      domain: planData.domain,
      createdAt: planData.createdAt,
      modules: planData.modules.map((moduleData: any) => this.deserializeModule(moduleData))
    }
  }

  private normalizeFlashcard(cardData: any): GuestFlashcard {
    return {
      id: cardData.id,
      front: cardData.front,
      back: cardData.back,
      tags: cardData.tags || [],
      createdAt: cardData.createdAt,
      lastReviewedAt: cardData.lastReviewedAt,
      difficulty: cardData.difficulty || 'medium',
      reviewCount: cardData.reviewCount || 0,
      correctCount: cardData.correctCount || 0
    }
  }

  private serializeProgress(progress: GuestProgress): any {
    return {
      ...progress,
      _serializedAt: new Date().toISOString()
    }
  }

  private deserializeProgress(progressData: any): GuestProgress {
    return {
      totalPlans: progressData.totalPlans || 0,
      totalLessons: progressData.totalLessons || 0,
      totalFlashcards: progressData.totalFlashcards || 0,
      completedLessons: progressData.completedLessons || 0,
      studyMinutes: progressData.studyMinutes || 0,
      streak: progressData.streak || 0,
      lastStudyDate: progressData.lastStudyDate
    }
  }

  private calculateChecksum(data: any): string {
    // Simple checksum calculation (in production, use a proper hash function)
    const dataString = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  private createArrayDiff<T extends { id: string }>(oldArray: T[], newArray: T[], idKey: keyof T): any {
    const added = newArray.filter(newItem => !oldArray.find(oldItem => oldItem[idKey] === newItem[idKey]))
    const removed = oldArray.filter(oldItem => !newArray.find(newItem => newItem[idKey] === oldItem[idKey]))
    const modified = newArray.filter(newItem => {
      const oldItem = oldArray.find(oldItem => oldItem[idKey] === newItem[idKey])
      return oldItem && JSON.stringify(oldItem) !== JSON.stringify(newItem)
    })

    return { added, removed, modified }
  }

  private createObjectDiff(oldObj: any, newObj: any): any {
    const changes: any = {}
    
    Object.keys(newObj).forEach(key => {
      if (oldObj[key] !== newObj[key]) {
        changes[key] = newObj[key]
      }
    })

    return Object.keys(changes).length > 0 ? changes : null
  }

  private applyArrayDiff<T extends { id: string }>(baseArray: T[], diff: any, idKey: keyof T): T[] {
    let result = [...baseArray]

    // Remove items
    if (diff.removed) {
      result = result.filter(item => !diff.removed.find((removed: T) => removed[idKey] === item[idKey]))
    }

    // Add items
    if (diff.added) {
      result.push(...diff.added)
    }

    // Modify items
    if (diff.modified) {
      diff.modified.forEach((modifiedItem: T) => {
        const index = result.findIndex(item => item[idKey] === modifiedItem[idKey])
        if (index !== -1) {
          result[index] = modifiedItem
        }
      })
    }

    return result
  }

  // Validation methods

  private validateSerializedPlan(data: any): boolean {
    return (
      data &&
      typeof data.id === 'string' &&
      typeof data.title === 'string' &&
      typeof data.domain === 'string' &&
      typeof data.createdAt === 'string' &&
      Array.isArray(data.modules)
    )
  }

  private validateSerializedFlashcards(data: any): boolean {
    return (
      data &&
      Array.isArray(data.flashcards) &&
      typeof data._count === 'number' &&
      data._count === data.flashcards.length
    )
  }

  private validateSerializedUserData(data: any): boolean {
    return (
      data &&
      Array.isArray(data.plans) &&
      Array.isArray(data.flashcards) &&
      data.progress &&
      data.preferences
    )
  }

  private validateExportedData(data: any): boolean {
    return (
      data &&
      data.formatVersion &&
      data.data &&
      data.data.plans &&
      data.data.flashcards &&
      data.data.progress &&
      data.data.preferences
    )
  }
}

// Export singleton instance
export const guestSerializationManager = GuestSerializationManager.getInstance()

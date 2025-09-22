export interface MigrationCheckpoint {
  id: string
  timestamp: string
  guestId: string
  userId: string
  preState: {
    existingCurricula: any[]
    existingFlashcards: any[]
    userProfile: any
  }
  migrationSteps: {
    step: string
    completed: boolean
    data?: any
    error?: string
  }[]
}

export interface RollbackResult {
  success: boolean
  error?: string
  rollbackSteps: string[]
}

/**
 * Handles rollback of guest data migration in case of failures
 */
export class GuestMigrationRollback {
  private static instance: GuestMigrationRollback

  static getInstance(): GuestMigrationRollback {
    if (!GuestMigrationRollback.instance) {
      GuestMigrationRollback.instance = new GuestMigrationRollback()
    }
    return GuestMigrationRollback.instance
  }

  /**
   * Create a checkpoint before migration
   */
  async createCheckpoint(
    guestId: string,
    userId: string,
    supabaseGuestManager: any
  ): Promise<MigrationCheckpoint> {
    try {
      // Get existing user data before migration
      const existingCurricula = await this.getExistingCurricula(userId, supabaseGuestManager)
      const existingFlashcards = await this.getExistingFlashcards(userId, supabaseGuestManager)
      const userProfile = await this.getUserProfile(userId, supabaseGuestManager)

      const checkpoint: MigrationCheckpoint = {
        id: `checkpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        guestId,
        userId,
        preState: {
          existingCurricula,
          existingFlashcards,
          userProfile
        },
        migrationSteps: []
      }

      // Store checkpoint in memory/localStorage for recovery
      this.storeCheckpoint(checkpoint)
      
      return checkpoint
    } catch (error) {
      throw new Error(`Failed to create migration checkpoint: ${error}`)
    }
  }

  /**
   * Rollback migration to checkpoint state
   */
  async rollbackToCheckpoint(
    checkpoint: MigrationCheckpoint,
    supabaseGuestManager: any
  ): Promise<RollbackResult> {
    const rollbackSteps: string[] = []
    
    try {
      // Rollback in reverse order of migration steps
      const completedSteps = checkpoint.migrationSteps
        .filter(step => step.completed)
        .reverse()

      for (const step of completedSteps) {
        try {
          await this.rollbackStep(step, checkpoint, supabaseGuestManager)
          rollbackSteps.push(`Rolled back: ${step.step}`)
        } catch (error) {
          rollbackSteps.push(`Failed to rollback: ${step.step} - ${error}`)
          // Continue with other rollback steps even if one fails
        }
      }

      // Clean up checkpoint
      this.removeCheckpoint(checkpoint.id)

      return {
        success: true,
        rollbackSteps
      }
    } catch (error) {
      return {
        success: false,
        error: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        rollbackSteps
      }
    }
  }

  /**
   * Rollback a specific migration step
   */
  private async rollbackStep(
    step: any,
    checkpoint: MigrationCheckpoint,
    supabaseGuestManager: any
  ): Promise<void> {
    switch (step.step) {
      case 'create_curricula':
        await this.rollbackCurricula(step.data, checkpoint.userId, supabaseGuestManager)
        break
        
      case 'create_flashcards':
        await this.rollbackFlashcards(step.data, checkpoint.userId, supabaseGuestManager)
        break
        
      case 'update_profile':
        await this.rollbackProfile(checkpoint.preState.userProfile, checkpoint.userId, supabaseGuestManager)
        break
        
      default:
        console.warn(`Unknown rollback step: ${step.step}`)
    }
  }

  /**
   * Rollback created curricula
   */
  private async rollbackCurricula(
    createdCurricula: any[],
    userId: string,
    supabaseGuestManager: any
  ): Promise<void> {
    for (const curriculum of createdCurricula || []) {
      try {
        await supabaseGuestManager.deleteCurriculum(curriculum.id)
      } catch (error) {
        console.error(`Failed to delete curriculum ${curriculum.id}:`, error)
      }
    }
  }

  /**
   * Rollback created flashcards
   */
  private async rollbackFlashcards(
    createdFlashcards: any[],
    userId: string,
    supabaseGuestManager: any
  ): Promise<void> {
    for (const flashcard of createdFlashcards || []) {
      try {
        await supabaseGuestManager.deleteFlashcard(flashcard.id)
      } catch (error) {
        console.error(`Failed to delete flashcard ${flashcard.id}:`, error)
      }
    }
  }

  /**
   * Rollback profile changes
   */
  private async rollbackProfile(
    originalProfile: any,
    userId: string,
    supabaseGuestManager: any
  ): Promise<void> {
    try {
      await supabaseGuestManager.updateUserProfile(userId, originalProfile)
    } catch (error) {
      console.error(`Failed to rollback profile for user ${userId}:`, error)
    }
  }

  /**
   * Helper methods for getting existing data
   */
  private async getExistingCurricula(userId: string, supabaseGuestManager: any): Promise<any[]> {
    try {
      const result = await supabaseGuestManager.getUserCurricula(userId)
      return result.success ? result.data : []
    } catch (error) {
      console.error('Failed to get existing curricula:', error)
      return []
    }
  }

  private async getExistingFlashcards(userId: string, supabaseGuestManager: any): Promise<any[]> {
    try {
      const result = await supabaseGuestManager.getUserFlashcards(userId)
      return result.success ? result.data : []
    } catch (error) {
      console.error('Failed to get existing flashcards:', error)
      return []
    }
  }

  private async getUserProfile(userId: string, supabaseGuestManager: any): Promise<any> {
    try {
      const result = await supabaseGuestManager.getUserProfile(userId)
      return result.success ? result.data : null
    } catch (error) {
      console.error('Failed to get user profile:', error)
      return null
    }
  }

  /**
   * Store checkpoint (in production, this would go to database)
   */
  private storeCheckpoint(checkpoint: MigrationCheckpoint): void {
    try {
      const checkpoints = this.getStoredCheckpoints()
      checkpoints[checkpoint.id] = checkpoint
      localStorage.setItem('migration_checkpoints', JSON.stringify(checkpoints))
    } catch (error) {
      console.error('Failed to store checkpoint:', error)
    }
  }

  /**
   * Remove checkpoint after successful migration or rollback
   */
  private removeCheckpoint(checkpointId: string): void {
    try {
      const checkpoints = this.getStoredCheckpoints()
      delete checkpoints[checkpointId]
      localStorage.setItem('migration_checkpoints', JSON.stringify(checkpoints))
    } catch (error) {
      console.error('Failed to remove checkpoint:', error)
    }
  }

  /**
   * Get stored checkpoints
   */
  private getStoredCheckpoints(): Record<string, MigrationCheckpoint> {
    try {
      const stored = localStorage.getItem('migration_checkpoints')
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Failed to get stored checkpoints:', error)
      return {}
    }
  }

  /**
   * Clean up old checkpoints (older than 24 hours)
   */
  cleanupOldCheckpoints(): void {
    try {
      const checkpoints = this.getStoredCheckpoints()
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
      
      Object.keys(checkpoints).forEach(id => {
        const checkpoint = checkpoints[id]
        if (new Date(checkpoint.timestamp).getTime() < oneDayAgo) {
          delete checkpoints[id]
        }
      })
      
      localStorage.setItem('migration_checkpoints', JSON.stringify(checkpoints))
    } catch (error) {
      console.error('Failed to cleanup old checkpoints:', error)
    }
  }
}

// Export singleton instance
export const guestMigrationRollback = GuestMigrationRollback.getInstance()
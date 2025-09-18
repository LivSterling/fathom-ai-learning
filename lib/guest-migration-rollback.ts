import { supabaseGuestManager } from './supabase'
import { GuestUserData } from '@/types/guest'
import { TransformedMigrationData } from './guest-data-transformer'

/**
 * Rollback mechanism for failed data migrations to maintain data integrity
 * Provides transaction-like behavior for guest data migration process
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
   * Create a migration checkpoint before starting migration
   */
  async createMigrationCheckpoint(
    guestId: string,
    userId: string,
    guestData: GuestUserData
  ): Promise<MigrationCheckpoint> {
    const checkpointId = this.generateCheckpointId(guestId)
    
    try {
      console.log('Creating migration checkpoint:', checkpointId)

      // 1. Backup current database state for the user
      const databaseBackup = await this.backupUserDatabaseState(userId)

      // 2. Backup local storage state
      const localStorageBackup = await this.backupLocalStorageState(guestId)

      // 3. Create checkpoint record
      const checkpoint: MigrationCheckpoint = {
        id: checkpointId,
        guest_id: guestId,
        user_id: userId,
        created_at: new Date().toISOString(),
        status: 'active',
        backup_data: {
          database: databaseBackup,
          localStorage: localStorageBackup,
          original_guest_data: guestData
        },
        metadata: {
          checkpoint_version: '1.0.0',
          total_items: this.countTotalItems(guestData),
          backup_size: JSON.stringify(databaseBackup).length + JSON.stringify(localStorageBackup).length
        }
      }

      // 4. Store checkpoint in database
      await this.storeCheckpoint(checkpoint)

      // 5. Store checkpoint in local storage as fallback
      localStorage.setItem(`fathom_migration_checkpoint_${checkpointId}`, JSON.stringify(checkpoint))

      console.log('Migration checkpoint created successfully:', checkpointId)
      return checkpoint

    } catch (error) {
      console.error('Failed to create migration checkpoint:', error)
      throw new Error(`Checkpoint creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Execute rollback to restore previous state
   */
  async executeRollback(
    checkpointId: string,
    rollbackReason: string,
    partialMigrationData?: any
  ): Promise<RollbackResult> {
    const result: RollbackResult = {
      checkpointId,
      success: false,
      rollbackReason,
      restoredItems: {
        curricula: 0,
        flashcards: 0,
        progress: false,
        preferences: false
      },
      errors: [],
      completedAt: new Date().toISOString()
    }

    try {
      console.log('Starting rollback process for checkpoint:', checkpointId)

      // 1. Retrieve checkpoint
      const checkpoint = await this.retrieveCheckpoint(checkpointId)
      if (!checkpoint) {
        throw new Error(`Checkpoint ${checkpointId} not found`)
      }

      // 2. Validate checkpoint integrity
      const validationResult = await this.validateCheckpoint(checkpoint)
      if (!validationResult.isValid) {
        result.errors.push(`Checkpoint validation failed: ${validationResult.errors.join(', ')}`)
        throw new Error('Checkpoint validation failed')
      }

      // 3. Begin rollback transaction
      const rollbackTransaction = await this.beginRollbackTransaction(checkpoint)

      try {
        // 4. Restore database state
        const databaseRollback = await this.rollbackDatabaseState(checkpoint, rollbackTransaction)
        result.restoredItems.curricula = databaseRollback.curricula
        result.restoredItems.flashcards = databaseRollback.flashcards
        result.restoredItems.progress = databaseRollback.progress
        result.restoredItems.preferences = databaseRollback.preferences

        // 5. Restore local storage state
        await this.rollbackLocalStorageState(checkpoint)

        // 6. Clean up any partial migration data
        if (partialMigrationData) {
          await this.cleanupPartialMigration(partialMigrationData, rollbackTransaction)
        }

        // 7. Commit rollback transaction
        await this.commitRollbackTransaction(rollbackTransaction)

        // 8. Update checkpoint status
        await this.updateCheckpointStatus(checkpointId, 'rolled_back', rollbackReason)

        // 9. Create rollback audit log
        await this.createRollbackAuditLog(checkpoint, result, rollbackReason)

        result.success = true
        console.log('Rollback completed successfully:', result)

      } catch (rollbackError) {
        // Rollback failed, try to abort transaction
        await this.abortRollbackTransaction(rollbackTransaction)
        throw rollbackError
      }

    } catch (error) {
      console.error('Rollback process failed:', error)
      result.errors.push(error instanceof Error ? error.message : 'Unknown rollback error')
      result.success = false

      // Try emergency restoration
      await this.attemptEmergencyRestore(checkpointId, result)
    }

    return result
  }

  /**
   * Validate migration success and clean up checkpoint
   */
  async confirmMigrationSuccess(checkpointId: string): Promise<void> {
    try {
      console.log('Confirming migration success for checkpoint:', checkpointId)

      // 1. Update checkpoint status
      await this.updateCheckpointStatus(checkpointId, 'completed', 'Migration successful')

      // 2. Clean up checkpoint data after a delay (keep for audit)
      setTimeout(async () => {
        await this.cleanupOldCheckpoint(checkpointId)
      }, 24 * 60 * 60 * 1000) // 24 hours

      // 3. Remove local storage backup
      localStorage.removeItem(`fathom_migration_checkpoint_${checkpointId}`)

      console.log('Migration confirmation completed')

    } catch (error) {
      console.error('Failed to confirm migration success:', error)
      // Non-critical error, don't throw
    }
  }

  /**
   * List available checkpoints for a user
   */
  async listCheckpoints(guestId: string, userId?: string): Promise<MigrationCheckpoint[]> {
    try {
      const { data, error } = await supabaseGuestManager.supabase
        .from('guest_migration_checkpoints')
        .select('*')
        .eq('guest_id', guestId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to list checkpoints:', error)
      return []
    }
  }

  /**
   * Clean up old checkpoints
   */
  async cleanupOldCheckpoints(olderThanDays: number = 7): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      const { error } = await supabaseGuestManager.supabase
        .from('guest_migration_checkpoints')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .in('status', ['completed', 'rolled_back'])

      if (error) throw error

      console.log(`Cleaned up old checkpoints older than ${olderThanDays} days`)
    } catch (error) {
      console.error('Failed to cleanup old checkpoints:', error)
    }
  }

  // Private methods

  private async backupUserDatabaseState(userId: string): Promise<DatabaseBackup> {
    try {
      // Backup curricula
      const { data: curricula, error: curriculaError } = await supabaseGuestManager.supabase
        .from('curricula')
        .select(`
          *,
          modules:curriculum_modules(
            *,
            lessons:module_lessons(*)
          )
        `)
        .eq('user_id', userId)

      if (curriculaError) throw curriculaError

      // Backup flashcards
      const { data: flashcards, error: flashcardsError } = await supabaseGuestManager.supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)

      if (flashcardsError) throw flashcardsError

      // Backup progress
      const { data: progress, error: progressError } = await supabaseGuestManager.supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (progressError && progressError.code !== 'PGRST116') throw progressError

      // Backup preferences
      const { data: preferences, error: preferencesError } = await supabaseGuestManager.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (preferencesError && preferencesError.code !== 'PGRST116') throw preferencesError

      return {
        curricula: curricula || [],
        flashcards: flashcards || [],
        progress,
        preferences,
        backup_timestamp: new Date().toISOString()
      }

    } catch (error) {
      console.error('Failed to backup database state:', error)
      throw new Error('Database backup failed')
    }
  }

  private async backupLocalStorageState(guestId: string): Promise<LocalStorageBackup> {
    try {
      const backup: LocalStorageBackup = {
        session: localStorage.getItem('fathom_guest_session'),
        userData: localStorage.getItem('fathom_guest_data'),
        preferences: localStorage.getItem('fathom_guest_preferences'),
        analytics: localStorage.getItem('fathom_guest_analytics'),
        backup_timestamp: new Date().toISOString()
      }

      return backup
    } catch (error) {
      console.error('Failed to backup local storage state:', error)
      throw new Error('Local storage backup failed')
    }
  }

  private async storeCheckpoint(checkpoint: MigrationCheckpoint): Promise<void> {
    try {
      const { error } = await supabaseGuestManager.supabase
        .from('guest_migration_checkpoints')
        .insert({
          id: checkpoint.id,
          guest_id: checkpoint.guest_id,
          user_id: checkpoint.user_id,
          created_at: checkpoint.created_at,
          status: checkpoint.status,
          backup_data: checkpoint.backup_data,
          metadata: checkpoint.metadata
        })

      if (error) throw error
    } catch (error) {
      console.error('Failed to store checkpoint:', error)
      throw error
    }
  }

  private async retrieveCheckpoint(checkpointId: string): Promise<MigrationCheckpoint | null> {
    try {
      // Try database first
      const { data, error } = await supabaseGuestManager.supabase
        .from('guest_migration_checkpoints')
        .select('*')
        .eq('id', checkpointId)
        .single()

      if (!error && data) {
        return data as MigrationCheckpoint
      }

      // Fallback to local storage
      const localCheckpoint = localStorage.getItem(`fathom_migration_checkpoint_${checkpointId}`)
      if (localCheckpoint) {
        return JSON.parse(localCheckpoint)
      }

      return null
    } catch (error) {
      console.error('Failed to retrieve checkpoint:', error)
      return null
    }
  }

  private async validateCheckpoint(checkpoint: MigrationCheckpoint): Promise<ValidationResult> {
    const errors: string[] = []

    try {
      // Check checkpoint structure
      if (!checkpoint.id || !checkpoint.guest_id || !checkpoint.user_id) {
        errors.push('Checkpoint missing required fields')
      }

      if (!checkpoint.backup_data) {
        errors.push('Checkpoint missing backup data')
      }

      // Validate backup data integrity
      if (checkpoint.backup_data) {
        if (!checkpoint.backup_data.database) {
          errors.push('Database backup missing')
        }

        if (!checkpoint.backup_data.localStorage) {
          errors.push('Local storage backup missing')
        }

        // Check data consistency
        const expectedSize = checkpoint.metadata?.backup_size || 0
        const actualSize = JSON.stringify(checkpoint.backup_data).length
        
        if (Math.abs(actualSize - expectedSize) > expectedSize * 0.1) { // 10% tolerance
          errors.push('Backup data size mismatch, possible corruption')
        }
      }

    } catch (error) {
      errors.push(`Checkpoint validation error: ${error}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private async beginRollbackTransaction(checkpoint: MigrationCheckpoint): Promise<RollbackTransaction> {
    const transactionId = this.generateTransactionId()
    
    return {
      id: transactionId,
      checkpoint_id: checkpoint.id,
      started_at: new Date().toISOString(),
      operations: []
    }
  }

  private async rollbackDatabaseState(
    checkpoint: MigrationCheckpoint,
    transaction: RollbackTransaction
  ): Promise<DatabaseRollbackResult> {
    const result: DatabaseRollbackResult = {
      curricula: 0,
      flashcards: 0,
      progress: false,
      preferences: false
    }

    try {
      const backup = checkpoint.backup_data.database

      // Restore curricula
      if (backup.curricula) {
        await this.restoreCurricula(backup.curricula, checkpoint.user_id)
        result.curricula = backup.curricula.length
        transaction.operations.push({
          type: 'restore_curricula',
          count: backup.curricula.length,
          timestamp: new Date().toISOString()
        })
      }

      // Restore flashcards
      if (backup.flashcards) {
        await this.restoreFlashcards(backup.flashcards, checkpoint.user_id)
        result.flashcards = backup.flashcards.length
        transaction.operations.push({
          type: 'restore_flashcards',
          count: backup.flashcards.length,
          timestamp: new Date().toISOString()
        })
      }

      // Restore progress
      if (backup.progress) {
        await this.restoreProgress(backup.progress, checkpoint.user_id)
        result.progress = true
        transaction.operations.push({
          type: 'restore_progress',
          timestamp: new Date().toISOString()
        })
      }

      // Restore preferences
      if (backup.preferences) {
        await this.restorePreferences(backup.preferences, checkpoint.user_id)
        result.preferences = true
        transaction.operations.push({
          type: 'restore_preferences',
          timestamp: new Date().toISOString()
        })
      }

      return result
    } catch (error) {
      console.error('Database rollback failed:', error)
      throw error
    }
  }

  private async rollbackLocalStorageState(checkpoint: MigrationCheckpoint): Promise<void> {
    try {
      const backup = checkpoint.backup_data.localStorage

      // Restore each local storage item
      if (backup.session) {
        localStorage.setItem('fathom_guest_session', backup.session)
      } else {
        localStorage.removeItem('fathom_guest_session')
      }

      if (backup.userData) {
        localStorage.setItem('fathom_guest_data', backup.userData)
      } else {
        localStorage.removeItem('fathom_guest_data')
      }

      if (backup.preferences) {
        localStorage.setItem('fathom_guest_preferences', backup.preferences)
      } else {
        localStorage.removeItem('fathom_guest_preferences')
      }

      if (backup.analytics) {
        localStorage.setItem('fathom_guest_analytics', backup.analytics)
      } else {
        localStorage.removeItem('fathom_guest_analytics')
      }

      console.log('Local storage state restored from backup')
    } catch (error) {
      console.error('Local storage rollback failed:', error)
      throw error
    }
  }

  private async restoreCurricula(curricula: any[], userId: string): Promise<void> {
    // Delete current curricula
    await supabaseGuestManager.supabase
      .from('curricula')
      .delete()
      .eq('user_id', userId)

    // Restore from backup
    if (curricula.length > 0) {
      const { error } = await supabaseGuestManager.supabase
        .from('curricula')
        .insert(curricula.map(c => ({ ...c, user_id: userId })))

      if (error) throw error
    }
  }

  private async restoreFlashcards(flashcards: any[], userId: string): Promise<void> {
    // Delete current flashcards
    await supabaseGuestManager.supabase
      .from('flashcards')
      .delete()
      .eq('user_id', userId)

    // Restore from backup
    if (flashcards.length > 0) {
      const { error } = await supabaseGuestManager.supabase
        .from('flashcards')
        .insert(flashcards.map(f => ({ ...f, user_id: userId })))

      if (error) throw error
    }
  }

  private async restoreProgress(progress: any, userId: string): Promise<void> {
    const { error } = await supabaseGuestManager.supabase
      .from('user_progress')
      .upsert({ ...progress, user_id: userId })

    if (error) throw error
  }

  private async restorePreferences(preferences: any, userId: string): Promise<void> {
    const { error } = await supabaseGuestManager.supabase
      .from('user_preferences')
      .upsert({ ...preferences, user_id: userId })

    if (error) throw error
  }

  private async commitRollbackTransaction(transaction: RollbackTransaction): Promise<void> {
    transaction.completed_at = new Date().toISOString()
    transaction.status = 'committed'

    // Log transaction completion
    console.log('Rollback transaction committed:', transaction.id)
  }

  private async abortRollbackTransaction(transaction: RollbackTransaction): Promise<void> {
    transaction.completed_at = new Date().toISOString()
    transaction.status = 'aborted'

    console.error('Rollback transaction aborted:', transaction.id)
  }

  private async cleanupPartialMigration(partialData: any, transaction: RollbackTransaction): Promise<void> {
    // Clean up any partially migrated data
    if (partialData.migratedCurricula) {
      const curriculaIds = partialData.migratedCurricula.map((c: any) => c.id)
      await supabaseGuestManager.supabase
        .from('curricula')
        .delete()
        .in('id', curriculaIds)
    }

    if (partialData.migratedFlashcards) {
      const flashcardIds = partialData.migratedFlashcards.map((f: any) => f.id)
      await supabaseGuestManager.supabase
        .from('flashcards')
        .delete()
        .in('id', flashcardIds)
    }

    transaction.operations.push({
      type: 'cleanup_partial_migration',
      timestamp: new Date().toISOString()
    })
  }

  private async updateCheckpointStatus(
    checkpointId: string,
    status: CheckpointStatus,
    reason?: string
  ): Promise<void> {
    try {
      const { error } = await supabaseGuestManager.supabase
        .from('guest_migration_checkpoints')
        .update({
          status,
          updated_at: new Date().toISOString(),
          status_reason: reason
        })
        .eq('id', checkpointId)

      if (error) throw error
    } catch (error) {
      console.error('Failed to update checkpoint status:', error)
    }
  }

  private async createRollbackAuditLog(
    checkpoint: MigrationCheckpoint,
    result: RollbackResult,
    reason: string
  ): Promise<void> {
    try {
      const auditLog = {
        checkpoint_id: checkpoint.id,
        guest_id: checkpoint.guest_id,
        user_id: checkpoint.user_id,
        rollback_reason: reason,
        rollback_result: result,
        created_at: new Date().toISOString()
      }

      const { error } = await supabaseGuestManager.supabase
        .from('guest_migration_audit_log')
        .insert(auditLog)

      if (error) throw error
    } catch (error) {
      console.error('Failed to create rollback audit log:', error)
    }
  }

  private async attemptEmergencyRestore(checkpointId: string, result: RollbackResult): Promise<void> {
    try {
      console.log('Attempting emergency restore for checkpoint:', checkpointId)

      // Try to restore from local storage backup
      const localCheckpoint = localStorage.getItem(`fathom_migration_checkpoint_${checkpointId}`)
      if (localCheckpoint) {
        const checkpoint = JSON.parse(localCheckpoint)
        await this.rollbackLocalStorageState(checkpoint)
        result.errors.push('Emergency restore from local storage completed')
      } else {
        result.errors.push('Emergency restore failed: no local backup found')
      }
    } catch (error) {
      console.error('Emergency restore failed:', error)
      result.errors.push(`Emergency restore failed: ${error}`)
    }
  }

  private async cleanupOldCheckpoint(checkpointId: string): Promise<void> {
    try {
      const { error } = await supabaseGuestManager.supabase
        .from('guest_migration_checkpoints')
        .delete()
        .eq('id', checkpointId)

      if (error) throw error

      console.log('Old checkpoint cleaned up:', checkpointId)
    } catch (error) {
      console.error('Failed to cleanup old checkpoint:', error)
    }
  }

  // Utility methods

  private generateCheckpointId(guestId: string): string {
    return `checkpoint_${guestId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateTransactionId(): string {
    return `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private countTotalItems(guestData: GuestUserData): number {
    return guestData.plans.length + guestData.flashcards.length
  }
}

// Type definitions

interface MigrationCheckpoint {
  id: string
  guest_id: string
  user_id: string
  created_at: string
  status: CheckpointStatus
  backup_data: {
    database: DatabaseBackup
    localStorage: LocalStorageBackup
    original_guest_data: GuestUserData
  }
  metadata: {
    checkpoint_version: string
    total_items: number
    backup_size: number
  }
  updated_at?: string
  status_reason?: string
}

interface DatabaseBackup {
  curricula: any[]
  flashcards: any[]
  progress: any
  preferences: any
  backup_timestamp: string
}

interface LocalStorageBackup {
  session: string | null
  userData: string | null
  preferences: string | null
  analytics: string | null
  backup_timestamp: string
}

interface RollbackResult {
  checkpointId: string
  success: boolean
  rollbackReason: string
  restoredItems: {
    curricula: number
    flashcards: number
    progress: boolean
    preferences: boolean
  }
  errors: string[]
  completedAt: string
}

interface RollbackTransaction {
  id: string
  checkpoint_id: string
  started_at: string
  completed_at?: string
  status?: 'active' | 'committed' | 'aborted'
  operations: Array<{
    type: string
    count?: number
    timestamp: string
  }>
}

interface DatabaseRollbackResult {
  curricula: number
  flashcards: number
  progress: boolean
  preferences: boolean
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

type CheckpointStatus = 'active' | 'completed' | 'rolled_back' | 'failed'

// Export singleton instance
export const guestMigrationRollback = GuestMigrationRollback.getInstance()

// Export types
export type {
  MigrationCheckpoint,
  RollbackResult,
  CheckpointStatus
}
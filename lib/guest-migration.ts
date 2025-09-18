import { GuestUserData, GuestSession, GuestPlan, GuestFlashcard, GUEST_STORAGE_KEYS } from '@/types/guest'

/**
 * Migration utilities for local storage schema changes and data format updates
 * Handles version compatibility and data transformation
 */
export class GuestMigrationManager {
  private static instance: GuestMigrationManager
  private readonly currentVersion = '1.0.0'
  private readonly supportedVersions = ['0.9.0', '0.9.1', '1.0.0']

  static getInstance(): GuestMigrationManager {
    if (!GuestMigrationManager.instance) {
      GuestMigrationManager.instance = new GuestMigrationManager()
    }
    return GuestMigrationManager.instance
  }

  /**
   * Check if migration is needed for stored data
   */
  isMigrationNeeded(): {
    needed: boolean
    currentVersion?: string
    targetVersion: string
    items: Array<{ key: string; version?: string; needsMigration: boolean }>
  } {
    const items = Object.entries(GUEST_STORAGE_KEYS).map(([name, key]) => {
      const data = localStorage.getItem(key)
      let version: string | undefined
      let needsMigration = false

      if (data) {
        try {
          const parsed = JSON.parse(data)
          version = parsed._version || parsed.version || '0.9.0' // Default to old version
          needsMigration = version !== this.currentVersion
        } catch {
          needsMigration = true // Corrupted data needs migration
        }
      }

      return {
        key: name,
        version,
        needsMigration
      }
    })

    const anyNeedMigration = items.some(item => item.needsMigration)
    const oldestVersion = items
      .map(item => item.version)
      .filter(v => v)
      .sort()[0]

    return {
      needed: anyNeedMigration,
      currentVersion: oldestVersion,
      targetVersion: this.currentVersion,
      items
    }
  }

  /**
   * Perform complete data migration
   */
  async performMigration(): Promise<{
    success: boolean
    migratedItems: string[]
    errors: string[]
    backupCreated: boolean
  }> {
    const result = {
      success: true,
      migratedItems: [] as string[],
      errors: [] as string[],
      backupCreated: false
    }

    try {
      console.log('Starting guest data migration to version', this.currentVersion)

      // 1. Create backup before migration
      result.backupCreated = await this.createPreMigrationBackup()
      if (!result.backupCreated) {
        result.errors.push('Failed to create pre-migration backup')
      }

      // 2. Migrate each data type
      const migrationTasks = [
        () => this.migrateSessionData(),
        () => this.migrateUserData(),
        () => this.migratePreferences(),
        () => this.migrateAnalytics()
      ]

      for (const task of migrationTasks) {
        try {
          const taskResult = await task()
          if (taskResult.success) {
            result.migratedItems.push(taskResult.itemName)
          } else {
            result.errors.push(taskResult.error)
          }
        } catch (error) {
          result.errors.push(`Migration task failed: ${error}`)
        }
      }

      // 3. Update version metadata
      this.updateVersionMetadata()

      // 4. Verify migration success
      const verificationResult = this.verifyMigration()
      if (!verificationResult.success) {
        result.success = false
        result.errors.push(...verificationResult.errors)
      }

      console.log('Migration completed:', result)

    } catch (error) {
      console.error('Migration failed:', error)
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown migration error')
      
      // Attempt to restore from backup
      await this.restoreFromBackup()
    }

    return result
  }

  /**
   * Migrate session data from old format to new format
   */
  private async migrateSessionData(): Promise<{ success: boolean; itemName: string; error?: string }> {
    try {
      const rawData = localStorage.getItem(GUEST_STORAGE_KEYS.SESSION)
      if (!rawData) {
        return { success: true, itemName: 'session' } // No data to migrate
      }

      const data = JSON.parse(rawData)
      const version = data._version || data.version || '0.9.0'

      let migratedData = data

      // Apply version-specific migrations
      if (this.isVersionLessThan(version, '1.0.0')) {
        migratedData = this.migrateSessionTo1_0_0(data)
      }

      // Add current version and metadata
      migratedData._version = this.currentVersion
      migratedData._migratedAt = new Date().toISOString()
      migratedData._migratedFrom = version

      localStorage.setItem(GUEST_STORAGE_KEYS.SESSION, JSON.stringify(migratedData))

      return { success: true, itemName: 'session' }
    } catch (error) {
      return { 
        success: false, 
        itemName: 'session', 
        error: `Session migration failed: ${error}` 
      }
    }
  }

  /**
   * Migrate user data from old format to new format
   */
  private async migrateUserData(): Promise<{ success: boolean; itemName: string; error?: string }> {
    try {
      const rawData = localStorage.getItem(GUEST_STORAGE_KEYS.USER_DATA)
      if (!rawData) {
        return { success: true, itemName: 'userData' }
      }

      const data = JSON.parse(rawData)
      const version = data._version || data.version || '0.9.0'

      let migratedData = data

      // Apply version-specific migrations
      if (this.isVersionLessThan(version, '1.0.0')) {
        migratedData = this.migrateUserDataTo1_0_0(data)
      }

      // Add current version and metadata
      migratedData._version = this.currentVersion
      migratedData._migratedAt = new Date().toISOString()
      migratedData._migratedFrom = version

      localStorage.setItem(GUEST_STORAGE_KEYS.USER_DATA, JSON.stringify(migratedData))

      return { success: true, itemName: 'userData' }
    } catch (error) {
      return { 
        success: false, 
        itemName: 'userData', 
        error: `User data migration failed: ${error}` 
      }
    }
  }

  /**
   * Migrate preferences from old format to new format
   */
  private async migratePreferences(): Promise<{ success: boolean; itemName: string; error?: string }> {
    try {
      const rawData = localStorage.getItem(GUEST_STORAGE_KEYS.PREFERENCES)
      if (!rawData) {
        return { success: true, itemName: 'preferences' }
      }

      const data = JSON.parse(rawData)
      const version = data._version || data.version || '0.9.0'

      let migratedData = data

      // Apply version-specific migrations
      if (this.isVersionLessThan(version, '1.0.0')) {
        migratedData = this.migratePreferencesTo1_0_0(data)
      }

      // Add current version and metadata
      migratedData._version = this.currentVersion
      migratedData._migratedAt = new Date().toISOString()
      migratedData._migratedFrom = version

      localStorage.setItem(GUEST_STORAGE_KEYS.PREFERENCES, JSON.stringify(migratedData))

      return { success: true, itemName: 'preferences' }
    } catch (error) {
      return { 
        success: false, 
        itemName: 'preferences', 
        error: `Preferences migration failed: ${error}` 
      }
    }
  }

  /**
   * Migrate analytics from old format to new format
   */
  private async migrateAnalytics(): Promise<{ success: boolean; itemName: string; error?: string }> {
    try {
      const rawData = localStorage.getItem(GUEST_STORAGE_KEYS.ANALYTICS)
      if (!rawData) {
        return { success: true, itemName: 'analytics' }
      }

      const data = JSON.parse(rawData)
      
      // Analytics is an array, so handle differently
      let migratedData = Array.isArray(data) ? data : []

      // Migrate individual events if needed
      migratedData = migratedData.map((event: any) => {
        const version = event._version || '0.9.0'
        
        if (this.isVersionLessThan(version, '1.0.0')) {
          return this.migrateAnalyticsEventTo1_0_0(event)
        }
        
        return event
      })

      localStorage.setItem(GUEST_STORAGE_KEYS.ANALYTICS, JSON.stringify(migratedData))

      return { success: true, itemName: 'analytics' }
    } catch (error) {
      return { 
        success: false, 
        itemName: 'analytics', 
        error: `Analytics migration failed: ${error}` 
      }
    }
  }

  /**
   * Create backup before migration
   */
  private async createPreMigrationBackup(): Promise<boolean> {
    try {
      const timestamp = Date.now()
      const backupData: Record<string, string | null> = {}

      // Backup all guest data
      Object.values(GUEST_STORAGE_KEYS).forEach(key => {
        backupData[key] = localStorage.getItem(key)
      })

      // Include migration metadata
      const migrationBackup = {
        timestamp,
        version: 'pre-migration',
        data: backupData,
        migrationTarget: this.currentVersion
      }

      localStorage.setItem(
        `fathom_guest_migration_backup_${timestamp}`, 
        JSON.stringify(migrationBackup)
      )

      return true
    } catch (error) {
      console.error('Failed to create migration backup:', error)
      return false
    }
  }

  /**
   * Restore from backup if migration fails
   */
  private async restoreFromBackup(): Promise<boolean> {
    try {
      // Find the most recent migration backup
      const backupKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('fathom_guest_migration_backup_'))
        .sort()
        .reverse()

      if (backupKeys.length === 0) {
        console.error('No migration backup found')
        return false
      }

      const latestBackupKey = backupKeys[0]
      const backupData = localStorage.getItem(latestBackupKey)
      
      if (!backupData) {
        console.error('Backup data not found')
        return false
      }

      const backup = JSON.parse(backupData)
      
      // Restore all data
      Object.entries(backup.data).forEach(([key, value]) => {
        if (value) {
          localStorage.setItem(key, value)
        } else {
          localStorage.removeItem(key)
        }
      })

      console.log('Successfully restored from backup:', latestBackupKey)
      return true
    } catch (error) {
      console.error('Failed to restore from backup:', error)
      return false
    }
  }

  /**
   * Verify migration was successful
   */
  private verifyMigration(): { success: boolean; errors: string[] } {
    const errors: string[] = []

    try {
      // Check that all data has correct version
      Object.entries(GUEST_STORAGE_KEYS).forEach(([name, key]) => {
        const data = localStorage.getItem(key)
        if (data) {
          try {
            const parsed = JSON.parse(data)
            const version = parsed._version || parsed.version
            
            if (version !== this.currentVersion) {
              errors.push(`${name} still has old version: ${version}`)
            }
          } catch (error) {
            errors.push(`${name} has invalid JSON after migration`)
          }
        }
      })

      // Verify data integrity
      const integrityCheck = this.verifyDataIntegrity()
      if (!integrityCheck.valid) {
        errors.push(...integrityCheck.errors)
      }

    } catch (error) {
      errors.push(`Verification failed: ${error}`)
    }

    return {
      success: errors.length === 0,
      errors
    }
  }

  /**
   * Verify data integrity after migration
   */
  private verifyDataIntegrity(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    try {
      // Check session data
      const sessionData = localStorage.getItem(GUEST_STORAGE_KEYS.SESSION)
      if (sessionData) {
        const session = JSON.parse(sessionData)
        if (!session.id || !session.isGuest || !session.userData) {
          errors.push('Session data structure is invalid')
        }
      }

      // Check user data
      const userData = localStorage.getItem(GUEST_STORAGE_KEYS.USER_DATA)
      if (userData) {
        const data = JSON.parse(userData)
        if (!Array.isArray(data.plans) || !Array.isArray(data.flashcards) || !data.progress) {
          errors.push('User data structure is invalid')
        }
      }

    } catch (error) {
      errors.push(`Data integrity check failed: ${error}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Version-specific migration methods

  /**
   * Migrate session data to version 1.0.0
   */
  private migrateSessionTo1_0_0(data: any): any {
    const migrated = { ...data }

    // Add new fields introduced in 1.0.0
    if (!migrated.userData) {
      migrated.userData = {
        plans: [],
        flashcards: [],
        progress: {
          totalPlans: 0,
          totalLessons: 0,
          totalFlashcards: 0,
          completedLessons: 0,
          studyMinutes: 0,
          streak: 0
        },
        preferences: {
          theme: 'system',
          notifications: true,
          soundEffects: true
        }
      }
    }

    // Ensure all required fields exist
    if (!migrated.lastActiveAt) {
      migrated.lastActiveAt = migrated.createdAt || new Date().toISOString()
    }

    return migrated
  }

  /**
   * Migrate user data to version 1.0.0
   */
  private migrateUserDataTo1_0_0(data: any): any {
    const migrated = { ...data }

    // Migrate plans structure
    if (migrated.plans) {
      migrated.plans = migrated.plans.map((plan: any) => ({
        ...plan,
        modules: plan.modules || [],
        createdAt: plan.createdAt || new Date().toISOString()
      }))
    }

    // Migrate flashcards structure
    if (migrated.flashcards) {
      migrated.flashcards = migrated.flashcards.map((card: any) => ({
        ...card,
        tags: card.tags || [],
        difficulty: card.difficulty || 'medium',
        reviewCount: card.reviewCount || 0,
        correctCount: card.correctCount || 0
      }))
    }

    // Ensure progress object exists
    if (!migrated.progress) {
      migrated.progress = {
        totalPlans: migrated.plans?.length || 0,
        totalLessons: 0,
        totalFlashcards: migrated.flashcards?.length || 0,
        completedLessons: 0,
        studyMinutes: 0,
        streak: 0
      }
    }

    return migrated
  }

  /**
   * Migrate preferences to version 1.0.0
   */
  private migratePreferencesTo1_0_0(data: any): any {
    const migrated = { ...data }

    // Add new preference fields
    if (migrated.soundEffects === undefined) {
      migrated.soundEffects = true
    }

    // Normalize theme values
    if (!['light', 'dark', 'system'].includes(migrated.theme)) {
      migrated.theme = 'system'
    }

    return migrated
  }

  /**
   * Migrate analytics event to version 1.0.0
   */
  private migrateAnalyticsEventTo1_0_0(event: any): any {
    const migrated = { ...event }

    // Add version to event
    migrated._version = this.currentVersion

    // Ensure timestamp format is correct
    if (migrated.timestamp && !migrated.timestamp.includes('T')) {
      // Convert timestamp to ISO string if it's not already
      migrated.timestamp = new Date(migrated.timestamp).toISOString()
    }

    return migrated
  }

  // Utility methods

  private isVersionLessThan(version: string, target: string): boolean {
    const parseVersion = (v: string) => v.split('.').map(Number)
    const v1 = parseVersion(version)
    const v2 = parseVersion(target)

    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const a = v1[i] || 0
      const b = v2[i] || 0
      if (a < b) return true
      if (a > b) return false
    }
    return false
  }

  private updateVersionMetadata(): void {
    try {
      const metadata = {
        version: this.currentVersion,
        migratedAt: new Date().toISOString(),
        migrationHistory: this.getMigrationHistory()
      }
      localStorage.setItem('fathom_guest_version_metadata', JSON.stringify(metadata))
    } catch (error) {
      console.error('Failed to update version metadata:', error)
    }
  }

  private getMigrationHistory(): Array<{ from: string; to: string; timestamp: string }> {
    try {
      const existing = localStorage.getItem('fathom_guest_version_metadata')
      if (existing) {
        const data = JSON.parse(existing)
        return data.migrationHistory || []
      }
    } catch (error) {
      console.error('Error getting migration history:', error)
    }
    return []
  }

  /**
   * Clean up old migration backups
   */
  cleanupMigrationBackups(): void {
    try {
      const backupKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('fathom_guest_migration_backup_'))
        .sort()

      // Keep only the 2 most recent migration backups
      const keysToRemove = backupKeys.slice(0, Math.max(0, backupKeys.length - 2))
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
      })

      console.log(`Cleaned up ${keysToRemove.length} old migration backups`)
    } catch (error) {
      console.error('Error cleaning up migration backups:', error)
    }
  }
}

// Export singleton instance
export const guestMigrationManager = GuestMigrationManager.getInstance()

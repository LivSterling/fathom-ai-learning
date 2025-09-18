import { 
  GuestUserData, 
  GuestSession, 
  GuestPlan, 
  GuestFlashcard, 
  GuestProgress,
  GuestPreferences,
  GUEST_STORAGE_KEYS,
  GuestAnalyticsEvent 
} from '@/types/guest'

/**
 * Enhanced local storage data persistence layer for guest users
 * Handles serialization, validation, and storage management
 */
export class GuestStorageManager {
  private static instance: GuestStorageManager
  private readonly maxStorageSize = 5 * 1024 * 1024 // 5MB limit
  private readonly compressionThreshold = 1024 // 1KB

  static getInstance(): GuestStorageManager {
    if (!GuestStorageManager.instance) {
      GuestStorageManager.instance = new GuestStorageManager()
    }
    return GuestStorageManager.instance
  }

  /**
   * Enhanced local storage schema design for guest user data
   */
  private getStorageSchema() {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      dataTypes: {
        session: 'GuestSession',
        userData: 'GuestUserData',
        preferences: 'GuestPreferences',
        analytics: 'GuestAnalyticsEvent[]'
      }
    }
  }

  /**
   * Save guest session with enhanced error handling and validation
   */
  saveSession(session: GuestSession): boolean {
    try {
      // Validate session before saving
      if (!this.validateSession(session)) {
        console.error('Invalid session data structure')
        return false
      }

      // Check storage quota before saving
      if (!this.checkStorageQuota(session)) {
        this.performCleanup()
        // Try again after cleanup
        if (!this.checkStorageQuota(session)) {
          console.error('Insufficient storage space')
          return false
        }
      }

      const serializedData = this.serializeData(session)
      localStorage.setItem(GUEST_STORAGE_KEYS.SESSION, serializedData)
      
      // Update schema metadata
      this.updateStorageMetadata()
      
      return true
    } catch (error) {
      console.error('Failed to save guest session:', error)
      return false
    }
  }

  /**
   * Load guest session with data validation and migration
   */
  loadSession(): GuestSession | null {
    try {
      const rawData = localStorage.getItem(GUEST_STORAGE_KEYS.SESSION)
      if (!rawData) return null

      const session = this.deserializeData<GuestSession>(rawData)
      if (!session) return null

      // Validate loaded session
      if (!this.validateSession(session)) {
        console.warn('Loaded session failed validation, clearing corrupted data')
        this.clearSession()
        return null
      }

      // Migrate data if needed
      const migratedSession = this.migrateSessionData(session)
      
      // Save migrated data if changes were made
      if (migratedSession !== session) {
        this.saveSession(migratedSession)
      }

      return migratedSession
    } catch (error) {
      console.error('Failed to load guest session:', error)
      this.clearSession()
      return null
    }
  }

  /**
   * Save user data with incremental updates
   */
  saveUserData(userData: GuestUserData): boolean {
    try {
      if (!this.validateUserData(userData)) {
        console.error('Invalid user data structure')
        return false
      }

      // Create incremental backup
      this.createIncrementalBackup(userData)

      const serializedData = this.serializeData(userData)
      localStorage.setItem(GUEST_STORAGE_KEYS.USER_DATA, serializedData)
      
      return true
    } catch (error) {
      console.error('Failed to save user data:', error)
      return false
    }
  }

  /**
   * Load user data with fallback to backup
   */
  loadUserData(): GuestUserData | null {
    try {
      const rawData = localStorage.getItem(GUEST_STORAGE_KEYS.USER_DATA)
      if (!rawData) return null

      const userData = this.deserializeData<GuestUserData>(rawData)
      if (!userData || !this.validateUserData(userData)) {
        // Try to restore from backup
        console.warn('Primary user data corrupted, attempting backup restore')
        return this.restoreFromBackup()
      }

      return userData
    } catch (error) {
      console.error('Failed to load user data:', error)
      return this.restoreFromBackup()
    }
  }

  /**
   * Save preferences with validation
   */
  savePreferences(preferences: GuestPreferences): boolean {
    try {
      if (!this.validatePreferences(preferences)) {
        console.error('Invalid preferences structure')
        return false
      }

      const serializedData = this.serializeData(preferences)
      localStorage.setItem(GUEST_STORAGE_KEYS.PREFERENCES, serializedData)
      
      return true
    } catch (error) {
      console.error('Failed to save preferences:', error)
      return false
    }
  }

  /**
   * Load preferences with defaults fallback
   */
  loadPreferences(): GuestPreferences {
    try {
      const rawData = localStorage.getItem(GUEST_STORAGE_KEYS.PREFERENCES)
      if (!rawData) return this.getDefaultPreferences()

      const preferences = this.deserializeData<GuestPreferences>(rawData)
      if (!preferences || !this.validatePreferences(preferences)) {
        return this.getDefaultPreferences()
      }

      return preferences
    } catch (error) {
      console.error('Failed to load preferences:', error)
      return this.getDefaultPreferences()
    }
  }

  /**
   * Save analytics events with rotation
   */
  saveAnalyticsEvent(event: GuestAnalyticsEvent): boolean {
    try {
      const existingEvents = this.loadAnalyticsEvents()
      const updatedEvents = [...existingEvents, event]

      // Rotate events to keep only recent ones
      const rotatedEvents = this.rotateAnalyticsEvents(updatedEvents)

      const serializedData = this.serializeData(rotatedEvents)
      localStorage.setItem(GUEST_STORAGE_KEYS.ANALYTICS, serializedData)
      
      return true
    } catch (error) {
      console.error('Failed to save analytics event:', error)
      return false
    }
  }

  /**
   * Load analytics events
   */
  loadAnalyticsEvents(): GuestAnalyticsEvent[] {
    try {
      const rawData = localStorage.getItem(GUEST_STORAGE_KEYS.ANALYTICS)
      if (!rawData) return []

      const events = this.deserializeData<GuestAnalyticsEvent[]>(rawData)
      return events || []
    } catch (error) {
      console.error('Failed to load analytics events:', error)
      return []
    }
  }

  /**
   * Clear all guest storage data
   */
  clearSession(): void {
    try {
      Object.values(GUEST_STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key)
      })
      
      // Clear backup data
      this.clearBackupData()
      
      // Clear metadata
      localStorage.removeItem('fathom_guest_metadata')
    } catch (error) {
      console.error('Failed to clear session:', error)
    }
  }

  /**
   * Get storage usage statistics
   */
  getStorageStats(): {
    totalSize: number
    usedSize: number
    availableSize: number
    itemSizes: Record<string, number>
    utilizationPercent: number
  } {
    const itemSizes: Record<string, number> = {}
    let totalUsedSize = 0

    Object.entries(GUEST_STORAGE_KEYS).forEach(([name, key]) => {
      const data = localStorage.getItem(key)
      const size = data ? new Blob([data]).size : 0
      itemSizes[name] = size
      totalUsedSize += size
    })

    return {
      totalSize: this.maxStorageSize,
      usedSize: totalUsedSize,
      availableSize: this.maxStorageSize - totalUsedSize,
      itemSizes,
      utilizationPercent: Math.round((totalUsedSize / this.maxStorageSize) * 100)
    }
  }

  /**
   * Perform storage cleanup
   */
  performCleanup(): void {
    try {
      // Remove old analytics events
      const events = this.loadAnalyticsEvents()
      const recentEvents = events.slice(-50) // Keep only 50 most recent
      if (recentEvents.length < events.length) {
        const serializedData = this.serializeData(recentEvents)
        localStorage.setItem(GUEST_STORAGE_KEYS.ANALYTICS, serializedData)
      }

      // Clear old backups
      this.clearOldBackups()

      console.log('Storage cleanup completed')
    } catch (error) {
      console.error('Failed to perform cleanup:', error)
    }
  }

  /**
   * Data serialization with optional compression
   */
  private serializeData<T>(data: T): string {
    const jsonString = JSON.stringify(data)
    
    // Use compression for large data
    if (jsonString.length > this.compressionThreshold) {
      return this.compressData(jsonString)
    }
    
    return jsonString
  }

  /**
   * Data deserialization with decompression support
   */
  private deserializeData<T>(serializedData: string): T | null {
    try {
      // Check if data is compressed
      if (this.isCompressed(serializedData)) {
        const decompressed = this.decompressData(serializedData)
        return JSON.parse(decompressed)
      }
      
      return JSON.parse(serializedData)
    } catch (error) {
      console.error('Failed to deserialize data:', error)
      return null
    }
  }

  /**
   * Simple compression using base64 encoding (placeholder for real compression)
   */
  private compressData(data: string): string {
    // In a real implementation, you would use a proper compression library
    // For now, we'll use base64 encoding as a placeholder
    return `compressed:${btoa(data)}`
  }

  /**
   * Simple decompression
   */
  private decompressData(compressedData: string): string {
    if (compressedData.startsWith('compressed:')) {
      return atob(compressedData.substring(11))
    }
    return compressedData
  }

  /**
   * Check if data is compressed
   */
  private isCompressed(data: string): boolean {
    return data.startsWith('compressed:')
  }

  /**
   * Validate session data structure
   */
  private validateSession(session: any): session is GuestSession {
    return (
      session &&
      typeof session.id === 'string' &&
      typeof session.createdAt === 'string' &&
      typeof session.lastActiveAt === 'string' &&
      session.isGuest === true &&
      this.validateUserData(session.userData)
    )
  }

  /**
   * Validate user data structure
   */
  private validateUserData(userData: any): userData is GuestUserData {
    return (
      userData &&
      Array.isArray(userData.plans) &&
      Array.isArray(userData.flashcards) &&
      userData.progress &&
      typeof userData.progress.totalPlans === 'number' &&
      typeof userData.progress.totalLessons === 'number' &&
      typeof userData.progress.totalFlashcards === 'number' &&
      userData.preferences &&
      this.validatePreferences(userData.preferences)
    )
  }

  /**
   * Validate preferences structure
   */
  private validatePreferences(preferences: any): preferences is GuestPreferences {
    return (
      preferences &&
      ['light', 'dark', 'system'].includes(preferences.theme) &&
      typeof preferences.notifications === 'boolean' &&
      typeof preferences.soundEffects === 'boolean'
    )
  }

  /**
   * Check storage quota
   */
  private checkStorageQuota(data: any): boolean {
    const dataSize = new Blob([JSON.stringify(data)]).size
    const stats = this.getStorageStats()
    return stats.availableSize >= dataSize
  }

  /**
   * Update storage metadata
   */
  private updateStorageMetadata(): void {
    const metadata = {
      ...this.getStorageSchema(),
      lastAccess: new Date().toISOString()
    }
    localStorage.setItem('fathom_guest_metadata', JSON.stringify(metadata))
  }

  /**
   * Migrate session data for version compatibility
   */
  private migrateSessionData(session: GuestSession): GuestSession {
    // Add migration logic here for future schema changes
    // For now, return as-is
    return session
  }

  /**
   * Create incremental backup
   */
  private createIncrementalBackup(userData: GuestUserData): void {
    try {
      const timestamp = Date.now()
      const backupKey = `fathom_guest_backup_${timestamp}`
      const serializedData = this.serializeData(userData)
      
      localStorage.setItem(backupKey, serializedData)
      
      // Keep only last 3 backups
      this.rotateBackups()
    } catch (error) {
      console.error('Failed to create backup:', error)
    }
  }

  /**
   * Restore from backup
   */
  private restoreFromBackup(): GuestUserData | null {
    try {
      const backupKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('fathom_guest_backup_'))
        .sort()
        .reverse() // Most recent first

      for (const key of backupKeys) {
        const rawData = localStorage.getItem(key)
        if (rawData) {
          const userData = this.deserializeData<GuestUserData>(rawData)
          if (userData && this.validateUserData(userData)) {
            console.log('Successfully restored from backup:', key)
            return userData
          }
        }
      }

      return null
    } catch (error) {
      console.error('Failed to restore from backup:', error)
      return null
    }
  }

  /**
   * Rotate backup files
   */
  private rotateBackups(): void {
    const backupKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('fathom_guest_backup_'))
      .sort()

    // Keep only last 3 backups
    if (backupKeys.length > 3) {
      const keysToRemove = backupKeys.slice(0, backupKeys.length - 3)
      keysToRemove.forEach(key => localStorage.removeItem(key))
    }
  }

  /**
   * Clear old backups
   */
  private clearOldBackups(): void {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    
    Object.keys(localStorage)
      .filter(key => key.startsWith('fathom_guest_backup_'))
      .forEach(key => {
        const timestamp = parseInt(key.split('_').pop() || '0')
        if (timestamp < oneWeekAgo) {
          localStorage.removeItem(key)
        }
      })
  }

  /**
   * Clear backup data
   */
  private clearBackupData(): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith('fathom_guest_backup_'))
      .forEach(key => localStorage.removeItem(key))
  }

  /**
   * Rotate analytics events
   */
  private rotateAnalyticsEvents(events: GuestAnalyticsEvent[]): GuestAnalyticsEvent[] {
    // Keep only last 100 events and events from last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    
    const recentEvents = events
      .filter(event => new Date(event.timestamp).getTime() > thirtyDaysAgo)
      .slice(-100) // Keep only last 100

    return recentEvents
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): GuestPreferences {
    return {
      theme: 'system',
      notifications: true,
      soundEffects: true
    }
  }
}

// Export singleton instance
export const guestStorageManager = GuestStorageManager.getInstance()

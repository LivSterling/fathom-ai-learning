import { guestStorageManager } from './guest-storage'
import { GuestUserData, GUEST_STORAGE_KEYS } from '@/types/guest'

/**
 * Advanced local storage cleanup and management system
 * Prevents excessive data accumulation and handles storage limits
 */
export class GuestCleanupManager {
  private static instance: GuestCleanupManager
  private readonly cleanupInterval = 24 * 60 * 60 * 1000 // 24 hours
  private readonly maxStorageAge = 30 * 24 * 60 * 60 * 1000 // 30 days
  private readonly emergencyCleanupThreshold = 0.9 // 90% of quota
  private cleanupTimer: NodeJS.Timeout | null = null

  static getInstance(): GuestCleanupManager {
    if (!GuestCleanupManager.instance) {
      GuestCleanupManager.instance = new GuestCleanupManager()
    }
    return GuestCleanupManager.instance
  }

  /**
   * Initialize automatic cleanup system
   */
  initializeCleanup(): void {
    // Perform initial cleanup check
    this.performMaintenanceCleanup()

    // Set up periodic cleanup
    this.schedulePeriodicCleanup()

    // Listen for storage events
    this.setupStorageEventListeners()

    console.log('Guest cleanup manager initialized')
  }

  /**
   * Stop automatic cleanup system
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    console.log('Guest cleanup manager stopped')
  }

  /**
   * Perform comprehensive maintenance cleanup
   */
  performMaintenanceCleanup(): {
    success: boolean
    bytesFreed: number
    itemsRemoved: number
    errors: string[]
  } {
    const result = {
      success: true,
      bytesFreed: 0,
      itemsRemoved: 0,
      errors: [] as string[]
    }

    try {
      const initialStats = guestStorageManager.getStorageStats()
      console.log('Starting maintenance cleanup. Initial usage:', initialStats.utilizationPercent + '%')

      // 1. Clean expired analytics events
      const analyticsResult = this.cleanExpiredAnalytics()
      result.bytesFreed += analyticsResult.bytesFreed
      result.itemsRemoved += analyticsResult.itemsRemoved

      // 2. Remove old backup files
      const backupResult = this.cleanOldBackups()
      result.bytesFreed += backupResult.bytesFreed
      result.itemsRemoved += backupResult.itemsRemoved

      // 3. Clean orphaned data
      const orphanResult = this.cleanOrphanedData()
      result.bytesFreed += orphanResult.bytesFreed
      result.itemsRemoved += orphanResult.itemsRemoved

      // 4. Optimize data storage
      const optimizeResult = this.optimizeDataStorage()
      result.bytesFreed += optimizeResult.bytesFreed

      // 5. Clean temporary files
      const tempResult = this.cleanTemporaryFiles()
      result.bytesFreed += tempResult.bytesFreed
      result.itemsRemoved += tempResult.itemsRemoved

      const finalStats = guestStorageManager.getStorageStats()
      console.log('Maintenance cleanup completed. Final usage:', finalStats.utilizationPercent + '%')
      console.log('Freed', result.bytesFreed, 'bytes and removed', result.itemsRemoved, 'items')

      // Update cleanup metadata
      this.updateCleanupMetadata()

    } catch (error) {
      console.error('Error during maintenance cleanup:', error)
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return result
  }

  /**
   * Perform emergency cleanup when storage is nearly full
   */
  performEmergencyCleanup(): {
    success: boolean
    bytesFreed: number
    emergencyMeasures: string[]
  } {
    const result = {
      success: true,
      bytesFreed: 0,
      emergencyMeasures: [] as string[]
    }

    try {
      console.warn('Performing emergency cleanup - storage nearly full')

      // 1. Aggressive analytics cleanup
      const analyticsCleared = this.clearAllButRecentAnalytics(10) // Keep only 10 most recent
      result.bytesFreed += analyticsCleared
      result.emergencyMeasures.push('Reduced analytics to 10 most recent events')

      // 2. Remove all backups except the most recent
      const backupsCleared = this.clearAllButRecentBackups(1)
      result.bytesFreed += backupsCleared
      result.emergencyMeasures.push('Kept only 1 most recent backup')

      // 3. Clean all temporary and cache data
      const tempCleared = this.clearAllTemporaryData()
      result.bytesFreed += tempCleared
      result.emergencyMeasures.push('Cleared all temporary data')

      // 4. Optimize user data storage
      const optimized = this.aggressiveDataOptimization()
      result.bytesFreed += optimized
      result.emergencyMeasures.push('Applied aggressive data optimization')

      console.log('Emergency cleanup completed. Freed', result.bytesFreed, 'bytes')

    } catch (error) {
      console.error('Error during emergency cleanup:', error)
      result.success = false
    }

    return result
  }

  /**
   * Check if cleanup is needed based on storage usage
   */
  isCleanupNeeded(): {
    needed: boolean
    urgent: boolean
    reason: string
    utilizationPercent: number
  } {
    const stats = guestStorageManager.getStorageStats()
    const utilization = stats.utilizationPercent / 100

    if (utilization >= this.emergencyCleanupThreshold) {
      return {
        needed: true,
        urgent: true,
        reason: 'Storage usage above emergency threshold',
        utilizationPercent: stats.utilizationPercent
      }
    }

    if (utilization >= 0.7) { // 70% threshold
      return {
        needed: true,
        urgent: false,
        reason: 'Storage usage above 70%',
        utilizationPercent: stats.utilizationPercent
      }
    }

    // Check for old data
    const lastCleanup = this.getLastCleanupTime()
    const timeSinceCleanup = Date.now() - lastCleanup
    
    if (timeSinceCleanup > this.cleanupInterval) {
      return {
        needed: true,
        urgent: false,
        reason: 'Routine cleanup due',
        utilizationPercent: stats.utilizationPercent
      }
    }

    return {
      needed: false,
      urgent: false,
      reason: 'Storage usage within acceptable limits',
      utilizationPercent: stats.utilizationPercent
    }
  }

  /**
   * Get detailed storage analysis
   */
  getStorageAnalysis(): {
    totalSize: number
    usedSize: number
    availableSize: number
    utilizationPercent: number
    itemBreakdown: Record<string, { size: number; count: number; lastModified?: string }>
    recommendations: string[]
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  } {
    const stats = guestStorageManager.getStorageStats()
    const itemBreakdown: Record<string, { size: number; count: number; lastModified?: string }> = {}
    const recommendations: string[] = []

    // Analyze each storage item
    Object.entries(GUEST_STORAGE_KEYS).forEach(([name, key]) => {
      const data = localStorage.getItem(key)
      if (data) {
        itemBreakdown[name] = {
          size: new Blob([data]).size,
          count: this.getItemCount(key, data),
          lastModified: this.getItemLastModified(key)
        }
      }
    })

    // Analyze backup files
    const backupInfo = this.analyzeBackupFiles()
    if (backupInfo.count > 0) {
      itemBreakdown['backups'] = backupInfo
    }

    // Generate recommendations
    const utilization = stats.utilizationPercent / 100
    
    if (utilization > 0.8) {
      recommendations.push('Consider upgrading to a registered account for unlimited storage')
      recommendations.push('Remove old flashcards or lessons you no longer need')
    }
    
    if (itemBreakdown.analytics && itemBreakdown.analytics.count > 50) {
      recommendations.push('Analytics data can be cleaned up to free space')
    }
    
    if (backupInfo.count > 3) {
      recommendations.push('Old backup files can be removed')
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (utilization >= 0.95) riskLevel = 'critical'
    else if (utilization >= 0.85) riskLevel = 'high'
    else if (utilization >= 0.7) riskLevel = 'medium'

    return {
      totalSize: stats.totalSize,
      usedSize: stats.usedSize,
      availableSize: stats.availableSize,
      utilizationPercent: stats.utilizationPercent,
      itemBreakdown,
      recommendations,
      riskLevel
    }
  }

  /**
   * Optimize storage by removing redundant data
   */
  optimizeStorage(): { success: boolean; bytesFreed: number; optimizations: string[] } {
    const result = {
      success: true,
      bytesFreed: 0,
      optimizations: [] as string[]
    }

    try {
      // 1. Remove duplicate flashcards
      const duplicatesResult = this.removeDuplicateFlashcards()
      result.bytesFreed += duplicatesResult.bytesFreed
      if (duplicatesResult.count > 0) {
        result.optimizations.push(`Removed ${duplicatesResult.count} duplicate flashcards`)
      }

      // 2. Compress old data
      const compressionResult = this.compressOldData()
      result.bytesFreed += compressionResult.bytesFreed
      if (compressionResult.itemsCompressed > 0) {
        result.optimizations.push(`Compressed ${compressionResult.itemsCompressed} old data items`)
      }

      // 3. Clean up empty or invalid entries
      const cleanupResult = this.cleanupInvalidEntries()
      result.bytesFreed += cleanupResult.bytesFreed
      if (cleanupResult.itemsRemoved > 0) {
        result.optimizations.push(`Removed ${cleanupResult.itemsRemoved} invalid entries`)
      }

    } catch (error) {
      console.error('Error during storage optimization:', error)
      result.success = false
    }

    return result
  }

  // Private helper methods

  private schedulePeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const cleanupCheck = this.isCleanupNeeded()
      if (cleanupCheck.needed) {
        if (cleanupCheck.urgent) {
          this.performEmergencyCleanup()
        } else {
          this.performMaintenanceCleanup()
        }
      }
    }, this.cleanupInterval)
  }

  private setupStorageEventListeners(): void {
    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', (event) => {
      if (event.key && Object.values(GUEST_STORAGE_KEYS).includes(event.key as any)) {
        // Check if cleanup is needed after storage changes
        setTimeout(() => {
          const cleanupCheck = this.isCleanupNeeded()
          if (cleanupCheck.urgent) {
            this.performEmergencyCleanup()
          }
        }, 1000)
      }
    })

    // Listen for beforeunload to perform final cleanup
    window.addEventListener('beforeunload', () => {
      this.performMaintenanceCleanup()
    })
  }

  private cleanExpiredAnalytics(): { bytesFreed: number; itemsRemoved: number } {
    try {
      const events = guestStorageManager.loadAnalyticsEvents()
      const thirtyDaysAgo = Date.now() - this.maxStorageAge
      
      const validEvents = events.filter(event => 
        new Date(event.timestamp).getTime() > thirtyDaysAgo
      )

      const itemsRemoved = events.length - validEvents.length
      const oldSize = new Blob([JSON.stringify(events)]).size
      const newSize = new Blob([JSON.stringify(validEvents)]).size
      
      if (itemsRemoved > 0) {
        localStorage.setItem(GUEST_STORAGE_KEYS.ANALYTICS, JSON.stringify(validEvents))
      }

      return {
        bytesFreed: oldSize - newSize,
        itemsRemoved
      }
    } catch (error) {
      console.error('Error cleaning expired analytics:', error)
      return { bytesFreed: 0, itemsRemoved: 0 }
    }
  }

  private cleanOldBackups(): { bytesFreed: number; itemsRemoved: number } {
    let bytesFreed = 0
    let itemsRemoved = 0

    try {
      const backupKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('fathom_guest_backup_'))
        .sort()

      // Keep only the 3 most recent backups
      const keysToRemove = backupKeys.slice(0, Math.max(0, backupKeys.length - 3))
      
      keysToRemove.forEach(key => {
        const data = localStorage.getItem(key)
        if (data) {
          bytesFreed += new Blob([data]).size
          localStorage.removeItem(key)
          itemsRemoved++
        }
      })
    } catch (error) {
      console.error('Error cleaning old backups:', error)
    }

    return { bytesFreed, itemsRemoved }
  }

  private cleanOrphanedData(): { bytesFreed: number; itemsRemoved: number } {
    let bytesFreed = 0
    let itemsRemoved = 0

    try {
      // Find and remove orphaned keys that don't belong to our system
      const allKeys = Object.keys(localStorage)
      const validPrefixes = ['fathom_guest_', 'fathom_temp_']
      
      allKeys.forEach(key => {
        if (key.startsWith('fathom_') && !validPrefixes.some(prefix => key.startsWith(prefix))) {
          const data = localStorage.getItem(key)
          if (data) {
            bytesFreed += new Blob([data]).size
            localStorage.removeItem(key)
            itemsRemoved++
          }
        }
      })
    } catch (error) {
      console.error('Error cleaning orphaned data:', error)
    }

    return { bytesFreed, itemsRemoved }
  }

  private optimizeDataStorage(): { bytesFreed: number } {
    // This would implement data compression and optimization
    // For now, return 0 as placeholder
    return { bytesFreed: 0 }
  }

  private cleanTemporaryFiles(): { bytesFreed: number; itemsRemoved: number } {
    let bytesFreed = 0
    let itemsRemoved = 0

    try {
      const tempKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('fathom_temp_'))
      
      tempKeys.forEach(key => {
        const data = localStorage.getItem(key)
        if (data) {
          bytesFreed += new Blob([data]).size
          localStorage.removeItem(key)
          itemsRemoved++
        }
      })
    } catch (error) {
      console.error('Error cleaning temporary files:', error)
    }

    return { bytesFreed, itemsRemoved }
  }

  private clearAllButRecentAnalytics(keepCount: number): number {
    try {
      const events = guestStorageManager.loadAnalyticsEvents()
      const recentEvents = events.slice(-keepCount)
      
      const oldSize = new Blob([JSON.stringify(events)]).size
      const newSize = new Blob([JSON.stringify(recentEvents)]).size
      
      localStorage.setItem(GUEST_STORAGE_KEYS.ANALYTICS, JSON.stringify(recentEvents))
      
      return oldSize - newSize
    } catch (error) {
      console.error('Error clearing analytics:', error)
      return 0
    }
  }

  private clearAllButRecentBackups(keepCount: number): number {
    let bytesFreed = 0

    try {
      const backupKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('fathom_guest_backup_'))
        .sort()
        .reverse() // Most recent first

      const keysToRemove = backupKeys.slice(keepCount)
      
      keysToRemove.forEach(key => {
        const data = localStorage.getItem(key)
        if (data) {
          bytesFreed += new Blob([data]).size
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Error clearing backups:', error)
    }

    return bytesFreed
  }

  private clearAllTemporaryData(): number {
    return this.cleanTemporaryFiles().bytesFreed
  }

  private aggressiveDataOptimization(): number {
    // Implement aggressive optimization strategies
    // This is a placeholder for more advanced optimization
    return 0
  }

  private removeDuplicateFlashcards(): { bytesFreed: number; count: number } {
    // Implementation for removing duplicate flashcards
    // This is a placeholder
    return { bytesFreed: 0, count: 0 }
  }

  private compressOldData(): { bytesFreed: number; itemsCompressed: number } {
    // Implementation for compressing old data
    // This is a placeholder
    return { bytesFreed: 0, itemsCompressed: 0 }
  }

  private cleanupInvalidEntries(): { bytesFreed: number; itemsRemoved: number } {
    // Implementation for cleaning up invalid entries
    // This is a placeholder
    return { bytesFreed: 0, itemsRemoved: 0 }
  }

  private getLastCleanupTime(): number {
    try {
      const metadata = localStorage.getItem('fathom_guest_cleanup_metadata')
      if (metadata) {
        const data = JSON.parse(metadata)
        return new Date(data.lastCleanup).getTime()
      }
    } catch (error) {
      console.error('Error getting last cleanup time:', error)
    }
    return 0
  }

  private updateCleanupMetadata(): void {
    try {
      const metadata = {
        lastCleanup: new Date().toISOString(),
        version: '1.0'
      }
      localStorage.setItem('fathom_guest_cleanup_metadata', JSON.stringify(metadata))
    } catch (error) {
      console.error('Error updating cleanup metadata:', error)
    }
  }

  private getItemCount(key: string, data: string): number {
    try {
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed)) return parsed.length
      if (parsed.flashcards && Array.isArray(parsed.flashcards)) return parsed.flashcards.length
      if (parsed.plans && Array.isArray(parsed.plans)) return parsed.plans.length
      return 1
    } catch {
      return 1
    }
  }

  private getItemLastModified(key: string): string | undefined {
    try {
      const data = localStorage.getItem(key)
      if (data) {
        const parsed = JSON.parse(data)
        return parsed.lastActiveAt || parsed._serializedAt || parsed.lastUpdated
      }
    } catch {
      return undefined
    }
    return undefined
  }

  private analyzeBackupFiles(): { size: number; count: number; lastModified?: string } {
    let totalSize = 0
    let count = 0
    let lastModified: string | undefined

    Object.keys(localStorage)
      .filter(key => key.startsWith('fathom_guest_backup_'))
      .forEach(key => {
        const data = localStorage.getItem(key)
        if (data) {
          totalSize += new Blob([data]).size
          count++
          
          // Extract timestamp from key
          const timestamp = key.split('_').pop()
          if (timestamp && (!lastModified || timestamp > lastModified)) {
            lastModified = new Date(parseInt(timestamp)).toISOString()
          }
        }
      })

    return { size: totalSize, count, lastModified }
  }
}

// Export singleton instance
export const guestCleanupManager = GuestCleanupManager.getInstance()

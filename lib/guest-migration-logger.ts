export interface MigrationLogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  data?: any
}

/**
 * Simple logging system for guest data migration
 */
export class GuestMigrationLogger {
  private static instance: GuestMigrationLogger

  static getInstance(): GuestMigrationLogger {
    if (!GuestMigrationLogger.instance) {
      GuestMigrationLogger.instance = new GuestMigrationLogger()
    }
    return GuestMigrationLogger.instance
  }

  log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any): void {
    const entry: MigrationLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    }

    const logMessage = `[${entry.timestamp}] [${level.toUpperCase()}] ${message}`
    
    switch (level) {
      case 'error':
        console.error(logMessage, data)
        break
      case 'warn':
        console.warn(logMessage, data)
        break
      case 'debug':
        console.debug(logMessage, data)
        break
      default:
        console.log(logMessage, data)
    }
  }

  logStepStart(step: string, data?: any): void {
    this.log('info', `Starting step: ${step}`, data)
  }

  logStepComplete(step: string, data?: any): void {
    this.log('info', `Completed step: ${step}`, data)
  }

  logStepError(step: string, error: any, data?: any): void {
    this.log('error', `Failed step: ${step}`, { 
      error: error instanceof Error ? error.message : error,
      ...data 
    })
  }
}

// Export singleton instance
export const guestMigrationLogger = GuestMigrationLogger.getInstance()
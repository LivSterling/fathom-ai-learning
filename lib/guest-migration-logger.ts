import { supabaseGuestManager } from './supabase'

/**
 * Comprehensive error handling and logging system for migration processes
 * Provides structured logging, error tracking, and monitoring capabilities
 */
export class GuestMigrationLogger {
  private static instance: GuestMigrationLogger
  private sessionLogs: MigrationLogEntry[] = []

  static getInstance(): GuestMigrationLogger {
    if (!GuestMigrationLogger.instance) {
      GuestMigrationLogger.instance = new GuestMigrationLogger()
    }
    return GuestMigrationLogger.instance
  }

  /**
   * Initialize migration session logging
   */
  async initializeMigrationSession(guestId: string, userId: string): Promise<string> {
    const sessionId = this.generateSessionId(guestId)
    
    try {
      const sessionLog: MigrationSession = {
        id: sessionId,
        guest_id: guestId,
        user_id: userId,
        started_at: new Date().toISOString(),
        status: 'active',
        phase: 'initialization',
        logs: [],
        metrics: {
          total_operations: 0,
          successful_operations: 0,
          failed_operations: 0,
          warnings: 0,
          errors: 0,
          processing_time_ms: 0
        }
      }

      // Store session in database
      await this.storeMigrationSession(sessionLog)

      // Initialize local session tracking
      this.sessionLogs = []

      await this.logInfo(sessionId, 'Migration session initialized', {
        guest_id: guestId,
        user_id: userId,
        session_id: sessionId
      })

      return sessionId
    } catch (error) {
      console.error('Failed to initialize migration session:', error)
      throw new Error('Migration session initialization failed')
    }
  }

  /**
   * Log information message
   */
  async logInfo(
    sessionId: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.addLogEntry(sessionId, 'info', message, metadata)
  }

  /**
   * Log warning message
   */
  async logWarning(
    sessionId: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.addLogEntry(sessionId, 'warning', message, metadata)
  }

  /**
   * Log error message
   */
  async logError(
    sessionId: string,
    message: string,
    error?: Error | unknown,
    metadata?: Record<string, any>
  ): Promise<void> {
    const errorMetadata = {
      ...metadata,
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
      error_name: error instanceof Error ? error.name : 'Unknown'
    }

    await this.addLogEntry(sessionId, 'error', message, errorMetadata)
  }

  /**
   * Log operation start
   */
  async logOperationStart(
    sessionId: string,
    operationType: string,
    operationData?: Record<string, any>
  ): Promise<string> {
    const operationId = this.generateOperationId(operationType)
    
    await this.logInfo(sessionId, `Operation started: ${operationType}`, {
      operation_id: operationId,
      operation_type: operationType,
      operation_data: operationData,
      started_at: new Date().toISOString()
    })

    return operationId
  }

  /**
   * Log operation success
   */
  async logOperationSuccess(
    sessionId: string,
    operationId: string,
    operationType: string,
    result?: Record<string, any>,
    durationMs?: number
  ): Promise<void> {
    await this.logInfo(sessionId, `Operation completed: ${operationType}`, {
      operation_id: operationId,
      operation_type: operationType,
      result,
      duration_ms: durationMs,
      completed_at: new Date().toISOString()
    })

    await this.updateSessionMetrics(sessionId, 'successful_operations', 1)
  }

  /**
   * Log operation failure
   */
  async logOperationFailure(
    sessionId: string,
    operationId: string,
    operationType: string,
    error: Error | unknown,
    durationMs?: number
  ): Promise<void> {
    await this.logError(sessionId, `Operation failed: ${operationType}`, error, {
      operation_id: operationId,
      operation_type: operationType,
      duration_ms: durationMs,
      failed_at: new Date().toISOString()
    })

    await this.updateSessionMetrics(sessionId, 'failed_operations', 1)
  }

  /**
   * Update migration phase
   */
  async updateMigrationPhase(
    sessionId: string,
    phase: MigrationPhase,
    phaseData?: Record<string, any>
  ): Promise<void> {
    await this.logInfo(sessionId, `Migration phase: ${phase}`, {
      phase,
      phase_data: phaseData,
      phase_updated_at: new Date().toISOString()
    })

    try {
      const { error } = await supabaseGuestManager.supabase
        .from('guest_migration_sessions')
        .update({
          phase,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) throw error
    } catch (error) {
      console.error('Failed to update migration phase:', error)
    }
  }

  /**
   * Complete migration session
   */
  async completeMigrationSession(
    sessionId: string,
    status: 'completed' | 'failed' | 'rolled_back',
    summary?: Record<string, any>
  ): Promise<MigrationSessionSummary> {
    const completedAt = new Date().toISOString()
    
    try {
      // Calculate final metrics
      const session = await this.getMigrationSession(sessionId)
      if (!session) {
        throw new Error('Migration session not found')
      }

      const sessionSummary: MigrationSessionSummary = {
        session_id: sessionId,
        guest_id: session.guest_id,
        user_id: session.user_id,
        status,
        started_at: session.started_at,
        completed_at: completedAt,
        total_duration_ms: new Date(completedAt).getTime() - new Date(session.started_at).getTime(),
        metrics: session.metrics,
        summary,
        log_count: this.sessionLogs.length
      }

      // Update session status
      await this.updateSessionStatus(sessionId, status, completedAt)

      // Log completion
      await this.logInfo(sessionId, `Migration session ${status}`, {
        session_summary: sessionSummary
      })

      // Store final logs
      await this.flushSessionLogs(sessionId)

      // Create summary report
      await this.createSessionReport(sessionSummary)

      return sessionSummary

    } catch (error) {
      console.error('Failed to complete migration session:', error)
      throw error
    }
  }

  /**
   * Create performance metrics
   */
  async trackPerformanceMetric(
    sessionId: string,
    metricName: string,
    value: number,
    unit: string = 'ms',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logInfo(sessionId, `Performance metric: ${metricName}`, {
      metric_name: metricName,
      metric_value: value,
      metric_unit: unit,
      metadata,
      recorded_at: new Date().toISOString()
    })

    try {
      const { error } = await supabaseGuestManager.supabase
        .from('guest_migration_metrics')
        .insert({
          session_id: sessionId,
          metric_name: metricName,
          metric_value: value,
          metric_unit: unit,
          metadata,
          recorded_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Failed to store performance metric:', error)
    }
  }

  /**
   * Get migration session logs
   */
  async getSessionLogs(
    sessionId: string,
    level?: LogLevel,
    limit?: number
  ): Promise<MigrationLogEntry[]> {
    try {
      let query = supabaseGuestManager.supabase
        .from('guest_migration_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      if (level) {
        query = query.eq('level', level)
      }

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to get session logs:', error)
      return []
    }
  }

  /**
   * Search logs by pattern
   */
  async searchLogs(
    sessionId: string,
    searchPattern: string,
    level?: LogLevel
  ): Promise<MigrationLogEntry[]> {
    try {
      let query = supabaseGuestManager.supabase
        .from('guest_migration_logs')
        .select('*')
        .eq('session_id', sessionId)
        .ilike('message', `%${searchPattern}%`)
        .order('created_at', { ascending: false })

      if (level) {
        query = query.eq('level', level)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to search logs:', error)
      return []
    }
  }

  /**
   * Export session logs
   */
  async exportSessionLogs(sessionId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const logs = await this.getSessionLogs(sessionId)
      const session = await this.getMigrationSession(sessionId)

      const exportData = {
        session_info: session,
        logs,
        exported_at: new Date().toISOString(),
        total_logs: logs.length
      }

      if (format === 'json') {
        return JSON.stringify(exportData, null, 2)
      } else {
        // Convert to CSV
        const csvHeaders = ['timestamp', 'level', 'message', 'metadata']
        const csvRows = logs.map(log => [
          log.created_at,
          log.level,
          log.message.replace(/"/g, '""'), // Escape quotes
          JSON.stringify(log.metadata || {}).replace(/"/g, '""')
        ])

        const csvContent = [
          csvHeaders.join(','),
          ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        return csvContent
      }
    } catch (error) {
      console.error('Failed to export session logs:', error)
      throw error
    }
  }

  /**
   * Get migration statistics
   */
  async getMigrationStatistics(timeRange?: { from: string; to: string }): Promise<MigrationStatistics> {
    try {
      let query = supabaseGuestManager.supabase
        .from('guest_migration_sessions')
        .select('*')

      if (timeRange) {
        query = query
          .gte('started_at', timeRange.from)
          .lte('started_at', timeRange.to)
      }

      const { data: sessions, error } = await query

      if (error) throw error

      const stats: MigrationStatistics = {
        total_sessions: sessions?.length || 0,
        successful_sessions: sessions?.filter(s => s.status === 'completed').length || 0,
        failed_sessions: sessions?.filter(s => s.status === 'failed').length || 0,
        rolled_back_sessions: sessions?.filter(s => s.status === 'rolled_back').length || 0,
        average_duration_ms: 0,
        success_rate: 0,
        common_errors: [],
        performance_metrics: {
          avg_processing_time: 0,
          p95_processing_time: 0,
          total_operations: 0,
          avg_operations_per_session: 0
        }
      }

      if (sessions && sessions.length > 0) {
        // Calculate averages
        const completedSessions = sessions.filter(s => s.completed_at)
        if (completedSessions.length > 0) {
          const totalDuration = completedSessions.reduce((sum, session) => {
            return sum + (new Date(session.completed_at!).getTime() - new Date(session.started_at).getTime())
          }, 0)
          stats.average_duration_ms = totalDuration / completedSessions.length
        }

        stats.success_rate = (stats.successful_sessions / stats.total_sessions) * 100

        // Get common errors
        const errorLogs = await this.getCommonErrors(timeRange)
        stats.common_errors = errorLogs
      }

      return stats
    } catch (error) {
      console.error('Failed to get migration statistics:', error)
      throw error
    }
  }

  // Private methods

  private async addLogEntry(
    sessionId: string,
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const logEntry: MigrationLogEntry = {
      id: this.generateLogId(),
      session_id: sessionId,
      level,
      message,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    }

    // Add to local session logs
    this.sessionLogs.push(logEntry)

    // Store in database (async, don't wait)
    this.storeLogEntry(logEntry).catch(error => {
      console.error('Failed to store log entry:', error)
    })

    // Update session metrics
    if (level === 'error') {
      await this.updateSessionMetrics(sessionId, 'errors', 1)
    } else if (level === 'warning') {
      await this.updateSessionMetrics(sessionId, 'warnings', 1)
    }

    // Console logging for development
    const consoleMessage = `[${level.toUpperCase()}] ${message}`
    if (level === 'error') {
      console.error(consoleMessage, metadata)
    } else if (level === 'warning') {
      console.warn(consoleMessage, metadata)
    } else {
      console.log(consoleMessage, metadata)
    }
  }

  private async storeLogEntry(logEntry: MigrationLogEntry): Promise<void> {
    try {
      const { error } = await supabaseGuestManager.supabase
        .from('guest_migration_logs')
        .insert(logEntry)

      if (error) throw error
    } catch (error) {
      // Don't throw here to avoid recursive logging
      console.error('Failed to store log entry:', error)
    }
  }

  private async storeMigrationSession(session: MigrationSession): Promise<void> {
    try {
      const { error } = await supabaseGuestManager.supabase
        .from('guest_migration_sessions')
        .insert({
          id: session.id,
          guest_id: session.guest_id,
          user_id: session.user_id,
          started_at: session.started_at,
          status: session.status,
          phase: session.phase,
          metrics: session.metrics
        })

      if (error) throw error
    } catch (error) {
      console.error('Failed to store migration session:', error)
      throw error
    }
  }

  private async getMigrationSession(sessionId: string): Promise<MigrationSession | null> {
    try {
      const { data, error } = await supabaseGuestManager.supabase
        .from('guest_migration_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error) throw error

      return data as MigrationSession
    } catch (error) {
      console.error('Failed to get migration session:', error)
      return null
    }
  }

  private async updateSessionMetrics(
    sessionId: string,
    metricName: keyof MigrationMetrics,
    increment: number
  ): Promise<void> {
    try {
      const session = await this.getMigrationSession(sessionId)
      if (!session) return

      const updatedMetrics = {
        ...session.metrics,
        [metricName]: (session.metrics[metricName] as number) + increment
      }

      const { error } = await supabaseGuestManager.supabase
        .from('guest_migration_sessions')
        .update({
          metrics: updatedMetrics,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) throw error
    } catch (error) {
      console.error('Failed to update session metrics:', error)
    }
  }

  private async updateSessionStatus(
    sessionId: string,
    status: string,
    completedAt: string
  ): Promise<void> {
    try {
      const { error } = await supabaseGuestManager.supabase
        .from('guest_migration_sessions')
        .update({
          status,
          completed_at: completedAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) throw error
    } catch (error) {
      console.error('Failed to update session status:', error)
    }
  }

  private async flushSessionLogs(sessionId: string): Promise<void> {
    try {
      if (this.sessionLogs.length === 0) return

      const { error } = await supabaseGuestManager.supabase
        .from('guest_migration_logs')
        .insert(this.sessionLogs)

      if (error) throw error

      this.sessionLogs = []
    } catch (error) {
      console.error('Failed to flush session logs:', error)
    }
  }

  private async createSessionReport(summary: MigrationSessionSummary): Promise<void> {
    try {
      const report = {
        session_id: summary.session_id,
        guest_id: summary.guest_id,
        user_id: summary.user_id,
        report_data: summary,
        created_at: new Date().toISOString()
      }

      const { error } = await supabaseGuestManager.supabase
        .from('guest_migration_reports')
        .insert(report)

      if (error) throw error
    } catch (error) {
      console.error('Failed to create session report:', error)
    }
  }

  private async getCommonErrors(timeRange?: { from: string; to: string }): Promise<CommonError[]> {
    try {
      let query = supabaseGuestManager.supabase
        .from('guest_migration_logs')
        .select('message, metadata')
        .eq('level', 'error')

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.from)
          .lte('created_at', timeRange.to)
      }

      const { data, error } = await query

      if (error) throw error

      // Group errors by message pattern
      const errorGroups = new Map<string, number>()
      
      data?.forEach(log => {
        const errorType = this.extractErrorType(log.message)
        errorGroups.set(errorType, (errorGroups.get(errorType) || 0) + 1)
      })

      return Array.from(errorGroups.entries())
        .map(([error_type, count]) => ({ error_type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // Top 10 errors
    } catch (error) {
      console.error('Failed to get common errors:', error)
      return []
    }
  }

  private extractErrorType(message: string): string {
    // Extract error type from message (simplified)
    if (message.includes('database')) return 'Database Error'
    if (message.includes('network')) return 'Network Error'
    if (message.includes('validation')) return 'Validation Error'
    if (message.includes('transformation')) return 'Data Transformation Error'
    if (message.includes('conflict')) return 'Conflict Resolution Error'
    if (message.includes('rollback')) return 'Rollback Error'
    return 'General Error'
  }

  // Utility methods

  private generateSessionId(guestId: string): string {
    return `session_${guestId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateOperationId(operationType: string): string {
    return `op_${operationType}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Type definitions

type LogLevel = 'info' | 'warning' | 'error'
type MigrationPhase = 'initialization' | 'validation' | 'transformation' | 'conflict_resolution' | 'migration' | 'verification' | 'completion' | 'rollback'

interface MigrationLogEntry {
  id: string
  session_id: string
  level: LogLevel
  message: string
  metadata: Record<string, any>
  created_at: string
}

interface MigrationSession {
  id: string
  guest_id: string
  user_id: string
  started_at: string
  completed_at?: string
  status: 'active' | 'completed' | 'failed' | 'rolled_back'
  phase: MigrationPhase
  logs: MigrationLogEntry[]
  metrics: MigrationMetrics
  updated_at?: string
}

interface MigrationMetrics {
  total_operations: number
  successful_operations: number
  failed_operations: number
  warnings: number
  errors: number
  processing_time_ms: number
}

interface MigrationSessionSummary {
  session_id: string
  guest_id: string
  user_id: string
  status: string
  started_at: string
  completed_at: string
  total_duration_ms: number
  metrics: MigrationMetrics
  summary?: Record<string, any>
  log_count: number
}

interface MigrationStatistics {
  total_sessions: number
  successful_sessions: number
  failed_sessions: number
  rolled_back_sessions: number
  average_duration_ms: number
  success_rate: number
  common_errors: CommonError[]
  performance_metrics: {
    avg_processing_time: number
    p95_processing_time: number
    total_operations: number
    avg_operations_per_session: number
  }
}

interface CommonError {
  error_type: string
  count: number
}

// Export singleton instance
export const guestMigrationLogger = GuestMigrationLogger.getInstance()

// Export types
export type {
  LogLevel,
  MigrationPhase,
  MigrationLogEntry,
  MigrationSession,
  MigrationMetrics,
  MigrationSessionSummary,
  MigrationStatistics
}
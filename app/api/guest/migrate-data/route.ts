import { NextRequest, NextResponse } from 'next/server'
import { supabaseGuestManager } from '@/lib/supabase'
import { GuestUserData } from '@/types/guest'
import { guestDataTransformer } from '@/lib/guest-data-transformer'
import { guestConflictResolver } from '@/lib/guest-conflict-resolver'
import { guestMigrationRollback } from '@/lib/guest-migration-rollback'
import { guestMigrationLogger } from '@/lib/guest-migration-logger'
import { guestMigrationValidator } from '@/lib/guest-migration-validator'

interface MigrateDataRequest {
  guestId: string
  userId: string
  guestData: GuestUserData
  conflictResolutionStrategy?: 'merge_with_preference' | 'guest_priority' | 'existing_priority' | 'create_duplicate'
}

/**
 * Enhanced API endpoint for migrating guest data to registered user
 * Includes comprehensive validation, transformation, conflict resolution, and rollback capabilities
 */
export async function POST(request: NextRequest) {
  let sessionId: string | null = null
  let checkpoint: any = null
  
  try {
    const body: MigrateDataRequest = await request.json()
    const { guestId, userId, guestData, conflictResolutionStrategy = 'merge_with_preference' } = body

    // Validate required fields
    if (!guestId || !userId || !guestData) {
      return NextResponse.json(
        { error: 'Guest ID, user ID, and guest data are required' },
        { status: 400 }
      )
    }

    // Initialize migration session logging
    sessionId = await guestMigrationLogger.initializeMigrationSession(guestId, userId)
    await guestMigrationLogger.logInfo(sessionId, 'Migration request received', {
      guestId,
      userId,
      dataSize: JSON.stringify(guestData).length,
      conflictStrategy: conflictResolutionStrategy
    })

    // Phase 1: Pre-migration validation
    await guestMigrationLogger.updateMigrationPhase(sessionId, 'validation')
    const validationOpId = await guestMigrationLogger.logOperationStart(sessionId, 'pre_migration_validation')
    
    const validationReport = await guestMigrationValidator.validateGuestData(guestData)
    
    if (!validationReport.isValid) {
      await guestMigrationLogger.logOperationFailure(sessionId, validationOpId, 'pre_migration_validation', 
        new Error(`Validation failed: ${validationReport.errors.join(', ')}`))
      
      await guestMigrationLogger.completeMigrationSession(sessionId, 'failed', {
        reason: 'Pre-migration validation failed',
        validationReport
      })
      
      return NextResponse.json({
        success: false,
        error: 'Guest data validation failed',
        validationReport,
        sessionId
      }, { status: 400 })
    }

    await guestMigrationLogger.logOperationSuccess(sessionId, validationOpId, 'pre_migration_validation', {
      integrityScore: validationReport.statistics.data_integrity_score
    })

    // Phase 2: Create migration checkpoint
    await guestMigrationLogger.updateMigrationPhase(sessionId, 'initialization')
    const checkpointOpId = await guestMigrationLogger.logOperationStart(sessionId, 'create_checkpoint')
    
    checkpoint = await guestMigrationRollback.createMigrationCheckpoint(guestId, userId, guestData)
    
    await guestMigrationLogger.logOperationSuccess(sessionId, checkpointOpId, 'create_checkpoint', {
      checkpointId: checkpoint.id
    })

    // Phase 3: Data transformation
    await guestMigrationLogger.updateMigrationPhase(sessionId, 'transformation')
    const transformOpId = await guestMigrationLogger.logOperationStart(sessionId, 'data_transformation')
    
    const transformedData = guestDataTransformer.transformGuestDataForMigration(guestData, guestId, userId)
    const transformationValidation = await guestMigrationValidator.validateTransformedData(transformedData)
    
    if (!transformationValidation.isValid) {
      await guestMigrationLogger.logOperationFailure(sessionId, transformOpId, 'data_transformation',
        new Error(`Transformation validation failed: ${transformationValidation.errors.join(', ')}`))
      
      // Rollback and cleanup
      await this.handleMigrationFailure(sessionId, checkpoint, 'Transformation validation failed')
      
      return NextResponse.json({
        success: false,
        error: 'Data transformation validation failed',
        transformationValidation,
        sessionId
      }, { status: 500 })
    }

    await guestMigrationLogger.logOperationSuccess(sessionId, transformOpId, 'data_transformation', {
      transformedItems: transformedData.migration_metadata.total_items
    })

    // Phase 4: Get existing user data and resolve conflicts
    await guestMigrationLogger.updateMigrationPhase(sessionId, 'conflict_resolution')
    const conflictOpId = await guestMigrationLogger.logOperationStart(sessionId, 'conflict_resolution')
    
    const existingUserData = await this.getExistingUserData(userId)
    const conflictResult = await guestConflictResolver.resolveDataConflicts(
      transformedData,
      existingUserData,
      conflictResolutionStrategy
    )

    await guestMigrationLogger.logOperationSuccess(sessionId, conflictOpId, 'conflict_resolution', {
      conflictsFound: conflictResult.statistics.totalConflicts,
      conflictsResolved: conflictResult.statistics.resolvedConflicts
    })

    // Phase 5: Database migration
    await guestMigrationLogger.updateMigrationPhase(sessionId, 'migration')
    await supabaseGuestManager.setGuestContext(guestId)

    const migrationResults = {
      plans: { success: 0, failed: 0, errors: [] as string[] },
      flashcards: { success: 0, failed: 0, errors: [] as string[] },
      sessions: { success: 0, failed: 0, errors: [] as string[] },
      totalItems: 0,
      startTime: new Date().toISOString(),
      conflictResolution: conflictResult
    }

    // Migrate resolved data using conflict resolution results
    const migrationOpId = await guestMigrationLogger.logOperationStart(sessionId, 'database_migration')
    
    try {
      // Step 1: Migrate resolved curricula
      await guestMigrationLogger.logInfo(sessionId, 'Migrating curricula', {
        count: conflictResult.finalData.curricula.length
      })
      
      for (const curriculum of conflictResult.finalData.curricula) {
        try {
          const result = await supabaseGuestManager.createGuestCurriculum(guestId, curriculum)
          if (result.success) {
            migrationResults.plans.success++
          } else {
            migrationResults.plans.failed++
            migrationResults.plans.errors.push(`Curriculum ${curriculum.title}: ${result.error}`)
            await guestMigrationLogger.logError(sessionId, `Curriculum migration failed: ${curriculum.title}`, result.error)
          }
        } catch (error) {
          migrationResults.plans.failed++
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          migrationResults.plans.errors.push(`Curriculum ${curriculum.title}: ${errorMsg}`)
          await guestMigrationLogger.logError(sessionId, `Curriculum migration error: ${curriculum.title}`, error)
        }
        migrationResults.totalItems++
      }

      // Step 2: Migrate resolved flashcards
      await guestMigrationLogger.logInfo(sessionId, 'Migrating flashcards', {
        count: conflictResult.finalData.flashcards.length
      })
      
      for (const flashcard of conflictResult.finalData.flashcards) {
        try {
          const result = await supabaseGuestManager.createGuestFlashcard(guestId, flashcard)
          if (result.success) {
            migrationResults.flashcards.success++
          } else {
            migrationResults.flashcards.failed++
            migrationResults.flashcards.errors.push(`Flashcard ${flashcard.id}: ${result.error}`)
            await guestMigrationLogger.logError(sessionId, `Flashcard migration failed: ${flashcard.id}`, result.error)
          }
        } catch (error) {
          migrationResults.flashcards.failed++
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          migrationResults.flashcards.errors.push(`Flashcard ${flashcard.id}: ${errorMsg}`)
          await guestMigrationLogger.logError(sessionId, `Flashcard migration error: ${flashcard.id}`, error)
        }
        migrationResults.totalItems++
      }

      // Step 3: Execute database migration
      await guestMigrationLogger.logInfo(sessionId, 'Executing database migration')
      const dbMigrationResult = await supabaseGuestManager.migrateGuestToUser(guestId, userId)
      
      if (!dbMigrationResult.success) {
        throw new Error(`Database migration failed: ${dbMigrationResult.error}`)
      }

      await guestMigrationLogger.logOperationSuccess(sessionId, migrationOpId, 'database_migration', {
        plansSuccess: migrationResults.plans.success,
        flashcardsSuccess: migrationResults.flashcards.success,
        totalItems: migrationResults.totalItems
      })

      // Phase 6: Post-migration validation
      await guestMigrationLogger.updateMigrationPhase(sessionId, 'verification')
      const verificationOpId = await guestMigrationLogger.logOperationStart(sessionId, 'post_migration_validation')
      
      const postMigrationValidation = await guestMigrationValidator.validateMigrationResults(
        guestData,
        guestId,
        userId
      )

      if (!postMigrationValidation.isValid) {
        await guestMigrationLogger.logOperationFailure(sessionId, verificationOpId, 'post_migration_validation',
          new Error(`Post-migration validation failed: ${postMigrationValidation.errors.join(', ')}`))
        
        // Perform rollback
        await this.handleMigrationFailure(sessionId, checkpoint, 'Post-migration validation failed', {
          migrationResults,
          validationReport: postMigrationValidation
        })
        
        return NextResponse.json({
          success: false,
          error: 'Post-migration validation failed',
          validationReport: postMigrationValidation,
          sessionId,
          rollbackPerformed: true
        }, { status: 500 })
      }

      await guestMigrationLogger.logOperationSuccess(sessionId, verificationOpId, 'post_migration_validation', {
        integrityScore: postMigrationValidation.statistics.data_integrity_score
      })

      // Phase 7: Data integrity check
      const integrityOpId = await guestMigrationLogger.logOperationStart(sessionId, 'data_integrity_check')
      
      const integrityResult = await guestMigrationValidator.performDataIntegrityCheck(
        sessionId,
        guestData,
        {
          curricula: conflictResult.finalData.curricula,
          flashcards: conflictResult.finalData.flashcards,
          progress: conflictResult.finalData.progress,
          preferences: conflictResult.finalData.preferences
        }
      )

      await guestMigrationLogger.logOperationSuccess(sessionId, integrityOpId, 'data_integrity_check', {
        integrityScore: integrityResult.integrityScore,
        issuesFound: integrityResult.issues.length
      })

      // Step 4: Track migration completion
      try {
        await supabaseGuestManager.trackGuestEvent(
          guestId,
          'data_migration_completed',
          {
            user_id: userId,
            session_id: sessionId,
            migration_results: migrationResults,
            db_migration_result: dbMigrationResult.result,
            integrity_score: integrityResult.integrityScore,
            conflicts_resolved: conflictResult.statistics.totalConflicts
          }
        )
      } catch (trackingError) {
        await guestMigrationLogger.logWarning(sessionId, 'Failed to track migration event', { error: trackingError })
      }

      // Step 5: Confirm migration success and cleanup
      await guestMigrationLogger.updateMigrationPhase(sessionId, 'completion')
      await guestMigrationRollback.confirmMigrationSuccess(checkpoint.id)
      
      const finalStats = await supabaseGuestManager.getGuestUsageStats(guestId)
      migrationResults.totalItems = migrationResults.plans.success + migrationResults.flashcards.success

      const sessionSummary = await guestMigrationLogger.completeMigrationSession(sessionId, 'completed', {
        migrationResults,
        conflictResolution: conflictResult,
        integrityCheck: integrityResult,
        validationReport: postMigrationValidation
      })

      await guestMigrationLogger.logInfo(sessionId, 'Migration completed successfully', {
        totalDuration: sessionSummary.total_duration_ms,
        integrityScore: integrityResult.integrityScore
      })

      return NextResponse.json({
        success: true,
        sessionId,
        migrationResults,
        conflictResolution: {
          strategy: conflictResult.strategy,
          conflicts: conflictResult.statistics.totalConflicts,
          resolutions: conflictResult.statistics.resolvedConflicts
        },
        validation: {
          preValidation: validationReport,
          postValidation: postMigrationValidation,
          integrityCheck: integrityResult
        },
        dbMigrationResult: dbMigrationResult.result,
        finalStats: finalStats.stats,
        completedAt: new Date().toISOString(),
        sessionSummary
      })

    } catch (migrationError) {
      await guestMigrationLogger.logOperationFailure(sessionId, migrationOpId, 'database_migration', migrationError)
      
      // Handle migration failure with rollback
      await this.handleMigrationFailure(sessionId, checkpoint, 'Database migration failed', {
        migrationResults,
        error: migrationError
      })
      
      return NextResponse.json({
        success: false,
        error: 'Database migration failed',
        details: migrationError instanceof Error ? migrationError.message : 'Unknown error',
        sessionId,
        rollbackPerformed: true
      }, { status: 500 })
    }

  } catch (error) {
    // Handle unexpected errors
    if (sessionId) {
      await guestMigrationLogger.logError(sessionId, 'Unexpected migration error', error)
      await guestMigrationLogger.completeMigrationSession(sessionId, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Attempt emergency rollback if we have a checkpoint
    if (checkpoint) {
      try {
        await guestMigrationRollback.executeRollback(checkpoint.id, 'Unexpected error during migration')
      } catch (rollbackError) {
        console.error('Emergency rollback failed:', rollbackError)
      }
    }
    
    return NextResponse.json({
      error: 'An unexpected error occurred during data migration',
      details: error instanceof Error ? error.message : 'Unknown error',
      sessionId,
      emergencyRollbackAttempted: !!checkpoint
    }, { status: 500 })
  }
}

/**
 * Helper method to handle migration failures with rollback
 */
async function handleMigrationFailure(
  sessionId: string,
  checkpoint: any,
  reason: string,
  partialData?: any
): Promise<void> {
  try {
    await guestMigrationLogger.logError(sessionId, `Migration failed: ${reason}`, partialData)
    
    if (checkpoint) {
      const rollbackResult = await guestMigrationRollback.executeRollback(
        checkpoint.id,
        reason,
        partialData
      )
      
      await guestMigrationLogger.logInfo(sessionId, 'Rollback executed', {
        rollbackSuccess: rollbackResult.success,
        rollbackErrors: rollbackResult.errors
      })
    }
    
    await guestMigrationLogger.completeMigrationSession(sessionId, 'rolled_back', {
      reason,
      partialData
    })
  } catch (error) {
    console.error('Failed to handle migration failure:', error)
  }
}

/**
 * Helper method to get existing user data for conflict resolution
 */
async function getExistingUserData(userId: string): Promise<any> {
  try {
    // Get existing curricula
    const { data: curricula } = await supabaseGuestManager.supabase
      .from('curricula')
      .select(`
        *,
        modules:curriculum_modules(
          *,
          lessons:module_lessons(*)
        )
      `)
      .eq('user_id', userId)

    // Get existing flashcards
    const { data: flashcards } = await supabaseGuestManager.supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', userId)

    // Get existing progress
    const { data: progress } = await supabaseGuestManager.supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Get existing preferences
    const { data: preferences } = await supabaseGuestManager.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    return {
      curricula: curricula || [],
      flashcards: flashcards || [],
      progress: progress || null,
      preferences: preferences || null
    }
  } catch (error) {
    console.error('Failed to get existing user data:', error)
    return {
      curricula: [],
      flashcards: [],
      progress: null,
      preferences: null
    }
  }
}

/**
 * Get migration status for a guest user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guestId = searchParams.get('guestId')

    if (!guestId) {
      return NextResponse.json(
        { error: 'Guest ID is required' },
        { status: 400 }
      )
    }

    // Get guest usage statistics
    const statsResult = await supabaseGuestManager.getGuestUsageStats(guestId)
    
    if (!statsResult.success) {
      return NextResponse.json(
        { error: 'Failed to get migration status' },
        { status: 500 }
      )
    }

    // Check if guest has any data to migrate
    const stats = statsResult.stats
    const hasDataToMigrate = stats && (
      stats.usage?.plans?.count > 0 || 
      stats.usage?.flashcards?.count > 0 ||
      stats.analytics_events > 0
    )

    return NextResponse.json({
      guestId,
      hasDataToMigrate,
      stats,
      migrationReady: hasDataToMigrate
    })

  } catch (error) {
    console.error('Error getting migration status:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get migration status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Handle preflight requests for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

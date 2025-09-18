import { NextRequest, NextResponse } from 'next/server'
import { supabaseGuestManager } from '@/lib/supabase'
import { GuestUserData } from '@/types/guest'

interface MigrateDataRequest {
  guestId: string
  userId: string
  guestData: GuestUserData
}

/**
 * API endpoint for migrating guest data to registered user
 * Handles data transformation and database operations
 */
export async function POST(request: NextRequest) {
  try {
    const body: MigrateDataRequest = await request.json()
    const { guestId, userId, guestData } = body

    // Validate required fields
    if (!guestId || !userId || !guestData) {
      return NextResponse.json(
        { error: 'Guest ID, user ID, and guest data are required' },
        { status: 400 }
      )
    }

    console.log('Starting data migration:', { guestId, userId })

    // Set guest context for database operations
    await supabaseGuestManager.setGuestContext(guestId)

    const migrationResults = {
      plans: { success: 0, failed: 0, errors: [] as string[] },
      flashcards: { success: 0, failed: 0, errors: [] as string[] },
      sessions: { success: 0, failed: 0, errors: [] as string[] },
      totalItems: 0,
      startTime: new Date().toISOString()
    }

    // Step 1: Migrate plans (curricula) with modules and lessons
    console.log('Migrating plans...')
    for (const plan of guestData.plans) {
      try {
        const result = await supabaseGuestManager.createGuestCurriculum(guestId, plan)
        if (result.success) {
          migrationResults.plans.success++
        } else {
          migrationResults.plans.failed++
          migrationResults.plans.errors.push(`Plan ${plan.title}: ${result.error}`)
        }
      } catch (error) {
        migrationResults.plans.failed++
        migrationResults.plans.errors.push(`Plan ${plan.title}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      migrationResults.totalItems++
    }

    // Step 2: Migrate flashcards
    console.log('Migrating flashcards...')
    for (const flashcard of guestData.flashcards) {
      try {
        const result = await supabaseGuestManager.createGuestFlashcard(guestId, flashcard)
        if (result.success) {
          migrationResults.flashcards.success++
        } else {
          migrationResults.flashcards.failed++
          migrationResults.flashcards.errors.push(`Flashcard ${flashcard.id}: ${result.error}`)
        }
      } catch (error) {
        migrationResults.flashcards.failed++
        migrationResults.flashcards.errors.push(`Flashcard ${flashcard.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      migrationResults.totalItems++
    }

    // Step 3: Use database function to migrate all guest data to registered user
    console.log('Executing database migration...')
    const dbMigrationResult = await supabaseGuestManager.migrateGuestToUser(guestId, userId)
    
    if (!dbMigrationResult.success) {
      console.error('Database migration failed:', dbMigrationResult.error)
      return NextResponse.json(
        { 
          error: 'Database migration failed',
          details: dbMigrationResult.error,
          partialResults: migrationResults
        },
        { status: 500 }
      )
    }

    // Step 4: Track migration completion
    try {
      await supabaseGuestManager.trackGuestEvent(
        guestId,
        'data_migration_completed',
        {
          user_id: userId,
          migration_results: migrationResults,
          db_migration_result: dbMigrationResult.result
        }
      )
    } catch (trackingError) {
      console.error('Failed to track migration event:', trackingError)
      // Don't fail the process for tracking errors
    }

    // Step 5: Get final usage statistics
    const finalStats = await supabaseGuestManager.getGuestUsageStats(guestId)

    migrationResults.totalItems = migrationResults.plans.success + migrationResults.flashcards.success

    console.log('Data migration completed successfully:', migrationResults)

    return NextResponse.json({
      success: true,
      migrationResults,
      dbMigrationResult: dbMigrationResult.result,
      finalStats: finalStats.stats,
      completedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Unexpected error during data migration:', error)
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred during data migration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
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

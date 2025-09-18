import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseGuestManager } from '@/lib/supabase'
import { GuestUserData } from '@/types/guest'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create admin client for user creation
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface GuestUpgradeRequest {
  email: string
  password: string
  name?: string
  guestId: string
  guestData: GuestUserData | null
}

/**
 * API endpoint for converting guest users to registered accounts
 * Handles Supabase Auth integration and data migration
 */
export async function POST(request: NextRequest) {
  try {
    const body: GuestUpgradeRequest = await request.json()
    const { email, password, name, guestId, guestData } = body

    // Validate required fields
    if (!email || !password || !guestId) {
      return NextResponse.json(
        { error: 'Email, password, and guest ID are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    console.log('Starting guest upgrade process for:', { email, guestId })

    // Step 1: Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email)
    
    if (existingUser.user) {
      // User exists - we need to merge data
      console.log('User already exists, merging data...')
      
      // Migrate guest data to existing user
      const migrationResult = await supabaseGuestManager.migrateGuestToUser(guestId, existingUser.user.id)
      
      if (!migrationResult.success) {
        console.error('Data migration failed:', migrationResult.error)
        return NextResponse.json(
          { error: 'Failed to merge guest data with existing account' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        user: existingUser.user,
        merged: true,
        migrationResult: migrationResult.result
      })
    }

    // Step 2: Create new user account
    console.log('Creating new user account...')
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation for now
      user_metadata: {
        name: name || null,
        upgraded_from_guest: true,
        original_guest_id: guestId
      }
    })

    if (authError || !authData.user) {
      console.error('Failed to create user:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user account' },
        { status: 400 }
      )
    }

    const newUser = authData.user
    console.log('User created successfully:', newUser.id)

    // Step 3: Create or update profile
    const profileResult = await supabaseGuestManager.createGuestProfile(newUser.id, {
      email,
      name: name || null,
      is_guest: false,
      upgraded_at: new Date().toISOString(),
      guest_id: guestId
    })

    if (!profileResult.success) {
      console.error('Failed to create profile:', profileResult.error)
      // Don't fail the whole process, profile can be created later
    }

    // Step 4: Migrate guest data if available
    let migrationResult = null
    if (guestData && (guestData.plans.length > 0 || guestData.flashcards.length > 0)) {
      console.log('Migrating guest data...')
      
      // Set guest context for data access
      await supabaseGuestManager.setGuestContext(guestId)
      
      try {
        // Migrate plans (curricula)
        for (const plan of guestData.plans) {
          const curriculumResult = await supabaseGuestManager.createGuestCurriculum(guestId, plan)
          if (!curriculumResult.success) {
            console.warn('Failed to migrate plan:', plan.id, curriculumResult.error)
          }
        }

        // Migrate flashcards
        for (const flashcard of guestData.flashcards) {
          const flashcardResult = await supabaseGuestManager.createGuestFlashcard(guestId, flashcard)
          if (!flashcardResult.success) {
            console.warn('Failed to migrate flashcard:', flashcard.id, flashcardResult.error)
          }
        }

        // Now migrate all guest data to the new user
        migrationResult = await supabaseGuestManager.migrateGuestToUser(guestId, newUser.id)
        
        if (!migrationResult.success) {
          console.error('Data migration failed:', migrationResult.error)
          // Don't fail the whole process, data can be migrated later
        }
      } catch (migrationError) {
        console.error('Error during data migration:', migrationError)
        // Continue with account creation even if migration fails
      }
    }

    // Step 5: Track the upgrade event
    try {
      await supabaseGuestManager.trackGuestEvent(
        guestId,
        'upgrade_completed',
        {
          new_user_id: newUser.id,
          email,
          has_data: !!(guestData && (guestData.plans.length > 0 || guestData.flashcards.length > 0)),
          migration_success: migrationResult?.success || false
        }
      )
    } catch (trackingError) {
      console.error('Failed to track upgrade event:', trackingError)
      // Don't fail the process for tracking errors
    }

    // Step 6: Generate session for immediate login
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${request.nextUrl.origin}/dashboard`
      }
    })

    console.log('Guest upgrade completed successfully')

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: name || null,
        created_at: newUser.created_at
      },
      merged: false,
      migrationResult: migrationResult?.result || null,
      sessionUrl: sessionData?.properties?.action_link || null
    })

  } catch (error) {
    console.error('Unexpected error during guest upgrade:', error)
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred during account creation',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

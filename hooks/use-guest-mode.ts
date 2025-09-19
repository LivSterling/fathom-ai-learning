"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/auth-context'

interface GuestData {
  curricula: any[]
  flashcards: any[]
  progress: any[]
  preferences: any
}

export function useGuestMode() {
  const { user, isGuest } = useAuth()
  const [guestData, setGuestData] = useState<GuestData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  // Initialize guest mode - create anonymous user if needed
  const initializeGuestMode = async () => {
    if (user) return user

    setIsLoading(true)
    try {
      // Sign in anonymously or create guest user
      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: { is_guest: true }
        }
      })

      if (error) {
        console.error('Error initializing guest mode:', error)
        return null
      }

      return data.user
    } catch (error) {
      console.error('Error initializing guest mode:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Save data to local storage for guest users
  const saveGuestData = (key: string, data: any) => {
    if (isGuest) {
      const existingData = getGuestData()
      const updatedData = { ...existingData, [key]: data }
      localStorage.setItem('guest_data', JSON.stringify(updatedData))
      setGuestData(updatedData)
    }
  }

  // Get data from local storage for guest users
  const getGuestData = (): GuestData => {
    if (typeof window === 'undefined') {
      return { curricula: [], flashcards: [], progress: [], preferences: {} }
    }

    const stored = localStorage.getItem('guest_data')
    return stored ? JSON.parse(stored) : { curricula: [], flashcards: [], progress: [], preferences: {} }
  }

  // Migrate guest data to authenticated user
  const migrateGuestData = async () => {
    if (!isGuest || !user) return { success: false, error: 'Invalid state for migration' }

    setIsLoading(true)
    try {
      const data = getGuestData()
      
      // Migrate curricula
      if (data.curricula?.length > 0) {
        const { error: curriculaError } = await supabase
          .from('curricula')
          .insert(data.curricula.map(curriculum => ({
            ...curriculum,
            user_id: user.id,
            created_at: new Date().toISOString()
          })))

        if (curriculaError) {
          console.error('Error migrating curricula:', curriculaError)
        }
      }

      // Migrate flashcards
      if (data.flashcards?.length > 0) {
        const { error: flashcardsError } = await supabase
          .from('flashcards')
          .insert(data.flashcards.map(card => ({
            ...card,
            user_id: user.id,
            created_at: new Date().toISOString()
          })))

        if (flashcardsError) {
          console.error('Error migrating flashcards:', flashcardsError)
        }
      }

      // Migrate progress
      if (data.progress?.length > 0) {
        const { error: progressError } = await supabase
          .from('user_progress')
          .insert(data.progress.map(progress => ({
            ...progress,
            user_id: user.id,
            created_at: new Date().toISOString()
          })))

        if (progressError) {
          console.error('Error migrating progress:', progressError)
        }
      }

      // Clear local storage after successful migration
      localStorage.removeItem('guest_data')
      setGuestData(null)

      return { success: true }
    } catch (error) {
      console.error('Error migrating guest data:', error)
      return { success: false, error: 'Failed to migrate data' }
    } finally {
      setIsLoading(false)
    }
  }

  // Load guest data on mount
  useEffect(() => {
    if (isGuest) {
      setGuestData(getGuestData())
    }
  }, [isGuest])

  return {
    isGuest,
    guestData,
    isLoading,
    initializeGuestMode,
    saveGuestData,
    getGuestData,
    migrateGuestData,
  }
}
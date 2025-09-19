"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  isGuest: boolean
  isLoading: boolean
  signOut: () => Promise<void>
  upgradeFromGuest: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  // Check if user is in guest mode (either no user or user has is_guest metadata)
  const isGuest = !user || user.user_metadata?.is_guest === true

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const upgradeFromGuest = async (email: string, password: string) => {
    try {
      // If user is anonymous/guest, we need to link their account
      if (user && isGuest) {
        // Update the existing user with email/password
        const { error: updateError } = await supabase.auth.updateUser({
          email,
          password,
          data: { is_guest: false }
        })

        if (updateError) {
          return { success: false, error: updateError.message }
        }

        return { success: true }
      } else {
        // No existing user, create new account
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { is_guest: false }
          }
        })

        if (signUpError) {
          return { success: false, error: signUpError.message }
        }

        return { success: true }
      }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const value = {
    user,
    session,
    isGuest,
    isLoading,
    signOut,
    upgradeFromGuest,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
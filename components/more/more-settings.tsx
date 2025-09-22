"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Settings, Link, Github, Mail } from "lucide-react"
import { useSupabaseGuestSession } from "@/hooks/use-supabase-guest-session"
import { supabase } from "@/lib/supabase"
import { useEffect } from "react"

interface MoreSettingsProps {
  onUpgrade?: () => void
}

export function MoreSettings({ onUpgrade }: MoreSettingsProps) {
  const { session: guestSession } = useSupabaseGuestSession()
  const [syncCode, setSyncCode] = useState("FTHM-2024-ABCD")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    // Check authentication state
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
      
      if (user) {
        // Get user profile from database
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        setUserProfile(profile || { 
          name: user.user_metadata?.name || user.email?.split('@')[0], 
          email: user.email 
        })
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthenticated(!!session?.user)
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        setUserProfile(profile || { 
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0], 
          email: session.user.email 
        })
      } else {
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const isGuest = !isAuthenticated

  const handleUpgrade = () => {
    onUpgrade?.()
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    } else {
      console.log('Signed out successfully')
      // Optionally redirect or refresh
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    }
  }

  const handleCopySync = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(syncCode)
      console.log("Sync code copied")
    }
  }

  return (
    <div className="space-y-6 py-4">
      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isGuest ? (
            <div className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h3 className="font-medium text-primary mb-2">Guest Mode Active</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Create an account to save your progress across devices and unlock premium features.
                </p>
                <Button onClick={handleUpgrade} className="w-full">
                  Create Account
                </Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Enter your email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="Create a password" />
                </div>
                <Button variant="outline" className="w-full bg-transparent">
                  Sign Up with Email
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="bg-transparent">
                  <Github className="w-4 h-4 mr-2" />
                  GitHub
                </Button>
                <Button variant="outline" className="bg-transparent">
                  <Mail className="w-4 h-4 mr-2" />
                  Google
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">{userProfile?.name || 'User'}</h3>
                  <p className="text-sm text-muted-foreground">{userProfile?.email || 'user@example.com'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 bg-transparent">
                  Manage Account
                </Button>
                <Button variant="outline" onClick={handleSignOut} className="flex-1 bg-transparent">
                  Sign Out
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Daily Review Target</Label>
            <Select defaultValue="20">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 cards</SelectItem>
                <SelectItem value="20">20 cards</SelectItem>
                <SelectItem value="30">30 cards</SelectItem>
                <SelectItem value="50">50 cards</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Study Minutes per Day</Label>
            <Select defaultValue="30">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Guest Sync */}
      {isGuest && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Guest Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this code to sync your progress across devices while in guest mode.
            </p>
            <div className="flex gap-2">
              <Input value={syncCode} readOnly className="font-mono" />
              <Button variant="outline" onClick={handleCopySync}>
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Keep this code private. Anyone with this code can access your learning data.
            </p>
          </CardContent>
        </Card>
      )}

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About Fathom</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            AI-powered learning platform with personalized curriculum and spaced repetition.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Version 1.0.0</span>
            <span>•</span>
            <button className="underline">Privacy Policy</button>
            <span>•</span>
            <button className="underline">Terms of Service</button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

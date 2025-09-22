"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, User, CheckCircle } from "lucide-react"
import { useGuestSession } from "@/hooks/use-guest-session"
import { supabase } from "@/lib/supabase"

interface SignupFormProps {
  onSuccess?: (user: any) => void
  onCancel?: () => void
  showGuestBenefits?: boolean
}

export function SignupForm({ onSuccess, onCancel, showGuestBenefits = true }: SignupFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<"form" | "success">("form")

  const { 
    session, 
    limits, 
    getAllGuestData, 
    clearSession,
    guestId 
  } = useGuestSession()

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError("Email is required")
      return false
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address")
      return false
    }
    
    if (!formData.password) {
      setError("Password is required")
      return false
    }
    
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long")
      return false
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    setError(null)

    try {
      // Get guest data before clearing session
      const guestData = getAllGuestData()
      
      // Call the guest upgrade API
      const response = await fetch('/api/auth/guest-upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name.trim() || null,
          guestId,
          guestData
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account')
      }

      // Sign in the user with the new credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (signInError) {
        console.error('Failed to sign in after account creation:', signInError)
        // Still show success, but user will need to sign in manually
      } else {
        console.log('User signed in successfully:', signInData.user)
      }

      // Clear guest session after successful upgrade
      clearSession()
      
      // Show success step
      setStep("success")
      
      // Call success callback after a short delay to show success message
      setTimeout(() => {
        onSuccess?.(result.user)
      }, 1000)

    } catch (err) {
      console.error('Signup error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (step === "success") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl">Account Created Successfully!</CardTitle>
          <CardDescription>
            Welcome to Fathom! All your guest data has been preserved.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            You'll be redirected to your dashboard in a moment...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl text-center">Create Your Account</CardTitle>
        <CardDescription className="text-center">
          Keep all your progress and sync across devices
        </CardDescription>
      </CardHeader>

      {showGuestBenefits && session && (
        <CardContent className="pb-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg mb-4">
            <h4 className="font-medium text-sm mb-2">You'll keep everything:</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Plans created</span>
                <span className="font-medium">{limits.current.maxPlans}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Flashcards made</span>
                <span className="font-medium">{limits.current.maxFlashcards}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Lessons completed</span>
                <span className="font-medium">{session.userData.progress.completedLessons}</span>
              </div>
            </div>
          </div>
        </CardContent>
      )}

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
          
          {onCancel && (
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full" 
              onClick={onCancel}
              disabled={isLoading}
            >
              Continue as Guest
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}

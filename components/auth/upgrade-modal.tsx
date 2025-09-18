"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, CheckCircle, ArrowRight } from "lucide-react"
import { useAuth } from '@/lib/auth/auth-context'
import { useGuestMode } from '@/hooks/use-guest-mode'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function UpgradeModal({ isOpen, onClose, onSuccess }: UpgradeModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'form' | 'migrating' | 'success'>('form')
  
  const { upgradeFromGuest } = useAuth()
  const { migrateGuestData } = useGuestMode()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Step 1: Upgrade the user account
      const { success, error: upgradeError } = await upgradeFromGuest(email, password)
      
      if (!success) {
        setError(upgradeError || 'Failed to create account')
        setIsLoading(false)
        return
      }

      // Step 2: Migrate guest data
      setStep('migrating')
      const { success: migrationSuccess, error: migrationError } = await migrateGuestData()
      
      if (!migrationSuccess) {
        console.warn('Data migration failed:', migrationError)
        // Don't fail the whole process - user is still upgraded
      }

      // Step 3: Success
      setStep('success')
      setTimeout(() => {
        onSuccess?.()
        onClose()
        // Reset form
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setStep('form')
      }, 2000)

    } catch (error) {
      console.error('Upgrade error:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading && step !== 'migrating') {
      onClose()
      // Reset form
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setError('')
      setStep('form')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'success' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Welcome to Fathom!
              </>
            ) : (
              <>
                <ArrowRight className="h-5 w-5" />
                Upgrade Your Account
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'form' && "Create an account to save your progress and access all features."}
            {step === 'migrating' && "Setting up your account and transferring your data..."}
            {step === 'success' && "Your account has been created successfully!"}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  placeholder="Create a password"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9"
                  placeholder="Confirm your password"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </div>
          </form>
        )}

        {step === 'migrating' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="font-medium">Setting up your account...</p>
              <p className="text-sm text-muted-foreground">
                We're transferring your progress and data to your new account.
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <div className="text-center space-y-2">
              <p className="font-medium">Account created successfully!</p>
              <p className="text-sm text-muted-foreground">
                Your progress has been saved and you now have access to all features.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SignupForm } from '@/components/auth/signup-form'
import { Button } from '@/components/ui/button'
import { X, Crown } from 'lucide-react'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (user: any) => void
  trigger?: string
}

export function UpgradeModal({ isOpen, onClose, onSuccess, trigger }: UpgradeModalProps) {
  const [step, setStep] = useState<'intro' | 'form'>('intro')

  const handleGetStarted = () => {
    setStep('form')
  }

  const handleSuccess = (user: any) => {
    onSuccess?.(user)
    onClose()
    // Redirect to dashboard or refresh page
    window.location.href = '/dashboard'
  }

  const handleClose = () => {
    setStep('intro')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="absolute right-0 top-0 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Upgrade Your Account
          </DialogTitle>
        </DialogHeader>

        {step === 'intro' ? (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">
                Ready to unlock unlimited learning?
              </p>
              <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm">What you'll get:</h4>
                <ul className="text-sm space-y-1 text-left">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Unlimited plans, lessons & flashcards
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Sync across all your devices
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Advanced progress tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Priority support
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={handleGetStarted} className="w-full">
                <Crown className="h-4 w-4 mr-2" />
                Get Started
              </Button>
              <Button variant="ghost" onClick={handleClose} className="w-full">
                Maybe Later
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-2">
            <SignupForm
              onSuccess={handleSuccess}
              onCancel={handleClose}
              showGuestBenefits={true}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

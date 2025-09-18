"use client"

import { Button } from "@/components/ui/button"
import { Brain, Sparkles, Target } from "lucide-react"

interface OnboardingStartProps {
  onStartAsGuest: () => void
  onSignIn: () => void
}

export function OnboardingStart({ onStartAsGuest, onSignIn }: OnboardingStartProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Title */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center w-16 h-16 bg-primary rounded-full mx-auto mb-4">
            <Brain className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Fathom</h1>
          <p className="text-muted-foreground text-balance">
            AI-powered learning platform with personalized curriculum and spaced repetition
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-card rounded-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">AI Tutor</p>
              <p className="text-xs text-muted-foreground">Get personalized help and explanations</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-card rounded-lg">
            <Target className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Smart Review</p>
              <p className="text-xs text-muted-foreground">Spaced repetition for better retention</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button onClick={onStartAsGuest} className="w-full" size="lg">
            Start as Guest
          </Button>
          <Button onClick={onSignIn} variant="outline" className="w-full bg-transparent" size="lg">
            Sign In
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Guest mode lets you explore features without creating an account
        </p>
      </div>
    </div>
  )
}

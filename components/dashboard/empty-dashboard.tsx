"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, MessageSquare, Sparkles } from "lucide-react"

interface EmptyDashboardProps {
  onGetStarted: () => void
}

export function EmptyDashboard({ onGetStarted }: EmptyDashboardProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Welcome to Fathom!</h2>
        <p className="text-muted-foreground text-balance max-w-sm">
          Start your learning journey by creating a plan or jumping into a session with our AI tutor.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-0 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium">Build a Learning Plan</p>
              <p className="text-sm text-muted-foreground">Structured curriculum</p>
            </div>
          </CardContent>
        </Card>

        <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-0 flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <MessageSquare className="w-5 h-5 text-secondary" />
            </div>
            <div className="text-left">
              <p className="font-medium">Start AI Session</p>
              <p className="text-sm text-muted-foreground">Learn with AI tutor</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={onGetStarted} className="w-full max-w-sm">
        Get Started
      </Button>
    </div>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RotateCcw, Target, Clock, Mic } from "lucide-react"

interface ReviewStartProps {
  cardsDue: number
  onStartSession: () => void
}

export function ReviewStart({ cardsDue, onStartSession }: ReviewStartProps) {
  if (cardsDue === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center py-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <Target className="w-8 h-8 text-green-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">All Caught Up!</h2>
          <p className="text-muted-foreground text-balance max-w-sm">
            No cards are due for review right now. Great job staying on top of your learning!
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>Come back later for more reviews, or continue learning new material.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Ready to Review?</h2>
        <p className="text-muted-foreground">Strengthen your memory with spaced repetition</p>
      </div>

      {/* Stats Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-primary" />
            Review Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">{cardsDue}</div>
              <div className="text-sm text-muted-foreground">Cards Due</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-secondary">~{Math.ceil(cardsDue * 1.5)}</div>
              <div className="text-sm text-muted-foreground">Minutes</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Estimated time: {Math.ceil(cardsDue * 1.5)} minutes</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mic className="w-4 h-4" />
              <span>Voice review mode available</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Be honest with your grading - it helps the algorithm</li>
            <li>• Use "Again" if you couldn't recall the answer</li>
            <li>• "Easy" means you knew it instantly</li>
            <li>• Voice mode lets you speak your answers</li>
          </ul>
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button onClick={onStartSession} className="w-full" size="lg">
        Start Review Session
      </Button>
    </div>
  )
}

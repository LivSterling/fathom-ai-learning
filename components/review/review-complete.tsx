"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, RotateCcw, Home } from "lucide-react"
import { useRouter } from "next/navigation"

interface ReviewCompleteProps {
  stats: {
    total: number
    correct: number
    again: number
    hard: number
    good: number
    easy: number
  }
  onNewSession: () => void
}

export function ReviewComplete({ stats, onNewSession }: ReviewCompleteProps) {
  const router = useRouter()
  const accuracy = Math.round((stats.correct / stats.total) * 100)

  const getPerformanceMessage = () => {
    if (accuracy >= 90) return { message: "Excellent work! 🎉", color: "text-green-600" }
    if (accuracy >= 75) return { message: "Great job! 👏", color: "text-blue-600" }
    if (accuracy >= 60) return { message: "Good progress! 👍", color: "text-orange-600" }
    return { message: "Keep practicing! 💪", color: "text-red-600" }
  }

  const performance = getPerformanceMessage()

  return (
    <div className="space-y-6 py-4">
      {/* Completion Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Session Complete!</h2>
          <p className={`text-lg font-medium ${performance.color}`}>{performance.message}</p>
        </div>
      </div>

      {/* Stats Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-center">Session Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Cards Reviewed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="space-y-2">
            <h4 className="font-medium text-center">Grade Breakdown</h4>
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              <div className="p-2 bg-red-50 rounded">
                <div className="font-bold text-red-600">{stats.again}</div>
                <div className="text-red-600">Again</div>
              </div>
              <div className="p-2 bg-orange-50 rounded">
                <div className="font-bold text-orange-600">{stats.hard}</div>
                <div className="text-orange-600">Hard</div>
              </div>
              <div className="p-2 bg-green-50 rounded">
                <div className="font-bold text-green-600">{stats.good}</div>
                <div className="text-green-600">Good</div>
              </div>
              <div className="p-2 bg-blue-50 rounded">
                <div className="font-bold text-blue-600">{stats.easy}</div>
                <div className="text-blue-600">Easy</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What's Next?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Cards marked "Again" will appear sooner for review</li>
            <li>• "Easy" cards will have longer intervals before next review</li>
            <li>• Your next review session will be available tomorrow</li>
            <li>• Consider adding more cards from your recent lessons</li>
          </ul>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button onClick={onNewSession} variant="outline" className="w-full bg-transparent">
          <RotateCcw className="w-4 h-4 mr-2" />
          Review More Cards
        </Button>
        <Button onClick={() => router.push("/dashboard")} className="w-full">
          <Home className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}

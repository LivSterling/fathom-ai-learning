"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, Eye, EyeOff } from "lucide-react"

interface ReviewSessionProps {
  card: {
    id: string
    front: string
    back: string
    difficulty: string
    tags: string[]
  }
  currentIndex: number
  totalCards: number
  onGrade: (grade: "again" | "hard" | "good" | "easy") => void
}

export function ReviewSession({ card, currentIndex, totalCards, onGrade }: ReviewSessionProps) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState("")

  const progress = ((currentIndex + 1) / totalCards) * 100

  const handleRevealAnswer = () => {
    setShowAnswer(true)
  }

  const handleGrade = (grade: "again" | "hard" | "good" | "easy") => {
    setShowAnswer(false)
    setVoiceTranscript("")
    onGrade(grade)
  }

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode)
    if (!isVoiceMode) {
      setIsListening(true)
      // Simulate voice recognition
      setTimeout(() => {
        setVoiceTranscript("A closure is a function that has access to variables in its outer scope...")
        setIsListening(false)
      }, 3000)
    }
  }

  const gradeButtons = [
    { grade: "again" as const, label: "Again", color: "bg-red-500 hover:bg-red-600 text-white", shortcut: "1" },
    { grade: "hard" as const, label: "Hard", color: "bg-orange-500 hover:bg-orange-600 text-white", shortcut: "2" },
    { grade: "good" as const, label: "Good", color: "bg-green-500 hover:bg-green-600 text-white", shortcut: "3" },
    { grade: "easy" as const, label: "Easy", color: "bg-blue-500 hover:bg-blue-600 text-white", shortcut: "4" },
  ]

  return (
    <div className="space-y-4 py-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Card {currentIndex + 1} of {totalCards}
          </span>
          <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Card */}
      <Card className="min-h-[300px]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {card.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={toggleVoiceMode}>
              {isVoiceMode ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Question */}
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium text-foreground text-balance">{card.front}</h3>

            {/* Voice Mode Interface */}
            {isVoiceMode && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Button
                    onClick={toggleVoiceMode}
                    className={`w-16 h-16 rounded-full ${
                      isListening ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"
                    }`}
                  >
                    {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </Button>
                </div>

                {isListening && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Listening for your answer...</p>
                    <div className="flex justify-center mt-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-primary rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-primary rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {voiceTranscript && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-sm text-muted-foreground mb-1">Your answer:</p>
                    <p className="text-sm">{voiceTranscript}</p>
                  </div>
                )}
              </div>
            )}

            {/* Reveal Answer Button */}
            {!showAnswer && !isVoiceMode && (
              <Button onClick={handleRevealAnswer} variant="outline" className="bg-transparent">
                <Eye className="w-4 h-4 mr-2" />
                Show Answer
              </Button>
            )}

            {/* Voice Mode Reveal */}
            {!showAnswer && isVoiceMode && voiceTranscript && (
              <Button onClick={handleRevealAnswer} variant="outline" className="bg-transparent">
                <Eye className="w-4 h-4 mr-2" />
                Compare with Answer
              </Button>
            )}
          </div>

          {/* Answer */}
          {showAnswer && (
            <div className="border-t border-border pt-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <EyeOff className="w-4 h-4" />
                  <span className="text-sm">Answer</span>
                </div>
                <p className="text-foreground text-balance">{card.back}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grading Buttons */}
      {showAnswer && (
        <div className="space-y-3">
          <p className="text-center text-sm text-muted-foreground">How well did you know this?</p>
          <div className="grid grid-cols-2 gap-2">
            {gradeButtons.map((button) => (
              <Button key={button.grade} onClick={() => handleGrade(button.grade)} className={button.color} size="lg">
                <div className="text-center">
                  <div className="font-medium">{button.label}</div>
                  <div className="text-xs opacity-80">Press {button.shortcut}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

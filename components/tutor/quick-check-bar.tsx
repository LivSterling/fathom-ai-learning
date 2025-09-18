"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, XCircle } from "lucide-react"

interface QuickCheckBarProps {
  onPass: () => void
  onFail: () => void
}

const mockQuestions = [
  {
    id: "1",
    question: "What method would you use to add an element to the end of an array?",
    options: ["push()", "pop()", "shift()", "unshift()"],
    correct: 0,
  },
  {
    id: "2",
    question: "How do you access the 'name' property of an object called 'person'?",
    options: ["person.name", "person[name]", "person->name", "person::name"],
    correct: 0,
  },
]

export function QuickCheckBar({ onPass, onFail }: QuickCheckBarProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)

  const question = mockQuestions[currentQuestion]

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex)
    setShowResult(true)

    if (answerIndex === question.correct) {
      setScore((prev) => prev + 1)
    }

    setTimeout(() => {
      if (currentQuestion < mockQuestions.length - 1) {
        setCurrentQuestion((prev) => prev + 1)
        setSelectedAnswer(null)
        setShowResult(false)
      } else {
        // Quiz complete
        const finalScore = score + (answerIndex === question.correct ? 1 : 0)
        if (finalScore >= mockQuestions.length * 0.7) {
          onPass()
        } else {
          onFail()
        }
      }
    }, 2000)
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground">Quick Check</h3>
            <div className="text-sm text-muted-foreground">
              {currentQuestion + 1} of {mockQuestions.length}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{question.question}</p>

            <div className="grid grid-cols-1 gap-2">
              {question.options.map((option, index) => {
                let buttonClass = "justify-start text-left h-auto p-3 bg-white hover:bg-gray-50"

                if (showResult) {
                  if (index === question.correct) {
                    buttonClass += " bg-green-100 border-green-300 text-green-700"
                  } else if (index === selectedAnswer && index !== question.correct) {
                    buttonClass += " bg-red-100 border-red-300 text-red-700"
                  }
                }

                return (
                  <Button
                    key={index}
                    variant="outline"
                    className={buttonClass}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showResult}
                  >
                    <div className="flex items-center gap-2">
                      {showResult && index === question.correct && <CheckCircle className="w-4 h-4 text-green-600" />}
                      {showResult && index === selectedAnswer && index !== question.correct && (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span>{option}</span>
                    </div>
                  </Button>
                )
              })}
            </div>

            {showResult && (
              <div className="text-center">
                {selectedAnswer === question.correct ? (
                  <p className="text-sm text-green-600 font-medium">Correct! 🎉</p>
                ) : (
                  <p className="text-sm text-red-600 font-medium">
                    Not quite. The correct answer is: {question.options[question.correct]}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

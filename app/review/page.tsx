"use client"

import { useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { ReviewStart } from "@/components/review/review-start"
import { ReviewSession } from "@/components/review/review-session"
import { ReviewComplete } from "@/components/review/review-complete"
import { UpgradePrompt } from "@/components/guest/upgrade-prompt"
import { usePageUpgradePrompts } from "@/hooks/use-integrated-upgrade-prompts"
import { mockCards } from "@/lib/mock-data"

export default function ReviewPage() {
  const [sessionState, setSessionState] = useState<"start" | "active" | "complete">("start")
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [sessionStats, setSessionStats] = useState({
    total: 0,
    correct: 0,
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  })
  const upgradePrompts = usePageUpgradePrompts('review')

  const handleStartSession = () => {
    setSessionState("active")
    setSessionStats((prev) => ({ ...prev, total: mockCards.length }))
  }

  const handleCardGraded = (grade: "again" | "hard" | "good" | "easy") => {
    setSessionStats((prev) => ({
      ...prev,
      [grade]: prev[grade] + 1,
      correct: grade !== "again" ? prev.correct + 1 : prev.correct,
    }))

    if (currentCardIndex < mockCards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1)
    } else {
      setSessionState("complete")
    }
  }

  const handleUpgrade = () => {
    console.log("Upgrade clicked")
  }

  const resetSession = () => {
    setSessionState("start")
    setCurrentCardIndex(0)
    setSessionStats({
      total: 0,
      correct: 0,
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    })
  }

  return (
    <LayoutWrapper title="Review" onUpgrade={handleUpgrade}>
      <div className="space-y-6">
        {/* Upgrade Prompt - Show after completing sessions */}
        {sessionState === "complete" && upgradePrompts.isVisible && upgradePrompts.promptConfig && (
          <UpgradePrompt
            trigger={upgradePrompts.promptConfig.trigger}
            variant={upgradePrompts.promptConfig.variant}
            onUpgrade={upgradePrompts.onUpgrade}
            onDismiss={upgradePrompts.onDismiss}
            customMessage={upgradePrompts.promptConfig.customMessage}
            showBenefits={upgradePrompts.promptConfig.showBenefits}
            isDismissible={upgradePrompts.promptConfig.isDismissible}
          />
        )}

        {/* Review Flow */}
        {sessionState === "start" && <ReviewStart cardsDue={mockCards.length} onStartSession={handleStartSession} />}
        {sessionState === "active" && (
          <ReviewSession
            card={mockCards[currentCardIndex]}
            currentIndex={currentCardIndex}
            totalCards={mockCards.length}
            onGrade={handleCardGraded}
          />
        )}
        {sessionState === "complete" && <ReviewComplete stats={sessionStats} onNewSession={resetSession} />}
      </div>
    </LayoutWrapper>
  )
}

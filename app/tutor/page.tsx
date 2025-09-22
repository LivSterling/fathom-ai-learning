"use client"

// Force dynamic rendering for pages that use localStorage
export const dynamic = 'force-dynamic'

import { useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { TutorChat } from "@/components/tutor/tutor-chat"
import { ResourcePanel } from "@/components/tutor/resource-panel"
import { QuickCheckBar } from "@/components/tutor/quick-check-bar"
import { FlashcardSuggestDrawer } from "@/components/tutor/flashcard-suggest-drawer"

export default function TutorPage() {
  const [showFlashcardDrawer, setShowFlashcardDrawer] = useState(false)
  const [lessonComplete, setLessonComplete] = useState(false)

  const handleUpgrade = () => {
    console.log("Upgrade clicked")
  }

  const handleQuickCheckPass = () => {
    setLessonComplete(true)
    setShowFlashcardDrawer(true)
  }

  const handleQuickCheckFail = () => {
    console.log("Quick check failed - show remediation")
  }

  return (
    <LayoutWrapper title="AI Tutor" onUpgrade={handleUpgrade}>
      <div className="space-y-4 py-4">
        {/* Lesson Header */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">JavaScript Objects and Arrays</h2>
          <p className="text-sm text-muted-foreground">
            <strong>Objective:</strong> Learn to create, manipulate, and iterate through objects and arrays in
            JavaScript
          </p>
        </div>

        {/* Main Content Area */}
        <div className="space-y-4">
          {/* Chat Interface */}
          <TutorChat />

          {/* Resource Panel */}
          <ResourcePanel onAddToFlashcards={() => setShowFlashcardDrawer(true)} />

          {/* Quick Check */}
          {!lessonComplete && <QuickCheckBar onPass={handleQuickCheckPass} onFail={handleQuickCheckFail} />}

          {/* Lesson Complete State */}
          {lessonComplete && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-green-600 font-medium mb-2">🎉 Lesson Complete!</div>
              <p className="text-sm text-green-700 mb-3">
                Great job! You've mastered the basics of JavaScript objects and arrays.
              </p>
              <button onClick={() => setShowFlashcardDrawer(true)} className="text-sm text-green-600 underline">
                Review suggested flashcards
              </button>
            </div>
          )}
        </div>

        {/* Flashcard Suggestions Drawer */}
        <FlashcardSuggestDrawer isOpen={showFlashcardDrawer} onClose={() => setShowFlashcardDrawer(false)} />
      </div>
    </LayoutWrapper>
  )
}

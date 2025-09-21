"use client"

import { useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { WeakTagsList } from "@/components/dashboard/weak-tags-list"
import { NextLessonCard } from "@/components/dashboard/next-lesson-card"
import { EmptyDashboard } from "@/components/dashboard/empty-dashboard"
import { UpgradePrompt } from "@/components/guest/upgrade-prompt"
import { UpgradeModal } from "@/components/guest/upgrade-modal"
import { usePageUpgradePrompts } from "@/hooks/use-integrated-upgrade-prompts"
import { useGuestSession } from "@/hooks/use-guest-session"
import { mockStats } from "@/lib/mock-data"

export default function DashboardPage() {
  const [hasActivePlan, setHasActivePlan] = useState(true)
  const [showEmptyState, setShowEmptyState] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  const upgradePrompts = usePageUpgradePrompts('dashboard')
  const guestSession = useGuestSession()

  const handleUpgrade = () => {
    setShowUpgradeModal(true)
  }

  const handleUpgradeSuccess = (user: any) => {
    console.log('Upgrade successful:', user)
    // Refresh the page to show authenticated state
    window.location.reload()
  }

  // Get user name from guest session or fallback
  const userName = guestSession.session?.userData.name || 'there'

  if (showEmptyState) {
    return (
      <LayoutWrapper title="Home" onUpgrade={handleUpgrade}>
        <EmptyDashboard onGetStarted={() => setShowEmptyState(false)} />
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper title="Home" onUpgrade={handleUpgrade}>
      <div className="space-y-6 py-4">
        {/* Upgrade Prompt */}
        {upgradePrompts.isVisible && upgradePrompts.promptConfig && (
          <UpgradePrompt
            trigger={upgradePrompts.promptConfig.trigger}
            variant={upgradePrompts.promptConfig.variant}
            onUpgrade={handleUpgrade}
            onDismiss={upgradePrompts.onDismiss}
            customMessage={upgradePrompts.promptConfig.customMessage}
            showBenefits={upgradePrompts.promptConfig.showBenefits}
            isDismissible={upgradePrompts.promptConfig.isDismissible}
          />
        )}

        {/* Welcome Message */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground">Welcome back, {userName}!</h2>
          <p className="text-muted-foreground">Ready to continue your learning journey?</p>
        </div>

        {/* Stats Cards */}
        <DashboardStats stats={mockStats} />

        {/* Quick Actions */}
        <QuickActions />

        {/* Next Lesson */}
        {hasActivePlan && <NextLessonCard />}

        {/* Weak Tags */}
        <WeakTagsList tags={mockStats.weakestTags} />

        {/* Debug Toggle */}
        <div className="pt-4 border-t border-border">
          <button
            onClick={() => setShowEmptyState(!showEmptyState)}
            className="text-xs text-muted-foreground underline"
          >
            Toggle Empty State (Debug)
          </button>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={handleUpgradeSuccess}
        trigger="dashboard"
      />
    </LayoutWrapper>
  )
}

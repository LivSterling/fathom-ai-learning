"use client"

import { useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { WeakTagsList } from "@/components/dashboard/weak-tags-list"
import { NextLessonCard } from "@/components/dashboard/next-lesson-card"
import { EmptyDashboard } from "@/components/dashboard/empty-dashboard"
import { UpgradeModal } from "@/components/auth/upgrade-modal"
import { useAuth } from "@/lib/auth/auth-context"
import { mockStats, mockUser } from "@/lib/mock-data"

export default function DashboardPage() {
  const [hasActivePlan, setHasActivePlan] = useState(true)
  const [showEmptyState, setShowEmptyState] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const { user, isGuest } = useAuth()

  const handleUpgrade = () => {
    setShowUpgradeModal(true)
  }

  const handleUpgradeSuccess = () => {
    // Refresh the page or update state as needed
    console.log("Upgrade successful!")
  }

  if (showEmptyState) {
    return (
      <LayoutWrapper title="Home" onUpgrade={handleUpgrade}>
        <EmptyDashboard onGetStarted={() => setShowEmptyState(false)} />
      </LayoutWrapper>
    )
  }

  return (
    <>
      <LayoutWrapper title="Home" onUpgrade={handleUpgrade}>
        <div className="space-y-6 py-4">
          {/* Welcome Message */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-foreground">
              Welcome back, {isGuest ? 'Guest' : user?.email || mockUser.name}!
            </h2>
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
      </LayoutWrapper>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={handleUpgradeSuccess}
      />
    </>
  )
}

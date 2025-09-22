"use client"

// Force dynamic rendering for pages that use localStorage
export const dynamic = 'force-dynamic'

import { useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { MoreSettings } from "@/components/more/more-settings"
import { UpgradeModal } from "@/components/guest/upgrade-modal"

export default function MorePage() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const handleUpgrade = () => {
    setShowUpgradeModal(true)
  }

  const handleUpgradeSuccess = (user: any) => {
    console.log('Upgrade successful:', user)
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <>
      <LayoutWrapper title="More" onUpgrade={handleUpgrade}>
        <MoreSettings onUpgrade={handleUpgrade} />
      </LayoutWrapper>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={handleUpgradeSuccess}
        trigger="more-page"
      />
    </>
  )
}

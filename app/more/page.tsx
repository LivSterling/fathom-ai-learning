"use client"

import { LayoutWrapper } from "@/components/layout-wrapper"
import { MoreSettings } from "@/components/more/more-settings"

export default function MorePage() {
  const handleUpgrade = () => {
    console.log("Upgrade clicked")
  }

  return (
    <LayoutWrapper title="More" onUpgrade={handleUpgrade}>
      <MoreSettings />
    </LayoutWrapper>
  )
}

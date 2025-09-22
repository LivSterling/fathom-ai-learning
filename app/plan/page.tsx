"use client"

// Force dynamic rendering for pages that use localStorage
export const dynamic = 'force-dynamic'

import { useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"

export default function PlanPage() {
  const [step, setStep] = useState<"wizard" | "proposed" | "editor">("wizard")

  const handleUpgrade = () => {
    console.log("Upgrade clicked")
  }

  return (
    <LayoutWrapper title="Learning Plan" onUpgrade={handleUpgrade}>
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Learning Plan</h2>
          <p className="text-muted-foreground">
            Plan creation will be available after fixing the build issues.
          </p>
        </div>
      </div>
    </LayoutWrapper>
  )
}

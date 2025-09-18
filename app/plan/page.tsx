"use client"

import { useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { PlanWizard } from "@/components/plan/plan-wizard"
import { ProposedPlan } from "@/components/plan/proposed-plan"
import { PlanEditor } from "@/components/plan/plan-editor"

export default function PlanPage() {
  const [step, setStep] = useState<"wizard" | "proposed" | "editor">("wizard")
  const [planData, setPlanData] = useState<any>(null)

  const handleWizardComplete = (data: any) => {
    setPlanData(data)
    setStep("proposed")
  }

  const handleEditPlan = () => {
    setStep("editor")
  }

  const handlePublishPlan = () => {
    console.log("Plan published:", planData)
    // TODO: Save to Supabase and redirect to dashboard
  }

  const handleUpgrade = () => {
    console.log("Upgrade clicked")
  }

  return (
    <LayoutWrapper title="Learning Plan" onUpgrade={handleUpgrade}>
      {step === "wizard" && <PlanWizard onComplete={handleWizardComplete} />}
      {step === "proposed" && (
        <ProposedPlan planData={planData} onEdit={handleEditPlan} onPublish={handlePublishPlan} />
      )}
      {step === "editor" && <PlanEditor planData={planData} onSave={setPlanData} onPublish={handlePublishPlan} />}
    </LayoutWrapper>
  )
}

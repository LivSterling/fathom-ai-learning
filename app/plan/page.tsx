"use client"

import { useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { PlanWizard } from "@/components/plan/plan-wizard"
import { ProposedPlan } from "@/components/plan/proposed-plan"
import { PlanEditor } from "@/components/plan/plan-editor"
import { UpgradePrompt } from "@/components/guest/upgrade-prompt"
import { usePageUpgradePrompts } from "@/hooks/use-integrated-upgrade-prompts"

export default function PlanPage() {
  const [step, setStep] = useState<"wizard" | "proposed" | "editor">("wizard")
  const [planData, setPlanData] = useState<any>(null)
  const upgradePrompts = usePageUpgradePrompts('plan')

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
      <div className="space-y-6">
        {/* Upgrade Prompt */}
        {upgradePrompts.isVisible && upgradePrompts.promptConfig && (
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

        {/* Plan Creation Steps */}
        {step === "wizard" && <PlanWizard onComplete={handleWizardComplete} onUpgradeClick={upgradePrompts.onUpgrade} />}
        {step === "proposed" && (
          <ProposedPlan planData={planData} onEdit={handleEditPlan} onPublish={handlePublishPlan} />
        )}
        {step === "editor" && <PlanEditor planData={planData} onSave={setPlanData} onPublish={handlePublishPlan} />}
      </div>
    </LayoutWrapper>
  )
}

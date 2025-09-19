"use client"

import { useState, useEffect } from "react"
import { OnboardingStart } from "@/components/onboarding/onboarding-start"
import { OnboardingDomains } from "@/components/onboarding/onboarding-domains"
import { OnboardingChoice } from "@/components/onboarding/onboarding-choice"
import { OnboardingProposedPlan } from "@/components/onboarding/onboarding-proposed-plan"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { useGuestMode } from "@/hooks/use-guest-mode"

export default function HomePage() {
  const [step, setStep] = useState<"start" | "concept" | "setup" | "proposed">("start")
  const [concept, setConcept] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | undefined>()
  const [pastedUrl, setPastedUrl] = useState<string | undefined>()
  const [planConfig, setPlanConfig] = useState<any>(null)
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { initializeGuestMode } = useGuestMode()

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (!isLoading && user && !user.user_metadata?.is_guest) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  const handleStartAsGuest = async () => {
    await initializeGuestMode()
    setStep("concept")
  }

  const handleSignIn = () => {
    // TODO: Implement sign in with Supabase
    console.log("Sign in clicked")
  }

  const handleConceptSubmitted = (conceptText: string, file?: File, url?: string) => {
    setConcept(conceptText)
    setUploadedFile(file)
    setPastedUrl(url)
    setStep("setup")
  }

  const handlePlanSetup = (config: any) => {
    setPlanConfig(config)
    setStep("proposed")
  }

  const handleEditPlan = () => {
    router.push("/plan")
  }

  const handlePublishPlan = () => {
    // TODO: Save plan and redirect to dashboard
    router.push("/dashboard")
  }

  const handleJumpToSession = () => {
    router.push("/tutor")
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (step === "start") {
    return <OnboardingStart onStartAsGuest={handleStartAsGuest} onSignIn={handleSignIn} />
  }

  if (step === "concept") {
    return <OnboardingDomains onConceptSubmitted={handleConceptSubmitted} />
  }

  if (step === "setup") {
    return (
      <OnboardingChoice
        concept={concept}
        uploadedFile={uploadedFile}
        pastedUrl={pastedUrl}
        onPlanSetup={handlePlanSetup}
      />
    )
  }

  if (step === "proposed") {
    return (
      <OnboardingProposedPlan
        planConfig={planConfig}
        onEdit={handleEditPlan}
        onPublish={handlePublishPlan}
        onJumpToSession={handleJumpToSession}
      />
    )
  }

  return null
}

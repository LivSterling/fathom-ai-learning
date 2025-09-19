"use client"

import type { ReactNode } from "react"
import { AppHeader } from "./app-header"
import { GuestBanner } from "./guest-banner"
import { MobileNav } from "./mobile-nav"
import { useAuth } from "@/lib/auth/auth-context"

interface LayoutWrapperProps {
  children: ReactNode
  title?: string
  showGuestBanner?: boolean
  onUpgrade?: () => void
}

export function LayoutWrapper({ children, title, showGuestBanner = true, onUpgrade }: LayoutWrapperProps) {
  const { isGuest } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      {showGuestBanner && isGuest && <GuestBanner onUpgrade={onUpgrade} />}
      <AppHeader title={title} />
      <main className="pb-20 px-4">{children}</main>
      <MobileNav />
    </div>
  )
}

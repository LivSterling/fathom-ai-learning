"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useAuth } from "@/lib/auth/auth-context"

interface GuestBannerProps {
  onUpgrade?: () => void
}

export function GuestBanner({ onUpgrade }: GuestBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const { isGuest, isLoading } = useAuth()

  // Don't show banner if user is authenticated or still loading
  if (!isVisible || !isGuest || isLoading) return null

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-primary">Guest Mode</span>
          <span className="text-sm text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">Save progress</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent" onClick={onUpgrade}>
            Upgrade
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setIsVisible(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

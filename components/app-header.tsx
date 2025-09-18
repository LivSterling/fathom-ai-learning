"use client"

interface AppHeaderProps {
  title?: string
  showGuestBanner?: boolean
  onUpgrade?: () => void
}

export function AppHeader({ title = "Fathom", showGuestBanner = false, onUpgrade }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="flex items-center justify-center py-4 px-4">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>
    </header>
  )
}

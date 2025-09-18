"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, BookOpen, RotateCcw, MessageSquare, Library, MoreHorizontal } from "lucide-react"

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/plan", label: "Plan", icon: BookOpen },
  { href: "/review", label: "Review", icon: RotateCcw },
  { href: "/tutor", label: "Tutor", icon: MessageSquare },
  { href: "/library", label: "Library", icon: Library },
  { href: "/more", label: "More", icon: MoreHorizontal },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

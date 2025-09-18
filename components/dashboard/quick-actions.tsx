"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RotateCcw, BookOpen, MessageSquare, Upload } from "lucide-react"
import { useRouter } from "next/navigation"

export function QuickActions() {
  const router = useRouter()

  const actions = [
    {
      icon: RotateCcw,
      label: "Review Now",
      description: "Start spaced repetition",
      onClick: () => router.push("/review"),
      variant: "default" as const,
    },
    {
      icon: BookOpen,
      label: "Continue Lesson",
      description: "Resume learning",
      onClick: () => router.push("/tutor"),
      variant: "outline" as const,
    },
    {
      icon: MessageSquare,
      label: "Build a Plan",
      description: "Create curriculum",
      onClick: () => router.push("/plan"),
      variant: "outline" as const,
    },
    {
      icon: Upload,
      label: "Upload Material",
      description: "Add your content",
      onClick: () => router.push("/library"),
      variant: "outline" as const,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <Button
              key={index}
              variant={action.variant}
              className="w-full justify-start h-auto p-4"
              onClick={action.onClick}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </div>
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}

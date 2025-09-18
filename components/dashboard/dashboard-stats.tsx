"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Clock, Flame, Target } from "lucide-react"

interface DashboardStatsProps {
  stats: {
    cardsDue: number
    studyMinutes: number
    streak: number
    weakestTags: string[]
  }
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statCards = [
    {
      icon: Target,
      label: "Cards Due",
      value: stats.cardsDue,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: Clock,
      label: "Study Minutes",
      value: stats.studyMinutes,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      icon: Flame,
      label: "Day Streak",
      value: stats.streak,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="bg-card">
            <CardContent className="p-4 text-center">
              <div className={`inline-flex p-2 rounded-lg ${stat.bgColor} mb-2`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

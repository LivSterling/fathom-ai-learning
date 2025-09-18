"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { PlayCircle, Clock } from "lucide-react"
import { useRouter } from "next/navigation"

export function NextLessonCard() {
  const router = useRouter()

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-primary" />
          Continue Learning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium text-foreground">JavaScript Fundamentals</h3>
          <p className="text-sm text-muted-foreground">Objects and Arrays</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Module Progress</span>
            <span className="text-foreground font-medium">2 of 3 lessons</span>
          </div>
          <Progress value={67} className="h-2" />
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>15 min</span>
          </div>
        </div>

        <Button onClick={() => router.push("/tutor")} className="w-full">
          Continue Lesson
        </Button>
      </CardContent>
    </Card>
  )
}

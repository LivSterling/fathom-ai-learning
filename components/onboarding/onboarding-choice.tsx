"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Clock, Calendar, TrendingUp, BookOpen } from "lucide-react"

interface OnboardingChoiceProps {
  concept: string
  uploadedFile?: File
  pastedUrl?: string
  onPlanSetup: (planConfig: PlanConfig) => void
}

interface PlanConfig {
  concept: string
  minutesPerDay: number
  weeks: number
  level: string
  format: string
  uploadedFile?: File
  pastedUrl?: string
}

export function OnboardingChoice({ concept, uploadedFile, pastedUrl, onPlanSetup }: OnboardingChoiceProps) {
  const [minutesPerDay, setMinutesPerDay] = useState(30)
  const [weeks, setWeeks] = useState(4)
  const [level, setLevel] = useState("")
  const [format, setFormat] = useState("")

  const handleSubmit = () => {
    if (level && format) {
      onPlanSetup({
        concept,
        minutesPerDay,
        weeks,
        level,
        format,
        uploadedFile,
        pastedUrl,
      })
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col p-4">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-semibold">Plan Setup</h1>
      </div>

      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Learning Topic
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium mb-2">{concept}</p>
            {uploadedFile && (
              <Badge variant="secondary" className="mr-2">
                PDF: {uploadedFile.name}
              </Badge>
            )}
            {pastedUrl && (
              <Badge variant="secondary">
                URL: {pastedUrl.length > 30 ? pastedUrl.substring(0, 30) + "..." : pastedUrl}
              </Badge>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Minutes per day slider */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Minutes per day: {minutesPerDay}
            </Label>
            <div className="px-2">
              <input
                type="range"
                min="15"
                max="120"
                step="15"
                value={minutesPerDay}
                onChange={(e) => setMinutesPerDay(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>15 min</span>
                <span>60 min</span>
                <span>120 min</span>
              </div>
            </div>
          </div>

          {/* Weeks stepper */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Duration (weeks)
            </Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeeks(Math.max(1, weeks - 1))}
                disabled={weeks <= 1}
              >
                -
              </Button>
              <span className="font-medium text-lg w-8 text-center">{weeks}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeeks(Math.min(12, weeks + 1))}
                disabled={weeks >= 12}
              >
                +
              </Button>
            </div>
          </div>

          {/* Level selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Your level
            </Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select your current level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="intro">Intro - I'm new to this topic</SelectItem>
                <SelectItem value="intermediate">Intermediate - I have some knowledge</SelectItem>
                <SelectItem value="advanced">Advanced - I want to deepen my expertise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Format preference */}
          <div className="space-y-3">
            <Label>Preferred learning format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue placeholder="How do you like to learn?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video - Visual demonstrations and lectures</SelectItem>
                <SelectItem value="docs">Documentation - Articles and written guides</SelectItem>
                <SelectItem value="mixed">Mixed - Combination of videos and articles</SelectItem>
                <SelectItem value="interactive">Interactive - Hands-on exercises and tutorials</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="pt-6">
        <Button onClick={handleSubmit} disabled={!level || !format} className="w-full" size="lg">
          Create Learning Plan
        </Button>
      </div>
    </div>
  )
}

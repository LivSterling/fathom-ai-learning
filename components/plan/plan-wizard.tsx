"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface PlanWizardProps {
  onComplete: (data: any) => void
}

const formats = ["Videos", "Articles", "Interactive", "Books", "Podcasts"]
const levels = ["Beginner", "Intermediate", "Advanced"]

export function PlanWizard({ onComplete }: PlanWizardProps) {
  const [formData, setFormData] = useState({
    goal: "",
    timeframe: "",
    minutesPerDay: "",
    level: "",
    preferredFormats: [] as string[],
  })

  const toggleFormat = (format: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredFormats: prev.preferredFormats.includes(format)
        ? prev.preferredFormats.filter((f) => f !== format)
        : [...prev.preferredFormats, format],
    }))
  }

  const handleSubmit = () => {
    if (formData.goal && formData.timeframe && formData.minutesPerDay && formData.level) {
      onComplete(formData)
    }
  }

  const isComplete =
    formData.goal &&
    formData.timeframe &&
    formData.minutesPerDay &&
    formData.level &&
    formData.preferredFormats.length > 0

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Create Your Learning Plan</h2>
        <p className="text-muted-foreground">Tell us about your goals and we'll create a personalized curriculum.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Learning Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal">What do you want to learn?</Label>
            <Textarea
              id="goal"
              placeholder="e.g., Master React development, Learn data structures and algorithms..."
              value={formData.goal}
              onChange={(e) => setFormData((prev) => ({ ...prev, goal: e.target.value }))}
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select onValueChange={(value) => setFormData((prev) => ({ ...prev, timeframe: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2-weeks">2 weeks</SelectItem>
                  <SelectItem value="1-month">1 month</SelectItem>
                  <SelectItem value="3-months">3 months</SelectItem>
                  <SelectItem value="6-months">6 months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minutes">Minutes per day</Label>
              <Select onValueChange={(value) => setFormData((prev) => ({ ...prev, minutesPerDay: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Current Level</Label>
            <div className="flex gap-2">
              {levels.map((level) => (
                <Button
                  key={level}
                  variant={formData.level === level ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormData((prev) => ({ ...prev, level }))}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred Learning Formats</Label>
            <div className="flex flex-wrap gap-2">
              {formats.map((format) => (
                <Badge
                  key={format}
                  variant={formData.preferredFormats.includes(format) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleFormat(format)}
                >
                  {format}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={!isComplete} className="w-full" size="lg">
        Generate Learning Plan
      </Button>
    </div>
  )
}

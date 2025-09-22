"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Clock, Calendar, TrendingUp, BookOpen } from "lucide-react"
import { useConceptIntakeAnalytics } from "@/hooks/use-concept-intake-analytics"

interface OnboardingChoiceProps {
  concept: string
  uploadedFile?: File
  pastedUrl?: string
  onPlanSetup: (planConfig: PlanConfigWithPlan) => void
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

interface PlanConfigWithPlan extends PlanConfig {
  learningPlan?: any
  processedFile?: {
    fileName: string
    wordCount: number
    pageCount?: number
  }
  processedUrl?: {
    url: string
    title: string
    contentType: string
    domain: string
  }
}

export function OnboardingChoice({ concept, uploadedFile, pastedUrl, onPlanSetup }: OnboardingChoiceProps) {
  const { trackAPICall } = useConceptIntakeAnalytics()
  
  const [minutesPerDay, setMinutesPerDay] = useState(30)
  const [weeks, setWeeks] = useState(4)
  const [level, setLevel] = useState("")
  const [format, setFormat] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!level || !format) return
    
    setIsGenerating(true)
    setError(null)
    
    try {
      // Prepare the request body
      const requestBody: any = {
        concept,
        planConfig: {
          minutesPerDay,
          weeks,
          level,
          format
        }
      }
      
      // Add uploaded file if present
      if (uploadedFile) {
        const fileContent = await fileToBase64(uploadedFile)
        requestBody.uploadedFile = {
          name: uploadedFile.name,
          size: uploadedFile.size,
          type: uploadedFile.type,
          content: fileContent
        }
      }
      
      // Add pasted URL if present
      if (pastedUrl) {
        requestBody.pastedUrl = pastedUrl
      }
      
      // Call the concept processing API with analytics tracking
      const data = await trackAPICall(async () => {
        const response = await fetch('/api/concept/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error?.message || 'Failed to generate learning plan')
        }
        
        return response.json()
      }, '/api/concept/process', 'POST')
      
      // Pass the complete plan configuration with generated learning plan
      onPlanSetup({
        concept,
        minutesPerDay,
        weeks,
        level,
        format,
        uploadedFile,
        pastedUrl,
        learningPlan: data.data.learningPlan,
        processedFile: data.data.processedFile,
        processedUrl: data.data.processedUrl,
      })
      
    } catch (err) {
      console.error('Error generating learning plan:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate learning plan')
    } finally {
      setIsGenerating(false)
    }
  }
  
  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
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

      <div className="pt-6 space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        
        <Button 
          onClick={handleSubmit} 
          disabled={!level || !format || isGenerating} 
          className="w-full" 
          size="lg"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Generating Learning Plan...
            </>
          ) : (
            'Create Learning Plan'
          )}
        </Button>
      </div>
    </div>
  )
}

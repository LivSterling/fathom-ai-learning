"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { FileText, Brain, Sparkles } from "lucide-react"

export function UploadProcessing() {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Processing Your Materials</h2>
        <p className="text-muted-foreground">AI is analyzing your content and generating flashcards</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Processing Steps */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Extracting text content</p>
                <p className="text-sm text-muted-foreground">Reading and parsing your documents</p>
              </div>
              <div className="text-green-600 text-sm">✓ Complete</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center animate-pulse">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Analyzing key concepts</p>
                <p className="text-sm text-muted-foreground">Identifying important topics and definitions</p>
              </div>
              <div className="text-primary text-sm">Processing...</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-muted-foreground">Generating flashcards</p>
                <p className="text-sm text-muted-foreground">Creating study materials from your content</p>
              </div>
              <div className="text-muted-foreground text-sm">Waiting...</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="text-foreground font-medium">65%</span>
            </div>
            <Progress value={65} className="h-2" />
          </div>

          {/* Estimated Time */}
          <div className="text-center text-sm text-muted-foreground">
            <p>Estimated time remaining: 30 seconds</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

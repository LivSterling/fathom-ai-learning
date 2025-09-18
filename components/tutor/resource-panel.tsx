"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Plus, Clock, BookOpen } from "lucide-react"

interface ResourcePanelProps {
  onAddToFlashcards: () => void
}

const mockResources = [
  {
    id: "1",
    title: "JavaScript Objects - MDN Guide",
    source: "MDN Web Docs",
    type: "Article",
    duration: "15 min",
    difficulty: "Beginner",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects",
  },
  {
    id: "2",
    title: "Array Methods Deep Dive",
    source: "JavaScript.info",
    type: "Interactive",
    duration: "25 min",
    difficulty: "Intermediate",
    url: "https://javascript.info/array-methods",
  },
]

export function ResourcePanel({ onAddToFlashcards }: ResourcePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Learning Resources
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onAddToFlashcards}>
            <Plus className="w-4 h-4 mr-2" />
            Add to Flashcards
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {mockResources.map((resource) => (
          <div key={resource.id} className="border border-border rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-foreground">{resource.title}</h4>
                <p className="text-sm text-muted-foreground">{resource.source}</p>
              </div>
              <Button variant="ghost" size="sm" className="p-1">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs">
                {resource.type}
              </Badge>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{resource.duration}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {resource.difficulty}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

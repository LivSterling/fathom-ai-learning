"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingDown } from "lucide-react"

interface WeakTagsListProps {
  tags: string[]
}

export function WeakTagsList({ tags }: WeakTagsListProps) {
  if (tags.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-orange-500" />
          Areas to Focus On
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Badge key={index} variant="outline" className="text-orange-600 border-orange-200">
              {tag}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          These topics need more practice. Consider reviewing related flashcards.
        </p>
      </CardContent>
    </Card>
  )
}

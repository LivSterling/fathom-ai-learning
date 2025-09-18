"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Plus, Eye, Trash2, Calendar } from "lucide-react"

const mockMaterials = [
  {
    id: "1",
    title: "JavaScript Fundamentals.pdf",
    type: "PDF",
    size: "2.4 MB",
    uploadDate: "2024-01-15",
    keyPoints: ["Closures", "Scope", "Hoisting", "Event Loop"],
    proposedCards: 12,
    status: "processed",
  },
  {
    id: "2",
    title: "React Components Guide.docx",
    type: "Document",
    size: "1.8 MB",
    uploadDate: "2024-01-14",
    keyPoints: ["JSX", "Props", "State", "Lifecycle"],
    proposedCards: 8,
    status: "processed",
  },
  {
    id: "3",
    title: "Algorithm Notes.txt",
    type: "Text",
    size: "156 KB",
    uploadDate: "2024-01-13",
    keyPoints: ["Big O", "Sorting", "Binary Search", "Recursion"],
    proposedCards: 15,
    status: "processed",
  },
]

export function MaterialsList() {
  const [materials, setMaterials] = useState(mockMaterials)
  const [expandedMaterial, setExpandedMaterial] = useState<string | null>(null)

  const handleViewCards = (materialId: string) => {
    console.log("View proposed cards for:", materialId)
    // TODO: Show flashcard suggestions drawer
  }

  const handleAddCards = (materialId: string) => {
    console.log("Add cards from:", materialId)
    // TODO: Add cards to deck
  }

  const handleDelete = (materialId: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== materialId))
  }

  const toggleExpanded = (materialId: string) => {
    setExpandedMaterial(expandedMaterial === materialId ? null : materialId)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground">Your Materials ({materials.length})</h3>
      </div>

      <div className="space-y-3">
        {materials.map((material) => {
          const isExpanded = expandedMaterial === material.id
          return (
            <Card key={material.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{material.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {material.type}
                        </Badge>
                        <span>{material.size}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{material.uploadDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => toggleExpanded(material.id)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(material.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  {/* Key Points */}
                  <div>
                    <h4 className="font-medium mb-2">Key Points Extracted</h4>
                    <div className="flex flex-wrap gap-1">
                      {material.keyPoints.map((point) => (
                        <Badge key={point} variant="secondary" className="text-xs">
                          {point}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Proposed Cards */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Proposed Flashcards</h4>
                      <Badge variant="outline">{material.proposedCards} cards</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      AI has generated {material.proposedCards} flashcards from this material.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewCards(material.id)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Review Cards
                      </Button>
                      <Button size="sm" onClick={() => handleAddCards(material.id)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add to Deck
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Check } from "lucide-react"

interface FlashcardSuggestDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const suggestedCards = [
  {
    id: "1",
    type: "Definition",
    front: "What is a JavaScript object?",
    back: "A collection of key-value pairs where keys are strings and values can be any data type",
    tags: ["JavaScript", "Objects"],
  },
  {
    id: "2",
    type: "Contrast",
    front: "Difference between array.push() and array.unshift()",
    back: "push() adds elements to the end of array, unshift() adds elements to the beginning",
    tags: ["JavaScript", "Arrays", "Methods"],
  },
  {
    id: "3",
    type: "Why/When",
    front: "When should you use bracket notation vs dot notation for object properties?",
    back: "Use bracket notation when property names contain spaces, start with numbers, or are stored in variables",
    tags: ["JavaScript", "Objects", "Syntax"],
  },
  {
    id: "4",
    type: "Steps",
    front: "How to iterate through an array using forEach?",
    back: "1. Call array.forEach() 2. Pass callback function 3. Callback receives (element, index, array) parameters",
    tags: ["JavaScript", "Arrays", "Iteration"],
  },
]

export function FlashcardSuggestDrawer({ isOpen, onClose }: FlashcardSuggestDrawerProps) {
  const [selectedCards, setSelectedCards] = useState<string[]>([])

  if (!isOpen) return null

  const toggleCard = (cardId: string) => {
    setSelectedCards((prev) => (prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]))
  }

  const handleAddSelected = () => {
    console.log("Adding cards:", selectedCards)
    // TODO: Add to Supabase flashcard deck
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-background w-full max-h-[80vh] rounded-t-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Suggested Flashcards</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            AI-generated cards based on this lesson. Select the ones you'd like to add to your deck.
          </p>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
          {suggestedCards.map((card) => {
            const isSelected = selectedCards.includes(card.id)
            return (
              <Card
                key={card.id}
                className={`cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:shadow-md"
                }`}
                onClick={() => toggleCard(card.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {card.type}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCard(card.id)
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Front:</p>
                      <p className="text-sm text-muted-foreground">{card.front}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Back:</p>
                      <p className="text-sm text-muted-foreground">{card.back}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {card.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleAddSelected} disabled={selectedCards.length === 0} className="flex-1">
              Add Selected ({selectedCards.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

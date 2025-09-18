"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, Link } from "lucide-react"

interface OnboardingDomainsProps {
  onConceptSubmitted: (concept: string, uploadedFile?: File, pastedUrl?: string) => void
}

const suggestionChips = [
  { id: "software-engineering", label: "Software Engineering", example: "React useEffect hooks and lifecycle" },
  { id: "nursing", label: "Nursing", example: "Cardiac physiology basics and assessment" },
  { id: "language", label: "Language", example: "Spanish subjunctive mood and usage" },
]

export function OnboardingDomains({ onConceptSubmitted }: OnboardingDomainsProps) {
  const [concept, setConcept] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [pastedUrl, setPastedUrl] = useState("")
  const [showMaterialOptions, setShowMaterialOptions] = useState(false)

  const handleSuggestionClick = (example: string) => {
    setConcept(example)
  }

  const handleContinue = () => {
    if (concept.trim()) {
      onConceptSubmitted(concept.trim(), uploadedFile || undefined, pastedUrl || undefined)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col p-4">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-semibold">What do you want to learn?</h1>
      </div>

      <div className="flex-1 space-y-6">
        <div className="space-y-3">
          <Input
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="React useEffect, cardiac physiology basics, Spanish subjunctive, statistics for product..."
            className="text-lg h-14 px-4"
            autoFocus
          />

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Quick suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestionChips.map((chip) => (
                <Badge
                  key={chip.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10 px-3 py-1"
                  onClick={() => handleSuggestionClick(chip.example)}
                >
                  {chip.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setShowMaterialOptions(!showMaterialOptions)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Or paste a link / upload a PDF to build from your material
          </button>

          {showMaterialOptions && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              {/* URL input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Paste a URL</label>
                <div className="flex gap-2">
                  <Link className="w-4 h-4 mt-3 text-muted-foreground" />
                  <Input
                    value={pastedUrl}
                    onChange={(e) => setPastedUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* File upload dropzone */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload a PDF</label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {uploadedFile ? uploadedFile.name : "Drop a PDF here or click to browse"}
                  </p>
                  <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" id="file-upload" />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById("file-upload")?.click()}>
                    Choose File
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-6">
        <Button onClick={handleContinue} disabled={!concept.trim()} className="w-full" size="lg">
          Continue
        </Button>
      </div>
    </div>
  )
}

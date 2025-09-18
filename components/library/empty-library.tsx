"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileText, Brain, Sparkles } from "lucide-react"

interface EmptyLibraryProps {
  onUpload: (files: File[]) => void
}

export function EmptyLibrary({ onUpload }: EmptyLibraryProps) {
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onUpload(files)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center py-4">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
        <Upload className="w-8 h-8 text-primary" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Upload Your Materials</h2>
        <p className="text-muted-foreground text-balance max-w-md">
          Transform your documents, notes, and resources into interactive flashcards with AI
        </p>
      </div>

      {/* Features */}
      <div className="w-full max-w-md space-y-3">
        <Card className="p-4">
          <CardContent className="p-0 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium">Smart Extraction</p>
              <p className="text-sm text-muted-foreground">Key concepts from PDFs, docs, and notes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardContent className="p-0 flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Brain className="w-5 h-5 text-secondary" />
            </div>
            <div className="text-left">
              <p className="font-medium">AI-Generated Cards</p>
              <p className="text-sm text-muted-foreground">Automatic flashcard creation</p>
            </div>
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardContent className="p-0 flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-medium">Smart Search</p>
              <p className="text-sm text-muted-foreground">Find information across all materials</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full max-w-sm">
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
          onChange={handleFileSelect}
          className="hidden"
          id="empty-file-upload"
        />
        <Button asChild className="w-full" size="lg">
          <label htmlFor="empty-file-upload" className="cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Upload Your First Material
          </label>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Supports PDF, DOC, TXT, and image files</p>
    </div>
  )
}

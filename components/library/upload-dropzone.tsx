"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText, File } from "lucide-react"
import { ImageIcon } from "lucide-react"

interface UploadDropzoneProps {
  onUpload: (files: File[]) => void
}

export function UploadDropzone({ onUpload }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        onUpload(files)
      }
    },
    [onUpload],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length > 0) {
        onUpload(files)
      }
    },
    [onUpload],
  )

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return FileText
    if (type.includes("image")) return ImageIcon
    return File
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6 text-primary" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium text-foreground">Upload Learning Materials</h3>
              <p className="text-sm text-muted-foreground">Drag and drop files here, or click to browse</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                PDF
              </span>
              <span className="flex items-center gap-1">
                <File className="w-3 h-3" />
                DOC
              </span>
              <span className="flex items-center gap-1">
                <File className="w-3 h-3" />
                TXT
              </span>
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                Images
              </span>
            </div>

            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <Button asChild variant="outline" className="bg-transparent">
              <label htmlFor="file-upload" className="cursor-pointer">
                Choose Files
              </label>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

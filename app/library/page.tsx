"use client"

import { useState } from "react"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { UploadDropzone } from "@/components/library/upload-dropzone"
import { MaterialsList } from "@/components/library/materials-list"
import { SearchMaterials } from "@/components/library/search-materials"
import { EmptyLibrary } from "@/components/library/empty-library"
import { UploadProcessing } from "@/components/library/upload-processing"

export default function LibraryPage() {
  const [uploadState, setUploadState] = useState<"idle" | "processing" | "complete">("idle")
  const [hasMaterials, setHasMaterials] = useState(false)
  const [showEmptyState, setShowEmptyState] = useState(true)

  const handleFileUpload = (files: File[]) => {
    setUploadState("processing")
    // Simulate processing
    setTimeout(() => {
      setUploadState("complete")
      setHasMaterials(true)
      setShowEmptyState(false)
    }, 3000)
  }

  const handleUpgrade = () => {
    console.log("Upgrade clicked")
  }

  if (uploadState === "processing") {
    return (
      <LayoutWrapper title="Library" onUpgrade={handleUpgrade}>
        <UploadProcessing />
      </LayoutWrapper>
    )
  }

  if (showEmptyState && !hasMaterials) {
    return (
      <LayoutWrapper title="Library" onUpgrade={handleUpgrade}>
        <EmptyLibrary onUpload={handleFileUpload} />
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper title="Library" onUpgrade={handleUpgrade}>
      <div className="space-y-6 py-4">
        {/* Upload Section */}
        <UploadDropzone onUpload={handleFileUpload} />

        {/* Search */}
        <SearchMaterials />

        {/* Materials List */}
        <MaterialsList />

        {/* Debug Toggle */}
        <div className="pt-4 border-t border-border">
          <button
            onClick={() => setShowEmptyState(!showEmptyState)}
            className="text-xs text-muted-foreground underline"
          >
            Toggle Empty State (Debug)
          </button>
        </div>
      </div>
    </LayoutWrapper>
  )
}

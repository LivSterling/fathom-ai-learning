"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, Link, Loader2, Clock, Calendar, TrendingUp, BookOpen, AlertCircle, CheckCircle, Info } from "lucide-react"
import { ConceptChips, defaultConceptCategories, type ConceptExample } from "@/components/ui/concept-chips"
import { useConceptIntakeAnalytics, useConceptInputTracking, useFileUploadTracking, useDropOffTracking } from "@/hooks/use-concept-intake-analytics"

interface OnboardingConceptIntakeProps {
  onConceptSubmitted: (concept: string, uploadedFile?: File, pastedUrl?: string, planConfig?: PlanConfig) => void
  onBack?: () => void
}

interface PlanConfig {
  minutesPerDay: number
  weeks: number
  level: string
  format: string
}

interface ProcessingState {
  isLoading: boolean
  error: string | null
  progress?: string
  type?: 'info' | 'success' | 'warning' | 'error'
  step?: number
  totalSteps?: number
}

const suggestionChips = [
  { id: "software-engineering", label: "Software Engineering", example: "React useEffect hooks and lifecycle management" },
  { id: "nursing", label: "Nursing", example: "Cardiac physiology basics and assessment techniques" },
  { id: "language", label: "Language Learning", example: "Spanish subjunctive mood and usage patterns" },
  { id: "data-science", label: "Data Science", example: "Statistics for product managers and A/B testing" },
  { id: "business", label: "Business", example: "Financial modeling and valuation methods" },
  { id: "science", label: "Science", example: "Organic chemistry reaction mechanisms" },
]

// Dynamic placeholder examples that rotate to show variety
const placeholderExamples = [
  "React useEffect hooks and lifecycle management",
  "Cardiac physiology basics and assessment techniques", 
  "Spanish subjunctive mood and usage patterns",
  "Statistics for product managers and A/B testing",
  "Financial modeling and valuation methods",
  "Organic chemistry reaction mechanisms",
  "Machine learning fundamentals and neural networks",
  "Constitutional law and judicial review",
  "Microeconomics supply and demand analysis",
  "Photography composition and lighting techniques",
  "Project management methodologies and frameworks",
  "Nutrition science and metabolic pathways"
]

export function OnboardingConceptIntake({ onConceptSubmitted, onBack }: OnboardingConceptIntakeProps) {
  // Analytics hooks
  const { trackChipInteraction, trackError, trackAPICall } = useConceptIntakeAnalytics()
  const { trackInput, resetInputTracking } = useConceptInputTracking(1500)
  const { trackUploadStart, trackUploadComplete } = useFileUploadTracking()
  const { trackStepCompletion, trackStepAbandonment } = useDropOffTracking('concept_input')

  const [concept, setConcept] = useState("")
  const [selectedConceptId, setSelectedConceptId] = useState<string>("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [pastedUrl, setPastedUrl] = useState("")
  const [showMaterialOptions, setShowMaterialOptions] = useState(false)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isLoading: false,
    error: null
  })

  // Advanced options state
  const [minutesPerDay, setMinutesPerDay] = useState(30)
  const [weeks, setWeeks] = useState(4)
  const [level, setLevel] = useState("")
  const [format, setFormat] = useState("")

  // Rotate placeholder examples every 3 seconds
  useEffect(() => {
    if (concept.length === 0) { // Only rotate when input is empty
      const interval = setInterval(() => {
        setCurrentPlaceholder((prev) => (prev + 1) % placeholderExamples.length)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [concept])

  const handleSuggestionClick = (example: string) => {
    setConcept(example)
    // Show advanced options after concept is selected
    if (!showAdvancedOptions) {
      setTimeout(() => setShowAdvancedOptions(true), 300)
    }
  }

  const handleConceptSelect = (conceptExample: ConceptExample) => {
    setConcept(conceptExample.example)
    setSelectedConceptId(conceptExample.id)
    
    // Track chip interaction
    const category = defaultConceptCategories.find(cat => 
      cat.examples.some(ex => ex.id === conceptExample.id)
    )
    if (category) {
      trackChipInteraction({
        chipId: conceptExample.id,
        chipLabel: conceptExample.label,
        categoryId: category.id,
        categoryName: category.name,
        action: 'click',
        position: category.examples.findIndex(ex => ex.id === conceptExample.id),
        timeOnPage: Date.now() - performance.timing.navigationStart,
        previousConcept: concept.length > 0 ? concept : undefined
      })
    }
    
    // Track concept input from chip selection
    trackInput(conceptExample.example, 'chip_selection')
    
    // Show advanced options after concept is selected
    if (!showAdvancedOptions) {
      setTimeout(() => setShowAdvancedOptions(true), 300)
    }
  }

  const handleConceptChange = (value: string) => {
    setConcept(value)
    // Clear selected concept ID when user types manually
    if (selectedConceptId) {
      setSelectedConceptId("")
    }
    // Show advanced options when user starts typing a substantial concept
    if (value.trim().length > 10 && !showAdvancedOptions) {
      setTimeout(() => setShowAdvancedOptions(true), 500)
    }
    
    // Track concept input with debouncing
    trackInput(value, 'typing')
  }

  const handleContinue = async () => {
    if (!concept.trim()) return

    const totalSteps = 3 + (uploadedFile ? 1 : 0) + (pastedUrl && isValidUrl(pastedUrl) ? 1 : 0)
    let currentStep = 0

    try {
      // Step 1: Validate concept
      currentStep++
      setProcessingState({
        isLoading: true,
        error: null,
        progress: "Analyzing your concept...",
        type: 'info',
        step: currentStep,
        totalSteps
      })
      await new Promise(resolve => setTimeout(resolve, 800))

      // Step 2: Process file if uploaded
      if (uploadedFile) {
        currentStep++
        setProcessingState({
          isLoading: true,
          error: null,
          progress: "Processing PDF content...",
          type: 'info',
          step: currentStep,
          totalSteps
        })
        await new Promise(resolve => setTimeout(resolve, 1200))
      }

      // Step 3: Process URL if provided
      if (pastedUrl && isValidUrl(pastedUrl)) {
        currentStep++
        setProcessingState({
          isLoading: true,
          error: null,
          progress: "Extracting content from URL...",
          type: 'info',
          step: currentStep,
          totalSteps
        })
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Step 4: Generate plan
      currentStep++
      setProcessingState({
        isLoading: true,
        error: null,
        progress: "Generating your personalized learning plan...",
        type: 'info',
        step: currentStep,
        totalSteps
      })
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Success state
      setProcessingState({
        isLoading: false,
        error: null,
        progress: "Plan generated successfully!",
        type: 'success'
      })

      // Brief success display before proceeding
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const planConfig: PlanConfig = {
        minutesPerDay,
        weeks,
        level,
        format
      }
      
      // Track successful completion
      trackStepCompletion(100)
      
      onConceptSubmitted(
        concept.trim(), 
        uploadedFile || undefined, 
        pastedUrl || undefined,
        planConfig
      )
    } catch (error) {
      // Track error
      trackError({
        errorType: 'processing',
        errorCode: 'CONCEPT_PROCESSING_FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        component: 'OnboardingConceptIntake',
        userAction: 'continue_button_click',
        recoverable: true
      })
      
      setProcessingState({
        isLoading: false,
        error: "Failed to process concept. Please try again.",
        type: 'error',
        progress: undefined
      })
    }
  }

  const validateAndSetFile = (file: File) => {
    // Basic file validation
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setProcessingState({
        isLoading: false,
        error: "File size must be less than 10MB",
        progress: undefined
      })
      return false
    }
    
    if (!file.type.includes('pdf')) {
      setProcessingState({
        isLoading: false,
        error: "Only PDF files are supported at this time",
        progress: undefined
      })
      return false
    }

    setUploadedFile(file)
    setProcessingState({ isLoading: false, error: null })
    return true
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      validateAndSetFile(files[0])
    }
  }

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleUrlChange = (value: string) => {
    setPastedUrl(value)
    // Clear any previous errors when user starts typing
    if (processingState.error) {
      setProcessingState({ isLoading: false, error: null })
    }
  }

  const isFormValid = concept.trim().length > 0 && 
    (!showAdvancedOptions || (level && format))
  const isProcessing = processingState.isLoading

  return (
    <div className="min-h-screen bg-background flex flex-col p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        {onBack && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-2 min-w-[40px] min-h-[40px] touch-manipulation" 
            onClick={onBack} 
            disabled={isProcessing}
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <h1 className="text-xl sm:text-2xl font-semibold leading-tight">What do you want to learn?</h1>
      </div>

      <div className="flex-1 space-y-6 sm:space-y-8">
        {/* Main concept input */}
        <div className="space-y-3 sm:space-y-4">
          <Input
            value={concept}
            onChange={(e) => handleConceptChange(e.target.value)}
            placeholder={placeholderExamples[currentPlaceholder]}
            className="text-base sm:text-lg h-12 sm:h-14 px-4 transition-all duration-300 touch-manipulation"
            autoFocus
            disabled={isProcessing}
            aria-label="Enter learning concept"
          />

          {/* Helpful hint about rotating examples */}
          {concept.length === 0 && (
            <div className="text-xs text-muted-foreground/70 text-center">
              💡 Examples rotate every few seconds, or choose from suggestions below
            </div>
          )}

          {/* Concept chips */}
          <div className="space-y-2 sm:space-y-3">
            <p className="text-sm text-muted-foreground">Choose from curated examples:</p>
            <ConceptChips
              categories={defaultConceptCategories}
              onConceptSelect={handleConceptSelect}
              selectedConceptId={selectedConceptId}
              maxVisibleCategories={2}
            />
          </div>
        </div>

        {/* Advanced options - Progressive disclosure */}
        {showAdvancedOptions && (
          <Card className="animate-in slide-in-from-top-2 duration-300">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Customize Your Learning Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 sm:space-y-8">
              {/* Minutes per day */}
              <div className="space-y-3 sm:space-y-4">
                <Label className="flex items-center gap-2 text-sm sm:text-base">
                  <Clock className="w-4 h-4" />
                  Minutes per day: {minutesPerDay}
                </Label>
                <div className="px-2 sm:px-3">
                  <input
                    type="range"
                    min="15"
                    max="120"
                    step="15"
                    value={minutesPerDay}
                    onChange={(e) => setMinutesPerDay(Number(e.target.value))}
                    className="w-full h-3 sm:h-2 bg-muted rounded-lg appearance-none cursor-pointer slider touch-manipulation"
                    disabled={isProcessing}
                    aria-label={`Minutes per day: ${minutesPerDay}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>15 min</span>
                    <span>60 min</span>
                    <span>120 min</span>
                  </div>
                </div>
              </div>

              {/* Duration in weeks */}
              <div className="space-y-3 sm:space-y-4">
                <Label className="flex items-center gap-2 text-sm sm:text-base">
                  <Calendar className="w-4 h-4" />
                  Duration (weeks)
                </Label>
                <div className="flex items-center justify-center gap-4 sm:gap-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWeeks(Math.max(1, weeks - 1))}
                    disabled={weeks <= 1 || isProcessing}
                    className="min-w-[44px] min-h-[44px] touch-manipulation"
                    aria-label="Decrease weeks"
                  >
                    -
                  </Button>
                  <span className="font-medium text-xl sm:text-2xl w-12 text-center">{weeks}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWeeks(Math.min(12, weeks + 1))}
                    disabled={weeks >= 12 || isProcessing}
                    className="min-w-[44px] min-h-[44px] touch-manipulation"
                    aria-label="Increase weeks"
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Level selection */}
              <div className="space-y-3 sm:space-y-4">
                <Label className="flex items-center gap-2 text-sm sm:text-base">
                  <TrendingUp className="w-4 h-4" />
                  Your level
                </Label>
                <Select value={level} onValueChange={setLevel} disabled={isProcessing}>
                  <SelectTrigger className="h-12 sm:h-11 touch-manipulation">
                    <SelectValue placeholder="Select your current level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner" className="py-3 sm:py-2">Beginner - I'm new to this topic</SelectItem>
                    <SelectItem value="intermediate" className="py-3 sm:py-2">Intermediate - I have some knowledge</SelectItem>
                    <SelectItem value="advanced" className="py-3 sm:py-2">Advanced - I want to deepen my expertise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Format preference */}
              <div className="space-y-3 sm:space-y-4">
                <Label className="text-sm sm:text-base">Preferred learning format</Label>
                <Select value={format} onValueChange={setFormat} disabled={isProcessing}>
                  <SelectTrigger className="h-12 sm:h-11 touch-manipulation">
                    <SelectValue placeholder="How do you like to learn?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="videos" className="py-3 sm:py-2">Videos - Visual demonstrations and lectures</SelectItem>
                    <SelectItem value="articles" className="py-3 sm:py-2">Articles - Written guides and documentation</SelectItem>
                    <SelectItem value="mixed" className="py-3 sm:py-2">Mixed - Combination of videos and articles</SelectItem>
                    <SelectItem value="interactive" className="py-3 sm:py-2">Interactive - Hands-on exercises and tutorials</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Material options toggle */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setShowMaterialOptions(!showMaterialOptions)}
              className="text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 touch-manipulation min-h-[44px] flex items-center"
              disabled={isProcessing}
              aria-expanded={showMaterialOptions}
              aria-controls="material-options"
            >
              Or paste a link / upload a PDF to build from your material
            </button>
            
            {(uploadedFile || (pastedUrl && isValidUrl(pastedUrl))) && (
              <div className="flex items-center gap-2">
                {uploadedFile && (
                  <Badge variant="secondary" className="text-xs">
                    📄 PDF
                  </Badge>
                )}
                {pastedUrl && isValidUrl(pastedUrl) && (
                  <Badge variant="secondary" className="text-xs">
                    🔗 URL
                  </Badge>
                )}
              </div>
            )}
          </div>

          {showMaterialOptions && (
            <div id="material-options" className="space-y-4 sm:space-y-6 p-4 sm:p-6 border rounded-lg bg-muted/20">
              {/* Enhanced URL input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Paste a URL</label>
                <div className="flex gap-2">
                  <Link className={`w-4 h-4 mt-3 transition-colors ${
                    pastedUrl && isValidUrl(pastedUrl) 
                      ? "text-green-500" 
                      : pastedUrl && pastedUrl.length > 0
                        ? "text-red-500"
                        : "text-muted-foreground"
                  }`} />
                  <div className="flex-1 space-y-1">
                    <Input
                      value={pastedUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://example.com/article"
                      className={`h-12 sm:h-10 touch-manipulation transition-colors ${
                        pastedUrl && !isValidUrl(pastedUrl) && pastedUrl.length > 0
                          ? "border-red-500/50 focus:border-red-500"
                          : pastedUrl && isValidUrl(pastedUrl)
                            ? "border-green-500/50 focus:border-green-500"
                            : ""
                      }`}
                      disabled={isProcessing}
                      aria-label="Enter URL"
                    />
                    {pastedUrl && pastedUrl.length > 0 && (
                      <p className={`text-xs ${
                        isValidUrl(pastedUrl) 
                          ? "text-green-600 dark:text-green-400" 
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        {isValidUrl(pastedUrl) ? "✓ Valid URL" : "⚠ Please enter a valid URL"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced file upload dropzone */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload a PDF</label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                    isDragOver 
                      ? "border-primary bg-primary/5 scale-[1.02]" 
                      : uploadedFile
                        ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
                        : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors ${
                    isDragOver ? "text-primary" : "text-muted-foreground"
                  }`} />
                  
                  {uploadedFile ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        ✓ {uploadedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setUploadedFile(null)}
                        disabled={isProcessing}
                        className="text-xs"
                      >
                        Remove file
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {isDragOver ? "Drop your PDF here!" : "Drop a PDF here or click to browse"}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Maximum file size: 10MB
                      </p>
                    </div>
                  )}
                  
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    id="file-upload"
                    disabled={isProcessing}
                  />
                  
                  {!uploadedFile && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => document.getElementById("file-upload")?.click()}
                      disabled={isProcessing}
                      className="mt-2"
                    >
                      Choose File
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced feedback display */}
        {(processingState.error || isProcessing || processingState.type === 'success') && (
          <div className={`p-4 rounded-lg border transition-all duration-300 ${
            processingState.type === 'error' || processingState.error
              ? "bg-destructive/10 border-destructive/20"
              : processingState.type === 'success'
                ? "bg-green-50/50 border-green-200/50 dark:bg-green-950/20 dark:border-green-800/30"
                : processingState.type === 'warning'
                  ? "bg-yellow-50/50 border-yellow-200/50 dark:bg-yellow-950/20 dark:border-yellow-800/30"
                  : "bg-primary/10 border-primary/20"
          }`}>
            <div className="flex items-start gap-3">
              {/* Icon based on state */}
              <div className="flex-shrink-0 mt-0.5">
                {processingState.error || processingState.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                ) : processingState.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : processingState.type === 'warning' ? (
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                ) : isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <Info className="w-4 h-4 text-primary" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                {/* Main message */}
                <p className={`text-sm font-medium ${
                  processingState.error || processingState.type === 'error'
                    ? "text-destructive"
                    : processingState.type === 'success'
                      ? "text-green-700 dark:text-green-400"
                      : processingState.type === 'warning'
                        ? "text-yellow-700 dark:text-yellow-400"
                        : "text-primary"
                }`}>
                  {processingState.error || processingState.progress}
                </p>

                {/* Progress bar and step indicator */}
                {isProcessing && processingState.step && processingState.totalSteps && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Step {processingState.step} of {processingState.totalSteps}</span>
                      <span>{Math.round((processingState.step / processingState.totalSteps) * 100)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${(processingState.step / processingState.totalSteps) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Retry button for errors */}
                {processingState.error && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProcessingState({ isLoading: false, error: null })}
                    className="mt-2 h-7 text-xs"
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced continue button */}
      <div className="pt-6 sm:pt-8 pb-4 sm:pb-6">
        <Button 
          onClick={handleContinue} 
          disabled={!isFormValid || isProcessing} 
          className={`w-full h-12 sm:h-11 touch-manipulation transition-all duration-200 ${
            isProcessing ? "bg-primary/80" : ""
          }`}
          size="lg"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {processingState.step && processingState.totalSteps 
                  ? `Processing... (${processingState.step}/${processingState.totalSteps})`
                  : "Processing..."
                }
              </span>
            </div>
          ) : processingState.type === 'success' ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Success!</span>
            </div>
          ) : (
            "Continue"
          )}
        </Button>
        
        {/* Helpful hint */}
        {!isProcessing && (
          <p className="text-xs sm:text-sm text-center text-muted-foreground mt-3 sm:mt-2 px-4">
            {!isFormValid && showAdvancedOptions && (!level || !format)
              ? "Please select your level and preferred format to continue"
              : !isFormValid && !concept.trim()
                ? "Enter a concept above to get started"
                : isFormValid
                  ? "Click to generate your personalized learning plan"
                  : ""
            }
          </p>
        )}
      </div>
    </div>
  )
}

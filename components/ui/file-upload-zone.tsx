'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, File, X, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react'

export interface FileValidationError {
  type: 'size' | 'format' | 'corrupted' | 'network' | 'unknown'
  message: string
  details?: string
}

export interface FileUploadState {
  file: File | null
  isUploading: boolean
  isProcessing: boolean
  progress: number
  error: FileValidationError | null
  extractedText?: string
}

export interface FileUploadZoneProps {
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  onFileProcess?: (file: File) => Promise<string>
  onRetry?: () => void
  acceptedTypes?: string[]
  maxSizeBytes?: number
  className?: string
  disabled?: boolean
  uploadState: FileUploadState
}

const DEFAULT_ACCEPTED_TYPES = ['.pdf']
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10MB

export function FileUploadZone({
  onFileSelect,
  onFileRemove,
  onFileProcess,
  onRetry,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  className = '',
  disabled = false,
  uploadState
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): FileValidationError | null => {
    // Check file size
    if (file.size > maxSizeBytes) {
      return {
        type: 'size',
        message: `File size must be less than ${Math.round(maxSizeBytes / (1024 * 1024))}MB`,
        details: `Current file size: ${(file.size / (1024 * 1024)).toFixed(1)}MB`
      }
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!acceptedTypes.includes(fileExtension)) {
      return {
        type: 'format',
        message: `Only ${acceptedTypes.join(', ')} files are supported`,
        details: `Uploaded file type: ${fileExtension}`
      }
    }

    return null
  }, [acceptedTypes, maxSizeBytes])

  const handleFileSelection = useCallback((file: File) => {
    if (disabled) return

    const validationError = validateFile(file)
    if (validationError) {
      // We'll handle this through the parent component's state
      return
    }

    onFileSelect(file)
  }, [disabled, validateFile, onFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelection(files[0])
    }
  }, [disabled, handleFileSelection])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      handleFileSelection(files[0])
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFileSelection])

  const handleBrowseClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getProgressColor = () => {
    if (uploadState.error) return 'bg-destructive'
    if (uploadState.progress === 100) return 'bg-green-500'
    return 'bg-primary'
  }

  const getZoneStyles = () => {
    let baseStyles = `
      relative border-2 border-dashed rounded-lg p-6 sm:p-8 transition-all duration-200
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
    `

    if (uploadState.error) {
      baseStyles += ' border-destructive bg-destructive/5'
    } else if (uploadState.file && !uploadState.isUploading) {
      baseStyles += ' border-green-500 bg-green-50 dark:bg-green-950/20'
    } else if (isDragOver) {
      baseStyles += ' border-primary bg-primary/5'
    } else {
      baseStyles += ' border-border hover:bg-accent/50'
    }

    return baseStyles
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Upload Zone */}
      <div
        className={getZoneStyles()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault()
            handleBrowseClick()
          }
        }}
        aria-label="File upload zone"
        aria-disabled={disabled}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
          aria-label="File input"
        />

        <div className="flex flex-col items-center justify-center text-center space-y-4">
          {uploadState.isUploading || uploadState.isProcessing ? (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {uploadState.isProcessing ? 'Processing file...' : 'Uploading...'}
                </p>
                {uploadState.progress > 0 && (
                  <div className="w-full max-w-xs mx-auto">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{uploadState.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                        style={{ width: `${uploadState.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : uploadState.error ? (
            <>
              <AlertCircle className="w-12 h-12 text-destructive" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  {uploadState.error.message}
                </p>
                {uploadState.error.details && (
                  <p className="text-xs text-muted-foreground">
                    {uploadState.error.details}
                  </p>
                )}
                {onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRetry()
                    }}
                    className="mt-2"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                )}
              </div>
            </>
          ) : uploadState.file ? (
            <>
              <CheckCircle className="w-12 h-12 text-green-500" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  File uploaded successfully
                </p>
                <p className="text-xs text-muted-foreground">
                  Click to replace or drag a new file
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {isDragOver ? 'Drop your file here!' : 'Drop a file here or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports {acceptedTypes.join(', ')} files up to {Math.round(maxSizeBytes / (1024 * 1024))}MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* File Info Card */}
      {uploadState.file && !uploadState.error && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <File className="w-8 h-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {uploadState.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploadState.file.size)} • {uploadState.file.type || 'Unknown type'}
                </p>
                {uploadState.extractedText && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ Text extracted ({uploadState.extractedText.length} characters)
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onFileRemove()
              }}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remove file"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

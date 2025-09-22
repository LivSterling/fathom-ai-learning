import { NextRequest, NextResponse } from 'next/server'
import { fileParser, type ParsedContent } from '@/lib/file-parser'

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'text/markdown']
const PARSE_TIMEOUT = 15000 // 15 seconds

interface ParseFileRequest {
  file: {
    name: string
    size: number
    type: string
    content: string // base64 encoded
  }
  options?: {
    extractSections?: boolean
    includeMetadata?: boolean
    maxPages?: number
  }
}

interface ParseFileResponse {
  success: boolean
  data?: {
    text: string
    metadata: ParsedContent['metadata']
    sections?: ParsedContent['sections']
  }
  error?: {
    code: string
    message: string
    details?: string
  }
  metadata?: {
    processingTime: number
    requestId: string
  }
}

/**
 * Validate file upload request
 */
function validateFileRequest(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!body.file || typeof body.file !== 'object') {
    errors.push('File data is required')
    return { isValid: false, errors }
  }

  const { name, size, type, content } = body.file

  // Validate file name
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('File name is required')
  } else if (name.length > 255) {
    errors.push('File name must be less than 255 characters')
  }

  // Validate file size
  if (!Number.isInteger(size) || size <= 0) {
    errors.push('File size must be a positive integer')
  } else if (size > MAX_FILE_SIZE) {
    errors.push(`File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`)
  }

  // Validate file type
  if (!type || typeof type !== 'string') {
    errors.push('File type is required')
  } else if (!ALLOWED_TYPES.includes(type)) {
    errors.push(`File type must be one of: ${ALLOWED_TYPES.join(', ')}`)
  }

  // Validate file content
  if (!content || typeof content !== 'string') {
    errors.push('File content is required')
  } else {
    try {
      // Validate base64 content
      const buffer = Buffer.from(content, 'base64')
      if (buffer.length !== Math.floor((content.length * 3) / 4)) {
        errors.push('Invalid base64 file content')
      }
    } catch {
      errors.push('Invalid base64 file content')
    }
  }

  // Validate options if provided
  if (body.options && typeof body.options !== 'object') {
    errors.push('Options must be an object')
  } else if (body.options) {
    const { extractSections, includeMetadata, maxPages } = body.options

    if (extractSections !== undefined && typeof extractSections !== 'boolean') {
      errors.push('extractSections must be a boolean')
    }

    if (includeMetadata !== undefined && typeof includeMetadata !== 'boolean') {
      errors.push('includeMetadata must be a boolean')
    }

    if (maxPages !== undefined && (!Number.isInteger(maxPages) || maxPages <= 0 || maxPages > 100)) {
      errors.push('maxPages must be an integer between 1 and 100')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Create File object from request data
 */
function createFileFromRequest(fileData: ParseFileRequest['file']): File {
  const buffer = Buffer.from(fileData.content, 'base64')
  const file = new File([buffer], fileData.name, { type: fileData.type })
  
  // Set the size property to match the original file size
  Object.defineProperty(file, 'size', { 
    value: fileData.size,
    writable: false 
  })

  return file
}

/**
 * Sanitize file name
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid filename characters
    .replace(/\.\./g, '_') // Remove directory traversal attempts
    .trim()
    .substring(0, 255)
}

/**
 * POST /api/upload/parse
 * Parse an uploaded file and extract text content
 */
export async function POST(request: NextRequest): Promise<NextResponse<ParseFileResponse>> {
  const requestId = `parse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const startTime = Date.now()

  try {
    // Parse request body
    let body: ParseFileRequest
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON in request body',
          details: error instanceof Error ? error.message : 'Unknown parsing error'
        },
        metadata: {
          processingTime: Date.now() - startTime,
          requestId
        }
      }, { status: 400 })
    }

    // Validate request
    const validation = validateFileRequest(body)
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: validation.errors.join(', ')
        },
        metadata: {
          processingTime: Date.now() - startTime,
          requestId
        }
      }, { status: 400 })
    }

    // Sanitize file name
    const sanitizedFileName = sanitizeFileName(body.file.name)

    // Create File object
    const file = createFileFromRequest({
      ...body.file,
      name: sanitizedFileName
    })

    // Set up parsing options
    const parseOptions = {
      extractSections: body.options?.extractSections ?? true,
      includeMetadata: body.options?.includeMetadata ?? true,
      maxPages: body.options?.maxPages,
      timeout: PARSE_TIMEOUT
    }

    // Parse file with timeout
    const parsePromise = fileParser.parseFile(file, parseOptions)
    
    const result = await Promise.race([
      parsePromise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('File parsing timeout')), PARSE_TIMEOUT + 1000)
      )
    ])

    // Log successful parsing
    console.log(`[${requestId}] File parsed successfully`, {
      fileName: sanitizedFileName,
      fileSize: body.file.size,
      fileType: body.file.type,
      wordCount: result.metadata.wordCount,
      processingTime: Date.now() - startTime
    })

    // Return parsed content
    return NextResponse.json({
      success: true,
      data: {
        text: result.text,
        metadata: result.metadata,
        sections: result.sections
      },
      metadata: {
        processingTime: Date.now() - startTime,
        requestId
      }
    })

  } catch (error) {
    // Log error
    console.error(`[${requestId}] File parsing error:`, error)

    let errorCode = 'PARSING_ERROR'
    let errorMessage = 'Failed to parse file'
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message === 'File parsing timeout') {
        errorCode = 'TIMEOUT'
        errorMessage = 'File parsing timeout'
        statusCode = 408
      } else if (error.message.includes('Unsupported file type')) {
        errorCode = 'UNSUPPORTED_FILE_TYPE'
        errorMessage = 'Unsupported file type'
        statusCode = 400
      } else if (error.message.includes('File too large')) {
        errorCode = 'FILE_TOO_LARGE'
        errorMessage = 'File size exceeds limit'
        statusCode = 413
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: error instanceof Error ? error.message : undefined
      },
      metadata: {
        processingTime: Date.now() - startTime,
        requestId
      }
    }, { status: statusCode })
  }
}

/**
 * GET /api/upload/parse
 * Get information about the file parsing endpoint
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: 'File parsing API is healthy',
    supportedTypes: ALLOWED_TYPES,
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
    parseTimeout: PARSE_TIMEOUT,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
}

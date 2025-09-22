import { NextRequest, NextResponse } from 'next/server'
import { conceptProcessor, type ConceptInput, type PlanConfig } from '@/lib/concept-processor'
import { fileParser } from '@/lib/file-parser'
import { urlExtractor } from '@/lib/url-extractor'

// Rate limiting storage (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Response caching (in production, use Redis or similar)
const responseCache = new Map<string, { data: any; timestamp: number }>()

// Constants
const RATE_LIMIT_REQUESTS = 10 // requests per window
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute in milliseconds
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes in milliseconds
const REQUEST_TIMEOUT = 25000 // 25 seconds to stay under 30s requirement

interface ProcessConceptRequest {
  concept: string
  planConfig: PlanConfig
  uploadedFile?: {
    name: string
    size: number
    type: string
    content: string // base64 encoded content
  }
  pastedUrl?: string
}

interface ProcessConceptResponse {
  success: boolean
  data?: any
  error?: {
    code: string
    message: string
    details?: string
  }
  metadata?: {
    processingTime: number
    cached: boolean
    requestId: string
  }
}

/**
 * Rate limiting middleware
 */
function checkRateLimit(clientId: string): boolean {
  const now = Date.now()
  const clientData = rateLimitMap.get(clientId)

  if (!clientData || now > clientData.resetTime) {
    // Reset or create new entry
    rateLimitMap.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return true
  }

  if (clientData.count >= RATE_LIMIT_REQUESTS) {
    return false
  }

  clientData.count++
  return true
}

/**
 * Generate cache key for request
 */
function generateCacheKey(concept: string, config: PlanConfig): string {
  return `concept:${concept.toLowerCase().trim()}:${config.minutesPerDay}:${config.weeks}:${config.level}:${config.format}`
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // In production, you might want to use user ID or more sophisticated fingerprinting
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
  return ip
}

/**
 * Validate request payload
 */
function validateRequest(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate concept
  if (!body.concept || typeof body.concept !== 'string') {
    errors.push('Concept is required and must be a string')
  } else if (body.concept.trim().length === 0) {
    errors.push('Concept cannot be empty')
  } else if (body.concept.length > 500) {
    errors.push('Concept must be less than 500 characters')
  }

  // Validate planConfig
  if (!body.planConfig || typeof body.planConfig !== 'object') {
    errors.push('Plan configuration is required')
  } else {
    const { minutesPerDay, weeks, level, format } = body.planConfig

    if (![15, 30, 60].includes(minutesPerDay)) {
      errors.push('Minutes per day must be 15, 30, or 60')
    }

    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 12) {
      errors.push('Weeks must be an integer between 1 and 12')
    }

    if (!['Beginner', 'Intermediate', 'Advanced'].includes(level)) {
      errors.push('Level must be Beginner, Intermediate, or Advanced')
    }

    if (!['Videos', 'Articles', 'Interactive', 'Mixed'].includes(format)) {
      errors.push('Format must be Videos, Articles, Interactive, or Mixed')
    }
  }

  // Validate optional uploadedFile
  if (body.uploadedFile) {
    const { name, size, type, content } = body.uploadedFile

    if (!name || typeof name !== 'string') {
      errors.push('Uploaded file name is required')
    }

    if (!Number.isInteger(size) || size <= 0) {
      errors.push('Uploaded file size must be a positive integer')
    }

    if (size > 10 * 1024 * 1024) { // 10MB limit
      errors.push('Uploaded file size must be less than 10MB')
    }

    if (!type || typeof type !== 'string') {
      errors.push('Uploaded file type is required')
    }

    if (!content || typeof content !== 'string') {
      errors.push('Uploaded file content is required')
    }
  }

  // Validate optional pastedUrl
  if (body.pastedUrl) {
    if (typeof body.pastedUrl !== 'string') {
      errors.push('Pasted URL must be a string')
    } else {
      try {
        new URL(body.pastedUrl.startsWith('http') ? body.pastedUrl : 'https://' + body.pastedUrl)
      } catch {
        errors.push('Pasted URL is not a valid URL')
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitize input strings
 */
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000) // Limit length for safety
}

/**
 * Process uploaded file
 */
async function processUploadedFile(uploadedFile: ProcessConceptRequest['uploadedFile']) {
  if (!uploadedFile) return undefined

  try {
    // Decode base64 content
    const buffer = Buffer.from(uploadedFile.content, 'base64')
    
    // Create a File-like object for the parser
    const file = new File([buffer], uploadedFile.name, { type: uploadedFile.type })
    Object.defineProperty(file, 'size', { value: uploadedFile.size })

    // Parse the file
    return await fileParser.parseFile(file, {
      includeMetadata: true,
      extractSections: true,
      timeout: 10000 // 10 second timeout for file parsing
    })
  } catch (error) {
    console.error('File processing error:', error)
    throw new Error('Failed to process uploaded file')
  }
}

/**
 * Process pasted URL
 */
async function processURL(url: string) {
  try {
    return await urlExtractor.extractContent(url, {
      includeImages: false,
      extractSections: true,
      timeout: 10000 // 10 second timeout for URL extraction
    })
  } catch (error) {
    console.error('URL processing error:', error)
    throw new Error('Failed to process URL content')
  }
}

/**
 * POST /api/concept/process
 * Process a concept and generate a learning plan
 */
export async function POST(request: NextRequest): Promise<NextResponse<ProcessConceptResponse>> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const startTime = Date.now()

  try {
    // Rate limiting
    const clientId = getClientId(request)
    if (!checkRateLimit(clientId)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          details: `Rate limit: ${RATE_LIMIT_REQUESTS} requests per minute`
        },
        metadata: {
          processingTime: Date.now() - startTime,
          cached: false,
          requestId
        }
      }, { status: 429 })
    }

    // Parse request body
    let body: ProcessConceptRequest
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
          cached: false,
          requestId
        }
      }, { status: 400 })
    }

    // Validate request
    const validation = validateRequest(body)
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
          cached: false,
          requestId
        }
      }, { status: 400 })
    }

    // Sanitize inputs
    const sanitizedConcept = sanitizeInput(body.concept)

    // Check cache for simple concept-only requests
    if (!body.uploadedFile && !body.pastedUrl) {
      const cacheKey = generateCacheKey(sanitizedConcept, body.planConfig)
      const cached = responseCache.get(cacheKey)
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return NextResponse.json({
          success: true,
          data: cached.data,
          metadata: {
            processingTime: Date.now() - startTime,
            cached: true,
            requestId
          }
        })
      }
    }

    // Process with timeout
    const processPromise = processConceptWithTimeout({
      concept: sanitizedConcept,
      planConfig: body.planConfig,
      uploadedFile: body.uploadedFile,
      pastedUrl: body.pastedUrl ? sanitizeInput(body.pastedUrl) : undefined
    })

    const result = await Promise.race([
      processPromise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
      )
    ])

    // Cache result for simple requests
    if (!body.uploadedFile && !body.pastedUrl) {
      const cacheKey = generateCacheKey(sanitizedConcept, body.planConfig)
      responseCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })
    }

    // Log successful request
    console.log(`[${requestId}] Concept processed successfully`, {
      concept: sanitizedConcept.substring(0, 50),
      processingTime: Date.now() - startTime,
      hasFile: !!body.uploadedFile,
      hasUrl: !!body.pastedUrl,
      clientId
    })

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        cached: false,
        requestId
      }
    })

  } catch (error) {
    // Log error
    console.error(`[${requestId}] Concept processing error:`, error)

    let errorCode = 'PROCESSING_ERROR'
    let errorMessage = 'Failed to process concept'
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message === 'Request timeout') {
        errorCode = 'TIMEOUT'
        errorMessage = 'Request processing timeout'
        statusCode = 408
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: error instanceof Error ? error.stack?.split('\n')[0] : undefined
      },
      metadata: {
        processingTime: Date.now() - startTime,
        cached: false,
        requestId
      }
    }, { status: statusCode })
  }
}

/**
 * Process concept with all inputs
 */
async function processConceptWithTimeout(input: {
  concept: string
  planConfig: PlanConfig
  uploadedFile?: ProcessConceptRequest['uploadedFile']
  pastedUrl?: string
}) {
  // Process uploaded file if provided
  let parsedFile
  if (input.uploadedFile) {
    parsedFile = await processUploadedFile(input.uploadedFile)
  }

  // Process URL if provided
  let extractedUrl
  if (input.pastedUrl) {
    extractedUrl = await processURL(input.pastedUrl)
  }

  // Build concept input
  const conceptInput: ConceptInput = {
    concept: input.concept,
    uploadedFile: parsedFile,
    pastedUrl: extractedUrl
  }

  // Generate learning plan
  const learningPlan = await conceptProcessor.generateLearningPlan(conceptInput, input.planConfig)

  return {
    learningPlan,
    processedFile: parsedFile ? {
      fileName: parsedFile.metadata.fileName,
      wordCount: parsedFile.metadata.wordCount,
      pageCount: parsedFile.metadata.pageCount
    } : undefined,
    processedUrl: extractedUrl ? {
      url: extractedUrl.url,
      title: extractedUrl.title,
      contentType: extractedUrl.metadata.contentType,
      domain: extractedUrl.metadata.domain
    } : undefined
  }
}

/**
 * GET /api/concept/process
 * Health check endpoint
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: 'Concept processing API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
}

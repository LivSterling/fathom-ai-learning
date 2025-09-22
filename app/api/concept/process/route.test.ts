import { NextRequest } from 'next/server'
import { POST, GET } from './route'

// Mock the dependencies
jest.mock('@/lib/concept-processor', () => ({
  conceptProcessor: {
    generateLearningPlan: jest.fn()
  }
}))

jest.mock('@/lib/file-parser', () => ({
  fileParser: {
    parseFile: jest.fn()
  }
}))

jest.mock('@/lib/url-extractor', () => ({
  urlExtractor: {
    extractContent: jest.fn()
  }
}))

// Import mocked modules
import { conceptProcessor } from '@/lib/concept-processor'
import { fileParser } from '@/lib/file-parser'
import { urlExtractor } from '@/lib/url-extractor'

const mockConceptProcessor = conceptProcessor as jest.Mocked<typeof conceptProcessor>
const mockFileParser = fileParser as jest.Mocked<typeof fileParser>
const mockUrlExtractor = urlExtractor as jest.Mocked<typeof urlExtractor>

// Test data
const validPlanConfig = {
  minutesPerDay: 30,
  weeks: 4,
  level: 'Intermediate' as const,
  format: 'Mixed' as const
}

const mockLearningPlan = {
  title: 'React Hooks',
  totalDuration: '4 weeks',
  dailyTime: '30 min',
  level: 'Intermediate',
  format: 'Mixed',
  modules: [
    {
      id: '1',
      title: 'Fundamentals',
      duration: 'Week 1-2',
      outcomes: ['Learn basics'],
      lessons: [
        {
          id: '1',
          title: 'Introduction',
          resources: [
            {
              title: 'React Basics',
              source: 'Article' as const,
              length: '20 min',
              difficulty: 'Beginner' as const,
              citation: 'React Docs'
            }
          ]
        }
      ]
    }
  ],
  metadata: {
    conceptType: 'technology' as const,
    totalEstimatedHours: 5,
    generatedAt: new Date(),
    processingTime: 1000
  }
}

const mockParsedFile = {
  text: 'Mock file content',
  metadata: {
    fileName: 'test.pdf',
    fileSize: 1024,
    fileType: 'application/pdf',
    wordCount: 100,
    extractedAt: new Date(),
    processingTime: 500
  }
}

const mockExtractedUrl = {
  url: 'https://example.com',
  title: 'Example Article',
  content: 'Mock URL content',
  metadata: {
    contentType: 'article' as const,
    domain: 'example.com',
    extractedAt: new Date(),
    processingTime: 800,
    wordCount: 150
  }
}

// Helper function to create mock request
function createMockRequest(body: any, headers: Record<string, string> = {}): NextRequest {
  const request = new NextRequest('http://localhost:3000/api/concept/process', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  })
  return request
}

describe('/api/concept/process', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConceptProcessor.generateLearningPlan.mockResolvedValue(mockLearningPlan)
    mockFileParser.parseFile.mockResolvedValue(mockParsedFile)
    mockUrlExtractor.extractContent.mockResolvedValue(mockExtractedUrl)
  })

  describe('POST', () => {
    describe('Success Cases', () => {
      it('processes concept successfully with minimal input', async () => {
        const requestBody = {
          concept: 'React hooks',
          planConfig: validPlanConfig
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.learningPlan).toEqual(mockLearningPlan)
        expect(data.metadata.processingTime).toBeGreaterThan(0)
        expect(data.metadata.requestId).toBeDefined()
      })

      it('processes concept with uploaded file', async () => {
        const requestBody = {
          concept: 'React hooks',
          planConfig: validPlanConfig,
          uploadedFile: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            content: Buffer.from('mock content').toString('base64')
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.processedFile).toBeDefined()
        expect(data.data.processedFile.fileName).toBe('test.pdf')
        expect(mockFileParser.parseFile).toHaveBeenCalled()
      })

      it('processes concept with pasted URL', async () => {
        const requestBody = {
          concept: 'React hooks',
          planConfig: validPlanConfig,
          pastedUrl: 'https://example.com/react-guide'
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.processedUrl).toBeDefined()
        expect(data.data.processedUrl.url).toBe('https://example.com')
        expect(mockUrlExtractor.extractContent).toHaveBeenCalled()
      })

      it('processes concept with both file and URL', async () => {
        const requestBody = {
          concept: 'React hooks',
          planConfig: validPlanConfig,
          uploadedFile: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            content: Buffer.from('mock content').toString('base64')
          },
          pastedUrl: 'https://example.com/react-guide'
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.processedFile).toBeDefined()
        expect(data.data.processedUrl).toBeDefined()
        expect(mockFileParser.parseFile).toHaveBeenCalled()
        expect(mockUrlExtractor.extractContent).toHaveBeenCalled()
      })
    })

    describe('Validation Errors', () => {
      it('returns error for missing concept', async () => {
        const requestBody = {
          planConfig: validPlanConfig
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('Concept is required')
      })

      it('returns error for empty concept', async () => {
        const requestBody = {
          concept: '',
          planConfig: validPlanConfig
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('Concept cannot be empty')
      })

      it('returns error for concept too long', async () => {
        const requestBody = {
          concept: 'a'.repeat(501),
          planConfig: validPlanConfig
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('must be less than 500 characters')
      })

      it('returns error for missing plan config', async () => {
        const requestBody = {
          concept: 'React hooks'
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('Plan configuration is required')
      })

      it('returns error for invalid minutes per day', async () => {
        const requestBody = {
          concept: 'React hooks',
          planConfig: {
            ...validPlanConfig,
            minutesPerDay: 45
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('Minutes per day must be 15, 30, or 60')
      })

      it('returns error for invalid weeks', async () => {
        const requestBody = {
          concept: 'React hooks',
          planConfig: {
            ...validPlanConfig,
            weeks: 15
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('Weeks must be an integer between 1 and 12')
      })

      it('returns error for invalid level', async () => {
        const requestBody = {
          concept: 'React hooks',
          planConfig: {
            ...validPlanConfig,
            level: 'Expert'
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('Level must be Beginner, Intermediate, or Advanced')
      })

      it('returns error for invalid format', async () => {
        const requestBody = {
          concept: 'React hooks',
          planConfig: {
            ...validPlanConfig,
            format: 'Podcasts'
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('Format must be Videos, Articles, Interactive, or Mixed')
      })

      it('returns error for file too large', async () => {
        const requestBody = {
          concept: 'React hooks',
          planConfig: validPlanConfig,
          uploadedFile: {
            name: 'large.pdf',
            size: 11 * 1024 * 1024, // 11MB
            type: 'application/pdf',
            content: Buffer.from('mock content').toString('base64')
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('must be less than 10MB')
      })

      it('returns error for invalid URL', async () => {
        const requestBody = {
          concept: 'React hooks',
          planConfig: validPlanConfig,
          pastedUrl: 'not-a-valid-url'
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('not a valid URL')
      })
    })

    describe('Error Handling', () => {
      it('handles invalid JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/concept/process', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: 'invalid json'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('INVALID_JSON')
      })

      it('handles concept processor errors', async () => {
        mockConceptProcessor.generateLearningPlan.mockRejectedValue(new Error('Processing failed'))

        const requestBody = {
          concept: 'React hooks',
          planConfig: validPlanConfig
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('PROCESSING_ERROR')
        expect(data.error.message).toContain('Processing failed')
      })

      it('handles file processing errors', async () => {
        mockFileParser.parseFile.mockRejectedValue(new Error('File parsing failed'))

        const requestBody = {
          concept: 'React hooks',
          planConfig: validPlanConfig,
          uploadedFile: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            content: Buffer.from('mock content').toString('base64')
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('PROCESSING_ERROR')
      })

      it('handles URL processing errors', async () => {
        mockUrlExtractor.extractContent.mockRejectedValue(new Error('URL extraction failed'))

        const requestBody = {
          concept: 'React hooks',
          planConfig: validPlanConfig,
          pastedUrl: 'https://example.com'
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('PROCESSING_ERROR')
      })
    })

    describe('Rate Limiting', () => {
      it('applies rate limiting after multiple requests', async () => {
        const requestBody = {
          concept: 'React hooks',
          planConfig: validPlanConfig
        }

        // Make multiple requests quickly
        const requests = Array(12).fill(null).map(() => 
          POST(createMockRequest(requestBody, { 'x-forwarded-for': '192.168.1.1' }))
        )

        const responses = await Promise.all(requests)
        const lastResponse = responses[responses.length - 1]
        const data = await lastResponse.json()

        // Should get rate limited
        expect(lastResponse.status).toBe(429)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED')
      })
    })

    describe('Caching', () => {
      it('caches responses for identical requests', async () => {
        const requestBody = {
          concept: 'React hooks',
          planConfig: validPlanConfig
        }

        // First request
        const request1 = createMockRequest(requestBody)
        const response1 = await POST(request1)
        const data1 = await response1.json()

        // Second identical request
        const request2 = createMockRequest(requestBody)
        const response2 = await POST(request2)
        const data2 = await response2.json()

        expect(response2.status).toBe(200)
        expect(data2.success).toBe(true)
        expect(data2.metadata.cached).toBe(true)
        expect(mockConceptProcessor.generateLearningPlan).toHaveBeenCalledTimes(1)
      })

      it('does not cache requests with files or URLs', async () => {
        const requestBody = {
          concept: 'React hooks',
          planConfig: validPlanConfig,
          uploadedFile: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            content: Buffer.from('mock content').toString('base64')
          }
        }

        // First request
        const request1 = createMockRequest(requestBody)
        const response1 = await POST(request1)
        const data1 = await response1.json()

        // Second identical request
        const request2 = createMockRequest(requestBody)
        const response2 = await POST(request2)
        const data2 = await response2.json()

        expect(response2.status).toBe(200)
        expect(data2.success).toBe(true)
        expect(data2.metadata.cached).toBe(false)
        expect(mockConceptProcessor.generateLearningPlan).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('GET', () => {
    it('returns health check information', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('healthy')
      expect(data.version).toBe('1.0.0')
      expect(data.timestamp).toBeDefined()
    })
  })
})

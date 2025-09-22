import { NextRequest } from 'next/server'
import { POST, GET } from './route'

// Mock the file parser
jest.mock('@/lib/file-parser', () => ({
  fileParser: {
    parseFile: jest.fn()
  }
}))

// Import mocked module
import { fileParser } from '@/lib/file-parser'
const mockFileParser = fileParser as jest.Mocked<typeof fileParser>

// Test data
const mockParsedFile = {
  text: 'This is the extracted text from the file.',
  metadata: {
    fileName: 'test.pdf',
    fileSize: 1024,
    fileType: 'application/pdf',
    wordCount: 8,
    extractedAt: new Date(),
    processingTime: 500,
    pageCount: 1
  },
  sections: [
    {
      title: 'Introduction',
      content: 'This is the introduction section.',
      page: 1
    }
  ]
}

// Helper function to create mock request
function createMockRequest(body: any): NextRequest {
  return new NextRequest('http://localhost:3000/api/upload/parse', {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  })
}

describe('/api/upload/parse', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFileParser.parseFile.mockResolvedValue(mockParsedFile)
  })

  describe('POST', () => {
    describe('Success Cases', () => {
      it('parses PDF file successfully', async () => {
        const fileContent = Buffer.from('Mock PDF content').toString('base64')
        const requestBody = {
          file: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            content: fileContent
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.text).toBe(mockParsedFile.text)
        expect(data.data.metadata).toEqual(mockParsedFile.metadata)
        expect(data.data.sections).toEqual(mockParsedFile.sections)
        expect(data.metadata.processingTime).toBeGreaterThan(0)
        expect(data.metadata.requestId).toBeDefined()
        expect(mockFileParser.parseFile).toHaveBeenCalled()
      })

      it('parses text file successfully', async () => {
        const fileContent = Buffer.from('This is a text file content').toString('base64')
        const requestBody = {
          file: {
            name: 'test.txt',
            size: 512,
            type: 'text/plain',
            content: fileContent
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.text).toBe(mockParsedFile.text)
        expect(mockFileParser.parseFile).toHaveBeenCalled()
      })

      it('parses markdown file successfully', async () => {
        const fileContent = Buffer.from('# Markdown Title\n\nThis is markdown content').toString('base64')
        const requestBody = {
          file: {
            name: 'test.md',
            size: 256,
            type: 'text/markdown',
            content: fileContent
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(mockFileParser.parseFile).toHaveBeenCalled()
      })

      it('handles parsing options correctly', async () => {
        const fileContent = Buffer.from('Mock content').toString('base64')
        const requestBody = {
          file: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            content: fileContent
          },
          options: {
            extractSections: false,
            includeMetadata: false,
            maxPages: 5
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        
        // Check that options were passed to the parser
        const parseCall = mockFileParser.parseFile.mock.calls[0]
        expect(parseCall[1]).toMatchObject({
          extractSections: false,
          includeMetadata: false,
          maxPages: 5
        })
      })

      it('uses default options when not provided', async () => {
        const fileContent = Buffer.from('Mock content').toString('base64')
        const requestBody = {
          file: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            content: fileContent
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)

        expect(response.status).toBe(200)
        
        // Check default options
        const parseCall = mockFileParser.parseFile.mock.calls[0]
        expect(parseCall[1]).toMatchObject({
          extractSections: true,
          includeMetadata: true
        })
      })
    })

    describe('Validation Errors', () => {
      it('returns error for missing file data', async () => {
        const requestBody = {}

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('File data is required')
      })

      it('returns error for missing file name', async () => {
        const requestBody = {
          file: {
            size: 1024,
            type: 'application/pdf',
            content: Buffer.from('content').toString('base64')
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('File name is required')
      })

      it('returns error for empty file name', async () => {
        const requestBody = {
          file: {
            name: '',
            size: 1024,
            type: 'application/pdf',
            content: Buffer.from('content').toString('base64')
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('File name is required')
      })

      it('returns error for file name too long', async () => {
        const requestBody = {
          file: {
            name: 'a'.repeat(256),
            size: 1024,
            type: 'application/pdf',
            content: Buffer.from('content').toString('base64')
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('must be less than 255 characters')
      })

      it('returns error for invalid file size', async () => {
        const requestBody = {
          file: {
            name: 'test.pdf',
            size: -1,
            type: 'application/pdf',
            content: Buffer.from('content').toString('base64')
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('must be a positive integer')
      })

      it('returns error for file too large', async () => {
        const requestBody = {
          file: {
            name: 'large.pdf',
            size: 11 * 1024 * 1024, // 11MB
            type: 'application/pdf',
            content: Buffer.from('content').toString('base64')
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

      it('returns error for unsupported file type', async () => {
        const requestBody = {
          file: {
            name: 'test.jpg',
            size: 1024,
            type: 'image/jpeg',
            content: Buffer.from('content').toString('base64')
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('File type must be one of')
      })

      it('returns error for missing file content', async () => {
        const requestBody = {
          file: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf'
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('File content is required')
      })

      it('returns error for invalid base64 content', async () => {
        const requestBody = {
          file: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            content: 'not-valid-base64!'
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('Invalid base64 file content')
      })

      it('returns error for invalid options', async () => {
        const requestBody = {
          file: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            content: Buffer.from('content').toString('base64')
          },
          options: {
            extractSections: 'yes', // should be boolean
            maxPages: 101 // should be <= 100
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toContain('extractSections must be a boolean')
        expect(data.error.details).toContain('maxPages must be an integer between 1 and 100')
      })
    })

    describe('Error Handling', () => {
      it('handles invalid JSON', async () => {
        const request = new NextRequest('http://localhost:3000/api/upload/parse', {
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

      it('handles file parsing errors', async () => {
        mockFileParser.parseFile.mockRejectedValue(new Error('Parsing failed'))

        const requestBody = {
          file: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            content: Buffer.from('content').toString('base64')
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('PARSING_ERROR')
        expect(data.error.message).toBe('Failed to parse file')
      })

      it('handles timeout errors', async () => {
        mockFileParser.parseFile.mockRejectedValue(new Error('File parsing timeout'))

        const requestBody = {
          file: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            content: Buffer.from('content').toString('base64')
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(408)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('TIMEOUT')
        expect(data.error.message).toBe('File parsing timeout')
      })

      it('handles unsupported file type errors', async () => {
        mockFileParser.parseFile.mockRejectedValue(new Error('Unsupported file type: .docx'))

        const requestBody = {
          file: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            content: Buffer.from('content').toString('base64')
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('UNSUPPORTED_FILE_TYPE')
        expect(data.error.message).toBe('Unsupported file type')
      })

      it('handles file too large errors', async () => {
        mockFileParser.parseFile.mockRejectedValue(new Error('File too large'))

        const requestBody = {
          file: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            content: Buffer.from('content').toString('base64')
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(413)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('FILE_TOO_LARGE')
        expect(data.error.message).toBe('File size exceeds limit')
      })
    })

    describe('File Name Sanitization', () => {
      it('sanitizes dangerous file names', async () => {
        const requestBody = {
          file: {
            name: '../../../etc/passwd',
            size: 1024,
            type: 'application/pdf',
            content: Buffer.from('content').toString('base64')
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)

        expect(response.status).toBe(200)
        
        // Check that the file was created with sanitized name
        const parseCall = mockFileParser.parseFile.mock.calls[0]
        const file = parseCall[0]
        expect(file.name).not.toContain('../')
        expect(file.name).toBe('___etc_passwd')
      })

      it('sanitizes file names with invalid characters', async () => {
        const requestBody = {
          file: {
            name: 'test<>:"/\\|?*.pdf',
            size: 1024,
            type: 'application/pdf',
            content: Buffer.from('content').toString('base64')
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)

        expect(response.status).toBe(200)
        
        const parseCall = mockFileParser.parseFile.mock.calls[0]
        const file = parseCall[0]
        expect(file.name).toBe('test_________.pdf')
      })
    })
  })

  describe('GET', () => {
    it('returns endpoint information', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('healthy')
      expect(data.supportedTypes).toEqual(['application/pdf', 'text/plain', 'text/markdown'])
      expect(data.maxFileSize).toBe(10 * 1024 * 1024)
      expect(data.maxFileSizeMB).toBe(10)
      expect(data.parseTimeout).toBe(15000)
      expect(data.version).toBe('1.0.0')
      expect(data.timestamp).toBeDefined()
    })
  })
})

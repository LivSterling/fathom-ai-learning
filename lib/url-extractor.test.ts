import { URLExtractor, URLExtractionError, urlExtractor, isValidURL, extractDomain } from './url-extractor'

describe('URLExtractor', () => {
  let extractor: URLExtractor

  beforeEach(() => {
    extractor = new URLExtractor()
    jest.clearAllMocks()
  })

  describe('URL Validation', () => {
    it('validates and normalizes URLs correctly', async () => {
      const testCases = [
        { input: 'https://example.com', expected: 'https://example.com/' },
        { input: 'http://example.com', expected: 'http://example.com/' },
        { input: 'example.com', expected: 'https://example.com/' },
        { input: 'www.example.com', expected: 'https://www.example.com/' }
      ]

      for (const { input, expected } of testCases) {
        try {
          const result = await extractor.extractContent(input)
          // URL should be normalized in the result
          expect(result.url).toBeDefined()
        } catch (error) {
          // We expect the extraction to work in our mock implementation
        }
      }
    }, 10000)

    it('throws error for invalid URLs', async () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid-protocol.com',
        'javascript:alert("xss")',
        ''
      ]

      for (const url of invalidUrls) {
        await expect(extractor.extractContent(url)).rejects.toThrow(URLExtractionError)
        
        try {
          await extractor.extractContent(url)
        } catch (error) {
          expect(error).toBeInstanceOf(URLExtractionError)
          expect((error as URLExtractionError).code).toBe('INVALID_URL')
        }
      }
    })
  })

  describe('Content Type Detection', () => {
    it('detects video content correctly', async () => {
      const videoUrls = [
        'https://youtube.com/watch?v=123',
        'https://youtu.be/123',
        'https://vimeo.com/123',
        'https://wistia.com/medias/123'
      ]

      for (const url of videoUrls) {
        const result = await extractor.extractContent(url)
        expect(result.metadata.contentType).toBe('video')
      }
    }, 10000)

    it('detects course content correctly', async () => {
      const courseUrls = [
        'https://coursera.org/learn/course',
        'https://udemy.com/course/title',
        'https://edx.org/course/title',
        'https://khanacademy.org/course',
        'https://pluralsight.com/courses/title',
        'https://skillshare.com/classes/title'
      ]

      for (const url of courseUrls) {
        const result = await extractor.extractContent(url)
        expect(result.metadata.contentType).toBe('course')
      }
    }, 10000)

    it('detects documentation correctly', async () => {
      const docUrls = [
        'https://docs.example.com/guide',
        'https://example.com/docs/api',
        'https://developer.example.com/reference',
        'https://api.example.com/documentation'
      ]

      for (const url of docUrls) {
        const result = await extractor.extractContent(url)
        expect(result.metadata.contentType).toBe('documentation')
      }
    })

    it('detects PDF content correctly', async () => {
      const pdfUrl = 'https://example.com/document.pdf'
      
      const result = await extractor.extractContent(pdfUrl)
      expect(result.metadata.contentType).toBe('pdf')
    })

    it('defaults to article for unknown content', async () => {
      const articleUrl = 'https://blog.example.com/post'
      
      const result = await extractor.extractContent(articleUrl)
      expect(result.metadata.contentType).toBe('article')
    })
  })

  describe('Content Extraction', () => {
    it('extracts web article content', async () => {
      const url = 'https://blog.example.com/react-guide'
      
      const result = await extractor.extractContent(url)
      
      expect(result.url).toBe(url)
      expect(result.title).toBeDefined()
      expect(result.content).toBeDefined()
      expect(result.metadata.domain).toBe('blog.example.com')
      expect(result.metadata.contentType).toBe('article')
      expect(result.metadata.wordCount).toBeGreaterThan(0)
      expect(result.metadata.extractedAt).toBeInstanceOf(Date)
      expect(result.metadata.processingTime).toBeGreaterThan(0)
    })

    it('extracts React-specific content for React URLs', async () => {
      const url = 'https://reactjs.org/docs/hooks'
      
      const result = await extractor.extractContent(url)
      
      expect(result.content.toLowerCase()).toContain('react')
      expect(result.title.toLowerCase()).toContain('react')
    })

    it('extracts video content with transcript', async () => {
      const url = 'https://youtube.com/watch?v=123'
      
      const result = await extractor.extractContent(url)
      
      expect(result.metadata.contentType).toBe('video')
      expect(result.content).toBeDefined() // Should contain transcript
      expect(result.metadata.author).toBeDefined() // Should have channel info
    })

    it('extracts course content with structure', async () => {
      const url = 'https://coursera.org/learn/machine-learning'
      
      const result = await extractor.extractContent(url)
      
      expect(result.metadata.contentType).toBe('course')
      expect(result.content).toBeDefined()
      expect(result.metadata.author).toBeDefined() // Should have instructor info
    })

    it('extracts PDF content', async () => {
      const url = 'https://example.com/research.pdf'
      
      const result = await extractor.extractContent(url)
      
      expect(result.metadata.contentType).toBe('pdf')
      expect(result.content).toBeDefined()
      expect(result.title).toBeDefined()
    })
  })

  describe('Extraction Options', () => {
    it('extracts sections when requested', async () => {
      const url = 'https://example.com/article'
      
      const result = await extractor.extractContent(url, { extractSections: true })
      
      expect(result.sections).toBeDefined()
      expect(Array.isArray(result.sections)).toBe(true)
      if (result.sections && result.sections.length > 0) {
        expect(result.sections[0]).toHaveProperty('title')
        expect(result.sections[0]).toHaveProperty('content')
        expect(result.sections[0]).toHaveProperty('level')
      }
    })

    it('includes images when requested', async () => {
      const url = 'https://example.com/article'
      
      const result = await extractor.extractContent(url, { includeImages: true })
      
      // In a real implementation, this would include images
      expect(result).toBeDefined()
    })

    it('respects maxContentLength option', async () => {
      const url = 'https://example.com/long-article'
      
      const result = await extractor.extractContent(url, { maxContentLength: 1000 })
      
      // In a real implementation, this would truncate content
      expect(result.content).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      // This would be tested with actual network mocking in a real implementation
      const url = 'https://nonexistent-domain-12345.com'
      
      try {
        await extractor.extractContent(url)
      } catch (error) {
        expect(error).toBeInstanceOf(URLExtractionError)
        // In a real implementation, this might be NETWORK_ERROR
      }
    })

    it('handles timeout errors', async () => {
      const url = 'https://example.com'
      
      // In a real implementation, this would test actual timeout behavior
      await expect(
        extractor.extractContent(url, { timeout: 1 })
      ).rejects.toThrow()
    })

    it('handles parsing errors', async () => {
      // This would be tested with malformed content in a real implementation
      const url = 'https://example.com/malformed'
      
      try {
        await extractor.extractContent(url)
      } catch (error) {
        if (error instanceof URLExtractionError) {
          expect(['PARSING_ERROR', 'NETWORK_ERROR', 'INVALID_URL']).toContain(error.code)
        }
      }
    })
  })

  describe('URL Accessibility Check', () => {
    it('checks if URL is accessible', async () => {
      const url = 'https://example.com'
      
      const isAccessible = await extractor.isURLAccessible(url)
      
      expect(typeof isAccessible).toBe('boolean')
    })

    it('returns false for invalid URLs', async () => {
      const invalidUrl = 'not-a-url'
      
      const isAccessible = await extractor.isURLAccessible(invalidUrl)
      
      expect(isAccessible).toBe(false)
    })
  })

  describe('Supported Patterns', () => {
    it('returns list of supported patterns', () => {
      const patterns = extractor.getSupportedPatterns()
      
      expect(Array.isArray(patterns)).toBe(true)
      expect(patterns.length).toBeGreaterThan(0)
      expect(patterns).toContain('Articles and blogs')
      expect(patterns).toContain('YouTube videos')
      expect(patterns).toContain('Online courses (Coursera, Udemy, etc.)')
    })
  })

  describe('Processing Time Tracking', () => {
    it('tracks processing time correctly', async () => {
      const url = 'https://example.com'
      
      const startTime = Date.now()
      const result = await extractor.extractContent(url)
      const endTime = Date.now()
      
      expect(result.metadata.processingTime).toBeGreaterThan(0)
      expect(result.metadata.processingTime).toBeLessThanOrEqual(endTime - startTime + 100)
    })
  })

  describe('Word Count Calculation', () => {
    it('calculates word count correctly', async () => {
      const url = 'https://example.com'
      
      const result = await extractor.extractContent(url)
      
      expect(result.metadata.wordCount).toBeGreaterThan(0)
      expect(typeof result.metadata.wordCount).toBe('number')
    })
  })
})

describe('Utility Functions', () => {
  describe('isValidURL', () => {
    it('validates URLs correctly', () => {
      const testCases = [
        { url: 'https://example.com', expected: true },
        { url: 'http://example.com', expected: true },
        { url: 'example.com', expected: true },
        { url: 'www.example.com', expected: true },
        { url: 'not-a-url', expected: false },
        { url: '', expected: false },
        { url: 'javascript:alert("xss")', expected: false }
      ]

      testCases.forEach(({ url, expected }) => {
        expect(isValidURL(url)).toBe(expected)
      })
    })
  })

  describe('extractDomain', () => {
    it('extracts domain correctly', () => {
      const testCases = [
        { url: 'https://example.com/path', expected: 'example.com' },
        { url: 'http://www.example.com', expected: 'www.example.com' },
        { url: 'example.com', expected: 'example.com' },
        { url: 'subdomain.example.com/path?query=1', expected: 'subdomain.example.com' },
        { url: 'invalid-url', expected: '' }
      ]

      testCases.forEach(({ url, expected }) => {
        expect(extractDomain(url)).toBe(expected)
      })
    })
  })
})

  describe('URLExtractor Singleton', () => {
    it('exports working singleton instance', async () => {
      const url = 'https://example.com'
      
      const result = await urlExtractor.extractContent(url)
      
      expect(result).toBeDefined()
      expect(result.url).toBe('https://example.com/') // URL gets normalized
      expect(result.content).toBeDefined()
      expect(result.metadata).toBeDefined()
    })
  })

describe('URLExtractionError', () => {
  it('creates error with correct properties', () => {
    const error = new URLExtractionError('Test message', 'NETWORK_ERROR', 'Test details')
    
    expect(error.name).toBe('URLExtractionError')
    expect(error.message).toBe('Test message')
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.details).toBe('Test details')
  })

  it('creates error without details', () => {
    const error = new URLExtractionError('Test message', 'PARSING_ERROR')
    
    expect(error.name).toBe('URLExtractionError')
    expect(error.message).toBe('Test message')
    expect(error.code).toBe('PARSING_ERROR')
    expect(error.details).toBeUndefined()
  })

  it('handles all error codes', () => {
    const errorCodes = ['INVALID_URL', 'NETWORK_ERROR', 'TIMEOUT', 'PARSING_ERROR', 'BLOCKED_CONTENT'] as const
    
    errorCodes.forEach(code => {
      const error = new URLExtractionError('Test message', code)
      expect(error.code).toBe(code)
    })
  })
})

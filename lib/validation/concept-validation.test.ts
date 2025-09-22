/**
 * Error scenario tests for concept validation
 */

import { conceptValidator, fileValidator, urlValidator, ConceptValidator, FileValidator, URLValidator } from './concept-validation'

describe('ConceptValidator Error Scenarios', () => {
  describe('Input Validation Errors', () => {
    test('rejects empty concept', () => {
      const result = conceptValidator.validate('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('CONCEPT_TOO_SHORT')
    })

    test('rejects concept that is too short', () => {
      const result = conceptValidator.validate('ab')
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('CONCEPT_TOO_SHORT')
    })

    test('rejects concept that is too long', () => {
      const longConcept = 'a'.repeat(501)
      const result = conceptValidator.validate(longConcept)
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('CONCEPT_TOO_LONG')
    })

    test('rejects inappropriate content', () => {
      const result = conceptValidator.validate('spam test content')
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('INAPPROPRIATE_CONTENT')
    })

    test('warns about potential spam patterns', () => {
      const result = conceptValidator.validate('aaaaaaa learning')
      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].code).toBe('POTENTIAL_SPAM')
    })

    test('warns about very short concepts', () => {
      const result = conceptValidator.validate('react')
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'CONCEPT_VERY_SHORT')).toBe(true)
    })

    test('warns about very long concepts', () => {
      const longConcept = 'a'.repeat(350)
      const result = conceptValidator.validate(longConcept)
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'CONCEPT_VERY_LONG')).toBe(true)
    })

    test('handles HTML injection attempts', () => {
      const result = conceptValidator.validate('<script>alert("xss")</script> react hooks')
      expect(result.sanitizedValue).not.toContain('<script>')
      expect(result.sanitizedValue).toContain('react hooks')
    })

    test('handles excessive whitespace', () => {
      const result = conceptValidator.validate('   react    hooks   ')
      expect(result.sanitizedValue).toBe('react hooks')
      expect(result.warnings.some(w => w.code === 'EXTRA_WHITESPACE')).toBe(true)
    })
  })

  describe('Content Filtering', () => {
    test('blocks spam-like content', () => {
      const spamConcepts = [
        'buy now learn react',
        'click here for free money',
        'get rich quick scheme',
        'test123 asdfgh qwerty'
      ]

      spamConcepts.forEach(concept => {
        const result = conceptValidator.validate(concept)
        expect(result.isValid).toBe(false)
        expect(result.errors[0].code).toBe('INAPPROPRIATE_CONTENT')
      })
    })

    test('allows legitimate educational content', () => {
      const legitimateConcepts = [
        'learn react hooks and state management',
        'understand machine learning fundamentals',
        'master python programming basics',
        'study organic chemistry reactions'
      ]

      legitimateConcepts.forEach(concept => {
        const result = conceptValidator.validate(concept)
        expect(result.isValid).toBe(true)
      })
    })
  })

  describe('Custom Validation Options', () => {
    test('respects custom length limits', () => {
      const strictValidator = new ConceptValidator({
        minLength: 10,
        maxLength: 50
      })

      expect(strictValidator.validate('short').isValid).toBe(false)
      expect(strictValidator.validate('this is a good concept').isValid).toBe(true)
      expect(strictValidator.validate('this concept is way too long for the strict validator settings').isValid).toBe(false)
    })

    test('respects content filter settings', () => {
      const lenientValidator = new ConceptValidator({
        contentFilter: {
          enabled: false,
          blockedWords: [],
          allowedLanguages: []
        }
      })

      const result = lenientValidator.validate('spam test content')
      expect(result.isValid).toBe(true)
    })
  })
})

describe('FileValidator Error Scenarios', () => {
  // Helper function to create mock files
  const createMockFile = (name: string, size: number, type: string): File => {
    const file = new File(['test content'], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  describe('Size Validation Errors', () => {
    test('rejects files that are too large', () => {
      const largeFile = createMockFile('large.pdf', 15 * 1024 * 1024, 'application/pdf')
      const result = fileValidator.validate(largeFile)
      
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('FILE_TOO_LARGE')
    })

    test('rejects empty files', () => {
      const emptyFile = createMockFile('empty.pdf', 0, 'application/pdf')
      const result = fileValidator.validate(emptyFile)
      
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('FILE_EMPTY')
    })

    test('warns about large files within limit', () => {
      const largeFile = createMockFile('large.pdf', 8 * 1024 * 1024, 'application/pdf')
      const result = fileValidator.validate(largeFile)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'FILE_LARGE')).toBe(true)
    })
  })

  describe('Type Validation Errors', () => {
    test('rejects unsupported file types', () => {
      const unsupportedFile = createMockFile('image.jpg', 1024, 'image/jpeg')
      const result = fileValidator.validate(unsupportedFile)
      
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('FILE_TYPE_NOT_ALLOWED')
    })

    test('rejects unsupported file extensions', () => {
      const unsupportedFile = createMockFile('document.docx', 1024, 'application/pdf')
      const result = fileValidator.validate(unsupportedFile)
      
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('FILE_EXTENSION_NOT_ALLOWED')
    })
  })

  describe('Filename Validation Errors', () => {
    test('rejects files with dangerous characters', () => {
      const dangerousFile = createMockFile('file<script>.pdf', 1024, 'application/pdf')
      const result = fileValidator.validate(dangerousFile)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_FILENAME_CHARS')).toBe(true)
    })

    test('rejects files with reserved names', () => {
      const reservedFile = createMockFile('CON.pdf', 1024, 'application/pdf')
      const result = fileValidator.validate(reservedFile)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'RESERVED_FILENAME')).toBe(true)
    })

    test('rejects files with names that are too long', () => {
      const longName = 'a'.repeat(260) + '.pdf'
      const longNameFile = createMockFile(longName, 1024, 'application/pdf')
      const result = fileValidator.validate(longNameFile)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'FILENAME_TOO_LONG')).toBe(true)
    })
  })

  describe('Custom Validation Options', () => {
    test('respects custom size limits', () => {
      const strictValidator = new FileValidator({
        maxSize: 1024 * 1024 // 1MB
      })

      const largeFile = createMockFile('large.pdf', 2 * 1024 * 1024, 'application/pdf')
      const result = strictValidator.validate(largeFile)
      
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('FILE_TOO_LARGE')
    })

    test('respects custom allowed types', () => {
      const restrictiveValidator = new FileValidator({
        allowedTypes: ['text/plain'],
        allowedExtensions: ['.txt']
      })

      const pdfFile = createMockFile('document.pdf', 1024, 'application/pdf')
      const result = restrictiveValidator.validate(pdfFile)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.code === 'FILE_TYPE_NOT_ALLOWED')).toBe(true)
    })
  })
})

describe('URLValidator Error Scenarios', () => {
  describe('Format Validation Errors', () => {
    test('rejects invalid URL formats', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd'
      ]

      invalidUrls.forEach(url => {
        const result = urlValidator.validate(url)
        expect(result.isValid).toBe(false)
        expect(result.errors[0].code).toMatch(/INVALID_|BLOCKED_|SUSPICIOUS_/)
      })
    })

    test('rejects blocked domains', () => {
      const blockedUrls = [
        'http://localhost:3000',
        'https://127.0.0.1:8080',
        'http://0.0.0.0'
      ]

      blockedUrls.forEach(url => {
        const result = urlValidator.validate(url)
        expect(result.isValid).toBe(false)
        expect(result.errors[0].code).toBe('BLOCKED_DOMAIN')
      })
    })

    test('rejects suspicious domain patterns', () => {
      const suspiciousUrls = [
        'https://..example.com',
        'https://.example.com',
        'https://example..com'
      ]

      suspiciousUrls.forEach(url => {
        const result = urlValidator.validate(url)
        expect(result.isValid).toBe(false)
        expect(result.errors[0].code).toBe('SUSPICIOUS_DOMAIN')
      })
    })
  })

  describe('Protocol Handling', () => {
    test('warns about non-HTTPS URLs', () => {
      const result = urlValidator.validate('http://example.com')
      expect(result.isValid).toBe(true)
      expect(result.warnings.some(w => w.code === 'NON_SECURE_URL')).toBe(true)
    })

    test('auto-adds HTTPS to URLs without protocol', () => {
      const result = urlValidator.validate('example.com')
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBe('https://example.com')
    })
  })

  describe('Custom Validation Options', () => {
    test('respects custom allowed protocols', () => {
      const restrictiveValidator = new URLValidator({
        allowedProtocols: ['https:']
      })

      const result = restrictiveValidator.validate('http://example.com')
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('INVALID_PROTOCOL')
    })

    test('respects custom blocked domains', () => {
      const restrictiveValidator = new URLValidator({
        blockedDomains: ['example.com', 'test.com']
      })

      const result = restrictiveValidator.validate('https://example.com')
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('BLOCKED_DOMAIN')
    })
  })

  describe('Accessibility Validation', async () => {
    test('handles timeout errors gracefully', async () => {
      const timeoutValidator = new URLValidator({
        requireAccessible: true,
        timeout: 100 // Very short timeout
      })

      const result = await timeoutValidator.validateAccessibility('https://httpstat.us/200?sleep=1000')
      expect(result.warnings.some(w => w.code === 'URL_TIMEOUT')).toBe(true)
    }, 10000)

    test('handles unreachable URLs gracefully', async () => {
      const validator = new URLValidator({
        requireAccessible: true
      })

      const result = await validator.validateAccessibility('https://this-domain-definitely-does-not-exist-12345.com')
      expect(result.warnings.some(w => w.code === 'URL_UNREACHABLE')).toBe(true)
    }, 10000)
  })
})

describe('Integration Error Scenarios', () => {
  test('handles null and undefined inputs gracefully', () => {
    expect(() => conceptValidator.validate(null as any)).not.toThrow()
    expect(() => conceptValidator.validate(undefined as any)).not.toThrow()
    
    const nullResult = conceptValidator.validate(null as any)
    expect(nullResult.isValid).toBe(false)
  })

  test('handles non-string inputs to concept validator', () => {
    const inputs = [123, {}, [], true, false]
    
    inputs.forEach(input => {
      expect(() => conceptValidator.validate(input as any)).not.toThrow()
      const result = conceptValidator.validate(input as any)
      expect(result.isValid).toBe(false)
    })
  })

  test('handles malformed file objects', () => {
    const malformedFile = {
      name: 'test.pdf',
      size: 1024,
      type: 'application/pdf'
    } as File

    expect(() => fileValidator.validate(malformedFile)).not.toThrow()
  })

  test('validates complex real-world scenarios', () => {
    // Test realistic user inputs that might cause issues
    const complexConcepts = [
      'Learn React.js with TypeScript & Next.js (2024 edition)',
      'Understand machine learning: supervised vs unsupervised learning',
      'Master Python 3.11+ features: walrus operator, match statements',
      'Study organic chemistry: alkenes, alkynes, and aromatic compounds',
      '学习中文编程：Python数据科学入门', // Chinese characters
      'Apprendre le français: grammaire et vocabulaire avancé', // French
      'JavaScript ES2023 новые возможности', // Mixed languages
      'React hooks: useState, useEffect, useContext, useMemo, useCallback',
      'How to build scalable microservices with Docker & Kubernetes'
    ]

    complexConcepts.forEach(concept => {
      const result = conceptValidator.validate(concept)
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue).toBeDefined()
    })
  })
})

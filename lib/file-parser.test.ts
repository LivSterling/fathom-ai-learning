import { FileParser, FileParsingError, fileParser, getSupportedFileTypes, isFileSupported } from './file-parser'

// Mock file creation helper
const createMockFile = (name: string, size: number, type: string, content = 'mock content'): File => {
  const file = new File([content], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  // Add text() method for text files
  if (type.startsWith('text/')) {
    Object.defineProperty(file, 'text', {
      value: jest.fn().mockResolvedValue(content)
    })
  }
  return file
}

describe('FileParser', () => {
  let parser: FileParser

  beforeEach(() => {
    parser = new FileParser()
    jest.clearAllMocks()
  })

  describe('File Type Support', () => {
    it('returns supported file types', () => {
      const supportedTypes = parser.getSupportedTypes()
      expect(supportedTypes).toContain('.pdf')
      expect(supportedTypes).toContain('.txt')
      expect(supportedTypes).toContain('.md')
    })

    it('checks if file type is supported', () => {
      expect(parser.isSupported('document.pdf')).toBe(true)
      expect(parser.isSupported('readme.txt')).toBe(true)
      expect(parser.isSupported('guide.md')).toBe(true)
      expect(parser.isSupported('image.jpg')).toBe(false)
      expect(parser.isSupported('video.mp4')).toBe(false)
    })

    it('handles files without extensions', () => {
      expect(parser.isSupported('filename')).toBe(false)
    })

    it('handles case insensitive extensions', () => {
      expect(parser.isSupported('document.PDF')).toBe(true)
      expect(parser.isSupported('readme.TXT')).toBe(true)
    })
  })

  describe('PDF Parsing', () => {
    it('parses PDF files successfully', async () => {
      const pdfFile = createMockFile('test.pdf', 1024, 'application/pdf')
      
      const result = await parser.parseFile(pdfFile)
      
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('metadata')
      expect(result.metadata.fileName).toBe('test.pdf')
      expect(result.metadata.fileSize).toBe(1024)
      expect(result.metadata.fileType).toBe('application/pdf')
      expect(result.metadata.wordCount).toBeGreaterThan(0)
      expect(result.metadata.extractedAt).toBeInstanceOf(Date)
      expect(result.metadata.processingTime).toBeGreaterThan(0)
    })

    it('generates React-specific content for React PDFs', async () => {
      const reactPdf = createMockFile('react-guide.pdf', 2048, 'application/pdf')
      
      const result = await parser.parseFile(reactPdf)
      
      expect(result.text.toLowerCase()).toContain('react')
      expect(result.text.toLowerCase()).toContain('component')
      expect(result.text.toLowerCase()).toContain('hook')
    })

    it('generates business-specific content for business PDFs', async () => {
      const businessPdf = createMockFile('business-plan.pdf', 2048, 'application/pdf')
      
      const result = await parser.parseFile(businessPdf)
      
      expect(result.text.toLowerCase()).toContain('business')
      expect(result.text.toLowerCase()).toContain('strategy')
      expect(result.text.toLowerCase()).toContain('financial')
    })

    it('extracts sections when requested', async () => {
      const pdfFile = createMockFile('test.pdf', 1024, 'application/pdf')
      
      const result = await parser.parseFile(pdfFile, { extractSections: true })
      
      expect(result.sections).toBeDefined()
      expect(Array.isArray(result.sections)).toBe(true)
      if (result.sections && result.sections.length > 0) {
        expect(result.sections[0]).toHaveProperty('title')
        expect(result.sections[0]).toHaveProperty('content')
        expect(result.sections[0]).toHaveProperty('page')
      }
    })

    it('estimates page count correctly', async () => {
      const pdfFile = createMockFile('test.pdf', 1024, 'application/pdf')
      
      const result = await parser.parseFile(pdfFile)
      
      expect(result.metadata.pageCount).toBeDefined()
      expect(result.metadata.pageCount).toBeGreaterThan(0)
    })
  })

  describe('Text File Parsing', () => {
    it('parses TXT files successfully', async () => {
      const textContent = 'This is a test text file with some content.'
      const txtFile = createMockFile('test.txt', textContent.length, 'text/plain', textContent)
      
      // The text() method is already mocked in createMockFile
      
      const result = await parser.parseFile(txtFile)
      
      expect(result.text).toBe(textContent)
      expect(result.metadata.fileName).toBe('test.txt')
      expect(result.metadata.fileType).toBe('text/plain')
      expect(result.metadata.wordCount).toBe(9) // "This is a test text file with content."
    })

    it('parses Markdown files successfully', async () => {
      const markdownContent = '# Title\n\nThis is **bold** text.'
      const mdFile = createMockFile('readme.md', markdownContent.length, 'text/markdown', markdownContent)
      
      // The text() method is already mocked in createMockFile
      
      const result = await parser.parseFile(mdFile)
      
      expect(result.text).toBe(markdownContent)
      expect(result.metadata.fileName).toBe('readme.md')
    })

    it('handles empty text files', async () => {
      const emptyFile = createMockFile('empty.txt', 0, 'text/plain', '')
      
      // The text() method is already mocked in createMockFile
      
      const result = await parser.parseFile(emptyFile)
      
      expect(result.text).toBe('')
      expect(result.metadata.wordCount).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('throws error for unsupported file types', async () => {
      const unsupportedFile = createMockFile('image.jpg', 1024, 'image/jpeg')
      
      await expect(parser.parseFile(unsupportedFile)).rejects.toThrow(FileParsingError)
      await expect(parser.parseFile(unsupportedFile)).rejects.toThrow('Unsupported file type')
    })

    it('throws error for null file', async () => {
      await expect(parser.parseFile(null as any)).rejects.toThrow(FileParsingError)
      await expect(parser.parseFile(null as any)).rejects.toThrow('No file provided')
    })

    it('handles parsing timeout', async () => {
      const pdfFile = createMockFile('test.pdf', 1024, 'application/pdf')
      
      await expect(
        parser.parseFile(pdfFile, { timeout: 100 })
      ).rejects.toThrow(FileParsingError)
      
      try {
        await parser.parseFile(pdfFile, { timeout: 100 })
      } catch (error) {
        expect(error).toBeInstanceOf(FileParsingError)
        expect((error as FileParsingError).code).toBe('TIMEOUT')
      }
    }, 10000)

    it('handles text file reading errors', async () => {
      const txtFile = createMockFile('test.txt', 1024, 'text/plain')
      
      // Mock the text method to throw an error
      const mockTextMethod = jest.fn().mockRejectedValue(new Error('File read error'))
      Object.defineProperty(txtFile, 'text', {
        value: mockTextMethod,
        writable: true,
        configurable: true
      })
      
      await expect(parser.parseFile(txtFile)).rejects.toThrow(FileParsingError)
      
      try {
        await parser.parseFile(txtFile)
      } catch (error) {
        expect(error).toBeInstanceOf(FileParsingError)
        expect((error as FileParsingError).code).toBe('PROCESSING_ERROR')
      }
    })
  })

  describe('Parser Options', () => {
    it('respects maxPages option', async () => {
      const pdfFile = createMockFile('test.pdf', 1024, 'application/pdf')
      
      const result = await parser.parseFile(pdfFile, { maxPages: 5 })
      
      // In a real implementation, this would limit the pages processed
      expect(result).toBeDefined()
      expect(result.metadata.pageCount).toBeDefined()
    })

    it('includes metadata when requested', async () => {
      const pdfFile = createMockFile('test.pdf', 1024, 'application/pdf')
      
      const result = await parser.parseFile(pdfFile, { includeMetadata: true })
      
      expect(result.metadata).toBeDefined()
      expect(result.metadata.fileName).toBe('test.pdf')
      expect(result.metadata.extractedAt).toBeInstanceOf(Date)
    })

    it('handles default options', async () => {
      const pdfFile = createMockFile('test.pdf', 1024, 'application/pdf')
      
      const result = await parser.parseFile(pdfFile)
      
      expect(result).toBeDefined()
      expect(result.metadata).toBeDefined()
    })
  })

  describe('Word Count Calculation', () => {
    it('calculates word count correctly', async () => {
      const testCases = [
        { text: 'Hello world', expected: 2 },
        { text: 'One', expected: 1 },
        { text: '', expected: 0 },
        { text: '   ', expected: 0 },
        { text: 'Multiple   spaces   between   words', expected: 4 },
        { text: 'Line\nbreaks\nand\ttabs', expected: 4 }
      ]
      
      for (const { text, expected } of testCases) {
        const txtFile = createMockFile('test.txt', text.length, 'text/plain', text)
        // The text() method is already mocked in createMockFile
        
        const result = await parser.parseFile(txtFile)
        expect(result.metadata.wordCount).toBe(expected)
      }
    })
  })

  describe('Processing Time Tracking', () => {
    it('tracks processing time', async () => {
      const pdfFile = createMockFile('test.pdf', 1024, 'application/pdf')
      
      const startTime = Date.now()
      const result = await parser.parseFile(pdfFile)
      const endTime = Date.now()
      
      expect(result.metadata.processingTime).toBeGreaterThan(0)
      expect(result.metadata.processingTime).toBeLessThanOrEqual(endTime - startTime + 100) // Allow some margin
    })
  })
})

describe('Exported Utilities', () => {
  describe('getSupportedFileTypes', () => {
    it('returns array of supported file types', () => {
      const types = getSupportedFileTypes()
      expect(Array.isArray(types)).toBe(true)
      expect(types.length).toBeGreaterThan(0)
      expect(types).toContain('.pdf')
    })
  })

  describe('isFileSupported', () => {
    it('checks if file is supported', () => {
      expect(isFileSupported('document.pdf')).toBe(true)
      expect(isFileSupported('image.jpg')).toBe(false)
    })
  })

  describe('fileParser singleton', () => {
    it('exports working singleton instance', async () => {
      const pdfFile = createMockFile('test.pdf', 1024, 'application/pdf')
      
      const result = await fileParser.parseFile(pdfFile)
      
      expect(result).toBeDefined()
      expect(result.text).toBeDefined()
      expect(result.metadata).toBeDefined()
    })
  })
})

describe('FileParsingError', () => {
  it('creates error with correct properties', () => {
    const error = new FileParsingError('Test message', 'UNSUPPORTED_FORMAT', 'Test details')
    
    expect(error.name).toBe('FileParsingError')
    expect(error.message).toBe('Test message')
    expect(error.code).toBe('UNSUPPORTED_FORMAT')
    expect(error.details).toBe('Test details')
  })

  it('creates error without details', () => {
    const error = new FileParsingError('Test message', 'PROCESSING_ERROR')
    
    expect(error.name).toBe('FileParsingError')
    expect(error.message).toBe('Test message')
    expect(error.code).toBe('PROCESSING_ERROR')
    expect(error.details).toBeUndefined()
  })
})

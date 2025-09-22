/**
 * File Parser Library
 * 
 * Provides extensible file parsing capabilities with support for multiple formats.
 * Currently implements PDF text extraction with a stub architecture that can be
 * extended to support other formats like DOCX, TXT, etc.
 */

export interface ParsedContent {
  text: string
  metadata: {
    fileName: string
    fileSize: number
    fileType: string
    pageCount?: number
    wordCount: number
    extractedAt: Date
    processingTime: number
  }
  sections?: {
    title?: string
    content: string
    page?: number
  }[]
}

export interface ParserOptions {
  maxPages?: number
  includeMetadata?: boolean
  extractSections?: boolean
  timeout?: number // in milliseconds
}

export class FileParsingError extends Error {
  constructor(
    message: string,
    public code: 'UNSUPPORTED_FORMAT' | 'CORRUPTED_FILE' | 'TIMEOUT' | 'PROCESSING_ERROR',
    public details?: string
  ) {
    super(message)
    this.name = 'FileParsingError'
  }
}

/**
 * Abstract base class for file parsers
 */
abstract class BaseParser {
  abstract supportedTypes: string[]
  abstract parse(file: File, options?: ParserOptions): Promise<ParsedContent>
  
  protected validateFile(file: File): void {
    if (!file) {
      throw new FileParsingError('No file provided', 'PROCESSING_ERROR')
    }
    
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!this.supportedTypes.includes(fileExtension)) {
      throw new FileParsingError(
        `Unsupported file type: ${fileExtension}`,
        'UNSUPPORTED_FORMAT',
        `Supported types: ${this.supportedTypes.join(', ')}`
      )
    }
  }

  protected calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }
}

/**
 * PDF Parser Implementation
 * 
 * Currently uses a stub implementation that simulates PDF text extraction.
 * In production, this would integrate with a library like pdf-parse or PDF.js
 */
class PDFParser extends BaseParser {
  supportedTypes = ['.pdf']

  async parse(file: File, options: ParserOptions = {}): Promise<ParsedContent> {
    const startTime = Date.now()
    this.validateFile(file)

    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

      // Stub implementation - in production, this would use a real PDF parser
      const mockText = this.generateMockPDFContent(file.name)
      
      const processingTime = Date.now() - startTime
      const wordCount = this.calculateWordCount(mockText)

      const parsedContent: ParsedContent = {
        text: mockText,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/pdf',
          pageCount: Math.ceil(mockText.length / 2000), // Estimate pages
          wordCount,
          extractedAt: new Date(),
          processingTime
        }
      }

      // Add sections if requested
      if (options.extractSections) {
        parsedContent.sections = this.extractSections(mockText)
      }

      return parsedContent

    } catch (error) {
      throw new FileParsingError(
        'Failed to parse PDF file',
        'PROCESSING_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  private generateMockPDFContent(fileName: string): string {
    // Generate realistic mock content based on filename patterns
    const baseName = fileName.toLowerCase()
    
    if (baseName.includes('react') || baseName.includes('javascript')) {
      return `
# React and JavaScript Development Guide

## Introduction
React is a popular JavaScript library for building user interfaces, particularly web applications. It was developed by Facebook and has become one of the most widely used frontend frameworks.

## Core Concepts

### Components
React applications are built using components, which are reusable pieces of UI. Components can be functional or class-based, though functional components with hooks are now preferred.

### State Management
State in React refers to data that can change over time. The useState hook allows functional components to have local state.

### Props
Props (properties) are how data is passed from parent components to child components. They are read-only and help make components reusable.

### Hooks
Hooks are functions that let you use state and other React features in functional components. Common hooks include useState, useEffect, and useContext.

## Best Practices
- Keep components small and focused
- Use meaningful names for components and props
- Implement proper error boundaries
- Optimize performance with React.memo when needed
- Follow the principle of single responsibility

## Conclusion
React provides a powerful and flexible way to build modern web applications. Understanding its core concepts and best practices is essential for effective development.
      `.trim()
    }
    
    if (baseName.includes('business') || baseName.includes('finance')) {
      return `
# Business Strategy and Financial Planning

## Executive Summary
This document outlines key principles of business strategy and financial planning for modern organizations.

## Strategic Planning
Strategic planning involves setting long-term goals and determining the best approach to achieve them. It requires analysis of market conditions, competitive landscape, and internal capabilities.

### Market Analysis
Understanding your target market is crucial for business success. This includes:
- Customer demographics and behavior
- Market size and growth potential
- Competitive analysis
- Industry trends and disruptions

### Financial Projections
Accurate financial forecasting helps businesses make informed decisions about:
- Revenue projections
- Cost management
- Investment requirements
- Cash flow planning

## Implementation
Successful strategy implementation requires:
- Clear communication of goals
- Proper resource allocation
- Regular monitoring and adjustment
- Strong leadership and team alignment

## Conclusion
Effective business strategy combines thorough analysis, realistic planning, and disciplined execution to achieve sustainable growth and competitive advantage.
      `.trim()
    }

    // Default generic content
    return `
# Document Content

## Overview
This document contains important information that has been extracted from the uploaded PDF file.

## Main Content
The document discusses various topics and concepts that are relevant to the subject matter. It provides detailed explanations, examples, and practical insights that can be used for learning and reference purposes.

### Key Points
- Important concept 1: Detailed explanation of the first key concept
- Important concept 2: Comprehensive overview of the second key concept  
- Important concept 3: In-depth analysis of the third key concept

### Examples and Applications
The document includes practical examples that demonstrate how these concepts can be applied in real-world scenarios. These examples help illustrate the theoretical concepts with concrete implementations.

### Best Practices
Several best practices are outlined throughout the document, providing guidance on how to effectively implement and utilize the discussed concepts.

## Conclusion
The document concludes with a summary of the main points and recommendations for further study or implementation.
    `.trim()
  }

  private extractSections(text: string): ParsedContent['sections'] {
    const sections: NonNullable<ParsedContent['sections']> = []
    const lines = text.split('\n')
    let currentSection: { title?: string; content: string; page?: number } | null = null

    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Detect headings (lines starting with #)
      if (trimmedLine.startsWith('#')) {
        // Save previous section if exists
        if (currentSection) {
          sections.push(currentSection)
        }
        
        // Start new section
        currentSection = {
          title: trimmedLine.replace(/^#+\s*/, ''),
          content: '',
          page: Math.floor(sections.length / 3) + 1 // Estimate page numbers
        }
      } else if (currentSection && trimmedLine) {
        // Add content to current section
        currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine
      }
    }

    // Add final section
    if (currentSection) {
      sections.push(currentSection)
    }

    return sections
  }
}

/**
 * Text Parser Implementation
 * For plain text files
 */
class TextParser extends BaseParser {
  supportedTypes = ['.txt', '.md']

  async parse(file: File, options: ParserOptions = {}): Promise<ParsedContent> {
    const startTime = Date.now()
    this.validateFile(file)

    try {
      const text = await file.text()
      const processingTime = Date.now() - startTime
      const wordCount = this.calculateWordCount(text)

      return {
        text,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'text/plain',
          wordCount,
          extractedAt: new Date(),
          processingTime
        }
      }
    } catch (error) {
      throw new FileParsingError(
        'Failed to parse text file',
        'PROCESSING_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }
}

/**
 * Main FileParser class that delegates to appropriate parser based on file type
 */
export class FileParser {
  private parsers: BaseParser[] = [
    new PDFParser(),
    new TextParser()
  ]

  /**
   * Parse a file and extract its text content
   */
  async parseFile(file: File, options: ParserOptions = {}): Promise<ParsedContent> {
    if (!file) {
      throw new FileParsingError('No file provided', 'PROCESSING_ERROR')
    }
    
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    const parser = this.parsers.find(p => p.supportedTypes.includes(fileExtension))
    
    if (!parser) {
      throw new FileParsingError(
        `Unsupported file type: ${fileExtension}`,
        'UNSUPPORTED_FORMAT',
        `Supported types: ${this.getSupportedTypes().join(', ')}`
      )
    }

    // Apply timeout if specified
    if (options.timeout) {
      return Promise.race([
        parser.parse(file, options),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new FileParsingError('Parsing timeout', 'TIMEOUT')), options.timeout)
        )
      ])
    }

    return parser.parse(file, options)
  }

  /**
   * Get all supported file types
   */
  getSupportedTypes(): string[] {
    return this.parsers.flatMap(parser => parser.supportedTypes)
  }

  /**
   * Check if a file type is supported
   */
  isSupported(fileName: string): boolean {
    const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase()
    return this.getSupportedTypes().includes(fileExtension)
  }
}

// Export singleton instance
export const fileParser = new FileParser()

// Export utility functions
export const getSupportedFileTypes = () => fileParser.getSupportedTypes()
export const isFileSupported = (fileName: string) => fileParser.isSupported(fileName)

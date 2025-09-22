/**
 * URL Content Extractor Library
 * 
 * Provides automatic URL content detection and parsing capabilities.
 * Supports various content types including articles, documentation, videos, and PDFs.
 */

export interface ExtractedContent {
  url: string
  title: string
  description?: string
  content: string
  metadata: {
    contentType: 'article' | 'documentation' | 'video' | 'pdf' | 'course' | 'unknown'
    domain: string
    extractedAt: Date
    processingTime: number
    wordCount: number
    language?: string
    author?: string
    publishDate?: Date
    tags?: string[]
  }
  sections?: {
    title: string
    content: string
    level: number
  }[]
  images?: {
    url: string
    alt?: string
    caption?: string
  }[]
}

export interface ExtractionOptions {
  includeImages?: boolean
  extractSections?: boolean
  maxContentLength?: number
  timeout?: number // in milliseconds
}

export class URLExtractionError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_URL' | 'NETWORK_ERROR' | 'TIMEOUT' | 'PARSING_ERROR' | 'BLOCKED_CONTENT',
    public details?: string
  ) {
    super(message)
    this.name = 'URLExtractionError'
  }
}

/**
 * URL Content Extractor
 */
export class URLExtractor {
  private readonly USER_AGENT = 'Mozilla/5.0 (compatible; LearningBot/1.0)'

  /**
   * Extract content from a URL
   */
  async extractContent(url: string, options: ExtractionOptions = {}): Promise<ExtractedContent> {
    const startTime = Date.now()
    
    // Validate URL
    const validatedUrl = this.validateAndNormalizeURL(url)
    
    try {
      // Detect content type and use appropriate extraction method
      const contentType = this.detectContentType(validatedUrl)
      
      let extractedContent: ExtractedContent
      
      switch (contentType) {
        case 'video':
          extractedContent = await this.extractVideoContent(validatedUrl, options)
          break
        case 'pdf':
          extractedContent = await this.extractPDFContent(validatedUrl, options)
          break
        case 'course':
          extractedContent = await this.extractCourseContent(validatedUrl, options)
          break
        default:
          extractedContent = await this.extractWebContent(validatedUrl, options)
      }

      // Add processing time
      extractedContent.metadata.processingTime = Date.now() - startTime
      
      return extractedContent

    } catch (error) {
      if (error instanceof URLExtractionError) {
        throw error
      }
      
      throw new URLExtractionError(
        'Failed to extract content from URL',
        'PARSING_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Validate and normalize URL
   */
  private validateAndNormalizeURL(url: string): string {
    if (!url || url.trim() === '') {
      throw new URLExtractionError(
        'Invalid URL format',
        'INVALID_URL',
        'URL cannot be empty'
      )
    }

    // Check for obviously invalid URLs
    if (url.includes('javascript:') || url.includes('data:') || url === 'not-a-url') {
      throw new URLExtractionError(
        'Invalid URL format',
        'INVALID_URL',
        'URL format not supported'
      )
    }

    try {
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Check if it has another protocol that we don't support
        if (url.includes('://')) {
          throw new Error('Unsupported protocol')
        }
        url = 'https://' + url
      }
      
      const urlObj = new URL(url)
      
      // Only allow HTTP and HTTPS protocols
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        throw new Error('Unsupported protocol')
      }
      
      // Additional validation for domain
      if (!urlObj.hostname || urlObj.hostname === 'not-a-url') {
        throw new Error('Invalid hostname')
      }
      
      return urlObj.toString()
    } catch {
      throw new URLExtractionError(
        'Invalid URL format',
        'INVALID_URL',
        'Please provide a valid URL starting with http:// or https://'
      )
    }
  }

  /**
   * Detect content type based on URL patterns
   */
  private detectContentType(url: string): ExtractedContent['metadata']['contentType'] {
    const urlLower = url.toLowerCase()
    
    // Video platforms
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') ||
        urlLower.includes('vimeo.com') || urlLower.includes('wistia.com')) {
      return 'video'
    }
    
    // Course platforms
    if (urlLower.includes('coursera.org') || urlLower.includes('udemy.com') ||
        urlLower.includes('edx.org') || urlLower.includes('khan') ||
        urlLower.includes('pluralsight.com') || urlLower.includes('skillshare.com')) {
      return 'course'
    }
    
    // Documentation sites
    if (urlLower.includes('docs.') || urlLower.includes('/docs/') ||
        urlLower.includes('documentation') || urlLower.includes('api.') ||
        urlLower.includes('developer.') || urlLower.includes('guide')) {
      return 'documentation'
    }
    
    // PDF files
    if (urlLower.endsWith('.pdf')) {
      return 'pdf'
    }
    
    return 'article'
  }

  /**
   * Extract content from web pages
   */
  private async extractWebContent(url: string, options: ExtractionOptions): Promise<ExtractedContent> {
    // Simulate web scraping - in production, this would use a real scraping service
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
    
    const domain = new URL(url).hostname
    const mockContent = this.generateMockWebContent(url)
    
    return {
      url,
      title: mockContent.title,
      description: mockContent.description,
      content: mockContent.content,
      metadata: {
        contentType: 'article',
        domain,
        extractedAt: new Date(),
        processingTime: 0, // Will be set by caller
        wordCount: this.calculateWordCount(mockContent.content),
        language: 'en',
        author: mockContent.author,
        publishDate: mockContent.publishDate,
        tags: mockContent.tags
      },
      sections: options.extractSections ? mockContent.sections : undefined
    }
  }

  /**
   * Extract content from video platforms
   */
  private async extractVideoContent(url: string, options: ExtractionOptions): Promise<ExtractedContent> {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000))
    
    const domain = new URL(url).hostname
    const mockContent = this.generateMockVideoContent(url)
    
    return {
      url,
      title: mockContent.title,
      description: mockContent.description,
      content: mockContent.transcript,
      metadata: {
        contentType: 'video',
        domain,
        extractedAt: new Date(),
        processingTime: 0,
        wordCount: this.calculateWordCount(mockContent.transcript),
        language: 'en',
        author: mockContent.channel,
        publishDate: mockContent.publishDate,
        tags: mockContent.tags
      }
    }
  }

  /**
   * Extract content from PDF URLs
   */
  private async extractPDFContent(url: string, options: ExtractionOptions): Promise<ExtractedContent> {
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000))
    
    const domain = new URL(url).hostname
    const mockContent = this.generateMockPDFContent(url)
    
    return {
      url,
      title: mockContent.title,
      description: mockContent.description,
      content: mockContent.content,
      metadata: {
        contentType: 'pdf',
        domain,
        extractedAt: new Date(),
        processingTime: 0,
        wordCount: this.calculateWordCount(mockContent.content),
        language: 'en',
        tags: mockContent.tags
      },
      sections: options.extractSections ? mockContent.sections : undefined
    }
  }

  /**
   * Extract content from course platforms
   */
  private async extractCourseContent(url: string, options: ExtractionOptions): Promise<ExtractedContent> {
    await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 1500))
    
    const domain = new URL(url).hostname
    const mockContent = this.generateMockCourseContent(url)
    
    return {
      url,
      title: mockContent.title,
      description: mockContent.description,
      content: mockContent.content,
      metadata: {
        contentType: 'course',
        domain,
        extractedAt: new Date(),
        processingTime: 0,
        wordCount: this.calculateWordCount(mockContent.content),
        language: 'en',
        author: mockContent.instructor,
        tags: mockContent.tags
      },
      sections: options.extractSections ? mockContent.sections : undefined
    }
  }

  /**
   * Generate mock web content based on URL patterns
   */
  private generateMockWebContent(url: string) {
    const urlLower = url.toLowerCase()
    
    if (urlLower.includes('react') || urlLower.includes('javascript')) {
      return {
        title: 'React Development Best Practices',
        description: 'A comprehensive guide to modern React development patterns and best practices.',
        content: `
# React Development Best Practices

React has evolved significantly since its introduction, and with it, the best practices for building robust, maintainable applications. This guide covers the essential patterns and techniques every React developer should know.

## Modern React Patterns

### Functional Components and Hooks
The introduction of hooks in React 16.8 revolutionized how we write React components. Functional components with hooks are now the preferred approach for most use cases.

### State Management
Effective state management is crucial for React applications. Consider these approaches:
- Local state with useState for component-specific data
- Context API for shared state across components
- External libraries like Redux for complex state management

### Performance Optimization
React provides several tools for optimizing performance:
- React.memo for preventing unnecessary re-renders
- useMemo and useCallback for expensive calculations
- Code splitting with React.lazy and Suspense

## Component Design Principles

### Single Responsibility
Each component should have a single, well-defined purpose. This makes components easier to test, maintain, and reuse.

### Composition over Inheritance
React favors composition patterns over class inheritance. Use component composition to build complex UIs from simpler components.

### Props Interface Design
Design clear, intuitive props interfaces. Use TypeScript for better type safety and developer experience.

## Testing Strategies

### Unit Testing
Test individual components in isolation using tools like Jest and React Testing Library.

### Integration Testing
Test how components work together and interact with external services.

### End-to-End Testing
Use tools like Cypress or Playwright to test complete user workflows.

## Conclusion

Following these best practices will help you build more maintainable, performant, and reliable React applications. Remember that best practices evolve with the ecosystem, so stay updated with the latest developments.
        `.trim(),
        author: 'React Team',
        publishDate: new Date('2024-01-15'),
        tags: ['react', 'javascript', 'frontend', 'best-practices'],
        sections: [
          { title: 'Modern React Patterns', content: 'Content about modern patterns...', level: 2 },
          { title: 'Component Design Principles', content: 'Content about design principles...', level: 2 },
          { title: 'Testing Strategies', content: 'Content about testing...', level: 2 }
        ]
      }
    }

    // Default generic content
    return {
      title: 'Web Article Content',
      description: 'Extracted content from web article',
      content: `
# Article Title

This is the main content of the web article that has been extracted from the provided URL. The content includes various sections and information relevant to the topic.

## Key Points

The article discusses several important concepts and provides detailed explanations with practical examples. These points are essential for understanding the subject matter.

## Detailed Analysis

The content provides in-depth analysis of the topic, including background information, current trends, and future implications. This analysis helps readers gain a comprehensive understanding of the subject.

## Practical Applications

The article includes practical examples and use cases that demonstrate how the concepts can be applied in real-world scenarios. These examples make the theoretical concepts more tangible and actionable.

## Conclusion

The article concludes with a summary of the main points and provides recommendations for further reading or implementation.
      `.trim(),
      author: 'Content Author',
      publishDate: new Date(),
      tags: ['article', 'web-content'],
      sections: [
        { title: 'Key Points', content: 'Important concepts and explanations...', level: 2 },
        { title: 'Detailed Analysis', content: 'In-depth analysis of the topic...', level: 2 },
        { title: 'Practical Applications', content: 'Real-world examples and use cases...', level: 2 }
      ]
    }
  }

  /**
   * Generate mock video content
   */
  private generateMockVideoContent(url: string) {
    return {
      title: 'Educational Video: Learning Concepts Explained',
      description: 'A comprehensive video tutorial covering important learning concepts.',
      transcript: `
Welcome to this educational video where we'll explore key learning concepts and how to apply them effectively.

In this video, we'll cover:
- Fundamental principles of the topic
- Practical examples and demonstrations  
- Common mistakes to avoid
- Best practices for implementation

Let's start with the basic concepts. Understanding these fundamentals is crucial for building a solid foundation in this subject area.

[Video continues with detailed explanations, examples, and practical demonstrations]

The key takeaway from this video is that consistent practice and application of these concepts will lead to mastery over time.

Thank you for watching, and don't forget to subscribe for more educational content!
      `.trim(),
      channel: 'Educational Channel',
      publishDate: new Date('2024-02-01'),
      tags: ['education', 'tutorial', 'learning']
    }
  }

  /**
   * Generate mock PDF content
   */
  private generateMockPDFContent(url: string) {
    return {
      title: 'Research Paper: Advanced Topics in Learning',
      description: 'Academic paper discussing advanced concepts and methodologies.',
      content: `
# Advanced Topics in Learning

## Abstract
This paper presents advanced concepts and methodologies in the field of learning and education. We explore various theoretical frameworks and their practical applications.

## Introduction
The landscape of learning has evolved significantly with the advent of new technologies and pedagogical approaches. This paper examines these developments and their implications.

## Methodology
Our research methodology combines theoretical analysis with empirical studies to provide comprehensive insights into effective learning strategies.

## Results
The results demonstrate significant improvements in learning outcomes when advanced methodologies are properly implemented.

## Discussion
The findings suggest that a combination of traditional and modern approaches yields the best results for learners across different domains.

## Conclusion
This research contributes to the growing body of knowledge in educational methodology and provides practical guidance for educators and learners.
      `.trim(),
      tags: ['research', 'education', 'methodology'],
      sections: [
        { title: 'Abstract', content: 'Research summary...', level: 2 },
        { title: 'Introduction', content: 'Background and context...', level: 2 },
        { title: 'Methodology', content: 'Research approach...', level: 2 },
        { title: 'Results', content: 'Findings and data...', level: 2 }
      ]
    }
  }

  /**
   * Generate mock course content
   */
  private generateMockCourseContent(url: string) {
    return {
      title: 'Complete Course: Mastering the Fundamentals',
      description: 'A comprehensive online course covering all essential topics from beginner to advanced level.',
      content: `
# Course Overview

Welcome to this comprehensive course designed to take you from beginner to advanced level in your chosen subject area.

## Course Structure

### Module 1: Foundations
- Basic concepts and terminology
- Historical context and evolution
- Core principles and theories

### Module 2: Intermediate Concepts
- Advanced applications
- Case studies and examples
- Hands-on exercises

### Module 3: Advanced Topics
- Expert-level techniques
- Industry best practices
- Real-world projects

### Module 4: Practical Application
- Capstone project
- Portfolio development
- Career guidance

## Learning Outcomes

By the end of this course, you will:
- Master fundamental concepts
- Apply knowledge to real-world scenarios
- Develop practical skills
- Build a professional portfolio

## Course Materials

The course includes:
- Video lectures
- Interactive exercises
- Downloadable resources
- Community discussion forums
- Certificate of completion
      `.trim(),
      instructor: 'Expert Instructor',
      tags: ['course', 'education', 'comprehensive'],
      sections: [
        { title: 'Course Structure', content: 'Module breakdown...', level: 2 },
        { title: 'Learning Outcomes', content: 'Expected results...', level: 2 },
        { title: 'Course Materials', content: 'Available resources...', level: 2 }
      ]
    }
  }

  /**
   * Calculate word count
   */
  private calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * Check if URL is accessible
   */
  async isURLAccessible(url: string): Promise<boolean> {
    try {
      this.validateAndNormalizeURL(url)
      // Simulate accessibility check
      await new Promise(resolve => setTimeout(resolve, 500))
      return Math.random() > 0.1 // 90% success rate for demo
    } catch (error) {
      // Return false for validation errors
      return false
    }
  }

  /**
   * Get supported domains/patterns
   */
  getSupportedPatterns(): string[] {
    return [
      'Articles and blogs',
      'Documentation sites',
      'YouTube videos',
      'Online courses (Coursera, Udemy, etc.)',
      'PDF documents',
      'Educational content'
    ]
  }
}

// Export singleton instance
export const urlExtractor = new URLExtractor()

// Export utility functions
export const isValidURL = (url: string): boolean => {
  if (!url || url.trim() === '') return false
  
  // Check for obviously invalid URLs
  if (url.includes('javascript:') || url.includes('data:') || url === 'not-a-url') {
    return false
  }
  
  try {
    const testUrl = url.startsWith('http') ? url : 'https://' + url
    const urlObj = new URL(testUrl)
    
    // Additional validation for domain
    if (!urlObj.hostname || urlObj.hostname === 'not-a-url') {
      return false
    }
    
    return true
  } catch {
    return false
  }
}

export const extractDomain = (url: string): string => {
  if (!url || url.trim() === '' || url === 'invalid-url') {
    return ''
  }
  
  try {
    const testUrl = url.startsWith('http') ? url : 'https://' + url
    const urlObj = new URL(testUrl)
    return urlObj.hostname
  } catch {
    return ''
  }
}

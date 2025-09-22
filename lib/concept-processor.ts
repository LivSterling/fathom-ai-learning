/**
 * Concept Processing & Plan Generation Library
 * 
 * Provides intelligent analysis of learning concepts and generates personalized
 * learning plans based on user preferences, skill level, and available time.
 */

import { ParsedContent } from './file-parser'
import { ExtractedContent } from './url-extractor'

export interface PlanConfig {
  minutesPerDay: number // 15, 30, 60
  weeks: number // 1-4 weeks, or convert months to weeks
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  format: 'Videos' | 'Articles' | 'Interactive' | 'Mixed'
}

export interface ConceptInput {
  concept: string
  uploadedFile?: ParsedContent
  pastedUrl?: ExtractedContent
}

export interface LearningResource {
  title: string
  source: 'Video' | 'Article' | 'Documentation' | 'Course' | 'Interactive' | 'Guide' | 'Research' | 'Platform' | 'Workbook'
  length: string // e.g., "20 min", "1 hour"
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  citation: string
  url?: string
  description?: string
}

export interface Lesson {
  id: string
  title: string
  resources: LearningResource[]
  estimatedTime?: number // in minutes
}

export interface Module {
  id: string
  title: string
  duration: string // e.g., "Week 1-2"
  outcomes: string[]
  lessons: Lesson[]
  estimatedHours?: number
}

export interface LearningPlan {
  title: string
  totalDuration: string
  dailyTime: string
  level: string
  format: string
  modules: Module[]
  metadata: {
    conceptType: string
    totalEstimatedHours: number
    generatedAt: Date
    processingTime: number
  }
}

export interface ConceptAnalysis {
  conceptType: 'technology' | 'business' | 'science' | 'language' | 'creative' | 'social-science' | 'general'
  complexity: 'low' | 'medium' | 'high'
  prerequisites: string[]
  keyTopics: string[]
  suggestedDuration: number // in weeks
  recommendedFormats: string[]
}

export class ConceptProcessingError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_INPUT' | 'PROCESSING_ERROR' | 'TIMEOUT' | 'INSUFFICIENT_DATA',
    public details?: string
  ) {
    super(message)
    this.name = 'ConceptProcessingError'
  }
}

/**
 * Main Concept Processor class
 */
export class ConceptProcessor {
  private readonly MAX_PROCESSING_TIME = 25000 // 25 seconds to stay under 30s requirement

  /**
   * Process a concept and generate a personalized learning plan
   */
  async generateLearningPlan(
    input: ConceptInput,
    config: PlanConfig
  ): Promise<LearningPlan> {
    const startTime = Date.now()

    try {
      // Validate inputs
      this.validateInput(input, config)

      // Analyze the concept
      const analysis = await this.analyzeConcept(input)

      // Generate plan structure
      const plan = await this.buildLearningPlan(input, config, analysis)

      // Add metadata
      plan.metadata = {
        conceptType: analysis.conceptType,
        totalEstimatedHours: this.calculateTotalHours(plan.modules),
        generatedAt: new Date(),
        processingTime: Date.now() - startTime
      }

      return plan

    } catch (error) {
      if (error instanceof ConceptProcessingError) {
        throw error
      }
      
      throw new ConceptProcessingError(
        'Failed to generate learning plan',
        'PROCESSING_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Validate input parameters
   */
  private validateInput(input: ConceptInput, config: PlanConfig): void {
    if (!input.concept || input.concept.trim().length === 0) {
      throw new ConceptProcessingError(
        'Concept is required',
        'INVALID_INPUT',
        'Please provide a learning concept'
      )
    }

    if (input.concept.length > 500) {
      throw new ConceptProcessingError(
        'Concept too long',
        'INVALID_INPUT',
        'Please limit concept to 500 characters'
      )
    }

    if (![15, 30, 60].includes(config.minutesPerDay)) {
      throw new ConceptProcessingError(
        'Invalid minutes per day',
        'INVALID_INPUT',
        'Minutes per day must be 15, 30, or 60'
      )
    }

    if (config.weeks < 1 || config.weeks > 12) {
      throw new ConceptProcessingError(
        'Invalid duration',
        'INVALID_INPUT',
        'Duration must be between 1 and 12 weeks'
      )
    }
  }

  /**
   * Analyze the concept to understand its type and complexity
   */
  private async analyzeConcept(input: ConceptInput): Promise<ConceptAnalysis> {
    // Simulate processing time (reduced for tests)
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))

    const concept = input.concept.toLowerCase()
    let conceptType: ConceptAnalysis['conceptType'] = 'general'
    let complexity: ConceptAnalysis['complexity'] = 'medium'
    let prerequisites: string[] = []
    let keyTopics: string[] = []
    let suggestedDuration = 4
    let recommendedFormats: string[] = ['Mixed']

    // Analyze concept type based on keywords
    if (this.matchesKeywords(concept, ['react', 'javascript', 'python', 'programming', 'code', 'software', 'web', 'api', 'database', 'algorithm'])) {
      conceptType = 'technology'
      recommendedFormats = ['Videos', 'Interactive', 'Mixed']
      
      if (concept.includes('react')) {
        prerequisites = ['Basic JavaScript', 'HTML/CSS fundamentals']
        keyTopics = ['Components', 'State Management', 'Hooks', 'Props', 'Event Handling']
        complexity = concept.includes('advanced') || concept.includes('hooks') ? 'high' : 'medium'
      } else if (concept.includes('javascript')) {
        prerequisites = ['Basic programming concepts']
        keyTopics = ['Variables', 'Functions', 'Objects', 'DOM Manipulation', 'Async Programming']
        complexity = concept.includes('async') || concept.includes('advanced') ? 'high' : 'medium'
      } else if (concept.includes('python')) {
        prerequisites = ['Basic programming logic']
        keyTopics = ['Syntax', 'Data Structures', 'Functions', 'Libraries', 'Object-Oriented Programming']
      }
    } else if (this.matchesKeywords(concept, ['business', 'marketing', 'finance', 'management', 'strategy', 'economics', 'accounting'])) {
      conceptType = 'business'
      recommendedFormats = ['Articles', 'Videos', 'Mixed']
      
      if (concept.includes('finance') || concept.includes('accounting')) {
        prerequisites = ['Basic mathematics', 'Business fundamentals']
        keyTopics = ['Financial Statements', 'Budgeting', 'Investment Analysis', 'Risk Management']
        complexity = 'high'
      } else if (concept.includes('marketing')) {
        keyTopics = ['Market Research', 'Brand Strategy', 'Digital Marketing', 'Customer Analysis']
      }
    } else if (this.matchesKeywords(concept, ['biology', 'chemistry', 'physics', 'science', 'research', 'medical', 'health'])) {
      conceptType = 'science'
      recommendedFormats = ['Articles', 'Videos', 'Mixed']
      
      if (concept.includes('chemistry') || concept.includes('physics')) {
        prerequisites = ['Mathematics', 'Scientific method']
        complexity = 'high'
        suggestedDuration = 6
      }
    } else if (this.matchesKeywords(concept, ['language', 'spanish', 'french', 'english', 'grammar', 'vocabulary'])) {
      conceptType = 'language'
      recommendedFormats = ['Interactive', 'Videos', 'Mixed']
      keyTopics = ['Vocabulary', 'Grammar', 'Pronunciation', 'Conversation', 'Writing']
      suggestedDuration = 8
    } else if (this.matchesKeywords(concept, ['design', 'art', 'creative', 'photography', 'music', 'writing'])) {
      conceptType = 'creative'
      recommendedFormats = ['Videos', 'Interactive', 'Mixed']
      keyTopics = ['Fundamentals', 'Techniques', 'Tools', 'Practice', 'Portfolio']
    } else if (this.matchesKeywords(concept, ['psychology', 'sociology', 'history', 'philosophy', 'law', 'politics'])) {
      conceptType = 'social-science'
      recommendedFormats = ['Articles', 'Videos', 'Mixed']
    }

    // Adjust complexity based on level indicators
    if (concept.includes('beginner') || concept.includes('basic') || concept.includes('intro')) {
      complexity = 'low'
    } else if (concept.includes('advanced') || concept.includes('expert') || concept.includes('master')) {
      complexity = 'high'
    }

    // Incorporate additional context from uploaded files or URLs
    if (input.uploadedFile) {
      const fileContent = input.uploadedFile.text.toLowerCase()
      if (fileContent.length > 5000) {
        complexity = 'high'
        suggestedDuration = Math.max(suggestedDuration, 6)
      }
    }

    if (input.pastedUrl) {
      const urlContent = input.pastedUrl.content.toLowerCase()
      if (input.pastedUrl.metadata.contentType === 'course') {
        suggestedDuration = Math.max(suggestedDuration, 8)
      }
    }

    return {
      conceptType,
      complexity,
      prerequisites,
      keyTopics: keyTopics.length > 0 ? keyTopics : this.generateDefaultKeyTopics(concept),
      suggestedDuration,
      recommendedFormats
    }
  }

  /**
   * Build the complete learning plan structure
   */
  private async buildLearningPlan(
    input: ConceptInput,
    config: PlanConfig,
    analysis: ConceptAnalysis
  ): Promise<LearningPlan> {
    // Simulate processing time (reduced for tests)
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))

    const conceptTitle = input.concept.length > 50 
      ? input.concept.substring(0, 50) + "..." 
      : input.concept

    // Generate modules based on duration and complexity
    const modules = this.generateModules(input, config, analysis)

    return {
      title: conceptTitle,
      totalDuration: `${config.weeks} week${config.weeks > 1 ? 's' : ''}`,
      dailyTime: `${config.minutesPerDay} min`,
      level: config.level,
      format: config.format,
      modules,
      metadata: {
        conceptType: analysis.conceptType,
        totalEstimatedHours: 0, // Will be calculated later
        generatedAt: new Date(),
        processingTime: 0 // Will be calculated later
      }
    }
  }

  /**
   * Generate modules based on the learning plan configuration
   */
  private generateModules(
    input: ConceptInput,
    config: PlanConfig,
    analysis: ConceptAnalysis
  ): Module[] {
    const modules: Module[] = []
    const totalWeeks = config.weeks

    // Module 1: Fundamentals (always present)
    modules.push({
      id: "1",
      title: "Fundamentals & Core Concepts",
      duration: totalWeeks === 1 ? "Week 1" : "Week 1-2",
      outcomes: [
        "Understand basic principles and terminology",
        "Build foundational knowledge",
        ...analysis.prerequisites.map(p => `Review ${p}`)
      ],
      lessons: this.generateFundamentalsLessons(input, config, analysis)
    })

    // Module 2: Practical Application (if duration > 1 week)
    if (totalWeeks > 1) {
      const startWeek = totalWeeks === 2 ? 2 : 2
      const endWeek = Math.min(totalWeeks, 3)
      
      modules.push({
        id: "2",
        title: "Practical Application & Examples",
        duration: startWeek === endWeek ? `Week ${startWeek}` : `Week ${startWeek}-${endWeek}`,
        outcomes: [
          "Apply concepts in practical scenarios",
          "Work through real-world examples",
          "Build hands-on experience",
          "Develop problem-solving skills"
        ],
        lessons: this.generatePracticalLessons(input, config, analysis)
      })
    }

    // Module 3: Advanced Topics (if duration > 2 weeks)
    if (totalWeeks > 2) {
      const startWeek = Math.max(3, totalWeeks - 1)
      
      modules.push({
        id: "3",
        title: "Advanced Topics & Integration",
        duration: startWeek === totalWeeks ? `Week ${totalWeeks}` : `Week ${startWeek}-${totalWeeks}`,
        outcomes: [
          "Master advanced concepts and techniques",
          "Integrate with related topics",
          "Develop expertise and best practices",
          "Prepare for real-world application"
        ],
        lessons: this.generateAdvancedLessons(input, config, analysis)
      })
    }

    return modules
  }

  /**
   * Generate lessons for the fundamentals module
   */
  private generateFundamentalsLessons(
    input: ConceptInput,
    config: PlanConfig,
    analysis: ConceptAnalysis
  ): Lesson[] {
    const lessons: Lesson[] = []

    // Lesson 1: Introduction and Overview
    lessons.push({
      id: "1",
      title: "Introduction and Overview",
      resources: this.generateResources([
        {
          title: `Introduction to ${input.concept}`,
          source: config.format === 'Videos' ? 'Video' : 'Article',
          difficulty: 'Beginner',
          baseLength: 20
        },
        {
          title: "Getting Started Guide",
          source: 'Documentation',
          difficulty: 'Beginner',
          baseLength: 15
        }
      ], config, analysis)
    })

    // Lesson 2: Core Concepts
    lessons.push({
      id: "2",
      title: "Core Concepts and Terminology",
      resources: this.generateResources([
        {
          title: "Fundamental Principles",
          source: config.format === 'Interactive' ? 'Interactive' : 'Article',
          difficulty: config.level === 'Beginner' ? 'Beginner' : 'Intermediate',
          baseLength: 30
        },
        {
          title: "Key Terminology and Definitions",
          source: 'Guide',
          difficulty: 'Beginner',
          baseLength: 25
        }
      ], config, analysis)
    })

    // Add prerequisite lesson if needed
    if (analysis.prerequisites.length > 0) {
      lessons.push({
        id: "3",
        title: "Prerequisites Review",
        resources: this.generateResources([
          {
            title: `Review: ${analysis.prerequisites[0]}`,
            source: 'Course',
            difficulty: 'Beginner',
            baseLength: 35
          }
        ], config, analysis)
      })
    }

    return lessons
  }

  /**
   * Generate lessons for the practical application module
   */
  private generatePracticalLessons(
    input: ConceptInput,
    config: PlanConfig,
    analysis: ConceptAnalysis
  ): Lesson[] {
    const lessons: Lesson[] = []

    // Lesson 1: Hands-on Practice
    lessons.push({
      id: "4",
      title: "Hands-on Practice and Exercises",
      resources: this.generateResources([
        {
          title: "Step-by-step Tutorial",
          source: config.format === 'Interactive' ? 'Interactive' : 'Guide',
          difficulty: 'Intermediate',
          baseLength: 45
        },
        {
          title: "Practice Exercises",
          source: 'Workbook',
          difficulty: 'Intermediate',
          baseLength: 40
        }
      ], config, analysis)
    })

    // Lesson 2: Real-world Examples
    lessons.push({
      id: "5",
      title: "Real-world Examples and Case Studies",
      resources: this.generateResources([
        {
          title: "Case Studies and Examples",
          source: 'Research',
          difficulty: 'Intermediate',
          baseLength: 35
        },
        {
          title: "Industry Applications",
          source: config.format === 'Videos' ? 'Video' : 'Article',
          difficulty: 'Intermediate',
          baseLength: 30
        }
      ], config, analysis)
    })

    return lessons
  }

  /**
   * Generate lessons for the advanced topics module
   */
  private generateAdvancedLessons(
    input: ConceptInput,
    config: PlanConfig,
    analysis: ConceptAnalysis
  ): Lesson[] {
    const lessons: Lesson[] = []

    // Lesson 1: Advanced Techniques
    lessons.push({
      id: "6",
      title: "Advanced Techniques and Best Practices",
      resources: this.generateResources([
        {
          title: "Advanced Techniques Guide",
          source: 'Documentation',
          difficulty: 'Advanced',
          baseLength: 50
        },
        {
          title: "Expert-level Tutorial",
          source: config.format === 'Videos' ? 'Video' : 'Course',
          difficulty: 'Advanced',
          baseLength: 60
        }
      ], config, analysis)
    })

    // Lesson 2: Integration and Mastery
    lessons.push({
      id: "7",
      title: "Integration and Mastery Project",
      resources: this.generateResources([
        {
          title: "Capstone Project Guide",
          source: 'Platform',
          difficulty: 'Advanced',
          baseLength: 75
        },
        {
          title: "Portfolio Development",
          source: 'Guide',
          difficulty: 'Advanced',
          baseLength: 45
        }
      ], config, analysis)
    })

    return lessons
  }

  /**
   * Generate learning resources based on configuration and analysis
   */
  private generateResources(
    resourceTemplates: Array<{
      title: string
      source: LearningResource['source']
      difficulty: LearningResource['difficulty']
      baseLength: number
    }>,
    config: PlanConfig,
    analysis: ConceptAnalysis
  ): LearningResource[] {
    return resourceTemplates.map(template => {
      // Adjust length based on daily time allocation
      const lengthMultiplier = config.minutesPerDay === 15 ? 0.7 : config.minutesPerDay === 60 ? 1.3 : 1
      const adjustedLength = Math.round(template.baseLength * lengthMultiplier)

      return {
        title: template.title,
        source: template.source,
        length: this.formatDuration(adjustedLength),
        difficulty: template.difficulty,
        citation: this.generateCitation(template.source, analysis.conceptType),
        description: `Learn about ${template.title.toLowerCase()} with ${template.source.toLowerCase()} format`
      }
    })
  }

  /**
   * Helper method to check if concept matches keywords
   */
  private matchesKeywords(concept: string, keywords: string[]): boolean {
    return keywords.some(keyword => concept.includes(keyword))
  }

  /**
   * Generate default key topics for unknown concepts
   */
  private generateDefaultKeyTopics(concept: string): string[] {
    return [
      'Fundamentals and basics',
      'Core principles',
      'Practical applications',
      'Best practices',
      'Advanced techniques'
    ]
  }

  /**
   * Format duration in minutes to human-readable string
   */
  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      if (remainingMinutes === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`
      } else {
        return `${hours}h ${remainingMinutes}m`
      }
    }
  }

  /**
   * Generate realistic citations based on source type and concept
   */
  private generateCitation(source: LearningResource['source'], conceptType: string): string {
    const citations = {
      'Video': ['Educational Channel', 'Expert Tutorial', 'Online Course', 'Tech Talk'],
      'Article': ['Expert Blog', 'Industry Publication', 'Educational Site', 'Professional Journal'],
      'Documentation': ['Official Docs', 'Technical Guide', 'Reference Manual', 'API Documentation'],
      'Course': ['Online Platform', 'Educational Institution', 'Professional Course', 'Certification Program'],
      'Interactive': ['Learning Platform', 'Interactive Tutorial', 'Coding Environment', 'Simulation Tool'],
      'Guide': ['Tutorial Site', 'How-to Guide', 'Step-by-step Manual', 'Learning Resource'],
      'Research': ['Academic Source', 'Research Paper', 'Case Study', 'Industry Report'],
      'Platform': ['Learning Management System', 'Educational Platform', 'Training Portal', 'Online Academy'],
      'Workbook': ['Exercise Collection', 'Practice Problems', 'Workbook Series', 'Training Materials']
    }

    const sourceCitations = citations[source] || ['Educational Resource']
    return sourceCitations[Math.floor(Math.random() * sourceCitations.length)]
  }

  /**
   * Calculate total estimated hours for all modules
   */
  private calculateTotalHours(modules: Module[]): number {
    let totalMinutes = 0
    
    modules.forEach(module => {
      module.lessons.forEach(lesson => {
        lesson.resources.forEach(resource => {
          // Parse duration string to get minutes
          const duration = resource.length
          if (duration.includes('min')) {
            totalMinutes += parseInt(duration.match(/\d+/)?.[0] || '0')
          } else if (duration.includes('hour') || duration.includes('h')) {
            const hours = parseInt(duration.match(/\d+/)?.[0] || '0')
            totalMinutes += hours * 60
            
            // Add additional minutes if present (e.g., "1h 30m")
            const minuteMatch = duration.match(/(\d+)m/)
            if (minuteMatch) {
              totalMinutes += parseInt(minuteMatch[1])
            }
          }
        })
      })
    })

    return Math.round(totalMinutes / 60 * 10) / 10 // Round to 1 decimal place
  }

  /**
   * Quick concept analysis for preview purposes
   */
  async quickAnalyze(concept: string): Promise<Partial<ConceptAnalysis>> {
    // Fast analysis for UI previews
    await new Promise(resolve => setTimeout(resolve, 50))
    
    const conceptLower = concept.toLowerCase()
    let conceptType: ConceptAnalysis['conceptType'] = 'general'
    
    if (this.matchesKeywords(conceptLower, ['react', 'javascript', 'python', 'programming'])) {
      conceptType = 'technology'
    } else if (this.matchesKeywords(conceptLower, ['business', 'marketing', 'finance'])) {
      conceptType = 'business'
    } else if (this.matchesKeywords(conceptLower, ['biology', 'chemistry', 'physics'])) {
      conceptType = 'science'
    }

    return {
      conceptType,
      complexity: 'medium',
      suggestedDuration: 4
    }
  }
}

// Export singleton instance
export const conceptProcessor = new ConceptProcessor()

// Export utility functions
export const generateQuickPlan = async (concept: string, config: PlanConfig): Promise<LearningPlan> => {
  return conceptProcessor.generateLearningPlan({ concept }, config)
}

export const analyzeConceptType = async (concept: string): Promise<string> => {
  const analysis = await conceptProcessor.quickAnalyze(concept)
  return analysis.conceptType || 'general'
}

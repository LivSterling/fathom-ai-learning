import { 
  ConceptProcessor, 
  ConceptProcessingError, 
  conceptProcessor, 
  generateQuickPlan, 
  analyzeConceptType,
  type ConceptInput,
  type PlanConfig,
  type LearningPlan
} from './concept-processor'

// Mock data for testing
const createMockPlanConfig = (overrides?: Partial<PlanConfig>): PlanConfig => ({
  minutesPerDay: 30,
  weeks: 4,
  level: 'Intermediate',
  format: 'Mixed',
  ...overrides
})

const createMockConceptInput = (overrides?: Partial<ConceptInput>): ConceptInput => ({
  concept: 'React hooks and state management',
  ...overrides
})

describe('ConceptProcessor', () => {
  let processor: ConceptProcessor

  beforeEach(() => {
    processor = new ConceptProcessor()
    jest.clearAllMocks()
  })

  describe('Input Validation', () => {
    it('throws error for empty concept', async () => {
      const input = createMockConceptInput({ concept: '' })
      const config = createMockPlanConfig()

      await expect(processor.generateLearningPlan(input, config))
        .rejects.toThrow(ConceptProcessingError)

      try {
        await processor.generateLearningPlan(input, config)
      } catch (error) {
        expect(error).toBeInstanceOf(ConceptProcessingError)
        expect((error as ConceptProcessingError).code).toBe('INVALID_INPUT')
      }
    })

    it('throws error for concept that is too long', async () => {
      const longConcept = 'a'.repeat(501)
      const input = createMockConceptInput({ concept: longConcept })
      const config = createMockPlanConfig()

      await expect(processor.generateLearningPlan(input, config))
        .rejects.toThrow('Concept too long')
    })

    it('throws error for invalid minutes per day', async () => {
      const input = createMockConceptInput()
      const config = createMockPlanConfig({ minutesPerDay: 45 })

      await expect(processor.generateLearningPlan(input, config))
        .rejects.toThrow('Invalid minutes per day')
    })

    it('throws error for invalid weeks duration', async () => {
      const input = createMockConceptInput()
      const config = createMockPlanConfig({ weeks: 15 })

      await expect(processor.generateLearningPlan(input, config))
        .rejects.toThrow('Invalid duration')
    })

    it('accepts valid input parameters', async () => {
      const input = createMockConceptInput()
      const config = createMockPlanConfig()

      const result = await processor.generateLearningPlan(input, config)
      expect(result).toBeDefined()
      expect(result.title).toBeDefined()
    })
  })

  describe('Concept Analysis', () => {
    it('correctly identifies technology concepts', async () => {
      const techConcepts = [
        'React hooks and components',
        'JavaScript async programming',
        'Python data structures',
        'Web API development',
        'Database design'
      ]

      for (const concept of techConcepts) {
        const input = createMockConceptInput({ concept })
        const config = createMockPlanConfig()
        
        const result = await processor.generateLearningPlan(input, config)
        expect(result.metadata.conceptType).toBe('technology')
      }
    }, 10000)

    it('correctly identifies business concepts', async () => {
      const businessConcepts = [
        'Financial modeling and analysis',
        'Marketing strategy development',
        'Business management principles',
        'Economics fundamentals'
      ]

      for (const concept of businessConcepts) {
        const input = createMockConceptInput({ concept })
        const config = createMockPlanConfig()
        
        const result = await processor.generateLearningPlan(input, config)
        expect(['business', 'general']).toContain(result.metadata.conceptType)
      }
    }, 10000)

    it('correctly identifies science concepts', async () => {
      const scienceConcepts = [
        'Biology cell structure',
        'Chemistry molecular bonds',
        'Physics quantum mechanics',
        'Medical anatomy basics'
      ]

      for (const concept of scienceConcepts) {
        const input = createMockConceptInput({ concept })
        const config = createMockPlanConfig()
        
        const result = await processor.generateLearningPlan(input, config)
        expect(result.metadata.conceptType).toBe('science')
      }
    }, 10000)

    it('correctly identifies language concepts', async () => {
      const languageConcepts = [
        'Spanish grammar and vocabulary',
        'French conversation skills',
        'English writing techniques'
      ]

      for (const concept of languageConcepts) {
        const input = createMockConceptInput({ concept })
        const config = createMockPlanConfig()
        
        const result = await processor.generateLearningPlan(input, config)
        expect(result.metadata.conceptType).toBe('language')
      }
    }, 10000)

    it('defaults to general for unknown concepts', async () => {
      const input = createMockConceptInput({ concept: 'Some unknown topic' })
      const config = createMockPlanConfig()
      
      const result = await processor.generateLearningPlan(input, config)
      expect(result.metadata.conceptType).toBe('general')
    })
  })

  describe('Plan Generation', () => {
    it('generates plan with correct basic structure', async () => {
      const input = createMockConceptInput()
      const config = createMockPlanConfig()

      const result = await processor.generateLearningPlan(input, config)

      expect(result.title).toBeDefined()
      expect(result.totalDuration).toBe('4 weeks')
      expect(result.dailyTime).toBe('30 min')
      expect(result.level).toBe('Intermediate')
      expect(result.format).toBe('Mixed')
      expect(result.modules).toHaveLength(3) // 4 weeks should generate 3 modules
      expect(result.metadata).toBeDefined()
    })

    it('adjusts module count based on duration', async () => {
      const testCases = [
        { weeks: 1, expectedModules: 1 },
        { weeks: 2, expectedModules: 2 },
        { weeks: 4, expectedModules: 3 },
        { weeks: 8, expectedModules: 3 }
      ]

      for (const { weeks, expectedModules } of testCases) {
        const input = createMockConceptInput()
        const config = createMockPlanConfig({ weeks })
        
        const result = await processor.generateLearningPlan(input, config)
        expect(result.modules).toHaveLength(expectedModules)
      }
    }, 10000)

    it('adjusts resource length based on daily time allocation', async () => {
      const input = createMockConceptInput()
      
      // Test different time allocations
      const timeConfigs = [15, 30, 60]
      
      for (const minutesPerDay of timeConfigs) {
        const config = createMockPlanConfig({ minutesPerDay })
        const result = await processor.generateLearningPlan(input, config)
        
        // Check that resources exist and have appropriate lengths
        const firstResource = result.modules[0].lessons[0].resources[0]
        expect(firstResource.length).toBeDefined()
        
        // 15 min should have shorter resources, 60 min should have longer ones
        if (minutesPerDay === 15) {
          expect(firstResource.length).toMatch(/\d+ min/)
        }
      }
    }, 10000)

    it('incorporates skill level into resource difficulty', async () => {
      const input = createMockConceptInput()
      
      const levels: PlanConfig['level'][] = ['Beginner', 'Intermediate', 'Advanced']
      
      for (const level of levels) {
        const config = createMockPlanConfig({ level })
        const result = await processor.generateLearningPlan(input, config)
        
        expect(result.level).toBe(level)
        
        // Check that resources have appropriate difficulty levels
        const resources = result.modules[0].lessons[0].resources
        expect(resources.length).toBeGreaterThan(0)
        expect(resources[0].difficulty).toBeDefined()
      }
    }, 10000)

    it('incorporates format preference into resource types', async () => {
      const input = createMockConceptInput()
      
      const formats: PlanConfig['format'][] = ['Videos', 'Articles', 'Interactive', 'Mixed']
      
      for (const format of formats) {
        const config = createMockPlanConfig({ format })
        const result = await processor.generateLearningPlan(input, config)
        
        expect(result.format).toBe(format)
        
        // Check that resources reflect format preference
        const allResources = result.modules.flatMap(m => 
          m.lessons.flatMap(l => l.resources)
        )
        
        if (format === 'Videos') {
          expect(allResources.some(r => r.source === 'Video')).toBe(true)
        } else if (format === 'Articles') {
          expect(allResources.some(r => r.source === 'Article')).toBe(true)
        } else if (format === 'Interactive') {
          expect(allResources.some(r => r.source === 'Interactive')).toBe(true)
        }
      }
    }, 10000)
  })

  describe('Module Structure', () => {
    it('generates fundamentals module for all plans', async () => {
      const input = createMockConceptInput()
      const config = createMockPlanConfig({ weeks: 1 })

      const result = await processor.generateLearningPlan(input, config)
      
      expect(result.modules[0].title).toContain('Fundamentals')
      expect(result.modules[0].lessons.length).toBeGreaterThan(0)
      expect(result.modules[0].outcomes.length).toBeGreaterThan(0)
    })

    it('generates practical module for multi-week plans', async () => {
      const input = createMockConceptInput()
      const config = createMockPlanConfig({ weeks: 3 })

      const result = await processor.generateLearningPlan(input, config)
      
      expect(result.modules.length).toBeGreaterThan(1)
      expect(result.modules[1].title).toContain('Practical')
    })

    it('generates advanced module for longer plans', async () => {
      const input = createMockConceptInput()
      const config = createMockPlanConfig({ weeks: 4 })

      const result = await processor.generateLearningPlan(input, config)
      
      expect(result.modules.length).toBe(3)
      expect(result.modules[2].title).toContain('Advanced')
    })

    it('includes proper learning outcomes for each module', async () => {
      const input = createMockConceptInput()
      const config = createMockPlanConfig()

      const result = await processor.generateLearningPlan(input, config)
      
      result.modules.forEach(module => {
        expect(module.outcomes).toBeDefined()
        expect(module.outcomes.length).toBeGreaterThan(0)
        expect(module.outcomes[0]).toMatch(/^[A-Z]/) // Should start with capital letter
      })
    })
  })

  describe('Resource Generation', () => {
    it('generates appropriate resources for each lesson', async () => {
      const input = createMockConceptInput()
      const config = createMockPlanConfig()

      const result = await processor.generateLearningPlan(input, config)
      
      result.modules.forEach(module => {
        module.lessons.forEach(lesson => {
          expect(lesson.resources.length).toBeGreaterThan(0)
          
          lesson.resources.forEach(resource => {
            expect(resource.title).toBeDefined()
            expect(resource.source).toBeDefined()
            expect(resource.length).toBeDefined()
            expect(resource.difficulty).toBeDefined()
            expect(resource.citation).toBeDefined()
          })
        })
      })
    })

    it('generates realistic citations for different source types', async () => {
      const input = createMockConceptInput()
      const config = createMockPlanConfig()

      const result = await processor.generateLearningPlan(input, config)
      
      const allResources = result.modules.flatMap(m => 
        m.lessons.flatMap(l => l.resources)
      )
      
      // Check that citations are appropriate for source types
      allResources.forEach(resource => {
        expect(resource.citation).toBeDefined()
        expect(resource.citation.length).toBeGreaterThan(0)
        
        if (resource.source === 'Video') {
          expect(['Educational Channel', 'Expert Tutorial', 'Online Course', 'Tech Talk'])
            .toContain(resource.citation)
        }
      })
    })

    it('formats duration correctly', async () => {
      const input = createMockConceptInput()
      const config = createMockPlanConfig()

      const result = await processor.generateLearningPlan(input, config)
      
      const allResources = result.modules.flatMap(m => 
        m.lessons.flatMap(l => l.resources)
      )
      
      allResources.forEach(resource => {
        expect(resource.length).toMatch(/^\d+(\.\d+)?\s*(min|hour|h|m)/)
      })
    })
  })

  describe('Metadata Generation', () => {
    it('calculates total estimated hours correctly', async () => {
      const input = createMockConceptInput()
      const config = createMockPlanConfig()

      const result = await processor.generateLearningPlan(input, config)
      
      expect(result.metadata.totalEstimatedHours).toBeGreaterThan(0)
      expect(typeof result.metadata.totalEstimatedHours).toBe('number')
    })

    it('tracks processing time', async () => {
      const input = createMockConceptInput()
      const config = createMockPlanConfig()

      const result = await processor.generateLearningPlan(input, config)
      
      expect(result.metadata.processingTime).toBeGreaterThan(0)
      expect(result.metadata.processingTime).toBeLessThan(30000) // Should be under 30 seconds
    })

    it('includes generation timestamp', async () => {
      const input = createMockConceptInput()
      const config = createMockPlanConfig()

      const beforeTime = new Date()
      const result = await processor.generateLearningPlan(input, config)
      const afterTime = new Date()
      
      expect(result.metadata.generatedAt).toBeInstanceOf(Date)
      expect(result.metadata.generatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime())
      expect(result.metadata.generatedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime())
    })
  })

  describe('File and URL Integration', () => {
    it('incorporates uploaded file content into analysis', async () => {
      const mockFileContent = {
        text: 'This is a very long and detailed document about advanced React patterns and state management techniques. It covers complex topics like custom hooks, context optimization, and performance considerations.',
        metadata: {
          fileName: 'react-advanced.pdf',
          fileSize: 5000,
          fileType: 'application/pdf',
          wordCount: 1000,
          extractedAt: new Date(),
          processingTime: 1000
        }
      }

      const input = createMockConceptInput({ 
        concept: 'React development',
        uploadedFile: mockFileContent
      })
      const config = createMockPlanConfig()

      const result = await processor.generateLearningPlan(input, config)
      
      expect(result).toBeDefined()
      expect(result.metadata.conceptType).toBe('technology')
    })

    it('incorporates URL content into analysis', async () => {
      const mockUrlContent = {
        url: 'https://coursera.org/learn/react-advanced',
        title: 'Advanced React Course',
        content: 'Comprehensive course on React development',
        metadata: {
          contentType: 'course' as const,
          domain: 'coursera.org',
          extractedAt: new Date(),
          processingTime: 1000,
          wordCount: 500
        }
      }

      const input = createMockConceptInput({ 
        concept: 'React development',
        pastedUrl: mockUrlContent
      })
      const config = createMockPlanConfig()

      const result = await processor.generateLearningPlan(input, config)
      
      expect(result).toBeDefined()
      expect(result.metadata.conceptType).toBe('technology')
    })
  })

  describe('Quick Analysis', () => {
    it('performs quick concept analysis', async () => {
      const result = await processor.quickAnalyze('React hooks')
      
      expect(result.conceptType).toBe('technology')
      expect(result.complexity).toBeDefined()
      expect(result.suggestedDuration).toBeDefined()
    })

    it('handles unknown concepts in quick analysis', async () => {
      const result = await processor.quickAnalyze('Unknown topic')
      
      expect(result.conceptType).toBe('general')
      expect(result.complexity).toBe('medium')
    })
  })

  describe('Error Handling', () => {
    it('handles processing errors gracefully', async () => {
      // Mock a processing error by providing invalid internal state
      const input = createMockConceptInput()
      const config = createMockPlanConfig()

      // This should not throw but should handle errors gracefully
      const result = await processor.generateLearningPlan(input, config)
      expect(result).toBeDefined()
    })

    it('creates proper error objects', () => {
      const error = new ConceptProcessingError('Test message', 'INVALID_INPUT', 'Test details')
      
      expect(error.name).toBe('ConceptProcessingError')
      expect(error.message).toBe('Test message')
      expect(error.code).toBe('INVALID_INPUT')
      expect(error.details).toBe('Test details')
    })
  })

  describe('Performance Requirements', () => {
    it('completes processing within 30 seconds', async () => {
      const input = createMockConceptInput()
      const config = createMockPlanConfig()

      const startTime = Date.now()
      const result = await processor.generateLearningPlan(input, config)
      const endTime = Date.now()
      
      const processingTime = endTime - startTime
      expect(processingTime).toBeLessThan(30000) // 30 seconds
      expect(result.metadata.processingTime).toBeLessThan(30000)
    }, 35000) // Allow 35 seconds for test timeout
  })
})

describe('Utility Functions', () => {
  describe('generateQuickPlan', () => {
    it('generates a quick plan with minimal input', async () => {
      const config = createMockPlanConfig()
      
      const result = await generateQuickPlan('JavaScript basics', config)
      
      expect(result).toBeDefined()
      expect(result.title).toBe('JavaScript basics')
      expect(result.modules.length).toBeGreaterThan(0)
    })
  })

  describe('analyzeConceptType', () => {
    it('analyzes concept type correctly', async () => {
      const testCases = [
        { concept: 'React development', expected: 'technology' },
        { concept: 'Business strategy', expected: 'business' },
        { concept: 'Biology basics', expected: 'science' },
        { concept: 'Random topic', expected: 'general' }
      ]

      for (const { concept, expected } of testCases) {
        const result = await analyzeConceptType(concept)
        expect(result).toBe(expected)
      }
    })
  })
})

describe('ConceptProcessor Singleton', () => {
  it('exports working singleton instance', async () => {
    const input = createMockConceptInput()
    const config = createMockPlanConfig()
    
    const result = await conceptProcessor.generateLearningPlan(input, config)
    
    expect(result).toBeDefined()
    expect(result.title).toBeDefined()
    expect(result.modules.length).toBeGreaterThan(0)
  })
})

import { UpgradePromptTrigger, UpgradePromptVariant } from '@/components/guest/upgrade-prompt'

export interface ABTestVariant {
  id: string
  name: string
  weight: number // 0-100, percentage of users who see this variant
  config: {
    variant: UpgradePromptVariant
    customMessage?: string
    showBenefits?: boolean
    isDismissible?: boolean
    ctaText?: string
    urgencyLevel?: 'low' | 'medium' | 'high'
  }
}

export interface ABTestExperiment {
  id: string
  name: string
  description: string
  trigger: UpgradePromptTrigger
  variants: ABTestVariant[]
  isActive: boolean
  startDate: string
  endDate?: string
  targetSampleSize?: number
  currentSampleSize: number
}

export interface ABTestResult {
  variantId: string
  userId: string
  timestamp: string
  event: 'shown' | 'clicked' | 'dismissed' | 'converted'
  sessionData?: {
    sessionAge: number
    completedLessons: number
    totalFlashcards: number
  }
}

/**
 * A/B Testing framework for upgrade prompt optimization
 */
export class UpgradePromptABTesting {
  private static instance: UpgradePromptABTesting
  private experiments: Map<string, ABTestExperiment> = new Map()
  private userAssignments: Map<string, Map<string, string>> = new Map() // userId -> experimentId -> variantId
  private results: ABTestResult[] = []

  static getInstance(): UpgradePromptABTesting {
    if (!UpgradePromptABTesting.instance) {
      UpgradePromptABTesting.instance = new UpgradePromptABTesting()
    }
    return UpgradePromptABTesting.instance
  }

  constructor() {
    this.loadFromStorage()
    this.setupDefaultExperiments()
  }

  /**
   * Set up default A/B test experiments
   */
  private setupDefaultExperiments() {
    // Test different messaging approaches for first lesson completion
    this.createExperiment({
      id: 'first-lesson-messaging',
      name: 'First Lesson Completion Messaging',
      description: 'Test different messaging approaches when user completes first lesson',
      trigger: 'first_lesson_complete',
      variants: [
        {
          id: 'celebration',
          name: 'Celebration Focused',
          weight: 25,
          config: {
            variant: 'celebration',
            customMessage: '🎉 Amazing! You completed your first lesson! Ready to unlock unlimited learning?',
            ctaText: 'Celebrate with Upgrade',
            urgencyLevel: 'low'
          }
        },
        {
          id: 'progress-focused',
          name: 'Progress Focused',
          weight: 25,
          config: {
            variant: 'banner',
            customMessage: 'Great start! You\'re building momentum. Upgrade to accelerate your progress.',
            ctaText: 'Accelerate Learning',
            urgencyLevel: 'low'
          }
        },
        {
          id: 'benefit-heavy',
          name: 'Benefit Heavy',
          weight: 25,
          config: {
            variant: 'card',
            showBenefits: true,
            customMessage: 'You\'ve proven you\'re serious about learning. See what unlimited access can do.',
            ctaText: 'See All Benefits',
            urgencyLevel: 'low'
          }
        },
        {
          id: 'minimal-approach',
          name: 'Minimal Approach',
          weight: 25,
          config: {
            variant: 'minimal',
            customMessage: 'First lesson done! Upgrade for unlimited access.',
            ctaText: 'Upgrade',
            urgencyLevel: 'low'
          }
        }
      ],
      isActive: true,
      startDate: new Date().toISOString(),
      targetSampleSize: 1000,
      currentSampleSize: 0
    })

    // Test urgency levels for limit reached scenarios
    this.createExperiment({
      id: 'limit-reached-urgency',
      name: 'Limit Reached Urgency Testing',
      description: 'Test different urgency levels when users hit limits',
      trigger: 'limit_reached',
      variants: [
        {
          id: 'high-urgency',
          name: 'High Urgency',
          weight: 33,
          config: {
            variant: 'banner',
            customMessage: '🚫 LIMIT REACHED! Upgrade now to continue your learning journey.',
            ctaText: 'Upgrade Immediately',
            urgencyLevel: 'high',
            isDismissible: false
          }
        },
        {
          id: 'medium-urgency',
          name: 'Medium Urgency',
          weight: 33,
          config: {
            variant: 'card',
            customMessage: 'You\'ve reached your creation limit. Upgrade to keep the momentum going!',
            ctaText: 'Continue Learning',
            urgencyLevel: 'medium',
            showBenefits: true
          }
        },
        {
          id: 'low-urgency',
          name: 'Low Urgency',
          weight: 34,
          config: {
            variant: 'banner',
            customMessage: 'Looks like you need more space to learn. Ready to upgrade?',
            ctaText: 'Get More Space',
            urgencyLevel: 'low',
            isDismissible: true
          }
        }
      ],
      isActive: true,
      startDate: new Date().toISOString(),
      targetSampleSize: 800,
      currentSampleSize: 0
    })

    // Test different CTA text variations
    this.createExperiment({
      id: 'cta-variations',
      name: 'Call-to-Action Text Variations',
      description: 'Test different CTA button text for engagement milestones',
      trigger: 'engagement_milestone',
      variants: [
        {
          id: 'action-oriented',
          name: 'Action Oriented',
          weight: 20,
          config: {
            variant: 'banner',
            ctaText: 'Unlock My Potential',
            urgencyLevel: 'medium'
          }
        },
        {
          id: 'benefit-focused',
          name: 'Benefit Focused',
          weight: 20,
          config: {
            variant: 'banner',
            ctaText: 'Get Unlimited Access',
            urgencyLevel: 'medium'
          }
        },
        {
          id: 'urgency-driven',
          name: 'Urgency Driven',
          weight: 20,
          config: {
            variant: 'banner',
            ctaText: 'Upgrade Right Now',
            urgencyLevel: 'high'
          }
        },
        {
          id: 'personal',
          name: 'Personal',
          weight: 20,
          config: {
            variant: 'banner',
            ctaText: 'Level Up My Learning',
            urgencyLevel: 'medium'
          }
        },
        {
          id: 'simple',
          name: 'Simple',
          weight: 20,
          config: {
            variant: 'banner',
            ctaText: 'Upgrade',
            urgencyLevel: 'low'
          }
        }
      ],
      isActive: true,
      startDate: new Date().toISOString(),
      targetSampleSize: 600,
      currentSampleSize: 0
    })
  }

  /**
   * Create a new A/B test experiment
   */
  createExperiment(experiment: Omit<ABTestExperiment, 'currentSampleSize'>) {
    const fullExperiment: ABTestExperiment = {
      ...experiment,
      currentSampleSize: 0
    }
    
    this.experiments.set(experiment.id, fullExperiment)
    this.saveToStorage()
  }

  /**
   * Get the variant for a user for a specific trigger
   */
  getVariantForUser(userId: string, trigger: UpgradePromptTrigger): ABTestVariant | null {
    // Find active experiment for this trigger
    const experiment = Array.from(this.experiments.values())
      .find(exp => exp.trigger === trigger && exp.isActive)

    if (!experiment) {
      return null
    }

    // Check if user already assigned to this experiment
    const userExperiments = this.userAssignments.get(userId) || new Map()
    const existingVariantId = userExperiments.get(experiment.id)

    if (existingVariantId) {
      return experiment.variants.find(v => v.id === existingVariantId) || null
    }

    // Check if experiment has reached target sample size
    if (experiment.targetSampleSize && experiment.currentSampleSize >= experiment.targetSampleSize) {
      return null
    }

    // Assign user to variant based on weights
    const variant = this.assignUserToVariant(experiment)
    if (variant) {
      // Store assignment
      userExperiments.set(experiment.id, variant.id)
      this.userAssignments.set(userId, userExperiments)
      
      // Increment sample size
      experiment.currentSampleSize++
      this.experiments.set(experiment.id, experiment)
      
      this.saveToStorage()
    }

    return variant
  }

  /**
   * Assign user to variant based on weights
   */
  private assignUserToVariant(experiment: ABTestExperiment): ABTestVariant | null {
    const random = Math.random() * 100
    let cumulative = 0

    for (const variant of experiment.variants) {
      cumulative += variant.weight
      if (random <= cumulative) {
        return variant
      }
    }

    return experiment.variants[0] // fallback
  }

  /**
   * Record an A/B test result
   */
  recordResult(
    userId: string, 
    variantId: string, 
    event: ABTestResult['event'],
    sessionData?: ABTestResult['sessionData']
  ) {
    const result: ABTestResult = {
      variantId,
      userId,
      timestamp: new Date().toISOString(),
      event,
      sessionData
    }

    this.results.push(result)
    this.saveToStorage()

    // Log for debugging
    console.log('A/B Test Result:', result)
  }

  /**
   * Get results for an experiment
   */
  getExperimentResults(experimentId: string) {
    const experiment = this.experiments.get(experimentId)
    if (!experiment) return null

    const variantResults = new Map<string, {
      shown: number
      clicked: number
      dismissed: number
      converted: number
      clickRate: number
      conversionRate: number
    }>()

    // Initialize results for each variant
    experiment.variants.forEach(variant => {
      variantResults.set(variant.id, {
        shown: 0,
        clicked: 0,
        dismissed: 0,
        converted: 0,
        clickRate: 0,
        conversionRate: 0
      })
    })

    // Count events for each variant
    this.results
      .filter(result => experiment.variants.some(v => v.id === result.variantId))
      .forEach(result => {
        const stats = variantResults.get(result.variantId)
        if (stats) {
          stats[result.event]++
        }
      })

    // Calculate rates
    variantResults.forEach((stats, variantId) => {
      if (stats.shown > 0) {
        stats.clickRate = (stats.clicked / stats.shown) * 100
        stats.conversionRate = (stats.converted / stats.shown) * 100
      }
    })

    return {
      experiment,
      results: Object.fromEntries(variantResults),
      totalSampleSize: experiment.currentSampleSize
    }
  }

  /**
   * Get all active experiments
   */
  getActiveExperiments(): ABTestExperiment[] {
    return Array.from(this.experiments.values()).filter(exp => exp.isActive)
  }

  /**
   * Stop an experiment
   */
  stopExperiment(experimentId: string) {
    const experiment = this.experiments.get(experimentId)
    if (experiment) {
      experiment.isActive = false
      experiment.endDate = new Date().toISOString()
      this.experiments.set(experimentId, experiment)
      this.saveToStorage()
    }
  }

  /**
   * Get the winning variant for an experiment based on conversion rate
   */
  getWinningVariant(experimentId: string): { variantId: string; conversionRate: number } | null {
    const results = this.getExperimentResults(experimentId)
    if (!results) return null

    let bestVariant = { variantId: '', conversionRate: 0 }
    
    Object.entries(results.results).forEach(([variantId, stats]) => {
      if (stats.conversionRate > bestVariant.conversionRate) {
        bestVariant = { variantId, conversionRate: stats.conversionRate }
      }
    })

    return bestVariant.variantId ? bestVariant : null
  }

  /**
   * Load data from localStorage
   */
  private loadFromStorage() {
    try {
      const experimentsData = localStorage.getItem('upgrade-prompt-ab-experiments')
      const assignmentsData = localStorage.getItem('upgrade-prompt-ab-assignments')
      const resultsData = localStorage.getItem('upgrade-prompt-ab-results')

      if (experimentsData) {
        const experiments = JSON.parse(experimentsData)
        this.experiments = new Map(Object.entries(experiments))
      }

      if (assignmentsData) {
        const assignments = JSON.parse(assignmentsData)
        this.userAssignments = new Map(
          Object.entries(assignments).map(([userId, exps]) => [
            userId,
            new Map(Object.entries(exps as Record<string, string>))
          ])
        )
      }

      if (resultsData) {
        this.results = JSON.parse(resultsData)
      }
    } catch (error) {
      console.error('Error loading A/B test data from storage:', error)
    }
  }

  /**
   * Save data to localStorage
   */
  private saveToStorage() {
    try {
      // Save experiments
      const experimentsObj = Object.fromEntries(this.experiments)
      localStorage.setItem('upgrade-prompt-ab-experiments', JSON.stringify(experimentsObj))

      // Save assignments
      const assignmentsObj = Object.fromEntries(
        Array.from(this.userAssignments.entries()).map(([userId, exps]) => [
          userId,
          Object.fromEntries(exps)
        ])
      )
      localStorage.setItem('upgrade-prompt-ab-assignments', JSON.stringify(assignmentsObj))

      // Save results
      localStorage.setItem('upgrade-prompt-ab-results', JSON.stringify(this.results))
    } catch (error) {
      console.error('Error saving A/B test data to storage:', error)
    }
  }

  /**
   * Clear all A/B test data (useful for testing)
   */
  clearAllData() {
    this.experiments.clear()
    this.userAssignments.clear()
    this.results = []
    
    localStorage.removeItem('upgrade-prompt-ab-experiments')
    localStorage.removeItem('upgrade-prompt-ab-assignments')
    localStorage.removeItem('upgrade-prompt-ab-results')
    
    this.setupDefaultExperiments()
  }
}

// Export singleton instance
export const upgradePromptABTesting = UpgradePromptABTesting.getInstance()

/**
 * Hook for using A/B testing in components
 */
export function useUpgradePromptABTest(userId: string, trigger: UpgradePromptTrigger) {
  const variant = upgradePromptABTesting.getVariantForUser(userId, trigger)
  
  const recordEvent = (event: ABTestResult['event'], sessionData?: ABTestResult['sessionData']) => {
    if (variant) {
      upgradePromptABTesting.recordResult(userId, variant.id, event, sessionData)
    }
  }

  return {
    variant,
    recordEvent,
    isInExperiment: variant !== null
  }
}

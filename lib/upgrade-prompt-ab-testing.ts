import { UpgradePromptTrigger } from '@/types/guest'

export interface ABTestVariant {
  id: string
  name: string
  config: {
    variant: 'banner' | 'card' | 'minimal' | 'celebration'
    showBenefits: boolean
    isDismissible: boolean
    urgency: 'low' | 'medium' | 'high'
  }
  weight: number
}

export interface ABTestExperiment {
  id: string
  name: string
  trigger: UpgradePromptTrigger
  variants: ABTestVariant[]
  isActive: boolean
}

// Mock A/B test experiments
const experiments: ABTestExperiment[] = [
  {
    id: 'limit-reached-test',
    name: 'Limit Reached Prompt Variants',
    trigger: 'limit_reached',
    variants: [
      {
        id: 'control',
        name: 'Standard Banner',
        config: {
          variant: 'banner',
          showBenefits: true,
          isDismissible: true,
          urgency: 'high'
        },
        weight: 50
      },
      {
        id: 'variant-a',
        name: 'Urgent Card',
        config: {
          variant: 'card',
          showBenefits: false,
          isDismissible: false,
          urgency: 'high'
        },
        weight: 50
      }
    ],
    isActive: true
  }
]

/**
 * Simple A/B testing hook for upgrade prompts
 */
export function useUpgradePromptABTest(guestId: string, trigger: UpgradePromptTrigger) {
  // Find active experiment for this trigger
  const experiment = experiments.find(exp => exp.trigger === trigger && exp.isActive)
  
  if (!experiment) {
    // No experiment running, return default
    return {
      variant: null,
      isInExperiment: false,
      recordEvent: () => {},
      getExperimentData: () => null
    }
  }

  // Simple hash-based assignment (consistent for same guestId)
  const hash = guestId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  
  const hashValue = Math.abs(hash) % 100
  let cumulativeWeight = 0
  let selectedVariant = experiment.variants[0] // fallback
  
  for (const variant of experiment.variants) {
    cumulativeWeight += variant.weight
    if (hashValue < cumulativeWeight) {
      selectedVariant = variant
      break
    }
  }

  // Record event (in real app, this would go to analytics)
  const recordEvent = (eventType: 'shown' | 'clicked' | 'dismissed', metadata?: any) => {
    console.log('A/B Test Event:', {
      experimentId: experiment.id,
      variantId: selectedVariant.id,
      eventType,
      guestId,
      metadata
    })
  }

  return {
    variant: selectedVariant,
    isInExperiment: true,
    recordEvent,
    getExperimentData: () => ({
      experimentId: experiment.id,
      variantId: selectedVariant.id,
      variantName: selectedVariant.name
    })
  }
}
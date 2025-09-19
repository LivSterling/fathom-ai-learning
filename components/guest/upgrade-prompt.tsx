'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Crown, 
  X, 
  Sparkles, 
  Zap,
  TrendingUp,
  Clock,
  BookOpen,
  Target,
  Star
} from 'lucide-react'
import { useGuestSession } from '@/hooks/use-guest-session'
import { useGuestLimitEnforcement } from '@/lib/guest-limit-enforcer'

export type UpgradePromptTrigger = 
  | 'first_lesson_complete'
  | 'approaching_limits' 
  | 'limit_reached'
  | 'advanced_feature_access'
  | 'time_based'
  | 'engagement_milestone'

export type UpgradePromptVariant = 
  | 'banner'
  | 'card' 
  | 'minimal'
  | 'celebration'

interface UpgradePromptProps {
  trigger: UpgradePromptTrigger
  variant?: UpgradePromptVariant
  onUpgrade: () => void
  onDismiss?: () => void
  isDismissible?: boolean
  autoShow?: boolean
  className?: string
  customMessage?: string
  showBenefits?: boolean
}

interface PromptContent {
  title: string
  message: string
  icon: typeof Crown
  urgency: 'low' | 'medium' | 'high'
  benefits: string[]
  ctaText: string
}

export function UpgradePrompt({
  trigger,
  variant = 'banner',
  onUpgrade,
  onDismiss,
  isDismissible = true,
  autoShow = true,
  className = '',
  customMessage,
  showBenefits = true
}: UpgradePromptProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const { session, shouldShowUpgradePrompt, getProgressSummary } = useGuestSession()
  const { hasReachedLimits, getCurrentLimits, isGuest } = useGuestLimitEnforcement()

  // Don't show for non-guest users
  if (!isGuest || !session) return null

  // Check if prompt should be shown based on trigger
  useEffect(() => {
    if (!autoShow || isDismissed) return

    const shouldShow = shouldShowUpgradePrompt(trigger)
    setIsVisible(shouldShow)
  }, [trigger, autoShow, isDismissed, shouldShowUpgradePrompt])

  // Get content based on trigger type
  const getPromptContent = (): PromptContent => {
    const limits = getCurrentLimits()
    const progress = getProgressSummary()

    switch (trigger) {
      case 'first_lesson_complete':
        return {
          title: '🎉 Great start!',
          message: customMessage || 'You completed your first lesson! Upgrade to unlock unlimited learning and sync across devices.',
          icon: Star,
          urgency: 'low',
          benefits: [
            'Unlimited lessons & flashcards',
            'Sync across all devices',
            'Advanced progress tracking'
          ],
          ctaText: 'Upgrade Now'
        }

      case 'approaching_limits':
        const approachingType = Object.entries(limits.percentages)
          .find(([_, percentage]) => percentage >= 80)?.[0] || 'content'
        return {
          title: 'Almost at your limit',
          message: customMessage || `You're approaching your ${approachingType} limit. Upgrade to continue creating without restrictions.`,
          icon: TrendingUp,
          urgency: 'medium',
          benefits: [
            'Remove all creation limits',
            'Advanced learning features',
            'Priority support'
          ],
          ctaText: 'Upgrade to Continue'
        }

      case 'limit_reached':
        return {
          title: 'Creation limit reached',
          message: customMessage || 'You\'ve reached your guest limits. Upgrade now to continue learning and creating.',
          icon: Zap,
          urgency: 'high',
          benefits: [
            'Unlimited everything',
            'Never lose your progress',
            'Advanced AI features'
          ],
          ctaText: 'Upgrade Now'
        }

      case 'advanced_feature_access':
        return {
          title: 'Unlock advanced features',
          message: customMessage || 'This feature is available with an upgraded account. Join thousands of learners already benefiting.',
          icon: Crown,
          urgency: 'medium',
          benefits: [
            'Advanced AI tutoring',
            'Personalized insights',
            'Collaboration tools'
          ],
          ctaText: 'Unlock Features'
        }

      case 'time_based':
        return {
          title: 'Ready to level up?',
          message: customMessage || `You've been learning for ${Math.ceil((Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days. Time to unlock your full potential!`,
          icon: Clock,
          urgency: 'low',
          benefits: [
            'Unlimited content creation',
            'Cross-device synchronization',
            'Detailed analytics'
          ],
          ctaText: 'Upgrade Account'
        }

      case 'engagement_milestone':
        return {
          title: 'You\'re on fire! 🔥',
          message: customMessage || `${progress.completedLessons} lessons completed! You're clearly serious about learning. Upgrade to accelerate your progress.`,
          icon: Target,
          urgency: 'low',
          benefits: [
            'Unlimited lesson creation',
            'Advanced progress tracking',
            'Achievement system'
          ],
          ctaText: 'Accelerate Learning'
        }

      default:
        return {
          title: 'Upgrade your learning',
          message: customMessage || 'Get unlimited access to all features and accelerate your learning journey.',
          icon: Crown,
          urgency: 'medium',
          benefits: [
            'Unlimited content',
            'Sync everywhere',
            'Premium support'
          ],
          ctaText: 'Upgrade Now'
        }
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    setIsVisible(false)
    if (onDismiss) {
      onDismiss()
    }
    
    // Store dismissal in localStorage to prevent re-showing too soon
    const dismissalKey = `upgrade-prompt-dismissed-${trigger}`
    localStorage.setItem(dismissalKey, Date.now().toString())
  }

  const handleUpgrade = () => {
    onUpgrade()
    // Track upgrade click analytics
    if (session) {
      // TODO: Add analytics tracking
      console.log('Upgrade prompt clicked', { trigger, variant })
    }
  }

  if (!isVisible) return null

  const content = getPromptContent()
  const IconComponent = content.icon

  // Get styling based on urgency
  const getUrgencyStyles = () => {
    switch (content.urgency) {
      case 'high':
        return {
          container: 'border-red-200 bg-gradient-to-r from-red-50 to-orange-50',
          icon: 'bg-red-100 text-red-600',
          button: 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
        }
      case 'medium':
        return {
          container: 'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50',
          icon: 'bg-amber-100 text-amber-600',
          button: 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700'
        }
      default:
        return {
          container: 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50',
          icon: 'bg-blue-100 text-blue-600',
          button: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
        }
    }
  }

  const styles = getUrgencyStyles()

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg border ${styles.container} ${className}`}>
        <div className="flex items-center space-x-3">
          <div className={`p-1.5 rounded-full ${styles.icon}`}>
            <IconComponent className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium text-gray-900">
            {content.message}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            size="sm" 
            onClick={handleUpgrade}
            className={`text-xs ${styles.button}`}
          >
            {content.ctaText}
          </Button>
          {isDismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="p-1 h-auto text-gray-400 hover:text-gray-600"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className={`rounded-lg border p-6 ${styles.container} ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-full ${styles.icon}`}>
              <IconComponent className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">{content.title}</h3>
                <Badge variant="secondary" className="text-xs">
                  Guest Mode
                </Badge>
              </div>
              <p className="text-sm text-gray-600 max-w-md">
                {content.message}
              </p>
              {showBenefits && (
                <ul className="text-xs text-gray-500 space-y-1 mt-3">
                  {content.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <Sparkles className="h-3 w-3 text-blue-500" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {isDismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="p-1 h-auto text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-4 flex space-x-3">
          <Button 
            onClick={handleUpgrade}
            className={styles.button}
          >
            <Crown className="h-4 w-4 mr-2" />
            {content.ctaText}
          </Button>
        </div>
      </div>
    )
  }

  if (variant === 'celebration') {
    return (
      <Alert className={`${styles.container} ${className}`}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${styles.icon}`}>
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-semibold text-gray-900">{content.title}</span>
                <Badge variant="secondary" className="text-xs">Guest</Badge>
              </div>
              <AlertDescription className="text-gray-600">
                {content.message}
              </AlertDescription>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={handleUpgrade}
              size="sm"
              className={styles.button}
            >
              <Crown className="h-4 w-4 mr-1" />
              {content.ctaText}
            </Button>
            {isDismissible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="p-1 h-auto text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Alert>
    )
  }

  // Default banner variant
  return (
    <Alert className={`${styles.container} ${className}`}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${styles.icon}`}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-semibold text-gray-900">{content.title}</span>
              <Badge variant="secondary" className="text-xs">Guest Mode</Badge>
            </div>
            <AlertDescription className="text-gray-600">
              {content.message}
            </AlertDescription>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={handleUpgrade}
            size="sm"
            className={styles.button}
          >
            <Crown className="h-4 w-4 mr-1" />
            {content.ctaText}
          </Button>
          {isDismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="p-1 h-auto text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Alert>
  )
}

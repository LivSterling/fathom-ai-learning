'use client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Crown, 
  Sparkles, 
  Check, 
  X,
  BookOpen,
  CreditCard,
  FileText,
  Zap,
  Globe,
  BarChart3,
  Shield
} from 'lucide-react'
import { ContentType } from '@/lib/guest-limit-enforcer'
import { useGuestLimitEnforcement } from '@/lib/guest-limit-enforcer'

interface GuestLimitReachedModalProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade: () => void
  contentType: ContentType
  attemptedAction?: string
}

export function GuestLimitReachedModal({
  isOpen,
  onClose,
  onUpgrade,
  contentType,
  attemptedAction
}: GuestLimitReachedModalProps) {
  const { limits } = useGuestLimitEnforcement()

  const getContentIcon = () => {
    switch (contentType) {
      case 'plan':
        return FileText
      case 'lesson':
        return BookOpen
      case 'flashcard':
        return CreditCard
      default:
        return FileText
    }
  }

  const getContentDetails = () => {
    switch (contentType) {
      case 'plan':
        return {
          title: 'Learning Plans',
          current: limits.current.maxPlans,
          max: limits.max.maxPlans,
          description: 'You\'ve created the maximum number of learning plans allowed for guest users.'
        }
      case 'lesson':
        return {
          title: 'Lessons',
          current: limits.current.maxLessons,
          max: limits.max.maxLessons,
          description: 'You\'ve reached the lesson limit for guest users.'
        }
      case 'flashcard':
        return {
          title: 'Flashcards',
          current: limits.current.maxFlashcards,
          max: limits.max.maxFlashcards,
          description: 'You\'ve created the maximum number of flashcards allowed for guest users.'
        }
      default:
        return {
          title: 'Content',
          current: 0,
          max: 0,
          description: 'You\'ve reached your creation limit.'
        }
    }
  }

  const ContentIcon = getContentIcon()
  const contentDetails = getContentDetails()
  const percentage = Math.round((contentDetails.current / contentDetails.max) * 100)

  const upgradeFeatures = [
    {
      icon: Zap,
      title: 'Unlimited Creation',
      description: 'Create unlimited plans, lessons, and flashcards'
    },
    {
      icon: Globe,
      title: 'Sync Across Devices',
      description: 'Access your content from any device, anywhere'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Track your progress with detailed insights'
    },
    {
      icon: Shield,
      title: 'Priority Support',
      description: 'Get help when you need it most'
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-red-100 rounded-full">
              <ContentIcon className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-left">
                {contentDetails.title} Limit Reached
              </DialogTitle>
              <Badge variant="secondary" className="mt-1">
                Guest Mode
              </Badge>
            </div>
          </div>
          <DialogDescription className="text-left">
            {contentDetails.description}
            {attemptedAction && (
              <span className="block mt-2 font-medium">
                Action blocked: {attemptedAction}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Current Usage Display */}
        <div className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Current Usage</span>
            <span className="text-sm text-muted-foreground">
              {contentDetails.current} / {contentDetails.max}
            </span>
          </div>
          <Progress 
            value={percentage} 
            className="h-2"
            style={{ 
              '--progress-background': 'rgb(239 68 68)' // red-500
            } as React.CSSProperties}
          />
          <div className="text-xs text-muted-foreground mt-1">
            {percentage}% of guest limit used
          </div>
        </div>

        {/* Upgrade Benefits */}
        <div className="py-4 border-t">
          <div className="flex items-center space-x-2 mb-3">
            <Crown className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-sm">Upgrade Benefits</span>
          </div>
          <div className="space-y-3">
            {upgradeFeatures.map((feature, index) => {
              const FeatureIcon = feature.icon
              return (
                <div key={index} className="flex items-start space-x-3">
                  <div className="p-1 bg-blue-100 rounded-full mt-0.5">
                    <FeatureIcon className="h-3 w-3 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{feature.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {feature.description}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">Ready to unlock your potential?</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Join thousands of learners who've upgraded to accelerate their learning journey.
          </p>
          <div className="flex items-center space-x-2 text-xs text-green-600">
            <Check className="h-3 w-3" />
            <span>30-day money-back guarantee</span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Continue as Guest
          </Button>
          <Button 
            onClick={onUpgrade}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

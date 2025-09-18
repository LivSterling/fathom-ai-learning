'use client'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, BookOpen, CreditCard, FileText, Sparkles } from 'lucide-react'
import { useGuestSession } from '@/hooks/use-guest-session'
import { GUEST_LIMITS } from '@/types/guest'

interface GuestProgressIndicatorProps {
  variant?: 'default' | 'compact' | 'banner'
  showUpgradeButton?: boolean
  onUpgradeClick?: () => void
  className?: string
}

export function GuestProgressIndicator({ 
  variant = 'default',
  showUpgradeButton = true,
  onUpgradeClick,
  className = ''
}: GuestProgressIndicatorProps) {
  const { limits, hasReachedLimits, isGuest } = useGuestSession()

  // Don't render if user is not a guest
  if (!isGuest) return null

  const { current, max, percentages } = limits

  // Progress data for each limit type
  const progressData = [
    {
      type: 'flashcards',
      label: 'Flashcards',
      current: current.maxFlashcards,
      max: max.maxFlashcards,
      percentage: percentages.maxFlashcards,
      icon: CreditCard,
      color: percentages.maxFlashcards >= 80 ? 'text-red-500' : percentages.maxFlashcards >= 60 ? 'text-yellow-500' : 'text-green-500',
      progressColor: percentages.maxFlashcards >= 80 ? 'bg-red-500' : percentages.maxFlashcards >= 60 ? 'bg-yellow-500' : 'bg-green-500'
    },
    {
      type: 'lessons',
      label: 'Lessons',
      current: current.maxLessons,
      max: max.maxLessons,
      percentage: percentages.maxLessons,
      icon: BookOpen,
      color: percentages.maxLessons >= 80 ? 'text-red-500' : percentages.maxLessons >= 60 ? 'text-yellow-500' : 'text-green-500',
      progressColor: percentages.maxLessons >= 80 ? 'bg-red-500' : percentages.maxLessons >= 60 ? 'bg-yellow-500' : 'bg-green-500'
    },
    {
      type: 'plans',
      label: 'Learning Plans',
      current: current.maxPlans,
      max: max.maxPlans,
      percentage: percentages.maxPlans,
      icon: FileText,
      color: percentages.maxPlans >= 80 ? 'text-red-500' : percentages.maxPlans >= 60 ? 'text-yellow-500' : 'text-green-500',
      progressColor: percentages.maxPlans >= 80 ? 'bg-red-500' : percentages.maxPlans >= 60 ? 'bg-yellow-500' : 'bg-green-500'
    }
  ]

  // Check if any limits are reached
  const hasAnyLimitsReached = hasReachedLimits.any
  const approachingLimits = progressData.some(item => item.percentage >= 80)

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Guest Mode</h3>
              <p className="text-sm text-gray-600">
                {hasAnyLimitsReached 
                  ? 'You\'ve reached your creation limits!' 
                  : approachingLimits 
                    ? 'You\'re approaching your creation limits'
                    : 'Create and learn without limits by upgrading'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex space-x-4">
              {progressData.map((item) => (
                <div key={item.type} className="text-center">
                  <div className="text-sm font-medium text-gray-900">
                    {item.current}/{item.max}
                  </div>
                  <div className="text-xs text-gray-500">{item.label}</div>
                </div>
              ))}
            </div>
            
            {showUpgradeButton && (
              <Button 
                onClick={onUpgradeClick}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Upgrade Now
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                Guest Mode
              </Badge>
              {hasAnyLimitsReached && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
            {showUpgradeButton && (
              <Button 
                onClick={onUpgradeClick}
                size="sm"
                variant="outline"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                Upgrade
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {progressData.map((item) => {
              const IconComponent = item.icon
              return (
                <div key={item.type} className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <IconComponent className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {item.current}/{item.max}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{item.label}</div>
                  <div className="mt-1">
                    <Progress 
                      value={item.percentage} 
                      className="h-1"
                      style={{ 
                        '--progress-background': item.progressColor 
                      } as React.CSSProperties}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default variant - full detailed view
  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <span>Guest Mode Progress</span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              Free
            </Badge>
          </div>
          {showUpgradeButton && (
            <Button 
              onClick={onUpgradeClick}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Upgrade to Pro
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {hasAnyLimitsReached && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <h4 className="font-medium text-red-800">Creation Limit Reached</h4>
                <p className="text-sm text-red-600">
                  You've reached your creation limits. Upgrade to continue creating unlimited content.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {progressData.map((item) => {
            const IconComponent = item.icon
            const isLimitReached = item.current >= item.max
            
            return (
              <div key={item.type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <IconComponent className={`h-4 w-4 ${item.color}`} />
                    <span className="font-medium text-gray-900">{item.label}</span>
                    {isLimitReached && (
                      <Badge variant="destructive" className="text-xs">
                        Limit Reached
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-600">
                    {item.current} / {item.max}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <Progress 
                    value={item.percentage} 
                    className="h-2"
                    style={{ 
                      '--progress-background': item.progressColor 
                    } as React.CSSProperties}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{item.percentage}% used</span>
                    <span>
                      {item.max - item.current} remaining
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <Sparkles className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-800">Upgrade Benefits</h4>
              <ul className="text-sm text-blue-600 mt-1 space-y-1">
                <li>• Unlimited flashcards and lessons</li>
                <li>• Sync across all devices</li>
                <li>• Advanced analytics and insights</li>
                <li>• Priority support</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

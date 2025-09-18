'use client'

import { useState, useCallback } from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Crown, Info } from 'lucide-react'
import { useGuestLimitEnforcement, ContentType } from '@/lib/guest-limit-enforcer'

interface GuestLimitWarningProps {
  contentType: ContentType
  onUpgradeClick?: () => void
  variant?: 'inline' | 'alert' | 'badge' | 'minimal'
  showUpgradeButton?: boolean
  className?: string
}

export function GuestLimitWarning({ 
  contentType,
  onUpgradeClick,
  variant = 'inline',
  showUpgradeButton = true,
  className = ''
}: GuestLimitWarningProps) {
  const { checkLimit, shouldShowWarning, getUpgradeMessage, isGuest } = useGuestLimitEnforcement()

  // Don't render if user is not a guest
  if (!isGuest) return null

  const limitCheck = checkLimit(contentType)
  const showWarning = shouldShowWarning(contentType)
  const upgradeMessage = getUpgradeMessage(contentType)

  // Don't render if no warning needed and not at limit
  if (!showWarning && !limitCheck.limitReached && variant !== 'minimal') return null

  // Get color based on usage
  const getColor = () => {
    if (limitCheck.limitReached) return 'text-red-500'
    if (limitCheck.remaining <= 2) return 'text-orange-500'
    if (showWarning) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getProgressColor = () => {
    if (limitCheck.limitReached) return 'bg-red-500'
    if (limitCheck.remaining <= 2) return 'bg-orange-500'
    if (showWarning) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const percentage = Math.round((limitCheck.current / limitCheck.max) * 100)

  if (variant === 'badge') {
    return (
      <Badge 
        variant={limitCheck.limitReached ? 'destructive' : showWarning ? 'secondary' : 'outline'}
        className={`${className} ${getColor()}`}
      >
        {limitCheck.current}/{limitCheck.max} {contentType}s
      </Badge>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center space-x-2 text-sm ${className}`}>
        <div className={`${getColor()}`}>
          {limitCheck.current}/{limitCheck.max}
        </div>
        <div className="w-16 h-1">
          <Progress 
            value={percentage} 
            className="h-1"
            style={{ 
              '--progress-background': getProgressColor().replace('bg-', '')
            } as React.CSSProperties}
          />
        </div>
        {limitCheck.limitReached && (
          <AlertTriangle className="h-3 w-3 text-red-500" />
        )}
      </div>
    )
  }

  if (variant === 'alert') {
    return (
      <Alert variant={limitCheck.limitReached ? 'destructive' : 'default'} className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{limitCheck.message || upgradeMessage}</span>
          {showUpgradeButton && onUpgradeClick && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onUpgradeClick}
            >
              <Crown className="h-3 w-3 mr-1" />
              Upgrade
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  // Default inline variant
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${className} ${
      limitCheck.limitReached 
        ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' 
        : showWarning 
          ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
          : 'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800'
    }`}>
      <div className="flex items-center space-x-3">
        {limitCheck.limitReached ? (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        ) : showWarning ? (
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        ) : (
          <Info className="h-4 w-4 text-gray-500" />
        )}
        
        <div>
          <div className="font-medium text-sm capitalize">
            {contentType} Limit
          </div>
          <div className="text-xs text-muted-foreground">
            {limitCheck.current} of {limitCheck.max} used
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="flex flex-col items-end space-y-1">
          <div className="text-xs text-muted-foreground">
            {limitCheck.remaining} remaining
          </div>
          <div className="w-20">
            <Progress 
              value={percentage} 
              className="h-2"
              style={{ 
                '--progress-background': getProgressColor().replace('bg-', '')
              } as React.CSSProperties}
            />
          </div>
        </div>

        {showUpgradeButton && onUpgradeClick && (
          <Button 
            variant={limitCheck.limitReached ? 'default' : 'outline'} 
            size="sm"
            onClick={onUpgradeClick}
          >
            <Crown className="h-3 w-3 mr-1" />
            {limitCheck.limitReached ? 'Upgrade Now' : 'Upgrade'}
          </Button>
        )}
      </div>
    </div>
  )
}

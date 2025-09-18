'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Clock, 
  Flame, 
  Crown,
  BookOpen,
  CreditCard,
  FileText
} from 'lucide-react'
import { useGuestProgress } from '@/hooks/use-guest-progress'
import { GuestProgressIndicator } from './guest-progress-indicator'

interface GuestProgressDashboardProps {
  variant?: 'full' | 'compact' | 'summary'
  onUpgradeClick?: () => void
  showUpgradePrompts?: boolean
  className?: string
}

export function GuestProgressDashboard({ 
  variant = 'full',
  onUpgradeClick,
  showUpgradePrompts = true,
  className = ''
}: GuestProgressDashboardProps) {
  const {
    progressStats,
    milestones,
    recentAchievements,
    nextMilestone,
    insights,
    warnings,
    isGuest,
    hasData
  } = useGuestProgress()

  if (!isGuest || !hasData || !progressStats) return null

  if (variant === 'summary') {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm">Learning Progress</h3>
            <Badge variant="secondary" className="text-xs">
              Guest Mode
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">
                {progressStats.plans.total}
              </div>
              <div className="text-xs text-muted-foreground">Plans</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {progressStats.lessons.completed}
              </div>
              <div className="text-xs text-muted-foreground">Lessons</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">
                {progressStats.flashcards.total}
              </div>
              <div className="text-xs text-muted-foreground">Cards</div>
            </div>
          </div>

          {progressStats.overall.nearingLimits && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between text-xs">
                <span className="text-orange-600">Approaching limits</span>
                {showUpgradePrompts && onUpgradeClick && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-6 px-2 text-xs"
                    onClick={onUpgradeClick}
                  >
                    Upgrade
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-semibold">{progressStats.plans.total}</div>
                  <div className="text-xs text-muted-foreground">
                    Plans ({progressStats.plans.remaining} left)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-green-600" />
                <div>
                  <div className="font-semibold">{progressStats.lessons.completed}</div>
                  <div className="text-xs text-muted-foreground">
                    Completed
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-purple-600" />
                <div>
                  <div className="font-semibold">{progressStats.flashcards.total}</div>
                  <div className="text-xs text-muted-foreground">
                    Flashcards
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Flame className="h-4 w-4 text-orange-600" />
                <div>
                  <div className="font-semibold">{progressStats.streaks.current}</div>
                  <div className="text-xs text-muted-foreground">
                    Day streak
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Limits */}
        <GuestProgressIndicator 
          variant="compact"
          onUpgradeClick={onUpgradeClick}
          showUpgradeButton={showUpgradePrompts}
        />

        {/* Warnings */}
        {warnings.length > 0 && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="p-4">
              <div className="flex items-start space-x-2">
                <Target className="h-4 w-4 text-orange-600 mt-0.5" />
                <div className="space-y-1">
                  {warnings.map((warning, index) => (
                    <div key={index} className="text-sm text-orange-800 dark:text-orange-200">
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Full variant
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{progressStats.plans.total}</div>
                <div className="text-sm text-muted-foreground">Learning Plans</div>
                <div className="text-xs text-blue-600">
                  {progressStats.plans.remaining} remaining
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-full">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{progressStats.lessons.completed}</div>
                <div className="text-sm text-muted-foreground">Lessons Completed</div>
                <div className="text-xs text-green-600">
                  {progressStats.lessons.completionRate}% completion rate
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-full">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{progressStats.flashcards.total}</div>
                <div className="text-sm text-muted-foreground">Flashcards</div>
                <div className="text-xs text-purple-600">
                  {progressStats.flashcards.correctRate}% accuracy
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-orange-100 rounded-full">
                <Flame className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{progressStats.streaks.current}</div>
                <div className="text-sm text-muted-foreground">Day Streak</div>
                <div className="text-xs text-orange-600">
                  {progressStats.timeSpent.average} min/day avg
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Progress Indicator */}
      <GuestProgressIndicator 
        variant="default"
        onUpgradeClick={onUpgradeClick}
        showUpgradeButton={showUpgradePrompts}
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <span>Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAchievements.length > 0 ? (
              <div className="space-y-3">
                {recentAchievements.slice(0, 3).map((achievement) => (
                  <div key={achievement.id} className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 rounded-full">
                      <Trophy className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{achievement.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {achievement.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <div className="text-sm text-muted-foreground">
                  Complete your first lesson to earn achievements!
                </div>
              </div>
            )}
            
            {nextMilestone && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium mb-2">Next Goal</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{nextMilestone.title}</span>
                    <span className="text-muted-foreground">
                      {nextMilestone.current}/{nextMilestone.requirement}
                    </span>
                  </div>
                  <Progress value={nextMilestone.progress} className="h-2" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights & Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.slice(0, 3).map((insight, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="p-1 bg-green-100 rounded-full mt-0.5">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  </div>
                  <div className="text-sm">{insight}</div>
                </div>
              ))}
              
              {warnings.length > 0 && (
                <div className="pt-3 border-t space-y-2">
                  {warnings.slice(0, 2).map((warning, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="p-1 bg-orange-100 rounded-full mt-0.5">
                        <Target className="h-3 w-3 text-orange-600" />
                      </div>
                      <div className="text-sm text-orange-800 dark:text-orange-200">
                        {warning}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showUpgradePrompts && onUpgradeClick && (
                <div className="pt-3 border-t">
                  <Button 
                    onClick={onUpgradeClick}
                    className="w-full"
                    variant="outline"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade for Unlimited Access
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Study Time Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <span>Study Time</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {progressStats.timeSpent.total}
              </div>
              <div className="text-sm text-muted-foreground">Total Minutes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {progressStats.timeSpent.thisWeek}
              </div>
              <div className="text-sm text-muted-foreground">This Week</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {progressStats.timeSpent.average}
              </div>
              <div className="text-sm text-muted-foreground">Daily Average</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

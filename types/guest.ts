// TypeScript type definitions for guest user system

export interface GuestSession {
  id: string
  createdAt: string
  lastActiveAt: string
  isGuest: true
  userData: GuestUserData
}

export interface GuestUserData {
  plans: GuestPlan[]
  flashcards: GuestFlashcard[]
  progress: GuestProgress
  preferences: GuestPreferences
}

export interface GuestPlan {
  id: string
  title: string
  domain: string
  createdAt: string
  modules: GuestModule[]
}

export interface GuestModule {
  id: string
  title: string
  lessons: GuestLesson[]
}

export interface GuestLesson {
  id: string
  title: string
  duration: string
  completed: boolean
  completedAt?: string
}

export interface GuestFlashcard {
  id: string
  front: string
  back: string
  tags: string[]
  createdAt: string
  lastReviewedAt?: string
  difficulty: 'easy' | 'medium' | 'hard'
  reviewCount: number
  correctCount: number
}

export interface GuestProgress {
  totalPlans: number
  totalLessons: number
  totalFlashcards: number
  completedLessons: number
  studyMinutes: number
  streak: number
  lastStudyDate?: string
}

export interface GuestPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: boolean
  soundEffects: boolean
}

export interface GuestUpgradeData {
  guestId: string
  email: string
  password: string
  userData: GuestUserData
}

export interface UpgradePromptTrigger {
  type: 'first_lesson_complete' | 'limit_reached' | 'advanced_feature' | 'time_based'
  context?: string
  timestamp: string
}

export interface GuestLimits {
  maxFlashcards: number
  maxLessons: number
  maxPlans: number
}

export interface GuestAnalyticsEvent {
  eventType: 'guest_session_start' | 'content_created' | 'upgrade_prompt_shown' | 'upgrade_prompt_clicked' | 'upgrade_completed' | 'lesson_completed'
  guestId: string
  timestamp: string
  metadata?: Record<string, any>
}

// Default limits for guest users
export const GUEST_LIMITS: GuestLimits = {
  maxFlashcards: 50,
  maxLessons: 10,
  maxPlans: 3
}

// Local storage keys
export const GUEST_STORAGE_KEYS = {
  SESSION: 'fathom_guest_session',
  USER_DATA: 'fathom_guest_data',
  PREFERENCES: 'fathom_guest_preferences',
  ANALYTICS: 'fathom_guest_analytics'
} as const

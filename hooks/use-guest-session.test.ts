import { renderHook, act } from '@testing-library/react'
import { useGuestSession } from './use-guest-session'
import { guestSessionManager } from '@/lib/guest-session'
import { GuestPlan, GuestFlashcard } from '@/types/guest'

// Mock the guest session manager
jest.mock('@/lib/guest-session', () => ({
  guestSessionManager: {
    getCurrentSession: jest.fn(),
    initializeGuestSession: jest.fn(),
    addPlan: jest.fn(),
    addFlashcard: jest.fn(),
    completeLesson: jest.fn(),
    updateUserData: jest.fn(),
    getAllGuestData: jest.fn(),
    clearSession: jest.fn(),
    getCurrentLimits: jest.fn(),
    hasReachedLimits: jest.fn()
  }
}))

const mockGuestSessionManager = guestSessionManager as jest.Mocked<typeof guestSessionManager>

describe('useGuestSession', () => {
  const mockSession = {
    id: 'guest_123_abc',
    createdAt: '2023-01-01T00:00:00.000Z',
    lastActiveAt: '2023-01-01T00:00:00.000Z',
    isGuest: true as const,
    userData: {
      plans: [],
      flashcards: [],
      progress: {
        totalPlans: 0,
        totalLessons: 0,
        totalFlashcards: 0,
        completedLessons: 0,
        studyMinutes: 0,
        streak: 0
      },
      preferences: {
        theme: 'system' as const,
        notifications: true,
        soundEffects: true
      }
    }
  }

  const mockLimits = {
    current: { maxFlashcards: 0, maxLessons: 0, maxPlans: 0 },
    max: { maxFlashcards: 50, maxLessons: 10, maxPlans: 3 },
    percentages: { maxFlashcards: 0, maxLessons: 0, maxPlans: 0 }
  }

  const mockHasReachedLimits = {
    flashcards: false,
    lessons: false,
    plans: false,
    any: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGuestSessionManager.getCurrentLimits.mockReturnValue(mockLimits)
    mockGuestSessionManager.hasReachedLimits.mockReturnValue(mockHasReachedLimits)
  })

  describe('initialization', () => {
    it('should initialize with existing session', async () => {
      mockGuestSessionManager.getCurrentSession.mockReturnValue(mockSession)

      const { result } = renderHook(() => useGuestSession())

      expect(result.current.isLoading).toBe(true)

      // Wait for useEffect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.session).toEqual(mockSession)
      expect(result.current.isGuest).toBe(true)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('should create new session when none exists', async () => {
      mockGuestSessionManager.getCurrentSession.mockReturnValue(null)
      mockGuestSessionManager.initializeGuestSession.mockReturnValue(mockSession)

      const { result } = renderHook(() => useGuestSession())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(mockGuestSessionManager.initializeGuestSession).toHaveBeenCalled()
      expect(result.current.session).toEqual(mockSession)
      expect(result.current.isGuest).toBe(true)
    })

    it('should handle initialization errors', async () => {
      mockGuestSessionManager.getCurrentSession.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const { result } = renderHook(() => useGuestSession())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Failed to initialize guest session')
      expect(result.current.session).toBeNull()
    })
  })

  describe('addPlan', () => {
    it('should add a plan successfully', async () => {
      mockGuestSessionManager.getCurrentSession.mockReturnValue(mockSession)
      mockGuestSessionManager.addPlan.mockReturnValue(true)

      const { result } = renderHook(() => useGuestSession())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const testPlan: GuestPlan = {
        id: 'plan-1',
        title: 'Test Plan',
        domain: 'Test Domain',
        createdAt: '2023-01-01T00:00:00.000Z',
        modules: []
      }

      let addResult: boolean
      act(() => {
        addResult = result.current.addPlan(testPlan)
      })

      expect(addResult!).toBe(true)
      expect(mockGuestSessionManager.addPlan).toHaveBeenCalledWith(testPlan)
      expect(mockGuestSessionManager.getCurrentSession).toHaveBeenCalledTimes(2) // Initial + refresh
    })

    it('should handle add plan failure', async () => {
      mockGuestSessionManager.getCurrentSession.mockReturnValue(mockSession)
      mockGuestSessionManager.addPlan.mockReturnValue(false)

      const { result } = renderHook(() => useGuestSession())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const testPlan: GuestPlan = {
        id: 'plan-1',
        title: 'Test Plan',
        domain: 'Test Domain',
        createdAt: '2023-01-01T00:00:00.000Z',
        modules: []
      }

      let addResult: boolean
      act(() => {
        addResult = result.current.addPlan(testPlan)
      })

      expect(addResult!).toBe(false)
    })
  })

  describe('addFlashcard', () => {
    it('should add a flashcard successfully', async () => {
      mockGuestSessionManager.getCurrentSession.mockReturnValue(mockSession)
      mockGuestSessionManager.addFlashcard.mockReturnValue(true)

      const { result } = renderHook(() => useGuestSession())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const testFlashcard: GuestFlashcard = {
        id: 'card-1',
        front: 'Question',
        back: 'Answer',
        tags: ['test'],
        createdAt: '2023-01-01T00:00:00.000Z',
        difficulty: 'medium',
        reviewCount: 0,
        correctCount: 0
      }

      let addResult: boolean
      act(() => {
        addResult = result.current.addFlashcard(testFlashcard)
      })

      expect(addResult!).toBe(true)
      expect(mockGuestSessionManager.addFlashcard).toHaveBeenCalledWith(testFlashcard)
    })
  })

  describe('completeLesson', () => {
    it('should complete a lesson successfully', async () => {
      mockGuestSessionManager.getCurrentSession.mockReturnValue(mockSession)
      mockGuestSessionManager.completeLesson.mockReturnValue(true)

      const { result } = renderHook(() => useGuestSession())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      let completeResult: boolean
      act(() => {
        completeResult = result.current.completeLesson('plan-1', 'module-1', 'lesson-1')
      })

      expect(completeResult!).toBe(true)
      expect(mockGuestSessionManager.completeLesson).toHaveBeenCalledWith('plan-1', 'module-1', 'lesson-1')
    })
  })

  describe('shouldShowUpgradePrompt', () => {
    it('should detect first lesson completion trigger', async () => {
      const sessionWithOneLesson = {
        ...mockSession,
        userData: {
          ...mockSession.userData,
          progress: {
            ...mockSession.userData.progress,
            completedLessons: 1
          }
        }
      }

      mockGuestSessionManager.getCurrentSession.mockReturnValue(sessionWithOneLesson)

      const { result } = renderHook(() => useGuestSession())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.shouldShowUpgradePrompt('first_lesson_complete')).toBe(true)
      expect(result.current.shouldShowUpgradePrompt('limit_reached')).toBe(false)
    })

    it('should detect limit reached trigger', async () => {
      mockGuestSessionManager.getCurrentSession.mockReturnValue(mockSession)
      mockGuestSessionManager.hasReachedLimits.mockReturnValue({
        flashcards: true,
        lessons: false,
        plans: false,
        any: true
      })

      const { result } = renderHook(() => useGuestSession())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.shouldShowUpgradePrompt('limit_reached')).toBe(true)
    })

    it('should detect time-based trigger', async () => {
      const oldSession = {
        ...mockSession,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      }

      mockGuestSessionManager.getCurrentSession.mockReturnValue(oldSession)

      const { result } = renderHook(() => useGuestSession())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.shouldShowUpgradePrompt('time_based')).toBe(true)
    })
  })

  describe('getProgressSummary', () => {
    it('should calculate progress summary correctly', async () => {
      const sessionWithProgress = {
        ...mockSession,
        userData: {
          ...mockSession.userData,
          plans: [
            {
              id: 'plan-1',
              title: 'Test Plan',
              domain: 'Test',
              createdAt: '2023-01-01T00:00:00.000Z',
              modules: [
                {
                  id: 'module-1',
                  title: 'Module 1',
                  lessons: [
                    { id: 'lesson-1', title: 'Lesson 1', duration: '30 min', completed: true },
                    { id: 'lesson-2', title: 'Lesson 2', duration: '30 min', completed: false }
                  ]
                }
              ]
            }
          ],
          progress: {
            ...mockSession.userData.progress,
            completedLessons: 1
          }
        }
      }

      mockGuestSessionManager.getCurrentSession.mockReturnValue(sessionWithProgress)

      const { result } = renderHook(() => useGuestSession())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const summary = result.current.getProgressSummary()

      expect(summary).toEqual({
        totalPlans: 0,
        totalLessons: 2,
        totalFlashcards: 0,
        completedLessons: 1,
        studyMinutes: 0,
        streak: 0,
        completionRate: 50
      })
    })
  })

  describe('clearSession', () => {
    it('should clear session and update state', async () => {
      mockGuestSessionManager.getCurrentSession.mockReturnValue(mockSession)

      const { result } = renderHook(() => useGuestSession())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.session).toEqual(mockSession)

      act(() => {
        result.current.clearSession()
      })

      expect(mockGuestSessionManager.clearSession).toHaveBeenCalled()
      expect(result.current.session).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })
})

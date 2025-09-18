import { GuestSessionManager, guestSessionManager } from './guest-session'
import { GuestSession, GuestPlan, GuestFlashcard, GUEST_LIMITS } from '@/types/guest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    })
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('GuestSessionManager', () => {
  let manager: GuestSessionManager

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear()
    jest.clearAllMocks()
    
    // Get fresh instance
    manager = GuestSessionManager.getInstance()
  })

  describe('generateGuestId', () => {
    it('should generate unique guest IDs', () => {
      const id1 = manager.generateGuestId()
      const id2 = manager.generateGuestId()
      
      expect(id1).toMatch(/^guest_[a-z0-9]+_[a-z0-9]+$/)
      expect(id2).toMatch(/^guest_[a-z0-9]+_[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })
  })

  describe('initializeGuestSession', () => {
    it('should create a new guest session', () => {
      const session = manager.initializeGuestSession()
      
      expect(session.id).toMatch(/^guest_/)
      expect(session.isGuest).toBe(true)
      expect(session.createdAt).toBeDefined()
      expect(session.lastActiveAt).toBeDefined()
      expect(session.userData).toBeDefined()
      expect(session.userData.plans).toEqual([])
      expect(session.userData.flashcards).toEqual([])
    })

    it('should save session to localStorage', () => {
      const session = manager.initializeGuestSession()
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'fathom_guest_session',
        JSON.stringify(session)
      )
    })
  })

  describe('getCurrentSession', () => {
    it('should return null when no session exists', () => {
      const session = manager.getCurrentSession()
      expect(session).toBeNull()
    })

    it('should return existing session from localStorage', () => {
      const originalSession = manager.initializeGuestSession()
      
      // Get session again
      const retrievedSession = manager.getCurrentSession()
      
      expect(retrievedSession).not.toBeNull()
      expect(retrievedSession?.id).toBe(originalSession.id)
      expect(retrievedSession?.isGuest).toBe(true)
    })

    it('should update lastActiveAt when retrieving session', () => {
      const originalSession = manager.initializeGuestSession()
      const originalActiveAt = originalSession.lastActiveAt
      
      // Wait a bit to ensure different timestamp
      jest.advanceTimersByTime(100)
      
      const retrievedSession = manager.getCurrentSession()
      
      expect(retrievedSession?.lastActiveAt).not.toBe(originalActiveAt)
    })

    it('should handle corrupted session data', () => {
      localStorageMock.setItem('fathom_guest_session', 'invalid json')
      
      const session = manager.getCurrentSession()
      
      expect(session).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })
  })

  describe('addPlan', () => {
    it('should add a plan to guest session', () => {
      manager.initializeGuestSession()
      
      const plan: GuestPlan = {
        id: 'plan-1',
        title: 'Test Plan',
        domain: 'Test Domain',
        createdAt: new Date().toISOString(),
        modules: []
      }
      
      const success = manager.addPlan(plan)
      
      expect(success).toBe(true)
      
      const session = manager.getCurrentSession()
      expect(session?.userData.plans).toHaveLength(1)
      expect(session?.userData.plans[0]).toEqual(plan)
      expect(session?.userData.progress.totalPlans).toBe(1)
    })

    it('should reject plan when limit is reached', () => {
      manager.initializeGuestSession()
      
      // Add plans up to the limit
      for (let i = 0; i < GUEST_LIMITS.maxPlans; i++) {
        const plan: GuestPlan = {
          id: `plan-${i}`,
          title: `Test Plan ${i}`,
          domain: 'Test Domain',
          createdAt: new Date().toISOString(),
          modules: []
        }
        manager.addPlan(plan)
      }
      
      // Try to add one more
      const extraPlan: GuestPlan = {
        id: 'extra-plan',
        title: 'Extra Plan',
        domain: 'Test Domain',
        createdAt: new Date().toISOString(),
        modules: []
      }
      
      const success = manager.addPlan(extraPlan)
      
      expect(success).toBe(false)
      
      const session = manager.getCurrentSession()
      expect(session?.userData.plans).toHaveLength(GUEST_LIMITS.maxPlans)
    })
  })

  describe('addFlashcard', () => {
    it('should add a flashcard to guest session', () => {
      manager.initializeGuestSession()
      
      const flashcard: GuestFlashcard = {
        id: 'card-1',
        front: 'Question',
        back: 'Answer',
        tags: ['test'],
        createdAt: new Date().toISOString(),
        difficulty: 'medium',
        reviewCount: 0,
        correctCount: 0
      }
      
      const success = manager.addFlashcard(flashcard)
      
      expect(success).toBe(true)
      
      const session = manager.getCurrentSession()
      expect(session?.userData.flashcards).toHaveLength(1)
      expect(session?.userData.flashcards[0]).toEqual(flashcard)
      expect(session?.userData.progress.totalFlashcards).toBe(1)
    })

    it('should reject flashcard when limit is reached', () => {
      manager.initializeGuestSession()
      
      // Add flashcards up to the limit
      for (let i = 0; i < GUEST_LIMITS.maxFlashcards; i++) {
        const flashcard: GuestFlashcard = {
          id: `card-${i}`,
          front: `Question ${i}`,
          back: `Answer ${i}`,
          tags: ['test'],
          createdAt: new Date().toISOString(),
          difficulty: 'medium',
          reviewCount: 0,
          correctCount: 0
        }
        manager.addFlashcard(flashcard)
      }
      
      // Try to add one more
      const extraCard: GuestFlashcard = {
        id: 'extra-card',
        front: 'Extra Question',
        back: 'Extra Answer',
        tags: ['test'],
        createdAt: new Date().toISOString(),
        difficulty: 'medium',
        reviewCount: 0,
        correctCount: 0
      }
      
      const success = manager.addFlashcard(extraCard)
      
      expect(success).toBe(false)
      
      const session = manager.getCurrentSession()
      expect(session?.userData.flashcards).toHaveLength(GUEST_LIMITS.maxFlashcards)
    })
  })

  describe('completeLesson', () => {
    it('should mark a lesson as completed', () => {
      manager.initializeGuestSession()
      
      const plan: GuestPlan = {
        id: 'plan-1',
        title: 'Test Plan',
        domain: 'Test Domain',
        createdAt: new Date().toISOString(),
        modules: [
          {
            id: 'module-1',
            title: 'Test Module',
            lessons: [
              {
                id: 'lesson-1',
                title: 'Test Lesson',
                duration: '30 min',
                completed: false
              }
            ]
          }
        ]
      }
      
      manager.addPlan(plan)
      
      const success = manager.completeLesson('plan-1', 'module-1', 'lesson-1')
      
      expect(success).toBe(true)
      
      const session = manager.getCurrentSession()
      const lesson = session?.userData.plans[0].modules[0].lessons[0]
      expect(lesson?.completed).toBe(true)
      expect(lesson?.completedAt).toBeDefined()
      expect(session?.userData.progress.completedLessons).toBe(1)
    })

    it('should return false for non-existent lesson', () => {
      manager.initializeGuestSession()
      
      const success = manager.completeLesson('non-existent', 'module', 'lesson')
      
      expect(success).toBe(false)
    })
  })

  describe('getCurrentLimits', () => {
    it('should return current usage and limits', () => {
      manager.initializeGuestSession()
      
      const limits = manager.getCurrentLimits()
      
      expect(limits.current.maxFlashcards).toBe(0)
      expect(limits.current.maxLessons).toBe(0)
      expect(limits.current.maxPlans).toBe(0)
      expect(limits.max).toEqual(GUEST_LIMITS)
      expect(limits.percentages.maxFlashcards).toBe(0)
    })

    it('should calculate percentages correctly', () => {
      manager.initializeGuestSession()
      
      // Add some content
      const plan: GuestPlan = {
        id: 'plan-1',
        title: 'Test Plan',
        domain: 'Test Domain',
        createdAt: new Date().toISOString(),
        modules: []
      }
      manager.addPlan(plan)
      
      const limits = manager.getCurrentLimits()
      
      expect(limits.current.maxPlans).toBe(1)
      expect(limits.percentages.maxPlans).toBe(Math.round((1 / GUEST_LIMITS.maxPlans) * 100))
    })
  })

  describe('hasReachedLimits', () => {
    it('should detect when limits are reached', () => {
      manager.initializeGuestSession()
      
      let limits = manager.hasReachedLimits()
      expect(limits.any).toBe(false)
      
      // Add plans to reach limit
      for (let i = 0; i < GUEST_LIMITS.maxPlans; i++) {
        const plan: GuestPlan = {
          id: `plan-${i}`,
          title: `Test Plan ${i}`,
          domain: 'Test Domain',
          createdAt: new Date().toISOString(),
          modules: []
        }
        manager.addPlan(plan)
      }
      
      limits = manager.hasReachedLimits()
      expect(limits.plans).toBe(true)
      expect(limits.any).toBe(true)
    })
  })

  describe('clearSession', () => {
    it('should remove all guest data from localStorage', () => {
      manager.initializeGuestSession()
      
      manager.clearSession()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fathom_guest_session')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fathom_guest_data')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fathom_guest_preferences')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('fathom_guest_analytics')
    })
  })

  describe('getAllGuestData', () => {
    it('should return all guest user data', () => {
      manager.initializeGuestSession()
      
      const data = manager.getAllGuestData()
      
      expect(data).not.toBeNull()
      expect(data?.plans).toEqual([])
      expect(data?.flashcards).toEqual([])
      expect(data?.progress).toBeDefined()
      expect(data?.preferences).toBeDefined()
    })

    it('should return null when no session exists', () => {
      const data = manager.getAllGuestData()
      
      expect(data).toBeNull()
    })
  })
})

// Mock timers for testing
jest.useFakeTimers()

/**
 * Simple guest progress hook stub
 */

import { useState } from 'react'

export function useGuestProgress() {
  const [progress] = useState({
    totalStudyTime: 0,
    totalCards: 0,
    totalSessions: 0,
    streakDays: 0,
    completedPlans: [],
    achievements: []
  })

  return {
    progress,
    updateProgress: () => {},
    incrementStudyTime: () => {},
    incrementCards: () => {},
    incrementSessions: () => {},
    updateStreak: () => {}
  }
}
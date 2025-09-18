// Mock data for demonstrating different states
export const mockUser = {
  id: "1",
  name: "Alex Chen",
  email: "alex@example.com",
  isGuest: true,
  streak: 7,
  totalMinutes: 245,
  level: "Intermediate",
}

export const mockStats = {
  cardsDue: 12,
  studyMinutes: 25,
  streak: 7,
  weakestTags: ["JavaScript", "React Hooks", "Async/Await"],
}

export const mockPlan = {
  id: "1",
  title: "Full-Stack JavaScript Development",
  domain: "Software Engineering",
  modules: [
    {
      id: "1",
      title: "JavaScript Fundamentals",
      lessons: [
        { id: "1", title: "Variables and Data Types", completed: true },
        { id: "2", title: "Functions and Scope", completed: true },
        { id: "3", title: "Objects and Arrays", completed: false },
      ],
    },
    {
      id: "2",
      title: "React Basics",
      lessons: [
        { id: "4", title: "Components and JSX", completed: false },
        { id: "5", title: "State and Props", completed: false },
      ],
    },
  ],
}

export const mockCards = [
  {
    id: "1",
    front: "What is a closure in JavaScript?",
    back: "A closure is a function that has access to variables in its outer (enclosing) scope even after the outer function has returned.",
    difficulty: "medium",
    nextReview: new Date(),
    tags: ["JavaScript", "Functions"],
  },
  {
    id: "2",
    front: "Explain the difference between let, const, and var",
    back: "let and const are block-scoped, var is function-scoped. const cannot be reassigned, let can be reassigned, var can be reassigned and redeclared.",
    difficulty: "easy",
    nextReview: new Date(),
    tags: ["JavaScript", "Variables"],
  },
]

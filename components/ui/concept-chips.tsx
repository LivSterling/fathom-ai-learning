'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface ConceptExample {
  id: string
  label: string
  example: string
  description?: string
}

export interface ConceptCategory {
  id: string
  name: string
  icon?: string
  examples: ConceptExample[]
}

interface ConceptChipsProps {
  categories: ConceptCategory[]
  onConceptSelect: (concept: ConceptExample) => void
  selectedConceptId?: string
  maxVisibleCategories?: number
  className?: string
}

export function ConceptChips({ 
  categories, 
  onConceptSelect, 
  selectedConceptId,
  maxVisibleCategories = 3,
  className = ""
}: ConceptChipsProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [showAllCategories, setShowAllCategories] = useState(false)

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const visibleCategories = showAllCategories 
    ? categories 
    : categories.slice(0, maxVisibleCategories)

  const hasMoreCategories = categories.length > maxVisibleCategories

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {visibleCategories.map((category) => {
        const isExpanded = expandedCategories.has(category.id)
        const visibleExamples = isExpanded ? category.examples : category.examples.slice(0, 3)
        const hasMoreExamples = category.examples.length > 3

        return (
          <div key={category.id} className="space-y-2 sm:space-y-3">
            {/* Category Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {category.icon && (
                  <span className="text-lg" role="img" aria-label={category.name}>
                    {category.icon}
                  </span>
                )}
                <h3 className="text-sm sm:text-base font-medium text-foreground">
                  {category.name}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {category.examples.length}
                </Badge>
              </div>
              
              {hasMoreExamples && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleCategoryExpansion(category.id)}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  aria-expanded={isExpanded}
                  aria-controls={`category-${category.id}-examples`}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Show More
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Concept Chips */}
            <div 
              id={`category-${category.id}-examples`}
              className="flex flex-wrap gap-2 sm:gap-3"
            >
              {visibleExamples.map((concept) => (
                <button
                  key={concept.id}
                  onClick={() => onConceptSelect(concept)}
                  className={`
                    inline-flex items-center rounded-full border font-medium text-sm
                    px-3 py-2 sm:px-4 sm:py-2 transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                    touch-manipulation min-h-[36px] sm:min-h-[40px]
                    ${selectedConceptId === concept.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20'
                    }
                  `}
                  aria-label={`Select ${concept.label} example: ${concept.example}`}
                  title={concept.description || concept.example}
                >
                  <span className="truncate max-w-[200px] sm:max-w-[250px]">
                    {concept.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {/* Show More Categories Button */}
      {hasMoreCategories && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAllCategories(!showAllCategories)}
            className="text-sm"
            aria-expanded={showAllCategories}
          >
            {showAllCategories ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Show Fewer Categories
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Show More Categories ({categories.length - maxVisibleCategories} more)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

// Default curated concept categories and examples
export const defaultConceptCategories: ConceptCategory[] = [
  {
    id: 'technology',
    name: 'Technology & Programming',
    icon: '💻',
    examples: [
      {
        id: 'react-hooks',
        label: 'React Hooks',
        example: 'React useEffect hooks and lifecycle management',
        description: 'Learn modern React patterns with hooks for state and side effects'
      },
      {
        id: 'javascript-async',
        label: 'JavaScript Async',
        example: 'JavaScript promises, async/await, and error handling',
        description: 'Master asynchronous programming in JavaScript'
      },
      {
        id: 'python-data-structures',
        label: 'Python Data Structures',
        example: 'Python lists, dictionaries, and algorithm optimization',
        description: 'Core Python data structures and algorithmic thinking'
      },
      {
        id: 'sql-databases',
        label: 'SQL & Databases',
        example: 'SQL joins, indexing, and database design principles',
        description: 'Database fundamentals and query optimization'
      },
      {
        id: 'machine-learning',
        label: 'Machine Learning',
        example: 'Machine learning fundamentals and neural networks',
        description: 'Introduction to ML algorithms and deep learning'
      },
      {
        id: 'web-security',
        label: 'Web Security',
        example: 'Web application security and OWASP best practices',
        description: 'Secure coding practices and vulnerability prevention'
      }
    ]
  },
  {
    id: 'business',
    name: 'Business & Finance',
    icon: '💼',
    examples: [
      {
        id: 'financial-modeling',
        label: 'Financial Modeling',
        example: 'Financial modeling and valuation methods',
        description: 'Build financial models for business analysis'
      },
      {
        id: 'project-management',
        label: 'Project Management',
        example: 'Project management methodologies and frameworks',
        description: 'Agile, Scrum, and traditional project management approaches'
      },
      {
        id: 'marketing-analytics',
        label: 'Marketing Analytics',
        example: 'Digital marketing analytics and conversion optimization',
        description: 'Measure and optimize marketing performance'
      },
      {
        id: 'business-strategy',
        label: 'Business Strategy',
        example: 'Strategic planning and competitive analysis frameworks',
        description: 'Develop and execute business strategies'
      },
      {
        id: 'accounting-basics',
        label: 'Accounting Fundamentals',
        example: 'Accounting principles and financial statement analysis',
        description: 'Understanding financial statements and accounting basics'
      }
    ]
  },
  {
    id: 'science',
    name: 'Science & Health',
    icon: '🔬',
    examples: [
      {
        id: 'organic-chemistry',
        label: 'Organic Chemistry',
        example: 'Organic chemistry reaction mechanisms',
        description: 'Chemical reactions and molecular structures'
      },
      {
        id: 'human-physiology',
        label: 'Human Physiology',
        example: 'Cardiac physiology basics and assessment techniques',
        description: 'How the human cardiovascular system works'
      },
      {
        id: 'nutrition-science',
        label: 'Nutrition Science',
        example: 'Nutrition science and metabolic pathways',
        description: 'Understanding metabolism and nutritional biochemistry'
      },
      {
        id: 'physics-mechanics',
        label: 'Physics Mechanics',
        example: 'Classical mechanics and motion analysis',
        description: 'Fundamental physics principles of motion and forces'
      },
      {
        id: 'genetics-basics',
        label: 'Genetics',
        example: 'Genetics fundamentals and inheritance patterns',
        description: 'DNA, genes, and heredity principles'
      }
    ]
  },
  {
    id: 'language',
    name: 'Languages & Communication',
    icon: '🗣️',
    examples: [
      {
        id: 'spanish-grammar',
        label: 'Spanish Grammar',
        example: 'Spanish subjunctive mood and usage patterns',
        description: 'Advanced Spanish grammar and verb conjugations'
      },
      {
        id: 'english-writing',
        label: 'English Writing',
        example: 'Academic writing and essay structure techniques',
        description: 'Improve writing clarity and academic style'
      },
      {
        id: 'french-conversation',
        label: 'French Conversation',
        example: 'French conversational skills and pronunciation',
        description: 'Practical French speaking and listening skills'
      },
      {
        id: 'public-speaking',
        label: 'Public Speaking',
        example: 'Public speaking techniques and presentation skills',
        description: 'Overcome speaking anxiety and deliver compelling presentations'
      },
      {
        id: 'technical-writing',
        label: 'Technical Writing',
        example: 'Technical documentation and API writing best practices',
        description: 'Clear communication for technical audiences'
      }
    ]
  },
  {
    id: 'creative',
    name: 'Creative & Design',
    icon: '🎨',
    examples: [
      {
        id: 'photography-basics',
        label: 'Photography',
        example: 'Photography composition and lighting techniques',
        description: 'Camera settings, composition rules, and lighting fundamentals'
      },
      {
        id: 'ui-ux-design',
        label: 'UI/UX Design',
        example: 'User interface design principles and usability testing',
        description: 'Design thinking and user experience optimization'
      },
      {
        id: 'graphic-design',
        label: 'Graphic Design',
        example: 'Graphic design fundamentals and typography principles',
        description: 'Visual design theory and practical application'
      },
      {
        id: 'music-theory',
        label: 'Music Theory',
        example: 'Music theory basics and chord progressions',
        description: 'Understanding scales, chords, and musical structure'
      },
      {
        id: 'creative-writing',
        label: 'Creative Writing',
        example: 'Creative writing techniques and storytelling methods',
        description: 'Develop compelling narratives and characters'
      }
    ]
  },
  {
    id: 'social-sciences',
    name: 'Social Sciences & Law',
    icon: '⚖️',
    examples: [
      {
        id: 'psychology-basics',
        label: 'Psychology',
        example: 'Cognitive psychology and behavioral analysis',
        description: 'Understanding human behavior and mental processes'
      },
      {
        id: 'constitutional-law',
        label: 'Constitutional Law',
        example: 'Constitutional law and judicial review',
        description: 'Legal principles and constitutional interpretation'
      },
      {
        id: 'economics-micro',
        label: 'Microeconomics',
        example: 'Microeconomics supply and demand analysis',
        description: 'Market mechanisms and economic decision-making'
      },
      {
        id: 'sociology-theory',
        label: 'Sociology',
        example: 'Sociological theory and social structure analysis',
        description: 'Understanding society and social relationships'
      },
      {
        id: 'political-science',
        label: 'Political Science',
        example: 'Political systems and governance structures',
        description: 'Comparative politics and government analysis'
      }
    ]
  }
]

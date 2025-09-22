import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ConceptChips, defaultConceptCategories, type ConceptCategory, type ConceptExample } from './concept-chips'

const mockCategories: ConceptCategory[] = [
  {
    id: 'technology',
    name: 'Technology',
    icon: '💻',
    examples: [
      { id: 'react', label: 'React', example: 'React hooks and components' },
      { id: 'javascript', label: 'JavaScript', example: 'JavaScript async programming' },
      { id: 'python', label: 'Python', example: 'Python data structures' },
      { id: 'sql', label: 'SQL', example: 'SQL database queries' }
    ]
  },
  {
    id: 'business',
    name: 'Business',
    icon: '💼',
    examples: [
      { id: 'finance', label: 'Finance', example: 'Financial modeling basics' },
      { id: 'marketing', label: 'Marketing', example: 'Digital marketing strategies' }
    ]
  },
  {
    id: 'science',
    name: 'Science',
    icon: '🔬',
    examples: [
      { id: 'chemistry', label: 'Chemistry', example: 'Organic chemistry reactions' },
      { id: 'physics', label: 'Physics', example: 'Classical mechanics principles' }
    ]
  }
]

const defaultProps = {
  categories: mockCategories,
  onConceptSelect: jest.fn(),
}

describe('ConceptChips', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Render', () => {
    it('renders categories with correct structure', () => {
      render(<ConceptChips {...defaultProps} />)
      
      expect(screen.getByText('Technology')).toBeInTheDocument()
      expect(screen.getByText('Business')).toBeInTheDocument()
      expect(screen.getByText('Science')).toBeInTheDocument()
    })

    it('displays category icons', () => {
      render(<ConceptChips {...defaultProps} />)
      
      expect(screen.getByRole('img', { name: 'Technology' })).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'Business' })).toBeInTheDocument()
      expect(screen.getByRole('img', { name: 'Science' })).toBeInTheDocument()
    })

    it('shows example count badges', () => {
      render(<ConceptChips {...defaultProps} />)
      
      expect(screen.getByText('4')).toBeInTheDocument() // Technology has 4 examples
      expect(screen.getAllByText('2')).toHaveLength(2) // Business and Science each have 2 examples
    })

    it('limits visible categories based on maxVisibleCategories prop', () => {
      render(<ConceptChips {...defaultProps} maxVisibleCategories={2} />)
      
      expect(screen.getByText('Technology')).toBeInTheDocument()
      expect(screen.getByText('Business')).toBeInTheDocument()
      expect(screen.queryByText('Science')).not.toBeInTheDocument()
      expect(screen.getByText('Show More Categories (1 more)')).toBeInTheDocument()
    })
  })

  describe('Concept Selection', () => {
    it('calls onConceptSelect when chip is clicked', async () => {
      const user = userEvent.setup()
      const mockOnConceptSelect = jest.fn()
      
      render(<ConceptChips {...defaultProps} onConceptSelect={mockOnConceptSelect} />)
      
      const reactChip = screen.getByRole('button', { name: /select react example/i })
      await user.click(reactChip)
      
      expect(mockOnConceptSelect).toHaveBeenCalledWith({
        id: 'react',
        label: 'React',
        example: 'React hooks and components'
      })
    })

    it('highlights selected concept chip', () => {
      render(<ConceptChips {...defaultProps} selectedConceptId="react" />)
      
      const reactChip = screen.getByRole('button', { name: /select react example/i })
      expect(reactChip).toHaveClass('bg-primary', 'text-primary-foreground')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      const mockOnConceptSelect = jest.fn()
      
      render(<ConceptChips {...defaultProps} onConceptSelect={mockOnConceptSelect} />)
      
      const reactChip = screen.getByRole('button', { name: /select react example/i })
      reactChip.focus()
      await user.keyboard('{Enter}')
      
      expect(mockOnConceptSelect).toHaveBeenCalledWith({
        id: 'react',
        label: 'React',
        example: 'React hooks and components'
      })
    })
  })

  describe('Category Expansion', () => {
    it('shows only first 3 examples initially for categories with more than 3', () => {
      render(<ConceptChips {...defaultProps} />)
      
      // Technology category has 4 examples, should show first 3 + "Show More" button
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('JavaScript')).toBeInTheDocument()
      expect(screen.getByText('Python')).toBeInTheDocument()
      expect(screen.queryByText('SQL')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /show more/i })).toBeInTheDocument()
    })

    it('expands category to show all examples when "Show More" is clicked', async () => {
      const user = userEvent.setup()
      render(<ConceptChips {...defaultProps} />)
      
      const showMoreButton = screen.getByRole('button', { name: /show more/i })
      await user.click(showMoreButton)
      
      expect(screen.getByText('SQL')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument()
    })

    it('collapses category when "Show Less" is clicked', async () => {
      const user = userEvent.setup()
      render(<ConceptChips {...defaultProps} />)
      
      // First expand
      const showMoreButton = screen.getByRole('button', { name: /show more/i })
      await user.click(showMoreButton)
      
      // Then collapse
      const showLessButton = screen.getByRole('button', { name: /show less/i })
      await user.click(showLessButton)
      
      expect(screen.queryByText('SQL')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /show more/i })).toBeInTheDocument()
    })
  })

  describe('Show More Categories', () => {
    it('expands to show all categories when "Show More Categories" is clicked', async () => {
      const user = userEvent.setup()
      render(<ConceptChips {...defaultProps} maxVisibleCategories={2} />)
      
      expect(screen.queryByText('Science')).not.toBeInTheDocument()
      
      const showMoreCategoriesButton = screen.getByRole('button', { name: /show more categories/i })
      await user.click(showMoreCategoriesButton)
      
      expect(screen.getByText('Science')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /show fewer categories/i })).toBeInTheDocument()
    })

    it('collapses to show limited categories when "Show Fewer Categories" is clicked', async () => {
      const user = userEvent.setup()
      render(<ConceptChips {...defaultProps} maxVisibleCategories={2} />)
      
      // First expand
      const showMoreCategoriesButton = screen.getByRole('button', { name: /show more categories/i })
      await user.click(showMoreCategoriesButton)
      
      // Then collapse
      const showFewerCategoriesButton = screen.getByRole('button', { name: /show fewer categories/i })
      await user.click(showFewerCategoriesButton)
      
      expect(screen.queryByText('Science')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /show more categories/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes for expandable sections', () => {
      render(<ConceptChips {...defaultProps} />)
      
      const showMoreButton = screen.getByRole('button', { name: /show more/i })
      expect(showMoreButton).toHaveAttribute('aria-expanded', 'false')
      expect(showMoreButton).toHaveAttribute('aria-controls', 'category-technology-examples')
    })

    it('updates ARIA attributes when expanded', async () => {
      const user = userEvent.setup()
      render(<ConceptChips {...defaultProps} />)
      
      const showMoreButton = screen.getByRole('button', { name: /show more/i })
      await user.click(showMoreButton)
      
      const showLessButton = screen.getByRole('button', { name: /show less/i })
      expect(showLessButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('has descriptive aria-labels for concept chips', () => {
      render(<ConceptChips {...defaultProps} />)
      
      const reactChip = screen.getByRole('button', { name: /select react example: react hooks and components/i })
      expect(reactChip).toBeInTheDocument()
    })

    it('has proper title attributes for tooltips', () => {
      render(<ConceptChips {...defaultProps} />)
      
      const reactChip = screen.getByRole('button', { name: /select react example/i })
      expect(reactChip).toHaveAttribute('title', 'React hooks and components')
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive classes for touch targets', () => {
      render(<ConceptChips {...defaultProps} />)
      
      const reactChip = screen.getByRole('button', { name: /select react example/i })
      expect(reactChip).toHaveClass('touch-manipulation', 'min-h-[36px]', 'sm:min-h-[40px]')
    })

    it('has responsive text truncation', () => {
      render(<ConceptChips {...defaultProps} />)
      
      const reactChip = screen.getByRole('button', { name: /select react example/i })
      const textSpan = reactChip.querySelector('span')
      expect(textSpan).toHaveClass('truncate', 'max-w-[200px]', 'sm:max-w-[250px]')
    })
  })

  describe('Default Categories', () => {
    it('exports default concept categories with expected structure', () => {
      expect(defaultConceptCategories).toBeDefined()
      expect(Array.isArray(defaultConceptCategories)).toBe(true)
      expect(defaultConceptCategories.length).toBeGreaterThan(0)
      
      // Check first category structure
      const firstCategory = defaultConceptCategories[0]
      expect(firstCategory).toHaveProperty('id')
      expect(firstCategory).toHaveProperty('name')
      expect(firstCategory).toHaveProperty('icon')
      expect(firstCategory).toHaveProperty('examples')
      expect(Array.isArray(firstCategory.examples)).toBe(true)
      
      // Check first example structure
      if (firstCategory.examples.length > 0) {
        const firstExample = firstCategory.examples[0]
        expect(firstExample).toHaveProperty('id')
        expect(firstExample).toHaveProperty('label')
        expect(firstExample).toHaveProperty('example')
      }
    })

    it('has diverse categories covering different domains', () => {
      const categoryNames = defaultConceptCategories.map(cat => cat.name.toLowerCase())
      
      expect(categoryNames).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/technology/i),
          expect.stringMatching(/business/i),
          expect.stringMatching(/science/i),
          expect.stringMatching(/language/i),
          expect.stringMatching(/creative/i)
        ])
      )
    })
  })
})

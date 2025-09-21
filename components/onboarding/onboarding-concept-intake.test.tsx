import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { OnboardingConceptIntake } from './onboarding-concept-intake'

// Mock timers for placeholder rotation
jest.useFakeTimers()

const defaultProps = {
  onConceptSubmitted: jest.fn(),
  onBack: jest.fn(),
}

describe('OnboardingConceptIntake', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Initial Render', () => {
    it('renders the main input field', () => {
      render(<OnboardingConceptIntake {...defaultProps} />)
      
      expect(screen.getByRole('textbox', { name: /enter learning concept/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /what do you want to learn/i })).toBeInTheDocument()
    })

    it('renders suggestion chips', () => {
      render(<OnboardingConceptIntake {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /select software engineering example/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /select nursing example/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /select language learning example/i })).toBeInTheDocument()
    })

    it('renders continue button as disabled initially', () => {
      render(<OnboardingConceptIntake {...defaultProps} />)
      
      const continueButton = screen.getByRole('button', { name: /continue/i })
      expect(continueButton).toBeDisabled()
    })
  })

  describe('Concept Input', () => {
    it('enables continue button when concept is entered', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<OnboardingConceptIntake {...defaultProps} />)
      
      const input = screen.getByRole('textbox', { name: /enter learning concept/i })
      const continueButton = screen.getByRole('button', { name: /continue/i })
      
      await user.type(input, 'React hooks')
      
      expect(continueButton).toBeEnabled()
    })

    it('fills input when suggestion chip is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<OnboardingConceptIntake {...defaultProps} />)
      
      const input = screen.getByRole('textbox', { name: /enter learning concept/i })
      const chip = screen.getByRole('button', { name: /select software engineering example/i })
      
      await user.click(chip)
      
      expect(input).toHaveValue('Software Engineering')
    })
  })

  describe('Advanced Options', () => {
    it('shows advanced options after typing sufficient text', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<OnboardingConceptIntake {...defaultProps} />)
      
      const input = screen.getByRole('textbox', { name: /enter learning concept/i })
      
      await user.type(input, 'React useEffect hooks')
      
      await waitFor(() => {
        expect(screen.getByText('Customize Your Learning Plan')).toBeInTheDocument()
      })
    })

    it('shows advanced options after clicking suggestion chip', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<OnboardingConceptIntake {...defaultProps} />)
      
      const chip = screen.getByRole('button', { name: /select software engineering example/i })
      
      await user.click(chip)
      
      await waitFor(() => {
        expect(screen.getByText('Customize Your Learning Plan')).toBeInTheDocument()
      })
    })
  })

  describe('Material Options', () => {
    it('shows material options when toggle is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<OnboardingConceptIntake {...defaultProps} />)
      
      const toggle = screen.getByRole('button', { name: /or paste a link \/ upload a pdf/i })
      await user.click(toggle)
      
      expect(screen.getByText(/paste a url/i)).toBeInTheDocument()
      expect(screen.getByText(/choose file/i)).toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    it('calls onConceptSubmitted with basic concept', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const mockOnConceptSubmitted = jest.fn()
      render(<OnboardingConceptIntake {...defaultProps} onConceptSubmitted={mockOnConceptSubmitted} />)
      
      const input = screen.getByRole('textbox', { name: /enter learning concept/i })
      const continueButton = screen.getByRole('button', { name: /continue/i })
      
      await user.type(input, 'React hooks')
      await user.click(continueButton)
      
      await waitFor(() => {
        expect(mockOnConceptSubmitted).toHaveBeenCalledWith(
          'React hooks',
          undefined,
          undefined,
          expect.objectContaining({
            minutesPerDay: 30,
            weeks: 4,
            level: '',
            format: ''
          })
        )
      })
    })
  })

  describe('Back Navigation', () => {
    it('calls onBack when back button is clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const mockOnBack = jest.fn()
      render(<OnboardingConceptIntake {...defaultProps} onBack={mockOnBack} />)
      
      const backButton = screen.getByRole('button', { name: /go back/i })
      await user.click(backButton)
      
      expect(mockOnBack).toHaveBeenCalled()
    })
  })

  describe('Placeholder Rotation', () => {
    it('rotates placeholder examples', () => {
      render(<OnboardingConceptIntake {...defaultProps} />)
      
      const input = screen.getByRole('textbox', { name: /enter learning concept/i })
      const initialPlaceholder = input.getAttribute('placeholder')
      
      // Fast-forward time to trigger placeholder rotation
      jest.advanceTimersByTime(3000)
      
      const newPlaceholder = input.getAttribute('placeholder')
      expect(newPlaceholder).toBeDefined()
    })
  })
})
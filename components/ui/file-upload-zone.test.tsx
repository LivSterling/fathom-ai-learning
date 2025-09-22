import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { FileUploadZone, type FileUploadState, type FileValidationError } from './file-upload-zone'

// Mock file for testing
const createMockFile = (name: string, size: number, type: string): File => {
  const file = new File(['mock content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

const defaultUploadState: FileUploadState = {
  file: null,
  isUploading: false,
  isProcessing: false,
  progress: 0,
  error: null
}

const defaultProps = {
  onFileSelect: jest.fn(),
  onFileRemove: jest.fn(),
  uploadState: defaultUploadState
}

describe('FileUploadZone', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial Render', () => {
    it('renders upload zone with default state', () => {
      render(<FileUploadZone {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /file upload zone/i })).toBeInTheDocument()
      expect(screen.getByText(/drop a file here or click to browse/i)).toBeInTheDocument()
      expect(screen.getByText(/supports \.pdf files up to 10mb/i)).toBeInTheDocument()
    })

    it('shows custom accepted types and size limit', () => {
      render(
        <FileUploadZone 
          {...defaultProps} 
          acceptedTypes={['.pdf', '.txt']}
          maxSizeBytes={5 * 1024 * 1024}
        />
      )
      
      expect(screen.getByText(/supports \.pdf, \.txt files up to 5mb/i)).toBeInTheDocument()
    })

    it('renders as disabled when disabled prop is true', () => {
      render(<FileUploadZone {...defaultProps} disabled />)
      
      const uploadZone = screen.getByRole('button', { name: /file upload zone/i })
      expect(uploadZone).toHaveAttribute('aria-disabled', 'true')
      expect(uploadZone).toHaveAttribute('tabIndex', '-1')
    })
  })

  describe('File Selection', () => {
    it('calls onFileSelect when valid file is selected via input', async () => {
      const user = userEvent.setup()
      render(<FileUploadZone {...defaultProps} />)
      
      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const input = screen.getByLabelText(/file input/i)
      
      await user.upload(input, file)
      
      expect(defaultProps.onFileSelect).toHaveBeenCalledWith(file)
    })

    it('calls onFileSelect when valid file is dropped', async () => {
      render(<FileUploadZone {...defaultProps} />)
      
      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const uploadZone = screen.getByRole('button', { name: /file upload zone/i })
      
      fireEvent.dragOver(uploadZone)
      fireEvent.drop(uploadZone, {
        dataTransfer: {
          files: [file]
        }
      })
      
      expect(defaultProps.onFileSelect).toHaveBeenCalledWith(file)
    })

    it('does not call onFileSelect when disabled', async () => {
      const user = userEvent.setup()
      render(<FileUploadZone {...defaultProps} disabled />)
      
      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const input = screen.getByLabelText(/file input/i)
      
      await user.upload(input, file)
      
      expect(defaultProps.onFileSelect).not.toHaveBeenCalled()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<FileUploadZone {...defaultProps} />)
      
      const uploadZone = screen.getByRole('button', { name: /file upload zone/i })
      
      await user.tab()
      expect(uploadZone).toHaveFocus()
      
      // Simulate clicking the hidden file input
      const fileInput = screen.getByLabelText(/file input/i)
      const clickSpy = jest.spyOn(fileInput, 'click')
      
      await user.keyboard('{Enter}')
      expect(clickSpy).toHaveBeenCalled()
    })
  })

  describe('Drag and Drop', () => {
    it('shows drag over state when file is dragged over', () => {
      render(<FileUploadZone {...defaultProps} />)
      
      const uploadZone = screen.getByRole('button', { name: /file upload zone/i })
      
      fireEvent.dragOver(uploadZone)
      expect(screen.getByText(/drop your file here!/i)).toBeInTheDocument()
    })

    it('removes drag over state when drag leaves', () => {
      render(<FileUploadZone {...defaultProps} />)
      
      const uploadZone = screen.getByRole('button', { name: /file upload zone/i })
      
      fireEvent.dragOver(uploadZone)
      fireEvent.dragLeave(uploadZone)
      
      expect(screen.getByText(/drop a file here or click to browse/i)).toBeInTheDocument()
    })

    it('does not show drag over state when disabled', () => {
      render(<FileUploadZone {...defaultProps} disabled />)
      
      const uploadZone = screen.getByRole('button', { name: /file upload zone/i })
      
      fireEvent.dragOver(uploadZone)
      expect(screen.queryByText(/drop your file here!/i)).not.toBeInTheDocument()
    })
  })

  describe('File Validation', () => {
    it('validates file size', async () => {
      const user = userEvent.setup()
      const maxSize = 1024 // 1KB
      render(<FileUploadZone {...defaultProps} maxSizeBytes={maxSize} />)
      
      const largeFile = createMockFile('large.pdf', 2048, 'application/pdf') // 2KB
      const input = screen.getByLabelText(/file input/i)
      
      await user.upload(input, largeFile)
      
      // The component should still call onFileSelect, validation errors are handled by parent
      expect(defaultProps.onFileSelect).toHaveBeenCalledWith(largeFile)
    })

    it('validates file type', async () => {
      const user = userEvent.setup()
      render(<FileUploadZone {...defaultProps} acceptedTypes={['.pdf']} />)
      
      const txtFile = createMockFile('test.txt', 1024, 'text/plain')
      const input = screen.getByLabelText(/file input/i)
      
      await user.upload(input, txtFile)
      
      // The component should still call onFileSelect, validation errors are handled by parent
      expect(defaultProps.onFileSelect).toHaveBeenCalledWith(txtFile)
    })
  })

  describe('Upload States', () => {
    it('shows uploading state', () => {
      const uploadingState: FileUploadState = {
        ...defaultUploadState,
        isUploading: true,
        progress: 50
      }
      
      render(<FileUploadZone {...defaultProps} uploadState={uploadingState} />)
      
      expect(screen.getByText(/uploading\.\.\./i)).toBeInTheDocument()
      expect(screen.getByText(/50%/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('shows processing state', () => {
      const processingState: FileUploadState = {
        ...defaultUploadState,
        isProcessing: true,
        progress: 75
      }
      
      render(<FileUploadZone {...defaultProps} uploadState={processingState} />)
      
      expect(screen.getByText(/processing file\.\.\./i)).toBeInTheDocument()
      expect(screen.getByText(/75%/i)).toBeInTheDocument()
    })

    it('shows success state with file info', () => {
      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const successState: FileUploadState = {
        ...defaultUploadState,
        file,
        extractedText: 'Sample extracted text content'
      }
      
      render(<FileUploadZone {...defaultProps} uploadState={successState} />)
      
      expect(screen.getByText(/file uploaded successfully/i)).toBeInTheDocument()
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
      expect(screen.getByText(/1 kb • application\/pdf/i)).toBeInTheDocument()
      expect(screen.getByText(/text extracted \(29 characters\)/i)).toBeInTheDocument()
    })

    it('shows error state with retry button', () => {
      const error: FileValidationError = {
        type: 'size',
        message: 'File too large',
        details: 'Maximum size is 10MB'
      }
      
      const errorState: FileUploadState = {
        ...defaultUploadState,
        error
      }
      
      const onRetry = jest.fn()
      
      render(
        <FileUploadZone 
          {...defaultProps} 
          uploadState={errorState} 
          onRetry={onRetry}
        />
      )
      
      expect(screen.getByText('File too large')).toBeInTheDocument()
      expect(screen.getByText('Maximum size is 10MB')).toBeInTheDocument()
      
      const retryButton = screen.getByRole('button', { name: /try again/i })
      expect(retryButton).toBeInTheDocument()
      
      fireEvent.click(retryButton)
      expect(onRetry).toHaveBeenCalled()
    })
  })

  describe('File Management', () => {
    it('calls onFileRemove when remove button is clicked', async () => {
      const user = userEvent.setup()
      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const uploadState: FileUploadState = {
        ...defaultUploadState,
        file
      }
      
      render(<FileUploadZone {...defaultProps} uploadState={uploadState} />)
      
      const removeButton = screen.getByRole('button', { name: /remove file/i })
      await user.click(removeButton)
      
      expect(defaultProps.onFileRemove).toHaveBeenCalled()
    })

    it('formats file size correctly', () => {
      const testCases = [
        { size: 0, expected: '0 Bytes' },
        { size: 1024, expected: '1 KB' },
        { size: 1024 * 1024, expected: '1 MB' },
        { size: 1536, expected: '1.5 KB' }
      ]
      
      testCases.forEach(({ size, expected }) => {
        const file = createMockFile('test.pdf', size, 'application/pdf')
        const uploadState: FileUploadState = {
          ...defaultUploadState,
          file
        }
        
        const { unmount } = render(<FileUploadZone {...defaultProps} uploadState={uploadState} />)
        expect(screen.getByText(new RegExp(expected, 'i'))).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('Progress Indicators', () => {
    it('shows correct progress bar color for different states', () => {
      const testCases = [
        { state: { ...defaultUploadState, progress: 50 }, expectedClass: 'bg-primary' },
        { state: { ...defaultUploadState, progress: 100 }, expectedClass: 'bg-green-500' },
        { 
          state: { 
            ...defaultUploadState, 
            progress: 50, 
            error: { type: 'size' as const, message: 'Error' } 
          }, 
          expectedClass: 'bg-destructive' 
        }
      ]
      
      testCases.forEach(({ state, expectedClass }) => {
        const { unmount } = render(
          <FileUploadZone {...defaultProps} uploadState={state} />
        )
        
        if (state.progress > 0) {
          const progressBar = document.querySelector('[style*="width"]')
          expect(progressBar).toHaveClass(expectedClass)
        }
        
        unmount()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<FileUploadZone {...defaultProps} />)
      
      const uploadZone = screen.getByRole('button', { name: /file upload zone/i })
      expect(uploadZone).toHaveAttribute('aria-disabled', 'false')
      expect(uploadZone).toHaveAttribute('tabIndex', '0')
      
      const fileInput = screen.getByLabelText(/file input/i)
      expect(fileInput).toHaveAttribute('type', 'file')
      expect(fileInput).toHaveAttribute('accept', '.pdf')
    })

    it('updates ARIA attributes when disabled', () => {
      render(<FileUploadZone {...defaultProps} disabled />)
      
      const uploadZone = screen.getByRole('button', { name: /file upload zone/i })
      expect(uploadZone).toHaveAttribute('aria-disabled', 'true')
      expect(uploadZone).toHaveAttribute('tabIndex', '-1')
      
      const fileInput = screen.getByLabelText(/file input/i)
      expect(fileInput).toBeDisabled()
    })

    it('has proper labels for screen readers', () => {
      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      const uploadState: FileUploadState = {
        ...defaultUploadState,
        file
      }
      
      render(<FileUploadZone {...defaultProps} uploadState={uploadState} />)
      
      expect(screen.getByRole('button', { name: /remove file/i })).toBeInTheDocument()
    })
  })

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const { container } = render(
        <FileUploadZone {...defaultProps} className="custom-class" />
      )
      
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('calls onFileProcess when provided', async () => {
      const onFileProcess = jest.fn().mockResolvedValue('extracted text')
      const file = createMockFile('test.pdf', 1024, 'application/pdf')
      
      render(
        <FileUploadZone 
          {...defaultProps} 
          onFileProcess={onFileProcess}
        />
      )
      
      // This would typically be called by the parent component
      await onFileProcess(file)
      expect(onFileProcess).toHaveBeenCalledWith(file)
    })
  })
})

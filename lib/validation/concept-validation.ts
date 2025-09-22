/**
 * Comprehensive validation library for concept intake inputs
 */

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  sanitizedValue?: string
}

export interface ValidationError {
  code: string
  message: string
  field: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  code: string
  message: string
  suggestion?: string
}

export interface ConceptValidationOptions {
  minLength: number
  maxLength: number
  allowSpecialCharacters: boolean
  allowNumbers: boolean
  allowEmojis: boolean
  contentFilter: {
    enabled: boolean
    blockedWords: string[]
    allowedLanguages: string[]
  }
  requireWords: number
}

const DEFAULT_CONCEPT_OPTIONS: ConceptValidationOptions = {
  minLength: 3,
  maxLength: 500,
  allowSpecialCharacters: true,
  allowNumbers: true,
  allowEmojis: true,
  contentFilter: {
    enabled: true,
    blockedWords: [
      // Inappropriate content
      'spam', 'test123', 'asdfgh', 'qwerty',
      // Common non-educational terms that might indicate spam
      'buy now', 'click here', 'free money', 'get rich'
    ],
    allowedLanguages: ['en', 'es', 'fr', 'de', 'pt', 'it', 'zh', 'ja', 'ko']
  },
  requireWords: 1
}

/**
 * Comprehensive concept text validation
 */
export class ConceptValidator {
  private options: ConceptValidationOptions

  constructor(options: Partial<ConceptValidationOptions> = {}) {
    this.options = { ...DEFAULT_CONCEPT_OPTIONS, ...options }
  }

  validate(concept: string): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    let sanitizedValue = concept

    // Basic sanitization
    sanitizedValue = this.sanitizeInput(sanitizedValue)

    // Length validation
    const lengthValidation = this.validateLength(sanitizedValue)
    errors.push(...lengthValidation.errors)
    warnings.push(...lengthValidation.warnings)

    // Content validation
    const contentValidation = this.validateContent(sanitizedValue)
    errors.push(...contentValidation.errors)
    warnings.push(...contentValidation.warnings)

    // Structure validation
    const structureValidation = this.validateStructure(sanitizedValue)
    errors.push(...structureValidation.errors)
    warnings.push(...structureValidation.warnings)

    // Language validation
    const languageValidation = this.validateLanguage(sanitizedValue)
    errors.push(...languageValidation.errors)
    warnings.push(...languageValidation.warnings)

    // Educational content validation
    const educationalValidation = this.validateEducationalContent(sanitizedValue)
    warnings.push(...educationalValidation.warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: errors.length === 0 ? sanitizedValue : undefined
    }
  }

  private sanitizeInput(input: string): string {
    // Remove excessive whitespace
    let sanitized = input.trim().replace(/\s+/g, ' ')
    
    // Remove potential HTML/script tags
    sanitized = sanitized.replace(/<[^>]*>/g, '')
    
    // Remove control characters but preserve emojis and international characters
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    return sanitized
  }

  private validateLength(concept: string): Pick<ValidationResult, 'errors' | 'warnings'> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    if (concept.length < this.options.minLength) {
      errors.push({
        code: 'CONCEPT_TOO_SHORT',
        message: `Concept must be at least ${this.options.minLength} characters long`,
        field: 'concept',
        severity: 'error'
      })
    }

    if (concept.length > this.options.maxLength) {
      errors.push({
        code: 'CONCEPT_TOO_LONG',
        message: `Concept must be no more than ${this.options.maxLength} characters long`,
        field: 'concept',
        severity: 'error'
      })
    }

    // Warning for very short concepts
    if (concept.length >= this.options.minLength && concept.length < 10) {
      warnings.push({
        code: 'CONCEPT_VERY_SHORT',
        message: 'Your concept is quite brief',
        suggestion: 'Consider adding more details for a better learning plan'
      })
    }

    // Warning for very long concepts
    if (concept.length > 300 && concept.length <= this.options.maxLength) {
      warnings.push({
        code: 'CONCEPT_VERY_LONG',
        message: 'Your concept is quite detailed',
        suggestion: 'Consider focusing on the core topic for better results'
      })
    }

    return { errors, warnings }
  }

  private validateContent(concept: string): Pick<ValidationResult, 'errors' | 'warnings'> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    if (!this.options.contentFilter.enabled) {
      return { errors, warnings }
    }

    // Check for blocked words
    const lowerConcept = concept.toLowerCase()
    for (const blockedWord of this.options.contentFilter.blockedWords) {
      if (lowerConcept.includes(blockedWord.toLowerCase())) {
        errors.push({
          code: 'INAPPROPRIATE_CONTENT',
          message: `Content contains inappropriate or spam-like text: "${blockedWord}"`,
          field: 'concept',
          severity: 'error'
        })
      }
    }

    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{4,}/g, // Repeated characters (aaaaa)
      /^[^a-zA-Z]*$/g, // Only numbers/symbols
      /[A-Z]{10,}/g, // Excessive caps
      /\b\d{4,}\b/g // Long numbers that might be spam
    ]

    for (const pattern of spamPatterns) {
      if (pattern.test(concept)) {
        warnings.push({
          code: 'POTENTIAL_SPAM',
          message: 'Content might contain spam-like patterns',
          suggestion: 'Please enter a genuine learning topic'
        })
        break
      }
    }

    return { errors, warnings }
  }

  private validateStructure(concept: string): Pick<ValidationResult, 'errors' | 'warnings'> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    const words = concept.trim().split(/\s+/).filter(word => word.length > 0)

    // Require minimum number of words
    if (words.length < this.options.requireWords) {
      errors.push({
        code: 'INSUFFICIENT_WORDS',
        message: `Concept must contain at least ${this.options.requireWords} word(s)`,
        field: 'concept',
        severity: 'error'
      })
    }

    // Check for valid characters
    if (!this.options.allowNumbers && /\d/.test(concept)) {
      warnings.push({
        code: 'CONTAINS_NUMBERS',
        message: 'Concept contains numbers',
        suggestion: 'Consider using words instead of numbers for better results'
      })
    }

    if (!this.options.allowSpecialCharacters && /[!@#$%^&*()_+=\[\]{}|;:,.<>?]/.test(concept)) {
      warnings.push({
        code: 'CONTAINS_SPECIAL_CHARS',
        message: 'Concept contains special characters',
        suggestion: 'Consider using only letters and spaces for clarity'
      })
    }

    // Check for common formatting issues
    if (/^\s/.test(concept) || /\s$/.test(concept)) {
      warnings.push({
        code: 'EXTRA_WHITESPACE',
        message: 'Concept has extra whitespace',
        suggestion: 'Extra spaces will be automatically removed'
      })
    }

    return { errors, warnings }
  }

  private validateLanguage(concept: string): Pick<ValidationResult, 'errors' | 'warnings'> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Simple language detection based on character sets
    const hasLatin = /[a-zA-Z]/.test(concept)
    const hasCJK = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff]/.test(concept)
    const hasArabic = /[\u0600-\u06ff]/.test(concept)
    const hasCyrillic = /[\u0400-\u04ff]/.test(concept)

    let detectedLanguage = 'unknown'
    if (hasLatin) detectedLanguage = 'latin'
    else if (hasCJK) detectedLanguage = 'cjk'
    else if (hasArabic) detectedLanguage = 'arabic'
    else if (hasCyrillic) detectedLanguage = 'cyrillic'

    // Check if language is supported (basic check)
    if (detectedLanguage === 'unknown' && concept.length > 10) {
      warnings.push({
        code: 'UNKNOWN_LANGUAGE',
        message: 'Unable to detect language',
        suggestion: 'Please use English or another supported language'
      })
    }

    return { errors, warnings }
  }

  private validateEducationalContent(concept: string): Pick<ValidationResult, 'warnings'> {
    const warnings: ValidationWarning[] = []

    // Check for educational keywords to provide suggestions
    const educationalKeywords = [
      'learn', 'understand', 'study', 'master', 'basics', 'fundamentals',
      'introduction', 'advanced', 'beginner', 'tutorial', 'guide', 'course'
    ]

    const hasEducationalKeywords = educationalKeywords.some(keyword =>
      concept.toLowerCase().includes(keyword)
    )

    if (!hasEducationalKeywords && concept.length > 20) {
      warnings.push({
        code: 'NO_EDUCATIONAL_KEYWORDS',
        message: 'Consider adding learning-focused terms',
        suggestion: 'Try phrases like "learn basics of..." or "understand..."'
      })
    }

    // Check for overly specific technical terms that might be too narrow
    const verySpecificPatterns = [
      /version\s+\d+\.\d+/i, // Version numbers
      /\b[A-Z]{3,}\b.*\b[A-Z]{3,}\b/g, // Multiple acronyms
      /\([^)]{20,}\)/g // Long parenthetical explanations
    ]

    for (const pattern of verySpecificPatterns) {
      if (pattern.test(concept)) {
        warnings.push({
          code: 'OVERLY_SPECIFIC',
          message: 'Concept might be too specific',
          suggestion: 'Consider focusing on broader fundamentals first'
        })
        break
      }
    }

    return { warnings }
  }
}

/**
 * File validation utilities
 */
export interface FileValidationOptions {
  maxSize: number // in bytes
  allowedTypes: string[]
  allowedExtensions: string[]
  requireContent: boolean
}

const DEFAULT_FILE_OPTIONS: FileValidationOptions = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['application/pdf', 'text/plain', 'text/markdown'],
  allowedExtensions: ['.pdf', '.txt', '.md'],
  requireContent: true
}

export class FileValidator {
  private options: FileValidationOptions

  constructor(options: Partial<FileValidationOptions> = {}) {
    this.options = { ...DEFAULT_FILE_OPTIONS, ...options }
  }

  validate(file: File): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Size validation
    if (file.size > this.options.maxSize) {
      errors.push({
        code: 'FILE_TOO_LARGE',
        message: `File size (${this.formatFileSize(file.size)}) exceeds limit of ${this.formatFileSize(this.options.maxSize)}`,
        field: 'file',
        severity: 'error'
      })
    }

    if (file.size === 0) {
      errors.push({
        code: 'FILE_EMPTY',
        message: 'File appears to be empty',
        field: 'file',
        severity: 'error'
      })
    }

    // Type validation
    if (!this.options.allowedTypes.includes(file.type)) {
      errors.push({
        code: 'FILE_TYPE_NOT_ALLOWED',
        message: `File type "${file.type}" is not supported. Allowed types: ${this.options.allowedTypes.join(', ')}`,
        field: 'file',
        severity: 'error'
      })
    }

    // Extension validation
    const extension = this.getFileExtension(file.name)
    if (!this.options.allowedExtensions.includes(extension)) {
      errors.push({
        code: 'FILE_EXTENSION_NOT_ALLOWED',
        message: `File extension "${extension}" is not supported. Allowed extensions: ${this.options.allowedExtensions.join(', ')}`,
        field: 'file',
        severity: 'error'
      })
    }

    // Name validation
    const nameValidation = this.validateFileName(file.name)
    errors.push(...nameValidation.errors)
    warnings.push(...nameValidation.warnings)

    // Size warnings
    if (file.size > 5 * 1024 * 1024 && file.size <= this.options.maxSize) {
      warnings.push({
        code: 'FILE_LARGE',
        message: `File is quite large (${this.formatFileSize(file.size)})`,
        suggestion: 'Large files may take longer to process'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  private validateFileName(fileName: string): Pick<ValidationResult, 'errors' | 'warnings'> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Check for dangerous characters
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/
    if (dangerousChars.test(fileName)) {
      errors.push({
        code: 'INVALID_FILENAME_CHARS',
        message: 'Filename contains invalid characters',
        field: 'fileName',
        severity: 'error'
      })
    }

    // Check length
    if (fileName.length > 255) {
      errors.push({
        code: 'FILENAME_TOO_LONG',
        message: 'Filename is too long (max 255 characters)',
        field: 'fileName',
        severity: 'error'
      })
    }

    // Check for suspicious patterns
    if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i.test(fileName)) {
      errors.push({
        code: 'RESERVED_FILENAME',
        message: 'Filename uses a reserved system name',
        field: 'fileName',
        severity: 'error'
      })
    }

    return { errors, warnings }
  }

  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.')
    return lastDot !== -1 ? fileName.slice(lastDot).toLowerCase() : ''
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

/**
 * URL validation utilities
 */
export interface URLValidationOptions {
  allowedProtocols: string[]
  blockedDomains: string[]
  requireAccessible: boolean
  timeout: number
}

const DEFAULT_URL_OPTIONS: URLValidationOptions = {
  allowedProtocols: ['http:', 'https:'],
  blockedDomains: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    // Add other blocked domains as needed
  ],
  requireAccessible: false, // Set to true if you want to check accessibility
  timeout: 5000
}

export class URLValidator {
  private options: URLValidationOptions

  constructor(options: Partial<URLValidationOptions> = {}) {
    this.options = { ...DEFAULT_URL_OPTIONS, ...options }
  }

  validate(url: string): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    let sanitizedValue = url.trim()

    try {
      // Add protocol if missing
      if (!sanitizedValue.startsWith('http://') && !sanitizedValue.startsWith('https://')) {
        sanitizedValue = 'https://' + sanitizedValue
      }

      const urlObj = new URL(sanitizedValue)

      // Protocol validation
      if (!this.options.allowedProtocols.includes(urlObj.protocol)) {
        errors.push({
          code: 'INVALID_PROTOCOL',
          message: `Protocol "${urlObj.protocol}" is not allowed. Allowed protocols: ${this.options.allowedProtocols.join(', ')}`,
          field: 'url',
          severity: 'error'
        })
      }

      // Domain validation
      if (this.options.blockedDomains.includes(urlObj.hostname)) {
        errors.push({
          code: 'BLOCKED_DOMAIN',
          message: `Domain "${urlObj.hostname}" is not allowed`,
          field: 'url',
          severity: 'error'
        })
      }

      // Check for suspicious patterns
      if (urlObj.hostname.includes('..') || urlObj.hostname.startsWith('.')) {
        errors.push({
          code: 'SUSPICIOUS_DOMAIN',
          message: 'URL contains suspicious domain patterns',
          field: 'url',
          severity: 'error'
        })
      }

      // Warn about non-HTTPS URLs
      if (urlObj.protocol === 'http:') {
        warnings.push({
          code: 'NON_SECURE_URL',
          message: 'URL uses HTTP instead of HTTPS',
          suggestion: 'HTTPS URLs are more secure and reliable'
        })
      }

    } catch (error) {
      errors.push({
        code: 'INVALID_URL_FORMAT',
        message: 'URL format is invalid',
        field: 'url',
        severity: 'error'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: errors.length === 0 ? sanitizedValue : undefined
    }
  }

  async validateAccessibility(url: string): Promise<ValidationResult> {
    const basicValidation = this.validate(url)
    if (!basicValidation.isValid) {
      return basicValidation
    }

    const errors: ValidationError[] = [...basicValidation.errors]
    const warnings: ValidationWarning[] = [...basicValidation.warnings]

    if (!this.options.requireAccessible) {
      return { ...basicValidation, errors, warnings }
    }

    try {
      // Simple accessibility check (in a real app, this might be done server-side)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout)

      const response = await fetch(basicValidation.sanitizedValue!, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors' // Avoid CORS issues for basic connectivity check
      })

      clearTimeout(timeoutId)

      if (!response.ok && response.status !== 0) { // status 0 is expected with no-cors
        warnings.push({
          code: 'URL_NOT_ACCESSIBLE',
          message: `URL returned status ${response.status}`,
          suggestion: 'Please check that the URL is correct and accessible'
        })
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        warnings.push({
          code: 'URL_TIMEOUT',
          message: 'URL took too long to respond',
          suggestion: 'The URL might be slow or temporarily unavailable'
        })
      } else {
        warnings.push({
          code: 'URL_UNREACHABLE',
          message: 'Unable to reach the URL',
          suggestion: 'Please check your internet connection and the URL'
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedValue: basicValidation.sanitizedValue
    }
  }
}

// Export singleton instances for easy use
export const conceptValidator = new ConceptValidator()
export const fileValidator = new FileValidator()
export const urlValidator = new URLValidator()

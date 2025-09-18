import { GuestUserData, GuestPlan, GuestFlashcard, GuestModule, GuestLesson } from '@/types/guest'
import { TransformedMigrationData } from './guest-data-transformer'
import { supabase, supabaseGuestManager } from './supabase'

/**
 * Data validation system to ensure 100% successful migration with no data loss
 * Provides comprehensive validation at every stage of the migration process
 */
export class GuestMigrationValidator {
  private static instance: GuestMigrationValidator

  static getInstance(): GuestMigrationValidator {
    if (!GuestMigrationValidator.instance) {
      GuestMigrationValidator.instance = new GuestMigrationValidator()
    }
    return GuestMigrationValidator.instance
  }

  /**
   * Validate guest data before migration
   */
  async validateGuestData(guestData: GuestUserData): Promise<ValidationReport> {
    const report: ValidationReport = {
      isValid: true,
      validationStage: 'pre_migration',
      timestamp: new Date().toISOString(),
      errors: [],
      warnings: [],
      statistics: {
        total_plans: guestData.plans.length,
        total_modules: 0,
        total_lessons: 0,
        total_flashcards: guestData.flashcards.length,
        data_integrity_score: 100
      },
      detailed_results: {
        plans: [],
        flashcards: [],
        progress: null,
        preferences: null
      }
    }

    try {
      // 1. Validate plans structure
      for (const [index, plan] of guestData.plans.entries()) {
        const planValidation = await this.validateGuestPlan(plan, index)
        report.detailed_results.plans.push(planValidation)
        
        if (!planValidation.isValid) {
          report.isValid = false
          report.errors.push(...planValidation.errors.map(e => `Plan ${index}: ${e}`))
        }
        
        report.warnings.push(...planValidation.warnings.map(w => `Plan ${index}: ${w}`))
        report.statistics.total_modules += plan.modules.length
        report.statistics.total_lessons += plan.modules.reduce((sum, m) => sum + m.lessons.length, 0)
      }

      // 2. Validate flashcards
      for (const [index, flashcard] of guestData.flashcards.entries()) {
        const flashcardValidation = await this.validateGuestFlashcard(flashcard, index)
        report.detailed_results.flashcards.push(flashcardValidation)
        
        if (!flashcardValidation.isValid) {
          report.isValid = false
          report.errors.push(...flashcardValidation.errors.map(e => `Flashcard ${index}: ${e}`))
        }
        
        report.warnings.push(...flashcardValidation.warnings.map(w => `Flashcard ${index}: ${w}`))
      }

      // 3. Validate progress data
      const progressValidation = await this.validateProgressData(guestData.progress)
      report.detailed_results.progress = progressValidation
      
      if (!progressValidation.isValid) {
        report.isValid = false
        report.errors.push(...progressValidation.errors.map(e => `Progress: ${e}`))
      }
      
      report.warnings.push(...progressValidation.warnings.map(w => `Progress: ${w}`))

      // 4. Validate preferences
      const preferencesValidation = await this.validatePreferences(guestData.preferences)
      report.detailed_results.preferences = preferencesValidation
      
      if (!preferencesValidation.isValid) {
        report.isValid = false
        report.errors.push(...preferencesValidation.errors.map(e => `Preferences: ${e}`))
      }
      
      report.warnings.push(...preferencesValidation.warnings.map(w => `Preferences: ${w}`))

      // 5. Calculate data integrity score
      report.statistics.data_integrity_score = this.calculateDataIntegrityScore(report)

      // 6. Perform cross-validation checks
      const crossValidation = await this.performCrossValidation(guestData)
      if (!crossValidation.isValid) {
        report.isValid = false
        report.errors.push(...crossValidation.errors)
      }
      report.warnings.push(...crossValidation.warnings)

    } catch (error) {
      report.isValid = false
      report.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return report
  }

  /**
   * Validate transformed data before database insertion
   */
  async validateTransformedData(transformedData: TransformedMigrationData): Promise<ValidationReport> {
    const report: ValidationReport = {
      isValid: true,
      validationStage: 'post_transformation',
      timestamp: new Date().toISOString(),
      errors: [],
      warnings: [],
      statistics: {
        total_plans: transformedData.curricula.length,
        total_modules: 0,
        total_lessons: 0,
        total_flashcards: transformedData.flashcards.length,
        data_integrity_score: 100
      },
      detailed_results: {
        plans: [],
        flashcards: [],
        progress: null,
        preferences: null
      }
    }

    try {
      // 1. Validate transformed curricula
      for (const [index, curriculum] of transformedData.curricula.entries()) {
        const curriculumValidation = await this.validateTransformedCurriculum(curriculum, index)
        report.detailed_results.plans.push(curriculumValidation)
        
        if (!curriculumValidation.isValid) {
          report.isValid = false
          report.errors.push(...curriculumValidation.errors.map(e => `Curriculum ${index}: ${e}`))
        }
        
        report.warnings.push(...curriculumValidation.warnings.map(w => `Curriculum ${index}: ${w}`))
        report.statistics.total_modules += curriculum.modules.length
        report.statistics.total_lessons += curriculum.modules.reduce((sum, m) => sum + m.lessons.length, 0)
      }

      // 2. Validate transformed flashcards
      for (const [index, flashcard] of transformedData.flashcards.entries()) {
        const flashcardValidation = await this.validateTransformedFlashcard(flashcard, index)
        report.detailed_results.flashcards.push(flashcardValidation)
        
        if (!flashcardValidation.isValid) {
          report.isValid = false
          report.errors.push(...flashcardValidation.errors.map(e => `Flashcard ${index}: ${e}`))
        }
        
        report.warnings.push(...flashcardValidation.warnings.map(w => `Flashcard ${index}: ${w}`))
      }

      // 3. Validate schema compliance
      const schemaValidation = await this.validateDatabaseSchemaCompliance(transformedData)
      if (!schemaValidation.isValid) {
        report.isValid = false
        report.errors.push(...schemaValidation.errors)
      }
      report.warnings.push(...schemaValidation.warnings)

      // 4. Calculate integrity score
      report.statistics.data_integrity_score = this.calculateDataIntegrityScore(report)

    } catch (error) {
      report.isValid = false
      report.errors.push(`Transformed data validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return report
  }

  /**
   * Validate migration results after database insertion
   */
  async validateMigrationResults(
    originalData: GuestUserData,
    guestId: string,
    userId: string
  ): Promise<ValidationReport> {
    const report: ValidationReport = {
      isValid: true,
      validationStage: 'post_migration',
      timestamp: new Date().toISOString(),
      errors: [],
      warnings: [],
      statistics: {
        total_plans: 0,
        total_modules: 0,
        total_lessons: 0,
        total_flashcards: 0,
        data_integrity_score: 100
      },
      detailed_results: {
        plans: [],
        flashcards: [],
        progress: null,
        preferences: null
      }
    }

    try {
      // 1. Verify all curricula were migrated
      const migratedCurricula = await this.getMigratedCurricula(userId, guestId)
      const curriculaValidation = await this.validateMigratedCurricula(
        originalData.plans,
        migratedCurricula
      )
      
      report.detailed_results.plans.push(curriculaValidation)
      report.statistics.total_plans = migratedCurricula.length
      
      if (!curriculaValidation.isValid) {
        report.isValid = false
        report.errors.push(...curriculaValidation.errors)
      }
      report.warnings.push(...curriculaValidation.warnings)

      // 2. Verify all flashcards were migrated
      const migratedFlashcards = await this.getMigratedFlashcards(userId, guestId)
      const flashcardsValidation = await this.validateMigratedFlashcards(
        originalData.flashcards,
        migratedFlashcards
      )
      
      report.detailed_results.flashcards.push(flashcardsValidation)
      report.statistics.total_flashcards = migratedFlashcards.length
      
      if (!flashcardsValidation.isValid) {
        report.isValid = false
        report.errors.push(...flashcardsValidation.errors)
      }
      report.warnings.push(...flashcardsValidation.warnings)

      // 3. Verify progress migration
      const migratedProgress = await this.getMigratedProgress(userId, guestId)
      const progressValidation = await this.validateMigratedProgress(
        originalData.progress,
        migratedProgress
      )
      
      report.detailed_results.progress = progressValidation
      
      if (!progressValidation.isValid) {
        report.isValid = false
        report.errors.push(...progressValidation.errors)
      }
      report.warnings.push(...progressValidation.warnings)

      // 4. Verify preferences migration
      const migratedPreferences = await this.getMigratedPreferences(userId, guestId)
      const preferencesValidation = await this.validateMigratedPreferences(
        originalData.preferences,
        migratedPreferences
      )
      
      report.detailed_results.preferences = preferencesValidation
      
      if (!preferencesValidation.isValid) {
        report.isValid = false
        report.errors.push(...preferencesValidation.errors)
      }
      report.warnings.push(...preferencesValidation.warnings)

      // 5. Perform data completeness check
      const completenessCheck = await this.performCompletenessCheck(originalData, {
        curricula: migratedCurricula,
        flashcards: migratedFlashcards,
        progress: migratedProgress,
        preferences: migratedPreferences
      })

      if (!completenessCheck.isValid) {
        report.isValid = false
        report.errors.push(...completenessCheck.errors)
      }
      report.warnings.push(...completenessCheck.warnings)

      // 6. Calculate final integrity score
      report.statistics.data_integrity_score = this.calculateDataIntegrityScore(report)

    } catch (error) {
      report.isValid = false
      report.errors.push(`Migration results validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return report
  }

  /**
   * Perform comprehensive data integrity check
   */
  async performDataIntegrityCheck(
    sessionId: string,
    originalData: GuestUserData,
    migratedData: any
  ): Promise<DataIntegrityResult> {
    const result: DataIntegrityResult = {
      sessionId,
      timestamp: new Date().toISOString(),
      integrityScore: 100,
      checksPerformed: [],
      issues: [],
      recommendations: []
    }

    try {
      // 1. Count-based integrity check
      const countCheck = await this.performCountIntegrityCheck(originalData, migratedData)
      result.checksPerformed.push(countCheck)
      if (!countCheck.passed) {
        result.integrityScore -= 20
        result.issues.push(...countCheck.issues)
      }

      // 2. Content-based integrity check
      const contentCheck = await this.performContentIntegrityCheck(originalData, migratedData)
      result.checksPerformed.push(contentCheck)
      if (!contentCheck.passed) {
        result.integrityScore -= 30
        result.issues.push(...contentCheck.issues)
      }

      // 3. Relationship integrity check
      const relationshipCheck = await this.performRelationshipIntegrityCheck(migratedData)
      result.checksPerformed.push(relationshipCheck)
      if (!relationshipCheck.passed) {
        result.integrityScore -= 25
        result.issues.push(...relationshipCheck.issues)
      }

      // 4. Data type integrity check
      const typeCheck = await this.performDataTypeIntegrityCheck(migratedData)
      result.checksPerformed.push(typeCheck)
      if (!typeCheck.passed) {
        result.integrityScore -= 15
        result.issues.push(...typeCheck.issues)
      }

      // 5. Business logic integrity check
      const businessLogicCheck = await this.performBusinessLogicIntegrityCheck(originalData, migratedData)
      result.checksPerformed.push(businessLogicCheck)
      if (!businessLogicCheck.passed) {
        result.integrityScore -= 10
        result.issues.push(...businessLogicCheck.issues)
      }

      // Generate recommendations
      result.recommendations = this.generateIntegrityRecommendations(result)

    } catch (error) {
      result.integrityScore = 0
      result.issues.push({
        type: 'system_error',
        severity: 'critical',
        description: `Integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        affectedItems: []
      })
    }

    return result
  }

  // Private validation methods

  private async validateGuestPlan(plan: GuestPlan, index: number): Promise<ItemValidationResult> {
    const result: ItemValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      itemType: 'plan',
      itemIndex: index
    }

    // Required fields validation
    if (!plan.id || typeof plan.id !== 'string') {
      result.errors.push('Missing or invalid plan ID')
      result.isValid = false
    }

    if (!plan.title || typeof plan.title !== 'string' || plan.title.trim().length === 0) {
      result.errors.push('Missing or invalid plan title')
      result.isValid = false
    }

    if (!plan.domain || typeof plan.domain !== 'string') {
      result.errors.push('Missing or invalid plan domain')
      result.isValid = false
    }

    if (!plan.createdAt || !this.isValidDate(plan.createdAt)) {
      result.errors.push('Missing or invalid creation date')
      result.isValid = false
    }

    // Modules validation
    if (!Array.isArray(plan.modules)) {
      result.errors.push('Plan modules must be an array')
      result.isValid = false
    } else {
      if (plan.modules.length === 0) {
        result.warnings.push('Plan has no modules')
      }

      for (const [moduleIndex, module] of plan.modules.entries()) {
        const moduleValidation = await this.validateGuestModule(module, moduleIndex)
        if (!moduleValidation.isValid) {
          result.errors.push(...moduleValidation.errors.map(e => `Module ${moduleIndex}: ${e}`))
          result.isValid = false
        }
        result.warnings.push(...moduleValidation.warnings.map(w => `Module ${moduleIndex}: ${w}`))
      }
    }

    return result
  }

  private async validateGuestModule(module: GuestModule, index: number): Promise<ItemValidationResult> {
    const result: ItemValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      itemType: 'module',
      itemIndex: index
    }

    if (!module.id || typeof module.id !== 'string') {
      result.errors.push('Missing or invalid module ID')
      result.isValid = false
    }

    if (!module.title || typeof module.title !== 'string' || module.title.trim().length === 0) {
      result.errors.push('Missing or invalid module title')
      result.isValid = false
    }

    if (!Array.isArray(module.lessons)) {
      result.errors.push('Module lessons must be an array')
      result.isValid = false
    } else {
      if (module.lessons.length === 0) {
        result.warnings.push('Module has no lessons')
      }

      for (const [lessonIndex, lesson] of module.lessons.entries()) {
        const lessonValidation = await this.validateGuestLesson(lesson, lessonIndex)
        if (!lessonValidation.isValid) {
          result.errors.push(...lessonValidation.errors.map(e => `Lesson ${lessonIndex}: ${e}`))
          result.isValid = false
        }
        result.warnings.push(...lessonValidation.warnings.map(w => `Lesson ${lessonIndex}: ${w}`))
      }
    }

    return result
  }

  private async validateGuestLesson(lesson: GuestLesson, index: number): Promise<ItemValidationResult> {
    const result: ItemValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      itemType: 'lesson',
      itemIndex: index
    }

    if (!lesson.id || typeof lesson.id !== 'string') {
      result.errors.push('Missing or invalid lesson ID')
      result.isValid = false
    }

    if (!lesson.title || typeof lesson.title !== 'string' || lesson.title.trim().length === 0) {
      result.errors.push('Missing or invalid lesson title')
      result.isValid = false
    }

    if (!lesson.duration || typeof lesson.duration !== 'string') {
      result.errors.push('Missing or invalid lesson duration')
      result.isValid = false
    }

    if (typeof lesson.completed !== 'boolean') {
      result.errors.push('Lesson completed status must be boolean')
      result.isValid = false
    }

    if (lesson.completed && lesson.completedAt && !this.isValidDate(lesson.completedAt)) {
      result.warnings.push('Invalid completion date format')
    }

    return result
  }

  private async validateGuestFlashcard(flashcard: GuestFlashcard, index: number): Promise<ItemValidationResult> {
    const result: ItemValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      itemType: 'flashcard',
      itemIndex: index
    }

    if (!flashcard.id || typeof flashcard.id !== 'string') {
      result.errors.push('Missing or invalid flashcard ID')
      result.isValid = false
    }

    if (!flashcard.front || typeof flashcard.front !== 'string' || flashcard.front.trim().length === 0) {
      result.errors.push('Missing or invalid flashcard front content')
      result.isValid = false
    }

    if (!flashcard.back || typeof flashcard.back !== 'string' || flashcard.back.trim().length === 0) {
      result.errors.push('Missing or invalid flashcard back content')
      result.isValid = false
    }

    if (!Array.isArray(flashcard.tags)) {
      result.errors.push('Flashcard tags must be an array')
      result.isValid = false
    }

    if (!flashcard.createdAt || !this.isValidDate(flashcard.createdAt)) {
      result.errors.push('Missing or invalid creation date')
      result.isValid = false
    }

    if (!['easy', 'medium', 'hard'].includes(flashcard.difficulty)) {
      result.errors.push('Invalid difficulty level')
      result.isValid = false
    }

    if (typeof flashcard.reviewCount !== 'number' || flashcard.reviewCount < 0) {
      result.errors.push('Invalid review count')
      result.isValid = false
    }

    if (typeof flashcard.correctCount !== 'number' || flashcard.correctCount < 0) {
      result.errors.push('Invalid correct count')
      result.isValid = false
    }

    if (flashcard.correctCount > flashcard.reviewCount) {
      result.warnings.push('Correct count exceeds review count')
    }

    return result
  }

  private async validateProgressData(progress: any): Promise<ItemValidationResult> {
    const result: ItemValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      itemType: 'progress',
      itemIndex: 0
    }

    const requiredFields = ['totalPlans', 'totalLessons', 'totalFlashcards', 'completedLessons', 'studyMinutes', 'streak']
    
    for (const field of requiredFields) {
      if (typeof progress[field] !== 'number' || progress[field] < 0) {
        result.errors.push(`Invalid ${field} value`)
        result.isValid = false
      }
    }

    if (progress.completedLessons > progress.totalLessons) {
      result.warnings.push('Completed lessons exceed total lessons')
    }

    return result
  }

  private async validatePreferences(preferences: any): Promise<ItemValidationResult> {
    const result: ItemValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      itemType: 'preferences',
      itemIndex: 0
    }

    if (!['light', 'dark', 'system'].includes(preferences.theme)) {
      result.errors.push('Invalid theme value')
      result.isValid = false
    }

    if (typeof preferences.notifications !== 'boolean') {
      result.errors.push('Notifications setting must be boolean')
      result.isValid = false
    }

    if (typeof preferences.soundEffects !== 'boolean') {
      result.errors.push('Sound effects setting must be boolean')
      result.isValid = false
    }

    return result
  }

  private async validateTransformedCurriculum(curriculum: any, index: number): Promise<ItemValidationResult> {
    const result: ItemValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      itemType: 'curriculum',
      itemIndex: index
    }

    // Database schema validation
    const requiredFields = ['id', 'title', 'user_id', 'created_at']
    for (const field of requiredFields) {
      if (!curriculum[field]) {
        result.errors.push(`Missing required field: ${field}`)
        result.isValid = false
      }
    }

    // UUID format validation for IDs
    if (curriculum.id && !this.isValidUUID(curriculum.id)) {
      result.warnings.push('ID format may not be optimal for database')
    }

    return result
  }

  private async validateTransformedFlashcard(flashcard: any, index: number): Promise<ItemValidationResult> {
    const result: ItemValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      itemType: 'flashcard',
      itemIndex: index
    }

    const requiredFields = ['id', 'front', 'back', 'user_id', 'created_at']
    for (const field of requiredFields) {
      if (!flashcard[field]) {
        result.errors.push(`Missing required field: ${field}`)
        result.isValid = false
      }
    }

    return result
  }

  private async validateDatabaseSchemaCompliance(data: TransformedMigrationData): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    // Check for potential database constraint violations
    // This would typically involve checking against actual database schema
    // For now, we'll do basic checks

    // Check for duplicate IDs within the same type
    const curriculaIds = data.curricula.map(c => c.id)
    const duplicateCurriculaIds = curriculaIds.filter((id, index) => curriculaIds.indexOf(id) !== index)
    if (duplicateCurriculaIds.length > 0) {
      result.errors.push(`Duplicate curriculum IDs found: ${duplicateCurriculaIds.join(', ')}`)
      result.isValid = false
    }

    const flashcardIds = data.flashcards.map(f => f.id)
    const duplicateFlashcardIds = flashcardIds.filter((id, index) => flashcardIds.indexOf(id) !== index)
    if (duplicateFlashcardIds.length > 0) {
      result.errors.push(`Duplicate flashcard IDs found: ${duplicateFlashcardIds.join(', ')}`)
      result.isValid = false
    }

    return result
  }

  private async performCrossValidation(guestData: GuestUserData): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    // Cross-validate progress data with actual content
    const actualLessonCount = guestData.plans.reduce((sum, plan) => 
      sum + plan.modules.reduce((moduleSum, module) => moduleSum + module.lessons.length, 0), 0)
    
    if (guestData.progress.totalLessons !== actualLessonCount) {
      result.warnings.push(`Progress total lessons (${guestData.progress.totalLessons}) doesn't match actual lesson count (${actualLessonCount})`)
    }

    if (guestData.progress.totalPlans !== guestData.plans.length) {
      result.warnings.push(`Progress total plans (${guestData.progress.totalPlans}) doesn't match actual plan count (${guestData.plans.length})`)
    }

    if (guestData.progress.totalFlashcards !== guestData.flashcards.length) {
      result.warnings.push(`Progress total flashcards (${guestData.progress.totalFlashcards}) doesn't match actual flashcard count (${guestData.flashcards.length})`)
    }

    return result
  }

  // Database query methods for post-migration validation

  private async getMigratedCurricula(userId: string, guestId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('curricula')
        .select(`
          *,
          modules:curriculum_modules(
            *,
            lessons:module_lessons(*)
          )
        `)
        .eq('user_id', userId)
        .eq('guest_id', guestId)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get migrated curricula:', error)
      return []
    }
  }

  private async getMigratedFlashcards(userId: string, guestId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .eq('guest_id', guestId)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Failed to get migrated flashcards:', error)
      return []
    }
  }

  private async getMigratedProgress(userId: string, guestId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('guest_id', guestId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    } catch (error) {
      console.error('Failed to get migrated progress:', error)
      return null
    }
  }

  private async getMigratedPreferences(userId: string, guestId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('guest_id', guestId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    } catch (error) {
      console.error('Failed to get migrated preferences:', error)
      return null
    }
  }

  // Validation comparison methods

  private async validateMigratedCurricula(
    original: GuestPlan[],
    migrated: any[]
  ): Promise<ItemValidationResult> {
    const result: ItemValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      itemType: 'curricula_comparison',
      itemIndex: 0
    }

    if (original.length !== migrated.length) {
      result.errors.push(`Curriculum count mismatch: expected ${original.length}, got ${migrated.length}`)
      result.isValid = false
    }

    // Validate each curriculum was migrated correctly
    for (const originalPlan of original) {
      const migratedCurriculum = migrated.find(c => c.id === originalPlan.id)
      if (!migratedCurriculum) {
        result.errors.push(`Missing curriculum: ${originalPlan.title} (${originalPlan.id})`)
        result.isValid = false
      } else {
        // Validate content preservation
        if (migratedCurriculum.title !== originalPlan.title) {
          result.warnings.push(`Title changed for curriculum ${originalPlan.id}`)
        }
      }
    }

    return result
  }

  private async validateMigratedFlashcards(
    original: GuestFlashcard[],
    migrated: any[]
  ): Promise<ItemValidationResult> {
    const result: ItemValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      itemType: 'flashcards_comparison',
      itemIndex: 0
    }

    if (original.length !== migrated.length) {
      result.errors.push(`Flashcard count mismatch: expected ${original.length}, got ${migrated.length}`)
      result.isValid = false
    }

    for (const originalFlashcard of original) {
      const migratedFlashcard = migrated.find(f => f.id === originalFlashcard.id)
      if (!migratedFlashcard) {
        result.errors.push(`Missing flashcard: ${originalFlashcard.id}`)
        result.isValid = false
      } else {
        if (migratedFlashcard.front !== originalFlashcard.front) {
          result.warnings.push(`Front content changed for flashcard ${originalFlashcard.id}`)
        }
        if (migratedFlashcard.back !== originalFlashcard.back) {
          result.warnings.push(`Back content changed for flashcard ${originalFlashcard.id}`)
        }
      }
    }

    return result
  }

  private async validateMigratedProgress(original: any, migrated: any): Promise<ItemValidationResult> {
    const result: ItemValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      itemType: 'progress_comparison',
      itemIndex: 0
    }

    if (!migrated) {
      result.errors.push('Progress data was not migrated')
      result.isValid = false
      return result
    }

    // Allow for some flexibility in progress migration as it might be merged
    if (migrated.total_plans < original.totalPlans) {
      result.warnings.push('Total plans count decreased after migration')
    }

    return result
  }

  private async validateMigratedPreferences(original: any, migrated: any): Promise<ItemValidationResult> {
    const result: ItemValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      itemType: 'preferences_comparison',
      itemIndex: 0
    }

    if (!migrated) {
      result.errors.push('Preferences data was not migrated')
      result.isValid = false
      return result
    }

    return result
  }

  private async performCompletenessCheck(original: GuestUserData, migrated: any): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }

    // Check that no data was lost during migration
    const expectedItems = original.plans.length + original.flashcards.length
    const migratedItems = migrated.curricula.length + migrated.flashcards.length

    if (migratedItems < expectedItems) {
      result.errors.push(`Data loss detected: expected ${expectedItems} items, got ${migratedItems}`)
      result.isValid = false
    }

    return result
  }

  // Integrity check methods

  private async performCountIntegrityCheck(original: GuestUserData, migrated: any): Promise<IntegrityCheck> {
    const check: IntegrityCheck = {
      type: 'count_integrity',
      passed: true,
      issues: [],
      details: {}
    }

    const originalCounts = {
      plans: original.plans.length,
      flashcards: original.flashcards.length,
      modules: original.plans.reduce((sum, p) => sum + p.modules.length, 0),
      lessons: original.plans.reduce((sum, p) => sum + p.modules.reduce((ms, m) => ms + m.lessons.length, 0), 0)
    }

    const migratedCounts = {
      plans: migrated.curricula?.length || 0,
      flashcards: migrated.flashcards?.length || 0,
      modules: migrated.curricula?.reduce((sum: number, c: any) => sum + (c.modules?.length || 0), 0) || 0,
      lessons: migrated.curricula?.reduce((sum: number, c: any) => 
        sum + (c.modules?.reduce((ms: number, m: any) => ms + (m.lessons?.length || 0), 0) || 0), 0) || 0
    }

    for (const [type, originalCount] of Object.entries(originalCounts)) {
      const migratedCount = migratedCounts[type as keyof typeof migratedCounts]
      if (migratedCount !== originalCount) {
        check.passed = false
        check.issues.push({
          type: 'count_mismatch',
          severity: 'critical',
          description: `${type} count mismatch: expected ${originalCount}, got ${migratedCount}`,
          affectedItems: [type]
        })
      }
    }

    check.details = { originalCounts, migratedCounts }
    return check
  }

  private async performContentIntegrityCheck(original: GuestUserData, migrated: any): Promise<IntegrityCheck> {
    const check: IntegrityCheck = {
      type: 'content_integrity',
      passed: true,
      issues: [],
      details: {}
    }

    // Sample content validation (checking a few random items)
    const sampleSize = Math.min(5, original.plans.length)
    const samplePlans = original.plans.slice(0, sampleSize)

    for (const originalPlan of samplePlans) {
      const migratedPlan = migrated.curricula?.find((c: any) => c.id === originalPlan.id)
      if (!migratedPlan) {
        check.passed = false
        check.issues.push({
          type: 'missing_content',
          severity: 'critical',
          description: `Plan ${originalPlan.title} not found in migrated data`,
          affectedItems: [originalPlan.id]
        })
      } else if (migratedPlan.title !== originalPlan.title) {
        check.issues.push({
          type: 'content_modification',
          severity: 'warning',
          description: `Plan title changed: ${originalPlan.title} -> ${migratedPlan.title}`,
          affectedItems: [originalPlan.id]
        })
      }
    }

    return check
  }

  private async performRelationshipIntegrityCheck(migrated: any): Promise<IntegrityCheck> {
    const check: IntegrityCheck = {
      type: 'relationship_integrity',
      passed: true,
      issues: [],
      details: {}
    }

    // Check that all modules belong to existing curricula
    if (migrated.curricula) {
      for (const curriculum of migrated.curricula) {
        if (curriculum.modules) {
          for (const module of curriculum.modules) {
            if (module.curriculum_id !== curriculum.id) {
              check.passed = false
              check.issues.push({
                type: 'relationship_violation',
                severity: 'critical',
                description: `Module ${module.id} has incorrect curriculum_id`,
                affectedItems: [module.id]
              })
            }
          }
        }
      }
    }

    return check
  }

  private async performDataTypeIntegrityCheck(migrated: any): Promise<IntegrityCheck> {
    const check: IntegrityCheck = {
      type: 'data_type_integrity',
      passed: true,
      issues: [],
      details: {}
    }

    // Check data types of migrated data
    if (migrated.flashcards) {
      for (const flashcard of migrated.flashcards) {
        if (typeof flashcard.review_count !== 'number') {
          check.passed = false
          check.issues.push({
            type: 'data_type_violation',
            severity: 'critical',
            description: `Flashcard ${flashcard.id} has invalid review_count type`,
            affectedItems: [flashcard.id]
          })
        }
      }
    }

    return check
  }

  private async performBusinessLogicIntegrityCheck(original: GuestUserData, migrated: any): Promise<IntegrityCheck> {
    const check: IntegrityCheck = {
      type: 'business_logic_integrity',
      passed: true,
      issues: [],
      details: {}
    }

    // Check business logic constraints
    if (migrated.flashcards) {
      for (const flashcard of migrated.flashcards) {
        if (flashcard.correct_count > flashcard.review_count) {
          check.issues.push({
            type: 'business_logic_violation',
            severity: 'warning',
            description: `Flashcard ${flashcard.id} has correct_count > review_count`,
            affectedItems: [flashcard.id]
          })
        }
      }
    }

    return check
  }

  // Utility methods

  private calculateDataIntegrityScore(report: ValidationReport): number {
    let score = 100

    // Deduct points for errors and warnings
    score -= report.errors.length * 10
    score -= report.warnings.length * 2

    return Math.max(0, score)
  }

  private generateIntegrityRecommendations(result: DataIntegrityResult): string[] {
    const recommendations: string[] = []

    if (result.integrityScore < 50) {
      recommendations.push('Consider rolling back the migration due to severe integrity issues')
    } else if (result.integrityScore < 80) {
      recommendations.push('Review and fix integrity issues before proceeding')
    }

    const criticalIssues = result.issues.filter(i => i.severity === 'critical')
    if (criticalIssues.length > 0) {
      recommendations.push(`Address ${criticalIssues.length} critical integrity issues immediately`)
    }

    return recommendations
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime())
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }
}

// Type definitions

interface ValidationReport {
  isValid: boolean
  validationStage: 'pre_migration' | 'post_transformation' | 'post_migration'
  timestamp: string
  errors: string[]
  warnings: string[]
  statistics: {
    total_plans: number
    total_modules: number
    total_lessons: number
    total_flashcards: number
    data_integrity_score: number
  }
  detailed_results: {
    plans: ItemValidationResult[]
    flashcards: ItemValidationResult[]
    progress: ItemValidationResult | null
    preferences: ItemValidationResult | null
  }
}

interface ItemValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  itemType: string
  itemIndex: number
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

interface DataIntegrityResult {
  sessionId: string
  timestamp: string
  integrityScore: number
  checksPerformed: IntegrityCheck[]
  issues: IntegrityIssue[]
  recommendations: string[]
}

interface IntegrityCheck {
  type: string
  passed: boolean
  issues: IntegrityIssue[]
  details: Record<string, any>
}

interface IntegrityIssue {
  type: string
  severity: 'critical' | 'warning' | 'info'
  description: string
  affectedItems: string[]
}

// Export singleton instance
export const guestMigrationValidator = GuestMigrationValidator.getInstance()

// Export types
export type {
  ValidationReport,
  ItemValidationResult,
  DataIntegrityResult,
  IntegrityCheck,
  IntegrityIssue
}
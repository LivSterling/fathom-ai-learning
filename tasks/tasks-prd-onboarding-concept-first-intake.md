# Task List: Onboarding & Concept-First Intake Implementation

## Relevant Files

- `components/onboarding/onboarding-concept-intake.tsx` - New main component for concept-first intake (replaces OnboardingDomains)
- `components/onboarding/onboarding-concept-intake.test.tsx` - Unit tests for concept intake component
- `components/ui/concept-chips.tsx` - Reusable component for curated example concept chips
- `components/ui/concept-chips.test.tsx` - Unit tests for concept chips component
- `components/ui/file-upload-zone.tsx` - Enhanced file upload component with drag-and-drop
- `components/ui/file-upload-zone.test.tsx` - Unit tests for file upload component
- `app/api/concept/process/route.ts` - API endpoint for processing concept inputs and generating plans
- `app/api/concept/process/route.test.ts` - API tests for concept processing
- `app/api/upload/parse/route.ts` - API endpoint for parsing uploaded files (PDF stub implementation)
- `app/api/upload/parse/route.test.ts` - API tests for file parsing
- `lib/concept-processor.ts` - Core logic for concept processing and plan generation
- `lib/concept-processor.test.ts` - Unit tests for concept processor
- `lib/file-parser.ts` - File parsing utilities (PDF extraction stub)
- `lib/file-parser.test.ts` - Unit tests for file parser
- `lib/url-extractor.ts` - URL content extraction utilities
- `lib/url-extractor.test.ts` - Unit tests for URL extractor
- `types/concept-intake.ts` - TypeScript type definitions for concept intake feature
- `app/page.tsx` - Update main onboarding flow to use new concept-first intake

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Create Enhanced Concept Input Component ✅ COMPLETED
  - [x] 1.1 Create `components/onboarding/onboarding-concept-intake.tsx` with prominent text input field supporting free-form concept entry
  - [x] 1.2 Implement progressive disclosure pattern - show advanced options (timebox, level, format) only after concept input
  - [x] 1.3 Add placeholder examples in input field (e.g., "React useEffect, cardiac physiology basics, Spanish subjunctive...")
  - [x] 1.4 Integrate file upload dropzone and URL paste functionality with collapsible "Or paste a link / upload a PDF" section
  - [x] 1.5 Add visual feedback states (loading, processing, error) with clear progress indicators
  - [x] 1.6 Ensure mobile-responsive design with proper touch targets and keyboard handling
  - [x] 1.7 Write comprehensive unit tests covering all interaction states and edge cases

- [x] 2.0 Implement Curated Example Concept Chips ✅ COMPLETED
  - [x] 2.1 Create `components/ui/concept-chips.tsx` component with clickable chips grouped by category
  - [x] 2.2 Define curated example concepts organized by categories (technology, science, business, language, etc.)
  - [x] 2.3 Implement chip click behavior to populate main concept input field
  - [x] 2.4 Add hover states and visual feedback for better UX
  - [x] 2.5 Make chips responsive and properly wrap on different screen sizes
  - [x] 2.6 Add accessibility features (ARIA labels, keyboard navigation)
  - [x] 2.7 Create unit tests for chip interactions and category organization

- [x] 3.0 Build File Upload & URL Processing System ✅ COMPLETED
  - [x] 3.1 Create `components/ui/file-upload-zone.tsx` with enhanced drag-and-drop functionality
  - [x] 3.2 Implement file type validation (PDFs initially, expandable to other formats)
  - [x] 3.3 Add file size validation (10MB limit) with clear error messaging
  - [x] 3.4 Create `lib/file-parser.ts` with PDF text extraction stub (expandable architecture)
  - [x] 3.5 Implement `lib/url-extractor.ts` for automatic URL content detection and parsing
  - [x] 3.6 Add visual feedback during file processing with loading states
  - [x] 3.7 Handle upload errors gracefully with retry mechanisms
  - [x] 3.8 Write comprehensive tests for file validation, parsing, and error scenarios

- [x] 4.0 Develop Concept Processing & Plan Generation Logic ✅ COMPLETED
  - [x] 4.1 Create `lib/concept-processor.ts` with core concept analysis and plan generation logic
  - [x] 4.2 Implement timebox integration (15/30/60 minutes per day, 1-4 weeks, 1-3 months duration)
  - [x] 4.3 Add skill level processing (Beginner, Intermediate, Advanced) to influence plan complexity
  - [x] 4.4 Integrate preferred format selection (videos, articles, interactive, mixed) into resource recommendations
  - [x] 4.5 Create mock data generation for <30 second response requirement during development
  - [x] 4.6 Design extensible architecture for future integration with real content recommendation engine
  - [x] 4.7 Implement plan structure matching existing `OnboardingProposedPlan` component expectations
  - [x] 4.8 Add comprehensive unit tests for different concept types and configurations

- [x] 5.0 Create API Endpoints for Concept Processing ✅ COMPLETED
  - [x] 5.1 Create `app/api/concept/process/route.ts` endpoint accepting concept, files, URLs, and user preferences
  - [x] 5.2 Implement request validation with proper error handling and input sanitization
  - [x] 5.3 Add rate limiting and basic security measures for concept processing endpoint
  - [x] 5.4 Create `app/api/upload/parse/route.ts` for file parsing with proper error handling
  - [x] 5.5 Implement response caching strategy for common concepts to improve performance
  - [x] 5.6 Add request/response logging for analytics and debugging
  - [x] 5.7 Ensure <30 second response time requirement with timeout handling
  - [x] 5.8 Write comprehensive API tests covering success cases, validation errors, and edge cases

- [x] 6.0 Integrate with Existing Onboarding Flow ✅ COMPLETED
  - [x] 6.1 Update `app/page.tsx` to use new `OnboardingConceptIntake` component instead of `OnboardingDomains`
  - [x] 6.2 Ensure seamless data flow from concept intake to `OnboardingChoice` component
  - [x] 6.3 Update `OnboardingChoice` component to handle new concept processing data structure
  - [x] 6.4 Verify integration with `OnboardingProposedPlan` component works with generated plans
  - [x] 6.5 Test complete flow from concept input to proposed plan display
  - [x] 6.6 Ensure existing Curriculum Builder Lite integration remains functional
  - [x] 6.7 Update any TypeScript interfaces and types for consistent data flow

- [ ] 7.0 Add Analytics & Performance Tracking
  - [ ] 7.1 Create `types/concept-intake.ts` with comprehensive type definitions for analytics events
  - [ ] 7.2 Implement concept input tracking (what users type, popular concepts, completion rates)
  - [ ] 7.3 Add file upload analytics (success rates, file types, processing times)
  - [ ] 7.4 Track concept chip usage to optimize curated examples
  - [ ] 7.5 Monitor API response times and success rates for performance optimization
  - [ ] 7.6 Implement drop-off point tracking to identify UX improvement opportunities
  - [ ] 7.7 Add basic metrics dashboard or logging for monitoring onboarding completion rates

- [ ] 8.0 Implement Error Handling & Validation
  - [ ] 8.1 Add comprehensive input validation for concept text (length limits, content filtering)
  - [ ] 8.2 Implement graceful error handling for file upload failures with user-friendly messages
  - [ ] 8.3 Add URL validation and error handling for invalid or inaccessible links
  - [ ] 8.4 Create fallback mechanisms when concept processing fails (default suggestions, retry options)
  - [ ] 8.5 Implement proper error boundaries in React components to prevent crashes
  - [ ] 8.6 Add timeout handling for slow API responses with appropriate user feedback
  - [ ] 8.7 Create comprehensive error logging for debugging and monitoring
  - [ ] 8.8 Write error scenario tests to ensure robust failure handling

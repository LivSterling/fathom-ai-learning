# Task List: Guest Mode & Seamless Upgrade Implementation

Based on the PRD analysis and current codebase assessment, here are the high-level tasks required to implement the Guest Mode & Seamless Upgrade feature.

## Current State Assessment

The application already has:
- Basic guest mode structure (guest banner, layout wrapper with upgrade handlers)
- Supabase integration configured with MCP
- Mock data system in place
- Component-based architecture with clear separation
- Existing onboarding flow with "Start as Guest" functionality
- Page-level upgrade handlers already implemented

## Relevant Files

- `lib/guest-session.ts` - Core guest session management utilities and local storage operations
- `lib/guest-session.test.ts` - Unit tests for guest session functionality
- `hooks/use-guest-session.ts` - React hook for managing guest user state and operations
- `hooks/use-guest-session.test.ts` - Unit tests for the guest session hook
- `lib/supabase.ts` - Supabase client configuration and guest user database operations
- `lib/supabase.test.ts` - Unit tests for Supabase integration
- `components/auth/signup-form.tsx` - Account creation form component for guest upgrade
- `components/auth/signup-form.test.tsx` - Unit tests for signup form
- `components/guest/upgrade-prompt.tsx` - Strategic upgrade prompt component
- `components/guest/upgrade-prompt.test.tsx` - Unit tests for upgrade prompts
- `components/guest/guest-progress-indicator.tsx` - Component showing creation limits and progress
- `components/guest/guest-progress-indicator.test.tsx` - Unit tests for progress indicator
- `app/api/auth/guest-upgrade/route.ts` - API endpoint for handling guest to registered user conversion
- `app/api/auth/guest-upgrade/route.test.ts` - Unit tests for upgrade API endpoint
- `app/api/guest/migrate-data/route.ts` - API endpoint for migrating guest data during upgrade
- `app/api/guest/migrate-data/route.test.ts` - Unit tests for data migration API
- `lib/analytics/guest-events.ts` - Guest user analytics event tracking utilities
- `lib/analytics/guest-events.test.ts` - Unit tests for analytics tracking
- `lib/guest-limit-enforcer.ts` - Utility class for enforcing guest user creation limits and upgrade prompts
- `lib/guest-progress-tracker.ts` - Advanced progress tracking utilities for guest users with milestones and insights
- `hooks/use-guest-progress.ts` - React hook for accessing guest user progress tracking and analytics
- `hooks/use-guest-limit-blocking.ts` - React hook for managing guest limit blocking with modal display
- `components/guest/guest-limit-warning.tsx` - Flexible limit warning component with multiple display variants
- `components/guest/guest-progress-dashboard.tsx` - Comprehensive progress dashboard with stats and insights
- `components/guest/guest-limit-reached-modal.tsx` - Modal component for limit-reached blocking with upgrade prompts
- `types/guest.ts` - TypeScript type definitions for guest user system
- `migrations/add-guest-support.sql` - Database migration for guest user schema changes

### Notes

- **Testing**: This project does not currently have Jest or testing libraries configured. To add testing support, you would need to:
  - Install Jest and React Testing Library: `npm install --save-dev jest @testing-library/react @testing-library/jest-dom`
  - Configure Jest with a `jest.config.js` file
  - Add test scripts to `package.json`
  - Unit tests should be placed alongside code files (e.g., `MyComponent.tsx` and `MyComponent.test.tsx`)
- **TypeScript**: All components use proper TypeScript types and follow Next.js patterns
- **Imports**: Components import specific React hooks/functions rather than the entire React namespace

## Tasks

- [x] 1.0 Guest User Management System
  - [x] 1.1 Create guest session utilities in `lib/guest-session.ts` for generating unique guest IDs, managing session state, and local storage operations
  - [x] 1.2 Implement `useGuestSession` hook in `hooks/use-guest-session.ts` for React components to access guest state, check authentication status, and trigger upgrade flows
  - [x] 1.3 Create TypeScript type definitions in `types/guest.ts` for guest user interfaces, session data structures, and upgrade flow types
  - [x] 1.4 Write comprehensive unit tests for guest session utilities and React hook functionality

- [x] 2.0 Local Storage Data Persistence Layer
  - [x] 2.1 Implement local storage schema design for guest user data including plans, lessons, flashcards, and progress tracking
  - [x] 2.2 Create data serialization/deserialization utilities for complex objects (plans with nested modules/lessons, flashcard states)
  - [x] 2.3 Build local storage cleanup and management system to prevent excessive data accumulation and handle storage limits
  - [x] 2.4 Implement data validation and error handling for corrupted or incomplete local storage data
  - [x] 2.5 Create migration utilities for local storage schema changes and data format updates

- [x] 3.0 Database Schema & RLS Policy Updates
  - [x] 3.1 Create database migration in `migrations/add-guest-support.sql` to add `is_guest`, `upgraded_at`, and `guest_id` columns to profiles table
  - [x] 3.2 Update existing RLS policies to support guest users accessing their own data based on user_id
  - [x] 3.3 Create new RLS policies for data migration scenarios during guest-to-registered user conversion
  - [x] 3.4 Update Supabase client configuration in `lib/supabase.ts` to handle guest user authentication and database operations
  - [x] 3.5 Test database constraints and referential integrity for guest user data relationships

- [x] 4.0 Account Creation & Authentication Flow
  - [x] 4.1 Create signup form component in `components/auth/signup-form.tsx` with email/password fields and validation
  - [x] 4.2 Implement API endpoint in `app/api/auth/guest-upgrade/route.ts` for converting guest users to registered accounts
  - [x] 4.3 Add Supabase Auth integration for email/password registration while preserving guest session context
  - [x] 4.4 Create account merging logic for cases where email already exists in the system
  - [x] 4.5 Implement post-registration redirect flow that maintains user context and shows success messaging

- [x] 5.0 Data Migration & Upgrade System
  - [x] 5.1 Build data migration API in `app/api/guest/migrate-data/route.ts` to transfer local storage data to Supabase during upgrade
  - [x] 5.2 Implement data transformation utilities to convert local storage format to database schema format
  - [x] 5.3 Create conflict resolution system for merging guest data with existing registered user data
  - [x] 5.4 Build rollback mechanism for failed data migrations to maintain data integrity
  - [x] 5.5 Add comprehensive error handling and logging for migration processes
  - [x] 5.6 Implement data validation to ensure 100% successful migration with no data loss

- [x] 6.0 Guest Limitation & Progress Tracking
  - [x] 6.1 Create guest progress indicator component in `components/guest/guest-progress-indicator.tsx` showing creation limits (50 flashcards, 10 lessons)
  - [x] 6.2 Implement limit enforcement logic in plan creation, lesson creation, and flashcard creation workflows
  - [x] 6.3 Add progress tracking utilities to count guest user's created content and calculate remaining limits
  - [x] 6.4 Create visual progress bars and limit warnings throughout the application interface
  - [x] 6.5 Implement limit-reached blocking with upgrade prompts when users hit creation boundaries

- [ ] 7.0 Strategic Upgrade Prompting System
  - [ ] 7.1 Create upgrade prompt component in `components/guest/upgrade-prompt.tsx` with dismissible banner design
  - [ ] 7.2 Implement trigger logic for showing prompts after first lesson completion, approaching limits, or accessing advanced features
  - [ ] 7.3 Add prompt scheduling system to avoid overwhelming users with too frequent upgrade suggestions
  - [ ] 7.4 Create contextual upgrade messaging that highlights relevant benefits based on user's current activity
  - [ ] 7.5 Implement A/B testing framework for different upgrade prompt strategies and messaging
  - [ ] 7.6 Update existing page components (dashboard, plan, review, library) to integrate upgrade prompts

- [ ] 8.0 Analytics & Event Tracking Integration
  - [ ] 8.1 Create guest analytics utilities in `lib/analytics/guest-events.ts` for tracking conversion funnel events
  - [ ] 8.2 Implement event tracking for guest session initiation, content creation, upgrade prompts shown/clicked, and conversion completion
  - [ ] 8.3 Add performance monitoring for data migration success rates and upgrade flow completion times
  - [ ] 8.4 Create analytics dashboard integration for tracking guest-to-registered conversion rates and engagement metrics
  - [ ] 8.5 Implement retention tracking for D7 guest user engagement and behavior analysis

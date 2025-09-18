# Product Requirements Document: Guest Mode & Seamless Upgrade

## Introduction/Overview

This feature enables zero-friction onboarding for new users by allowing them to start using the learning platform immediately as guests, without requiring account creation. Guest users can access core functionality, create learning materials, and have their progress persist locally. When ready, they can seamlessly upgrade to a registered account, retaining all their data and gaining cross-device synchronization capabilities.

**Problem Statement:** New users often abandon apps during lengthy signup processes. By removing this friction, we can increase user engagement and conversion rates while still capturing valuable users who are ready to commit after experiencing the product value.

**Goal:** Maximize user acquisition and conversion by providing immediate access to core features while maintaining a clear path to account creation that preserves user investment.

## Goals

1. **Reduce Time to Value:** Enable users to start learning within 30 seconds of landing on the platform
2. **Increase Conversion Rates:** Achieve a guest-to-registered user conversion rate of at least 15%
3. **Preserve User Investment:** Ensure 100% data retention during the upgrade process
4. **Maintain Feature Quality:** Provide near-identical experience for guest and registered users
5. **Drive Account Creation:** Convert engaged guest users to registered accounts through strategic prompting

## User Stories

### Primary User Stories
- **As a first-time visitor**, I want to immediately start creating lessons and flashcards without signing up, so I can quickly evaluate if this platform meets my learning needs
- **As a guest user**, I want my progress and created content to persist when I reload the app, so I don't lose my work
- **As an engaged guest user**, I want to easily create a full account while keeping all my data, so I can access my materials from multiple devices
- **As a converted user**, I want all my guest-created content to be available in my new account, so I don't have to recreate my work

### Secondary User Stories
- **As a returning guest user**, I want to be gently reminded about creating an account, so I'm aware of additional benefits without being overwhelmed
- **As a product manager**, I want to track guest user behavior and conversion funnels, so I can optimize the upgrade experience

## Functional Requirements

### Guest Mode Core Functionality
1. **Immediate Access:** Users can access the platform without any authentication or signup process
2. **Feature Parity:** Guest users can create learning plans, lessons, and flashcards with the same core functionality as registered users
3. **Local Persistence:** Guest session data persists in browser storage until cache is cleared
4. **Session Management:** Guest sessions are maintained through browser local storage with no server-side session management required
5. **Limited Creation:** Guest users can create up to 50 flashcards and 10 lessons before being prompted to upgrade

### Account Creation (Upgrade) Flow
6. **Strategic Prompting:** Upgrade prompts appear after completing first lesson, reaching creation limits, or accessing advanced features
7. **Email/Password Registration:** Users can create accounts using email and password authentication
8. **Data Migration:** All guest-created content (plans, lessons, flashcards, progress) automatically transfers to the new registered account
9. **Seamless Transition:** Post-upgrade, users land on their dashboard with all previous content intact
10. **Account Merging:** If a user creates an account with an email that already exists, merge guest data with existing account data

### Technical Implementation
11. **User Identification:** Generate unique guest user IDs stored in browser local storage
12. **Database Schema:** Support `is_guest` boolean flag and `upgraded_at` timestamp in user profiles
13. **Row Level Security:** Implement RLS policies that allow guests to access only their own data
14. **Data Integrity:** Ensure referential integrity when converting guest user ID to registered user ID
15. **Supabase Integration:** Leverage Supabase Auth for registered user management while maintaining guest user functionality

### User Experience
16. **Subtle Notifications:** Display dismissible banner notifications about account benefits
17. **Progress Indicators:** Show creation limits and progress toward those limits
18. **Clear Benefits:** Communicate cross-device sync and additional features available with accounts
19. **One-Click Upgrade:** Minimize friction in the account creation process

## Non-Goals (Out of Scope)

1. **Multi-device Guest Access:** Guest users cannot access their data from multiple devices without upgrading
2. **Guest Sync Link:** One-time guest sync functionality is excluded from this initial implementation
3. **Social Authentication:** OAuth providers (Google, GitHub, etc.) are not included in the initial release
4. **Social Sharing:** Guest users cannot share content or collaborate with others
5. **Advanced Analytics:** Detailed learning analytics are reserved for registered users only
6. **Data Export:** Guest users cannot export their learning materials
7. **Offline Functionality:** Advanced offline capabilities are not required for guest mode

## Design Considerations

### User Interface
- **Guest Indicator:** Subtle visual indicator in the header showing guest status
- **Upgrade Prompts:** Non-intrusive banners and contextual upgrade suggestions
- **Progress Limits:** Clear visual feedback when approaching creation limits
- **Seamless Branding:** Guest experience should feel identical to registered user experience

### User Experience Flow
1. **Landing:** User arrives and can immediately start creating content
2. **Engagement:** User creates lessons/flashcards and sees value
3. **Prompting:** Strategic upgrade prompts at key engagement moments
4. **Conversion:** Simple email/password form with clear value proposition
5. **Retention:** Post-upgrade experience reinforces the value of account creation

## Technical Considerations

### Database Schema Changes
```sql
-- Add guest tracking fields to profiles table
ALTER TABLE profiles ADD COLUMN is_guest BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN upgraded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN guest_id TEXT; -- for tracking original guest session
```

### Row Level Security Policies
- Guest users can only access their own data based on user_id
- Registered users maintain standard RLS policies
- Special handling for data migration during upgrade process

### Dependencies
- **Supabase Auth:** Core authentication system for registered users
- **Local Storage API:** Browser storage for guest session persistence
- **Existing User Profile System:** Integration with current user management
- **Analytics Tracking:** Event tracking for conversion funnel analysis

### Performance Considerations
- Local storage management to prevent excessive data accumulation
- Efficient data migration process during upgrade
- Minimal impact on existing registered user functionality

## Success Metrics

### Primary Metrics
1. **Guest-to-Registered Conversion Rate:** Target 15% conversion within 30 days
2. **Time to First Lesson:** Average time from landing to completing first lesson < 2 minutes
3. **D7 Retention Rate:** 7-day retention rate for guest users > 25%

### Secondary Metrics
4. **Creation Engagement:** Average number of flashcards/lessons created by guest users
5. **Upgrade Trigger Points:** Which prompts/limits most effectively drive conversions
6. **Data Migration Success Rate:** 100% successful data transfers during upgrade
7. **Session Duration:** Average session length for guest vs. registered users

### Analytics Events to Track
- Guest session initiated
- First lesson created
- First flashcard created
- Upgrade prompt shown
- Upgrade prompt clicked
- Account creation completed
- Data migration completed

## Acceptance Criteria

### Guest Mode Functionality
- [ ] New users can access the platform without signing up
- [ ] Guest users can create learning plans, lessons, and flashcards
- [ ] Guest data persists across browser sessions until cache is cleared
- [ ] Guest users see creation limits and progress indicators
- [ ] Guest users are limited to 50 flashcards and 10 lessons

### Account Creation Process
- [ ] Upgrade prompts appear at strategic moments (post-lesson, limits reached)
- [ ] Email/password registration form is accessible and functional
- [ ] Account creation process completes successfully
- [ ] All guest data transfers to new registered account
- [ ] User lands on dashboard with all previous content intact

### Data Integrity
- [ ] No data loss occurs during upgrade process
- [ ] Guest user ID properly converts to registered user ID
- [ ] RLS policies correctly restrict guest access to own data
- [ ] Database constraints maintain referential integrity

### User Experience
- [ ] Guest status is clearly but subtly indicated
- [ ] Upgrade prompts are dismissible and non-intrusive
- [ ] Post-upgrade experience feels seamless
- [ ] Performance remains consistent for both guest and registered users

## Open Questions

1. **Analytics Integration:** Should we implement additional guest user analytics beyond basic conversion tracking?
2. **Guest Data Cleanup:** How long should we retain guest data for users who never upgrade?
3. **Feature Expansion:** Which additional features should be gated behind account creation in future iterations?
4. **Mobile Experience:** Are there any mobile-specific considerations for guest mode implementation?
5. **A/B Testing:** Should we implement A/B testing for different upgrade prompt strategies?

## Implementation Priority

### Phase 1 (MVP)
- Core guest mode functionality
- Local data persistence
- Basic upgrade flow
- Data migration system

### Phase 2 (Post-MVP)
- Advanced analytics and conversion optimization
- A/B testing framework for upgrade prompts
- Guest sync link functionality
- Additional authentication methods

---

**Document Version:** 1.0  
**Created:** September 18, 2025  
**Last Updated:** September 18, 2025  
**Status:** Draft - Ready for Review

-- Migration: Add Guest Support to Fathom AI Learning Platform
-- Description: Adds guest user support with necessary columns and RLS policies
-- Version: 1.0
-- Created: 2025-01-01

BEGIN;

-- Add guest tracking fields to profiles table
-- These fields will track guest users and their upgrade status
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS upgraded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS guest_id TEXT,
ADD COLUMN IF NOT EXISTS guest_session_data JSONB,
ADD COLUMN IF NOT EXISTS guest_created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for guest queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON profiles(is_guest);
CREATE INDEX IF NOT EXISTS idx_profiles_guest_id ON profiles(guest_id);
CREATE INDEX IF NOT EXISTS idx_profiles_guest_created_at ON profiles(guest_created_at);

-- Add guest support to curricula table
ALTER TABLE curricula 
ADD COLUMN IF NOT EXISTS is_guest_content BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS guest_owner_id TEXT;

-- Create index for guest curricula queries
CREATE INDEX IF NOT EXISTS idx_curricula_guest_content ON curricula(is_guest_content);
CREATE INDEX IF NOT EXISTS idx_curricula_guest_owner ON curricula(guest_owner_id);

-- Add guest support to modules table
ALTER TABLE modules 
ADD COLUMN IF NOT EXISTS is_guest_content BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS guest_owner_id TEXT;

-- Create index for guest modules queries
CREATE INDEX IF NOT EXISTS idx_modules_guest_content ON modules(is_guest_content);
CREATE INDEX IF NOT EXISTS idx_modules_guest_owner ON modules(guest_owner_id);

-- Add guest support to lessons table
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS is_guest_content BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS guest_owner_id TEXT;

-- Create index for guest lessons queries
CREATE INDEX IF NOT EXISTS idx_lessons_guest_content ON lessons(is_guest_content);
CREATE INDEX IF NOT EXISTS idx_lessons_guest_owner ON lessons(guest_owner_id);

-- Add guest support to flashcards table
ALTER TABLE flashcards 
ADD COLUMN IF NOT EXISTS is_guest_content BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS guest_owner_id TEXT;

-- Create index for guest flashcards queries
CREATE INDEX IF NOT EXISTS idx_flashcards_guest_content ON flashcards(is_guest_content);
CREATE INDEX IF NOT EXISTS idx_flashcards_guest_owner ON flashcards(guest_owner_id);

-- Add guest support to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS is_guest_session BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS guest_owner_id TEXT;

-- Create index for guest sessions queries
CREATE INDEX IF NOT EXISTS idx_sessions_guest_session ON sessions(is_guest_session);
CREATE INDEX IF NOT EXISTS idx_sessions_guest_owner ON sessions(guest_owner_id);

-- Add guest support to reviews table
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS is_guest_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS guest_owner_id TEXT;

-- Create index for guest reviews queries
CREATE INDEX IF NOT EXISTS idx_reviews_guest_review ON reviews(is_guest_review);
CREATE INDEX IF NOT EXISTS idx_reviews_guest_owner ON reviews(guest_owner_id);

-- Create guest analytics table for tracking guest user behavior
CREATE TABLE IF NOT EXISTS guest_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    session_id TEXT,
    user_agent TEXT,
    ip_address INET
);

-- Create indexes for guest analytics
CREATE INDEX IF NOT EXISTS idx_guest_analytics_guest_id ON guest_analytics(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_analytics_event_type ON guest_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_guest_analytics_timestamp ON guest_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_guest_analytics_session_id ON guest_analytics(session_id);

-- Create guest limits table to track usage against limits
CREATE TABLE IF NOT EXISTS guest_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id TEXT NOT NULL UNIQUE,
    flashcards_count INTEGER DEFAULT 0,
    lessons_count INTEGER DEFAULT 0,
    plans_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Constraints to enforce limits
    CONSTRAINT chk_flashcards_limit CHECK (flashcards_count >= 0 AND flashcards_count <= 50),
    CONSTRAINT chk_lessons_limit CHECK (lessons_count >= 0 AND lessons_count <= 10),
    CONSTRAINT chk_plans_limit CHECK (plans_count >= 0 AND plans_count <= 3)
);

-- Create index for guest limits
CREATE INDEX IF NOT EXISTS idx_guest_limits_guest_id ON guest_limits(guest_id);

-- Create function to update guest limits
CREATE OR REPLACE FUNCTION update_guest_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- Update guest limits when content is added/removed
    IF TG_TABLE_NAME = 'flashcards' THEN
        IF TG_OP = 'INSERT' AND NEW.is_guest_content THEN
            INSERT INTO guest_limits (guest_id, flashcards_count)
            VALUES (NEW.guest_owner_id, 1)
            ON CONFLICT (guest_id) 
            DO UPDATE SET 
                flashcards_count = guest_limits.flashcards_count + 1,
                updated_at = now();
        ELSIF TG_OP = 'DELETE' AND OLD.is_guest_content THEN
            UPDATE guest_limits 
            SET 
                flashcards_count = GREATEST(0, flashcards_count - 1),
                updated_at = now()
            WHERE guest_id = OLD.guest_owner_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'lessons' THEN
        IF TG_OP = 'INSERT' AND NEW.is_guest_content THEN
            INSERT INTO guest_limits (guest_id, lessons_count)
            VALUES (NEW.guest_owner_id, 1)
            ON CONFLICT (guest_id) 
            DO UPDATE SET 
                lessons_count = guest_limits.lessons_count + 1,
                updated_at = now();
        ELSIF TG_OP = 'DELETE' AND OLD.is_guest_content THEN
            UPDATE guest_limits 
            SET 
                lessons_count = GREATEST(0, lessons_count - 1),
                updated_at = now()
            WHERE guest_id = OLD.guest_owner_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'curricula' THEN
        IF TG_OP = 'INSERT' AND NEW.is_guest_content THEN
            INSERT INTO guest_limits (guest_id, plans_count)
            VALUES (NEW.guest_owner_id, 1)
            ON CONFLICT (guest_id) 
            DO UPDATE SET 
                plans_count = guest_limits.plans_count + 1,
                updated_at = now();
        ELSIF TG_OP = 'DELETE' AND OLD.is_guest_content THEN
            UPDATE guest_limits 
            SET 
                plans_count = GREATEST(0, plans_count - 1),
                updated_at = now()
            WHERE guest_id = OLD.guest_owner_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update guest limits
CREATE TRIGGER trigger_update_guest_flashcard_limits
    AFTER INSERT OR DELETE ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_guest_limits();

CREATE TRIGGER trigger_update_guest_lesson_limits
    AFTER INSERT OR DELETE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_guest_limits();

CREATE TRIGGER trigger_update_guest_plan_limits
    AFTER INSERT OR DELETE ON curricula
    FOR EACH ROW
    EXECUTE FUNCTION update_guest_limits();

-- Create function to check guest limits before insertion
CREATE OR REPLACE FUNCTION check_guest_limits()
RETURNS TRIGGER AS $$
DECLARE
    current_limits RECORD;
BEGIN
    -- Only check limits for guest content
    IF NEW.is_guest_content THEN
        -- Get current limits for this guest
        SELECT * INTO current_limits 
        FROM guest_limits 
        WHERE guest_id = NEW.guest_owner_id;
        
        -- If no limits record exists, create one
        IF current_limits IS NULL THEN
            INSERT INTO guest_limits (guest_id) VALUES (NEW.guest_owner_id);
            SELECT * INTO current_limits FROM guest_limits WHERE guest_id = NEW.guest_owner_id;
        END IF;
        
        -- Check specific limits based on table
        IF TG_TABLE_NAME = 'flashcards' AND current_limits.flashcards_count >= 50 THEN
            RAISE EXCEPTION 'Guest user has reached the maximum limit of 50 flashcards';
        ELSIF TG_TABLE_NAME = 'lessons' AND current_limits.lessons_count >= 10 THEN
            RAISE EXCEPTION 'Guest user has reached the maximum limit of 10 lessons';
        ELSIF TG_TABLE_NAME = 'curricula' AND current_limits.plans_count >= 3 THEN
            RAISE EXCEPTION 'Guest user has reached the maximum limit of 3 plans';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to check limits before insertion
CREATE TRIGGER trigger_check_guest_flashcard_limits
    BEFORE INSERT ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION check_guest_limits();

CREATE TRIGGER trigger_check_guest_lesson_limits
    BEFORE INSERT ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION check_guest_limits();

CREATE TRIGGER trigger_check_guest_plan_limits
    BEFORE INSERT ON curricula
    FOR EACH ROW
    EXECUTE FUNCTION check_guest_limits();

-- Update existing RLS policies for guest support

-- Profiles table RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (
        auth.uid() = id OR 
        (is_guest AND guest_id = current_setting('app.guest_id', true))
    );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (
        auth.uid() = id OR 
        (is_guest AND guest_id = current_setting('app.guest_id', true))
    );

-- Curricula table RLS policies
DROP POLICY IF EXISTS "Users can view own curricula" ON curricula;
CREATE POLICY "Users can view own curricula" ON curricula
    FOR SELECT USING (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

DROP POLICY IF EXISTS "Users can create own curricula" ON curricula;
CREATE POLICY "Users can create own curricula" ON curricula
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

DROP POLICY IF EXISTS "Users can update own curricula" ON curricula;
CREATE POLICY "Users can update own curricula" ON curricula
    FOR UPDATE USING (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

DROP POLICY IF EXISTS "Users can delete own curricula" ON curricula;
CREATE POLICY "Users can delete own curricula" ON curricula
    FOR DELETE USING (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

-- Modules table RLS policies
DROP POLICY IF EXISTS "Users can view own modules" ON modules;
CREATE POLICY "Users can view own modules" ON modules
    FOR SELECT USING (
        curriculum_id IN (
            SELECT id FROM curricula 
            WHERE user_id = auth.uid() OR 
                  (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
        )
    );

DROP POLICY IF EXISTS "Users can create own modules" ON modules;
CREATE POLICY "Users can create own modules" ON modules
    FOR INSERT WITH CHECK (
        curriculum_id IN (
            SELECT id FROM curricula 
            WHERE user_id = auth.uid() OR 
                  (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
        )
    );

DROP POLICY IF EXISTS "Users can update own modules" ON modules;
CREATE POLICY "Users can update own modules" ON modules
    FOR UPDATE USING (
        curriculum_id IN (
            SELECT id FROM curricula 
            WHERE user_id = auth.uid() OR 
                  (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
        )
    );

DROP POLICY IF EXISTS "Users can delete own modules" ON modules;
CREATE POLICY "Users can delete own modules" ON modules
    FOR DELETE USING (
        curriculum_id IN (
            SELECT id FROM curricula 
            WHERE user_id = auth.uid() OR 
                  (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
        )
    );

-- Lessons table RLS policies
DROP POLICY IF EXISTS "Users can view own lessons" ON lessons;
CREATE POLICY "Users can view own lessons" ON lessons
    FOR SELECT USING (
        module_id IN (
            SELECT m.id FROM modules m
            JOIN curricula c ON m.curriculum_id = c.id
            WHERE c.user_id = auth.uid() OR 
                  (c.is_guest_content AND c.guest_owner_id = current_setting('app.guest_id', true))
        )
    );

DROP POLICY IF EXISTS "Users can create own lessons" ON lessons;
CREATE POLICY "Users can create own lessons" ON lessons
    FOR INSERT WITH CHECK (
        module_id IN (
            SELECT m.id FROM modules m
            JOIN curricula c ON m.curriculum_id = c.id
            WHERE c.user_id = auth.uid() OR 
                  (c.is_guest_content AND c.guest_owner_id = current_setting('app.guest_id', true))
        )
    );

DROP POLICY IF EXISTS "Users can update own lessons" ON lessons;
CREATE POLICY "Users can update own lessons" ON lessons
    FOR UPDATE USING (
        module_id IN (
            SELECT m.id FROM modules m
            JOIN curricula c ON m.curriculum_id = c.id
            WHERE c.user_id = auth.uid() OR 
                  (c.is_guest_content AND c.guest_owner_id = current_setting('app.guest_id', true))
        )
    );

DROP POLICY IF EXISTS "Users can delete own lessons" ON lessons;
CREATE POLICY "Users can delete own lessons" ON lessons
    FOR DELETE USING (
        module_id IN (
            SELECT m.id FROM modules m
            JOIN curricula c ON m.curriculum_id = c.id
            WHERE c.user_id = auth.uid() OR 
                  (c.is_guest_content AND c.guest_owner_id = current_setting('app.guest_id', true))
        )
    );

-- Flashcards table RLS policies
DROP POLICY IF EXISTS "Users can view own flashcards" ON flashcards;
CREATE POLICY "Users can view own flashcards" ON flashcards
    FOR SELECT USING (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

DROP POLICY IF EXISTS "Users can create own flashcards" ON flashcards;
CREATE POLICY "Users can create own flashcards" ON flashcards
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

DROP POLICY IF EXISTS "Users can update own flashcards" ON flashcards;
CREATE POLICY "Users can update own flashcards" ON flashcards
    FOR UPDATE USING (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

DROP POLICY IF EXISTS "Users can delete own flashcards" ON flashcards;
CREATE POLICY "Users can delete own flashcards" ON flashcards
    FOR DELETE USING (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

-- Sessions table RLS policies
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
CREATE POLICY "Users can view own sessions" ON sessions
    FOR SELECT USING (
        user_id = auth.uid() OR
        (is_guest_session AND guest_owner_id = current_setting('app.guest_id', true))
    );

DROP POLICY IF EXISTS "Users can create own sessions" ON sessions;
CREATE POLICY "Users can create own sessions" ON sessions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        (is_guest_session AND guest_owner_id = current_setting('app.guest_id', true))
    );

DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
CREATE POLICY "Users can update own sessions" ON sessions
    FOR UPDATE USING (
        user_id = auth.uid() OR
        (is_guest_session AND guest_owner_id = current_setting('app.guest_id', true))
    );

-- Reviews table RLS policies
DROP POLICY IF EXISTS "Users can view own reviews" ON reviews;
CREATE POLICY "Users can view own reviews" ON reviews
    FOR SELECT USING (
        user_id = auth.uid() OR
        (is_guest_review AND guest_owner_id = current_setting('app.guest_id', true))
    );

DROP POLICY IF EXISTS "Users can create own reviews" ON reviews;
CREATE POLICY "Users can create own reviews" ON reviews
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        (is_guest_review AND guest_owner_id = current_setting('app.guest_id', true))
    );

DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
CREATE POLICY "Users can update own reviews" ON reviews
    FOR UPDATE USING (
        user_id = auth.uid() OR
        (is_guest_review AND guest_owner_id = current_setting('app.guest_id', true))
    );

-- Guest analytics table RLS policies
CREATE POLICY "Guest analytics access" ON guest_analytics
    FOR ALL USING (
        guest_id = current_setting('app.guest_id', true)
    );

-- Guest limits table RLS policies
CREATE POLICY "Guest limits access" ON guest_limits
    FOR ALL USING (
        guest_id = current_setting('app.guest_id', true)
    );

-- Enable RLS on new tables
ALTER TABLE guest_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_limits ENABLE ROW LEVEL SECURITY;

-- Create helper function to set guest context
CREATE OR REPLACE FUNCTION set_guest_context(guest_user_id TEXT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.guest_id', guest_user_id, true);
END;
$$ LANGUAGE plpgsql;

-- Create helper function to clear guest context
CREATE OR REPLACE FUNCTION clear_guest_context()
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.guest_id', '', true);
END;
$$ LANGUAGE plpgsql;

-- Create function to migrate guest data to registered user
CREATE OR REPLACE FUNCTION migrate_guest_to_user(
    p_guest_id TEXT,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    migration_result JSONB := '{}';
    curricula_migrated INTEGER := 0;
    flashcards_migrated INTEGER := 0;
    sessions_migrated INTEGER := 0;
    reviews_migrated INTEGER := 0;
BEGIN
    -- Start transaction for data migration
    
    -- Migrate curricula
    UPDATE curricula 
    SET 
        user_id = p_user_id,
        is_guest_content = false,
        guest_owner_id = NULL,
        updated_at = now()
    WHERE is_guest_content = true AND guest_owner_id = p_guest_id;
    
    GET DIAGNOSTICS curricula_migrated = ROW_COUNT;
    
    -- Migrate flashcards
    UPDATE flashcards 
    SET 
        user_id = p_user_id,
        is_guest_content = false,
        guest_owner_id = NULL,
        updated_at = now()
    WHERE is_guest_content = true AND guest_owner_id = p_guest_id;
    
    GET DIAGNOSTICS flashcards_migrated = ROW_COUNT;
    
    -- Migrate sessions
    UPDATE sessions 
    SET 
        user_id = p_user_id,
        is_guest_session = false,
        guest_owner_id = NULL,
        updated_at = now()
    WHERE is_guest_session = true AND guest_owner_id = p_guest_id;
    
    GET DIAGNOSTICS sessions_migrated = ROW_COUNT;
    
    -- Migrate reviews
    UPDATE reviews 
    SET 
        user_id = p_user_id,
        is_guest_review = false,
        guest_owner_id = NULL,
        updated_at = now()
    WHERE is_guest_review = true AND guest_owner_id = p_guest_id;
    
    GET DIAGNOSTICS reviews_migrated = ROW_COUNT;
    
    -- Update profile to mark as upgraded
    UPDATE profiles 
    SET 
        is_guest = false,
        upgraded_at = now(),
        updated_at = now()
    WHERE id = p_user_id;
    
    -- Clean up guest limits
    DELETE FROM guest_limits WHERE guest_id = p_guest_id;
    
    -- Build result
    migration_result := jsonb_build_object(
        'success', true,
        'guest_id', p_guest_id,
        'user_id', p_user_id,
        'migrated_at', now(),
        'items_migrated', jsonb_build_object(
            'curricula', curricula_migrated,
            'flashcards', flashcards_migrated,
            'sessions', sessions_migrated,
            'reviews', reviews_migrated
        )
    );
    
    RETURN migration_result;
    
EXCEPTION WHEN OTHERS THEN
    -- Return error information
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to get guest usage statistics
CREATE OR REPLACE FUNCTION get_guest_usage_stats(p_guest_id TEXT)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    WITH guest_stats AS (
        SELECT 
            COALESCE(gl.flashcards_count, 0) as flashcards_count,
            COALESCE(gl.lessons_count, 0) as lessons_count,
            COALESCE(gl.plans_count, 0) as plans_count,
            gl.created_at as limits_created_at,
            gl.updated_at as limits_updated_at,
            (SELECT COUNT(*) FROM guest_analytics WHERE guest_id = p_guest_id) as analytics_events,
            (SELECT COUNT(*) FROM curricula WHERE is_guest_content = true AND guest_owner_id = p_guest_id) as actual_plans,
            (SELECT COUNT(*) FROM flashcards WHERE is_guest_content = true AND guest_owner_id = p_guest_id) as actual_flashcards
        FROM guest_limits gl
        WHERE gl.guest_id = p_guest_id
    )
    SELECT jsonb_build_object(
        'guest_id', p_guest_id,
        'usage', jsonb_build_object(
            'flashcards', jsonb_build_object(
                'count', flashcards_count,
                'limit', 50,
                'percentage', ROUND((flashcards_count::numeric / 50) * 100, 2)
            ),
            'lessons', jsonb_build_object(
                'count', lessons_count,
                'limit', 10,
                'percentage', ROUND((lessons_count::numeric / 10) * 100, 2)
            ),
            'plans', jsonb_build_object(
                'count', plans_count,
                'limit', 3,
                'percentage', ROUND((plans_count::numeric / 3) * 100, 2)
            )
        ),
        'analytics_events', analytics_events,
        'data_verification', jsonb_build_object(
            'plans_match', plans_count = actual_plans,
            'flashcards_match', flashcards_count = actual_flashcards
        ),
        'timestamps', jsonb_build_object(
            'limits_created_at', limits_created_at,
            'limits_updated_at', limits_updated_at
        )
    ) INTO stats
    FROM guest_stats;
    
    RETURN COALESCE(stats, jsonb_build_object('guest_id', p_guest_id, 'found', false));
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE guest_analytics IS 'Tracks guest user behavior and analytics events';
COMMENT ON TABLE guest_limits IS 'Tracks guest user content creation limits and usage';
COMMENT ON FUNCTION migrate_guest_to_user IS 'Migrates all guest user data to a registered user account';
COMMENT ON FUNCTION get_guest_usage_stats IS 'Returns comprehensive usage statistics for a guest user';
COMMENT ON FUNCTION set_guest_context IS 'Sets the guest context for RLS policies';
COMMENT ON FUNCTION clear_guest_context IS 'Clears the guest context for RLS policies';

COMMIT;

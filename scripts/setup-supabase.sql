-- Fathom AI Learning Platform - Guest Mode Database Setup
-- Run this script in your Supabase SQL Editor

BEGIN;

-- Create base tables for the learning platform
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    name TEXT,
    is_guest BOOLEAN DEFAULT false,
    upgraded_at TIMESTAMP WITH TIME ZONE,
    guest_id TEXT UNIQUE,
    guest_session_data JSONB,
    guest_created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS curricula (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    domain TEXT,
    description TEXT,
    is_guest_content BOOLEAN DEFAULT false,
    guest_owner_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curriculum_id UUID REFERENCES curricula(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_guest_content BOOLEAN DEFAULT false,
    guest_owner_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT,
    duration TEXT,
    order_index INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_guest_content BOOLEAN DEFAULT false,
    guest_owner_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    review_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    is_guest_content BOOLEAN DEFAULT false,
    guest_owner_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    is_guest_session BOOLEAN DEFAULT false,
    guest_owner_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    flashcard_id UUID REFERENCES flashcards(id) ON DELETE CASCADE,
    grade TEXT NOT NULL CHECK (grade IN ('again', 'hard', 'good', 'easy')),
    response_time_ms INTEGER,
    is_guest_review BOOLEAN DEFAULT false,
    guest_owner_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create guest-specific tables
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON profiles(is_guest);
CREATE INDEX IF NOT EXISTS idx_profiles_guest_id ON profiles(guest_id);
CREATE INDEX IF NOT EXISTS idx_profiles_guest_created_at ON profiles(guest_created_at);

CREATE INDEX IF NOT EXISTS idx_curricula_guest_content ON curricula(is_guest_content);
CREATE INDEX IF NOT EXISTS idx_curricula_guest_owner ON curricula(guest_owner_id);
CREATE INDEX IF NOT EXISTS idx_curricula_user_id ON curricula(user_id);

CREATE INDEX IF NOT EXISTS idx_modules_guest_content ON modules(is_guest_content);
CREATE INDEX IF NOT EXISTS idx_modules_guest_owner ON modules(guest_owner_id);
CREATE INDEX IF NOT EXISTS idx_modules_curriculum_id ON modules(curriculum_id);

CREATE INDEX IF NOT EXISTS idx_lessons_guest_content ON lessons(is_guest_content);
CREATE INDEX IF NOT EXISTS idx_lessons_guest_owner ON lessons(guest_owner_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);

CREATE INDEX IF NOT EXISTS idx_flashcards_guest_content ON flashcards(is_guest_content);
CREATE INDEX IF NOT EXISTS idx_flashcards_guest_owner ON flashcards(guest_owner_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_guest_session ON sessions(is_guest_session);
CREATE INDEX IF NOT EXISTS idx_sessions_guest_owner ON sessions(guest_owner_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_guest_review ON reviews(is_guest_review);
CREATE INDEX IF NOT EXISTS idx_reviews_guest_owner ON reviews(guest_owner_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_guest_analytics_guest_id ON guest_analytics(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_analytics_event_type ON guest_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_guest_analytics_timestamp ON guest_analytics(timestamp);

CREATE INDEX IF NOT EXISTS idx_guest_limits_guest_id ON guest_limits(guest_id);

COMMIT;

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_limits ENABLE ROW LEVEL SECURITY;

-- Create helper functions for guest context
CREATE OR REPLACE FUNCTION set_guest_context(guest_user_id TEXT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.guest_id', guest_user_id, true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clear_guest_context()
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.guest_id', '', true);
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
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE guest_analytics IS 'Tracks guest user behavior and analytics events';
COMMENT ON TABLE guest_limits IS 'Tracks guest user content creation limits and usage';
COMMENT ON FUNCTION migrate_guest_to_user IS 'Migrates all guest user data to a registered user account';
COMMENT ON FUNCTION get_guest_usage_stats IS 'Returns comprehensive usage statistics for a guest user';
COMMENT ON FUNCTION set_guest_context IS 'Sets the guest context for RLS policies';
COMMENT ON FUNCTION clear_guest_context IS 'Clears the guest context for RLS policies';

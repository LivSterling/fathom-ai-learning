-- Row Level Security Policies for Guest Mode Support
-- Run this script after running setup-supabase.sql

-- Profiles table RLS policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (
        auth.uid() = id OR 
        (is_guest AND guest_id = current_setting('app.guest_id', true))
    );

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (
        auth.uid() = id OR 
        (is_guest AND guest_id = current_setting('app.guest_id', true))
    );

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id OR
        (is_guest AND guest_id = current_setting('app.guest_id', true))
    );

-- Curricula table RLS policies
CREATE POLICY "Users can view own curricula" ON curricula
    FOR SELECT USING (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

CREATE POLICY "Users can create own curricula" ON curricula
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

CREATE POLICY "Users can update own curricula" ON curricula
    FOR UPDATE USING (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

CREATE POLICY "Users can delete own curricula" ON curricula
    FOR DELETE USING (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

-- Modules table RLS policies
CREATE POLICY "Users can view own modules" ON modules
    FOR SELECT USING (
        curriculum_id IN (
            SELECT id FROM curricula 
            WHERE user_id = auth.uid() OR 
                  (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
        )
    );

CREATE POLICY "Users can create own modules" ON modules
    FOR INSERT WITH CHECK (
        curriculum_id IN (
            SELECT id FROM curricula 
            WHERE user_id = auth.uid() OR 
                  (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
        )
    );

CREATE POLICY "Users can update own modules" ON modules
    FOR UPDATE USING (
        curriculum_id IN (
            SELECT id FROM curricula 
            WHERE user_id = auth.uid() OR 
                  (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
        )
    );

CREATE POLICY "Users can delete own modules" ON modules
    FOR DELETE USING (
        curriculum_id IN (
            SELECT id FROM curricula 
            WHERE user_id = auth.uid() OR 
                  (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
        )
    );

-- Lessons table RLS policies
CREATE POLICY "Users can view own lessons" ON lessons
    FOR SELECT USING (
        module_id IN (
            SELECT m.id FROM modules m
            JOIN curricula c ON m.curriculum_id = c.id
            WHERE c.user_id = auth.uid() OR 
                  (c.is_guest_content AND c.guest_owner_id = current_setting('app.guest_id', true))
        )
    );

CREATE POLICY "Users can create own lessons" ON lessons
    FOR INSERT WITH CHECK (
        module_id IN (
            SELECT m.id FROM modules m
            JOIN curricula c ON m.curriculum_id = c.id
            WHERE c.user_id = auth.uid() OR 
                  (c.is_guest_content AND c.guest_owner_id = current_setting('app.guest_id', true))
        )
    );

CREATE POLICY "Users can update own lessons" ON lessons
    FOR UPDATE USING (
        module_id IN (
            SELECT m.id FROM modules m
            JOIN curricula c ON m.curriculum_id = c.id
            WHERE c.user_id = auth.uid() OR 
                  (c.is_guest_content AND c.guest_owner_id = current_setting('app.guest_id', true))
        )
    );

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
CREATE POLICY "Users can view own flashcards" ON flashcards
    FOR SELECT USING (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

CREATE POLICY "Users can create own flashcards" ON flashcards
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

CREATE POLICY "Users can update own flashcards" ON flashcards
    FOR UPDATE USING (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

CREATE POLICY "Users can delete own flashcards" ON flashcards
    FOR DELETE USING (
        user_id = auth.uid() OR
        (is_guest_content AND guest_owner_id = current_setting('app.guest_id', true))
    );

-- Sessions table RLS policies
CREATE POLICY "Users can view own sessions" ON sessions
    FOR SELECT USING (
        user_id = auth.uid() OR
        (is_guest_session AND guest_owner_id = current_setting('app.guest_id', true))
    );

CREATE POLICY "Users can create own sessions" ON sessions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        (is_guest_session AND guest_owner_id = current_setting('app.guest_id', true))
    );

CREATE POLICY "Users can update own sessions" ON sessions
    FOR UPDATE USING (
        user_id = auth.uid() OR
        (is_guest_session AND guest_owner_id = current_setting('app.guest_id', true))
    );

-- Reviews table RLS policies
CREATE POLICY "Users can view own reviews" ON reviews
    FOR SELECT USING (
        user_id = auth.uid() OR
        (is_guest_review AND guest_owner_id = current_setting('app.guest_id', true))
    );

CREATE POLICY "Users can create own reviews" ON reviews
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        (is_guest_review AND guest_owner_id = current_setting('app.guest_id', true))
    );

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

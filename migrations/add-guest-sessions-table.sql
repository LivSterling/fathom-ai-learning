-- Create guest_sessions table for managing guest user sessions
CREATE TABLE IF NOT EXISTS guest_sessions (
    id TEXT PRIMARY KEY,
    session_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Create index for efficient cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires_at ON guest_sessions(expires_at);

-- Create index for last_active_at for analytics
CREATE INDEX IF NOT EXISTS idx_guest_sessions_last_active ON guest_sessions(last_active_at);

-- Enable RLS
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policy: Allow all operations on guest sessions (they're temporary and not user-specific)
CREATE POLICY "Allow all operations on guest sessions" ON guest_sessions
    FOR ALL USING (true);

-- Add columns to profiles table to support guest migration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS migrated_from_guest TEXT;

-- Create function to automatically clean up expired guest sessions
CREATE OR REPLACE FUNCTION cleanup_expired_guest_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM guest_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup daily (if pg_cron extension is available)
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('cleanup-expired-guest-sessions', '0 2 * * *', 'SELECT cleanup_expired_guest_sessions();');

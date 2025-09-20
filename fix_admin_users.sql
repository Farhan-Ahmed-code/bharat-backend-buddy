-- Fix for infinite recursion in admin_users policy
-- Run these commands in your Supabase SQL editor or psql

-- 1. First, create the admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'moderator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),

    -- Ensure one record per user
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 2. Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view audit logs" ON admin_audit_log;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON admin_audit_log;
DROP POLICY IF EXISTS "Admins can view all auctions" ON auctions;
DROP POLICY IF EXISTS "Admins can update any auction" ON auctions;
DROP POLICY IF EXISTS "Admins can delete any auction" ON auctions;

-- 3. Recreate the policies with fixed syntax
-- Audit log policies
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users
        )
    );

CREATE POLICY "Admins can insert audit logs" ON admin_audit_log
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM admin_users
        )
    );

-- Auction policies
CREATE POLICY "Admins can view all auctions" ON auctions
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users
        )
    );

CREATE POLICY "Admins can update any auction" ON auctions
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users
        )
    );

CREATE POLICY "Admins can delete any auction" ON auctions
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users
        )
    );

-- 4. Admin users table policies (avoiding circular reference)
CREATE POLICY "Users can view their own admin status" ON admin_users
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage admin_users" ON admin_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid() AND au.role = 'admin'
        )
    );

-- 5. Grant permissions
GRANT ALL ON admin_users TO authenticated;
GRANT ALL ON admin_users TO anon;
GRANT ALL ON admin_audit_log TO authenticated;
GRANT ALL ON admin_audit_log TO anon;

-- 6. Helper function to add first admin (replace YOUR_USER_ID with actual user ID)
CREATE OR REPLACE FUNCTION add_first_admin(admin_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Only allow if no admins exist yet
    IF NOT EXISTS (SELECT 1 FROM admin_users) THEN
        INSERT INTO admin_users (user_id, role, created_by)
        VALUES (admin_user_id, 'admin', admin_user_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION add_first_admin(UUID) TO authenticated;

-- 7. To add your first admin, run this after replacing with your actual user ID:
-- SELECT add_first_admin('your-actual-user-id-here');
-- Fix infinite recursion in admin_users policies by replacing with role column in profiles
-- Run this in Supabase SQL editor or via migration

-- 1. Add role column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator'));

-- 2. Create index for role queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 3. Migrate existing admin_users to profiles.role
UPDATE profiles
SET role = 'admin'
WHERE user_id IN (
    SELECT user_id FROM admin_users WHERE role = 'admin'
);

UPDATE profiles
SET role = 'moderator'
WHERE user_id IN (
    SELECT user_id FROM admin_users WHERE role = 'moderator'
);

-- 4. Drop all policies that reference admin_users (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can insert admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can update admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can delete admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can view audit logs" ON admin_audit_log;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON admin_audit_log;
DROP POLICY IF EXISTS "Admins can view all auctions" ON auctions;
DROP POLICY IF EXISTS "Admins can update any auction" ON auctions;
DROP POLICY IF EXISTS "Admins can delete any auction" ON auctions;

-- 5. Update policies to use profiles.role instead of admin_users
-- Audit log policies
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Admins can insert audit logs" ON admin_audit_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'moderator')
        )
    );

-- Auction policies
CREATE POLICY "Admins can view all auctions" ON auctions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Admins can update any auction" ON auctions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Admins can delete any auction" ON auctions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'moderator')
        )
    );

-- 6. Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 7. Create policies for profiles table
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'moderator')
        )
    );

-- 8. Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;

-- 9. Create function to promote user to admin (for manual admin assignment)
CREATE OR REPLACE FUNCTION promote_to_admin(target_user_id UUID, new_role TEXT DEFAULT 'admin')
RETURNS VOID AS $$
BEGIN
    -- Only allow admins to promote others, or allow self-promotion if no admins exist
    IF EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')) OR
       NOT EXISTS (SELECT 1 FROM profiles WHERE role IN ('admin', 'moderator')) THEN
        UPDATE profiles SET role = new_role WHERE user_id = target_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION promote_to_admin(UUID, TEXT) TO authenticated;

-- 10. Create function to check if user is admin (for frontend use)
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = user_uuid AND role IN ('admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;

-- 11. Remove admin_users table and related functions
DROP TABLE IF EXISTS admin_users CASCADE;
DROP FUNCTION IF EXISTS add_first_admin(UUID);

-- 12. Update any references in existing data (if needed)
-- This ensures backward compatibility
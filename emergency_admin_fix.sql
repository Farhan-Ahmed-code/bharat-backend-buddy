-- EMERGENCY FIX: Replace admin_users table with role column in profiles
-- This will eliminate the infinite recursion caused by self-referencing RLS policies

-- 1. Drop all problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can insert admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can update admin_users" ON admin_users;
DROP POLICY IF EXISTS "Admins can delete admin_users" ON admin_users;

-- 2. Drop policies on other tables that reference admin_users
DROP POLICY IF EXISTS "Admins can view all auctions" ON auctions;
DROP POLICY IF EXISTS "Admins can update any auction" ON auctions;
DROP POLICY IF EXISTS "Admins can delete any auction" ON auctions;
DROP POLICY IF EXISTS "Admins can view audit logs" ON admin_audit_log;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON admin_audit_log;

-- 3. Add role column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator'));

-- 4. Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON idx_profiles_role(role);

-- 5. Migrate existing admin data
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

-- 6. Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 7. Create new policies that don't cause recursion
-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON profiles
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

-- Auctions policies
CREATE POLICY "Admins can view all auctions" ON auctions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Admins can update any auction" ON auctions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Admins can delete any auction" ON auctions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'moderator')
        )
    );

-- Audit log policies
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Admins can insert audit logs" ON admin_audit_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'moderator')
        )
    );

-- 8. Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;

-- 9. Create helper function to promote user to admin
CREATE OR REPLACE FUNCTION promote_to_admin(target_user_id UUID, new_role TEXT DEFAULT 'admin')
RETURNS VOID AS $$
BEGIN
    -- Allow admins to promote others, or allow self-promotion if no admins exist
    IF EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')) OR
       NOT EXISTS (SELECT 1 FROM profiles WHERE role IN ('admin', 'moderator')) THEN
        UPDATE profiles SET role = new_role WHERE user_id = target_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION promote_to_admin(UUID, TEXT) TO authenticated;

-- 10. Create helper function to check admin status
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

-- 11. Remove the problematic admin_users table
DROP TABLE IF EXISTS admin_users CASCADE;
DROP FUNCTION IF EXISTS add_first_admin(UUID);

-- 12. Ensure the auctions_with_bid_count view exists and is accessible
DROP VIEW IF EXISTS auctions_with_bid_count;
CREATE OR REPLACE VIEW auctions_with_bid_count AS
SELECT
    a.id,
    a.title,
    a.description,
    a.starting_price,
    a.current_price,
    a.end_time,
    a.image_url,
    a.status,
    a.approval_status,
    a.approved_at,
    a.approved_by,
    a.rejection_reason,
    a.created_at,
    a.updated_at,
    a.seller_id,
    a.category_id,
    c.name as category_name,
    COALESCE(b.bid_count, 0) as bid_count
FROM auctions a
LEFT JOIN categories c ON a.category_id = c.id
LEFT JOIN (
    SELECT auction_id, COUNT(*) as bid_count
    FROM bids
    GROUP BY auction_id
) b ON a.id = b.auction_id;

-- Grant permissions to the view
GRANT SELECT ON auctions_with_bid_count TO authenticated, anon;
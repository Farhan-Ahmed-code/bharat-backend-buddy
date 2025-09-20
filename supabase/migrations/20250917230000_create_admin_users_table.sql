-- Create admin_users table to track admin privileges
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

-- Policy: Only admins can view admin_users table
CREATE POLICY "Admins can view admin_users" ON admin_users
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
        )
    );

-- Policy: Only admins can insert into admin_users table
CREATE POLICY "Admins can insert admin_users" ON admin_users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
        )
    );

-- Policy: Only admins can update admin_users table
CREATE POLICY "Admins can update admin_users" ON admin_users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
        )
    );

-- Policy: Only admins can delete from admin_users table
CREATE POLICY "Admins can delete admin_users" ON admin_users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.user_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT ALL ON admin_users TO authenticated;
GRANT ALL ON admin_users TO anon;

-- Insert a default admin user (you'll need to replace this with an actual user ID)
-- This is commented out because we need a real user ID
-- INSERT INTO admin_users (user_id, role, created_by)
-- VALUES ('your-user-id-here', 'admin', 'your-user-id-here');

-- Alternative: Create a function to safely add the first admin
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
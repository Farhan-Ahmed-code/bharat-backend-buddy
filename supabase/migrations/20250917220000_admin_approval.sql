-- Add admin approval system for auctions
-- Add approval status to auctions table
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for approval status for faster queries
CREATE INDEX IF NOT EXISTS idx_auctions_approval_status ON auctions(approval_status);
CREATE INDEX IF NOT EXISTS idx_auctions_approved_at ON auctions(approved_at);

-- Update existing auctions to be approved by default (for backward compatibility)
UPDATE auctions SET approval_status = 'approved', approved_at = created_at WHERE approval_status IS NULL;

-- Create admin_audit_log table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    action_type TEXT NOT NULL, -- 'approve_auction', 'reject_auction', 'delete_auction', etc.
    resource_type TEXT NOT NULL, -- 'auction', 'user', etc.
    resource_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for admin audit log
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_type ON admin_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

-- Enable Row Level Security for admin audit log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users
        )
    );

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert audit logs" ON admin_audit_log
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM admin_users
        )
    );

-- Grant necessary permissions
GRANT ALL ON admin_audit_log TO authenticated;
GRANT ALL ON admin_audit_log TO anon;

-- Update auctions RLS to show approved auctions to regular users
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Anyone can view auctions" ON auctions;
DROP POLICY IF EXISTS "Users can view their own auctions" ON auctions;

-- Create new policies for auctions with approval system
CREATE POLICY "Users can view approved auctions" ON auctions
    FOR SELECT USING (approval_status = 'approved');

CREATE POLICY "Users can view their own auctions regardless of approval" ON auctions
    FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "Admins can view all auctions" ON auctions
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users
        )
    );

-- Sellers can still update their own auctions
CREATE POLICY "Users can update their own auctions" ON auctions
    FOR UPDATE USING (seller_id = auth.uid());

-- Admins can update any auction (for approval/rejection)
CREATE POLICY "Admins can update any auction" ON auctions
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users
        )
    );

-- Sellers can still delete their own auctions
CREATE POLICY "Users can delete their own auctions" ON auctions
    FOR DELETE USING (seller_id = auth.uid());

-- Admins can delete any auction
CREATE POLICY "Admins can delete any auction" ON auctions
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM admin_users
        )
    );
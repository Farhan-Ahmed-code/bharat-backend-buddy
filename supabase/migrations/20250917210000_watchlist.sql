-- Create watchlist table for users to save favorite auctions
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

    -- Ensure a user can only have one entry per auction
    UNIQUE(user_id, auction_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_auction_id ON watchlist(auction_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_created_at ON watchlist(created_at DESC);

-- Enable Row Level Security
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Create policies for watchlist
-- Users can only see their own watchlist items
CREATE POLICY "Users can view their own watchlist" ON watchlist
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert into their own watchlist
CREATE POLICY "Users can insert into their own watchlist" ON watchlist
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete from their own watchlist
CREATE POLICY "Users can delete from their own watchlist" ON watchlist
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON watchlist TO authenticated;
GRANT ALL ON watchlist TO anon;
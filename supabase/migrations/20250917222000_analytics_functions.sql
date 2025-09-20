-- Analytics functions for dashboard
-- These functions provide aggregated data for analytics dashboard

-- Function to get average auction price
CREATE OR REPLACE FUNCTION get_avg_auction_price()
RETURNS DECIMAL AS $$
DECLARE
    avg_price DECIMAL;
BEGIN
    SELECT AVG(current_price) INTO avg_price
    FROM auctions
    WHERE status = 'completed' AND approval_status = 'approved';

    RETURN COALESCE(avg_price, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get completion rate (auctions with bids vs total auctions)
CREATE OR REPLACE FUNCTION get_completion_rate()
RETURNS DECIMAL AS $$
DECLARE
    total_auctions INTEGER;
    completed_auctions INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_auctions
    FROM auctions
    WHERE approval_status = 'approved';

    SELECT COUNT(*) INTO completed_auctions
    FROM auctions
    WHERE status = 'completed' AND approval_status = 'approved';

    IF total_auctions = 0 THEN
        RETURN 0;
    END IF;

    RETURN completed_auctions::DECIMAL / total_auctions::DECIMAL;
END;
$$ LANGUAGE plpgsql;

-- Function to get most active users
CREATE OR REPLACE FUNCTION get_most_active_users(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    user_id UUID,
    full_name TEXT,
    bid_count BIGINT,
    total_spent DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as user_id,
        p.full_name,
        COUNT(b.id) as bid_count,
        COALESCE(SUM(b.amount), 0) as total_spent
    FROM profiles p
    LEFT JOIN bids b ON p.id = b.bidder_id
    WHERE b.id IS NOT NULL
    GROUP BY p.id, p.full_name
    ORDER BY bid_count DESC, total_spent DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get top performing auctions
CREATE OR REPLACE FUNCTION get_top_auctions(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    id UUID,
    title TEXT,
    final_price DECIMAL,
    bid_count BIGINT,
    seller_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.title,
        a.current_price as final_price,
        COUNT(b.id) as bid_count,
        p.full_name as seller_name
    FROM auctions a
    LEFT JOIN bids b ON a.id = b.auction_id
    LEFT JOIN profiles p ON a.seller_id = p.id
    WHERE a.status = 'completed' AND a.approval_status = 'approved'
    GROUP BY a.id, a.title, a.current_price, p.full_name
    ORDER BY a.current_price DESC, COUNT(b.id) DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get monthly revenue data
CREATE OR REPLACE FUNCTION get_monthly_revenue(months_back INTEGER DEFAULT 12)
RETURNS TABLE(
    month TEXT,
    revenue DECIMAL,
    auction_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(DATE_TRUNC('month', a.created_at), 'Mon YYYY') as month,
        COALESCE(SUM(a.current_price), 0) as revenue,
        COUNT(a.id) as auction_count
    FROM auctions a
    WHERE a.status = 'completed'
        AND a.approval_status = 'approved'
        AND a.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * months_back)
    GROUP BY DATE_TRUNC('month', a.created_at)
    ORDER BY DATE_TRUNC('month', a.created_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION get_avg_auction_price() TO authenticated;
GRANT EXECUTE ON FUNCTION get_completion_rate() TO authenticated;
GRANT EXECUTE ON FUNCTION get_most_active_users(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_auctions(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_revenue(INTEGER) TO authenticated;
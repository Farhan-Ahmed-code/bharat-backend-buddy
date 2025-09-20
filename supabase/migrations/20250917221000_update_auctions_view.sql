-- Update auctions_with_bid_count view to include approval fields
-- This ensures that the auction grid and other components can filter by approval status

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
-- Create a view that returns auctions with bid counts and category name
create or replace view public.auctions_with_bid_count as
select 
  a.id,
  a.title,
  a.description,
  a.starting_price,
  a.current_price,
  a.end_time,
  a.status,
  a.image_url,
  a.category_id,
  a.created_at,
  a.seller_id,
  coalesce(bc.bid_count, 0) as bid_count,
  c.name as category_name
from public.auctions a
left join (
  select auction_id, count(*)::int as bid_count
  from public.bids
  group by auction_id
) bc on bc.auction_id = a.id
left join public.categories c on c.id = a.category_id;

-- Create a view that returns auctions with seller full name
create or replace view public.auctions_with_seller as
select 
  a.id,
  a.title,
  a.status,
  a.current_price,
  a.end_time,
  a.created_at,
  a.seller_id,
  p.full_name as seller_full_name
from public.auctions a
left join public.profiles p on p.user_id = a.seller_id;



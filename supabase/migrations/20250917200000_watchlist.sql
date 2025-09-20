-- Watchlist table for users to favorite auctions
create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  auction_id uuid not null references public.auctions(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, auction_id) -- prevent duplicates
);

-- Indexes for performance
create index if not exists watchlist_user_id_idx on public.watchlist(user_id);
create index if not exists watchlist_auction_id_idx on public.watchlist(auction_id);

-- Add approval status to auctions if not exists (extend existing status)
-- The status field already exists, but let's ensure it can handle 'pending_approval', 'approved', 'rejected'
-- We'll use RLS to control visibility of unapproved auctions
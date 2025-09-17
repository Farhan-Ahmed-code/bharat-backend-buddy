-- Payments table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid references public.auctions(id) on delete cascade not null,
  winner_id uuid references public.profiles(id) on delete set null,
  amount numeric not null,
  status text not null default 'pending',
  provider_order_id text,
  created_at timestamp with time zone default now()
);

-- Add payment_status to auctions
alter table public.auctions
  add column if not exists payment_status text default 'pending';



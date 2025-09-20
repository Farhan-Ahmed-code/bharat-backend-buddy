-- Shipments table for post-auction logistics
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete set null,
  winner_id uuid not null references public.profiles(id) on delete set null,
  shipping_address text,
  tracking_number text,
  carrier text,
  status text not null default 'Awaiting Shipment',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure one shipment per auction
alter table public.shipments
  add constraint shipments_auction_unique unique (auction_id);

-- Helpful indexes
create index if not exists shipments_auction_id_idx on public.shipments(auction_id);
create index if not exists shipments_winner_id_idx on public.shipments(winner_id);
create index if not exists shipments_seller_id_idx on public.shipments(seller_id);
create index if not exists shipments_status_idx on public.shipments(status);

-- Generic updated_at trigger (idempotent)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_shipments_updated_at on public.shipments;
create trigger set_shipments_updated_at
before update on public.shipments
for each row execute function public.set_updated_at();
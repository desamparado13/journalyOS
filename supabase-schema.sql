create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_date date not null,
  trade_time time not null,
  pair text not null check (pair in ('AUDUSD', 'EURUSD', 'EURJPY', 'AUDJPY', 'GBPUSD', 'NZDJPY', 'EURAUD')),
  setup text not null check (
    setup in (
      'REVERSAL',
      'Internal reversal',
      'Liquidity sweep',
      'Break and retest',
      'Flag',
      'Flag+',
      'EU timed entry'
    )
  ),
  direction text not null check (direction in ('Long', 'Short')),
  mae numeric not null default 0,
  mae_pips numeric,
  stop_loss_pips numeric,
  pnl_r numeric not null default 0,
  result text not null check (result in ('Win', 'Loss', 'Breakeven')),
  notes text not null default '',
  screenshot_url text not null default '',
  source_app text,
  legacy_id integer,
  duration_minutes integer,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trades add column if not exists mae_pips numeric;
alter table public.trades add column if not exists stop_loss_pips numeric;
alter table public.trades add column if not exists source_app text;
alter table public.trades add column if not exists legacy_id integer;
alter table public.trades add column if not exists duration_minutes integer;
alter table public.trades add column if not exists finalized_at timestamptz;

create unique index if not exists trades_source_app_legacy_id_unique
  on public.trades (source_app, legacy_id)
  where source_app is not null and legacy_id is not null;

create table if not exists public.backtests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_date date not null,
  trade_time time not null,
  pair text not null check (pair in ('AUDUSD', 'EURUSD', 'EURJPY', 'AUDJPY', 'GBPUSD', 'NZDJPY', 'EURAUD')),
  setup text not null check (
    setup in (
      'REVERSAL',
      'Internal reversal',
      'Liquidity sweep',
      'Break and retest',
      'Flag',
      'Flag+',
      'EU timed entry'
    )
  ),
  direction text not null check (direction in ('Long', 'Short')),
  duration_minutes integer,
  stop_loss_pips numeric,
  mae_pips numeric,
  pnl_r numeric not null default 0,
  result text not null check (result in ('Win', 'Loss', 'Breakeven')),
  notes text not null default '',
  scale_in text not null default 'No',
  screenshot_url text not null default '',
  source_app text,
  legacy_id integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.backtests add column if not exists duration_minutes integer;
alter table public.backtests add column if not exists stop_loss_pips numeric;
alter table public.backtests add column if not exists mae_pips numeric;
alter table public.backtests add column if not exists scale_in text not null default 'No';
alter table public.backtests add column if not exists screenshot_url text not null default '';
alter table public.backtests add column if not exists source_app text;
alter table public.backtests add column if not exists legacy_id integer;

create unique index if not exists backtests_user_source_app_legacy_id_unique
  on public.backtests (user_id, source_app, legacy_id)
  where source_app is not null and legacy_id is not null;

alter table public.trades enable row level security;
alter table public.backtests enable row level security;

drop policy if exists "Users can read their own trades" on public.trades;
drop policy if exists "Users can insert their own trades" on public.trades;
drop policy if exists "Users can update their own trades" on public.trades;
drop policy if exists "Users can delete their own trades" on public.trades;
drop policy if exists "Users can read their own backtests" on public.backtests;
drop policy if exists "Users can insert their own backtests" on public.backtests;
drop policy if exists "Users can update their own backtests" on public.backtests;
drop policy if exists "Users can delete their own backtests" on public.backtests;

create policy "Users can read their own trades"
  on public.trades
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own trades"
  on public.trades
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own trades"
  on public.trades
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own trades"
  on public.trades
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can read their own backtests"
  on public.backtests
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own backtests"
  on public.backtests
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own backtests"
  on public.backtests
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own backtests"
  on public.backtests
  for delete
  to authenticated
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';

create table if not exists public.trade_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  decision_date date not null,
  decision_time time not null,
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
  status text not null default 'Waiting' check (status in ('Taken', 'Cancelled', 'Missed', 'Waiting')),
  entry_plan text not null default '',
  stop_loss text not null default '',
  take_profit text not null default '',
  risk_percent numeric,
  reason_to_take text not null default '',
  reason_cancelled text not null default '',
  outcome text not null default 'Unknown' check (outcome in ('Unknown', 'Won', 'Lost', 'Breakeven', 'Avoided loss', 'Cost opportunity')),
  notes text not null default '',
  screenshot_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trade_decisions add column if not exists entry_plan text not null default '';
alter table public.trade_decisions add column if not exists stop_loss text not null default '';
alter table public.trade_decisions add column if not exists take_profit text not null default '';
alter table public.trade_decisions add column if not exists risk_percent numeric;
alter table public.trade_decisions add column if not exists reason_to_take text not null default '';
alter table public.trade_decisions add column if not exists reason_cancelled text not null default '';
alter table public.trade_decisions add column if not exists outcome text not null default 'Unknown';
alter table public.trade_decisions add column if not exists screenshot_url text not null default '';

alter table public.trade_decisions enable row level security;

drop policy if exists "Users can read their own trade decisions" on public.trade_decisions;
drop policy if exists "Users can insert their own trade decisions" on public.trade_decisions;
drop policy if exists "Users can update their own trade decisions" on public.trade_decisions;
drop policy if exists "Users can delete their own trade decisions" on public.trade_decisions;

create policy "Users can read their own trade decisions"
  on public.trade_decisions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own trade decisions"
  on public.trade_decisions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own trade decisions"
  on public.trade_decisions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own trade decisions"
  on public.trade_decisions
  for delete
  to authenticated
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';

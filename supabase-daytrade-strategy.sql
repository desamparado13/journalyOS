-- Imbalance + Fibonacci Strategy (15M London)
-- Run once in the Supabase SQL editor.

create table if not exists public.daytrade_live_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_date date not null,
  pair text not null,
  session text not null default 'London' check (session = 'London'),
  timeframe text not null default '15M' check (timeframe = '15M'),
  direction text not null check (direction in ('Buy', 'Sell')),
  accumulation_quality text not null,
  imbalance_quality text not null,
  fib_low numeric not null,
  fib_high numeric not null,
  retracement_depth text not null check (retracement_depth in ('0.618', '0.786')),
  entry_price numeric not null,
  stop_price numeric not null,
  target_price numeric not null,
  planned_rr numeric not null,
  mae_r numeric not null default 0,
  mfe_r numeric not null default 0,
  result_r numeric not null default 0,
  outcome text not null check (outcome in ('Win', 'Loss', 'Breakeven')),
  trade_grade text not null check (trade_grade in ('A+', 'A', 'B', 'C')),
  before_image_url text not null,
  after_image_url text not null,
  notes text not null default '',
  rule_checklist jsonb not null default '[false,false,false,false,false,false]'::jsonb,
  execution_quality text not null,
  emotions text not null default '',
  confidence smallint not null check (confidence between 1 and 10),
  patience smallint not null check (patience between 1 and 10),
  fomo smallint not null check (fomo between 1 and 10),
  discipline smallint not null check (discipline between 1 and 10),
  rule_violations text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daytrade_backtests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_date date not null,
  pair text not null,
  session text not null default 'London' check (session = 'London'),
  timeframe text not null default '15M' check (timeframe = '15M'),
  direction text not null check (direction in ('Buy', 'Sell')),
  accumulation_quality text not null,
  imbalance_quality text not null,
  fib_low numeric not null,
  fib_high numeric not null,
  retracement_depth text not null check (retracement_depth in ('0.618', '0.786')),
  entry_price numeric not null,
  stop_price numeric not null,
  target_price numeric not null,
  planned_rr numeric not null,
  mae_r numeric not null default 0,
  mfe_r numeric not null default 0,
  result_r numeric not null default 0,
  outcome text not null check (outcome in ('Win', 'Loss', 'Breakeven')),
  trade_grade text not null check (trade_grade in ('A+', 'A', 'B', 'C')),
  before_image_url text not null,
  after_image_url text not null,
  notes text not null default '',
  rule_checklist jsonb not null default '[false,false,false,false,false,false]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.daytrade_live_trades enable row level security;
alter table public.daytrade_backtests enable row level security;

create policy "Users manage their own daytrade live trades"
  on public.daytrade_live_trades for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own daytrade backtests"
  on public.daytrade_backtests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists daytrade_live_user_date_idx on public.daytrade_live_trades(user_id, trade_date desc);
create index if not exists daytrade_backtest_user_date_idx on public.daytrade_backtests(user_id, trade_date desc);

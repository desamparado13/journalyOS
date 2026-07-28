-- GBPUSD DayTrade Backtesting (15M London)
-- Safe to run for both a new install and an existing DayTrade database.

create table if not exists public.daytrade_live_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trade_date date not null,
  pair text not null default 'GBPUSD',
  session text not null default 'London' check (session = 'London'),
  timeframe text not null default '15M' check (timeframe = '15M'),
  direction text not null check (direction in ('Buy', 'Sell')),
  accumulation_quality text not null,
  imbalance_quality text not null,
  trading_day text check (trading_day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  trade_duration_hours numeric check (trade_duration_hours > 0),
  has_news boolean not null default false,
  news_details text not null default '',
  news_events jsonb not null default '[]'::jsonb,
  previous_imbalance_sessions text not null default 'None' check (previous_imbalance_sessions in ('None', 'Prev', '1', '2', '3')),
  liquidity_context text not null default 'None' check (liquidity_context in ('None', 'Order block', 'Liquidity area', 'Both')),
  accumulation_image_url text,
  imbalance_image_url text,
  fib_low numeric,
  fib_high numeric,
  retracement_depth text check (retracement_depth in ('0.618', '0.786')),
  entry_price numeric,
  stop_price numeric,
  target_price numeric,
  planned_rr numeric,
  mae_r numeric not null default 0,
  mfe_r numeric not null default 0,
  result_r numeric not null default 0,
  outcome text not null check (outcome in ('Win', 'Loss', 'Breakeven')),
  trade_grade text not null check (trade_grade in ('A+', 'A', 'B', 'C')),
  before_image_url text not null,
  after_image_url text not null,
  notes text not null default '',
  rule_checklist jsonb,
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
  pair text not null default 'GBPUSD',
  session text not null default 'London' check (session = 'London'),
  timeframe text not null default '15M' check (timeframe = '15M'),
  direction text not null check (direction in ('Buy', 'Sell')),
  accumulation_quality text not null,
  imbalance_quality text not null,
  trading_day text check (trading_day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  trade_duration_hours numeric check (trade_duration_hours > 0),
  has_news boolean not null default false,
  news_details text not null default '',
  news_events jsonb not null default '[]'::jsonb,
  previous_imbalance_sessions text not null default 'None' check (previous_imbalance_sessions in ('None', 'Prev', '1', '2', '3')),
  liquidity_context text not null default 'None' check (liquidity_context in ('None', 'Order block', 'Liquidity area', 'Both')),
  accumulation_image_url text,
  imbalance_image_url text,
  fib_low numeric,
  fib_high numeric,
  retracement_depth text check (retracement_depth in ('0.618', '0.786')),
  entry_price numeric,
  stop_price numeric,
  target_price numeric,
  planned_rr numeric,
  mae_r numeric not null default 0,
  mfe_r numeric not null default 0,
  result_r numeric not null default 0,
  outcome text not null check (outcome in ('Win', 'Loss', 'Breakeven')),
  trade_grade text not null check (trade_grade in ('A+', 'A', 'B', 'C')),
  before_image_url text not null,
  after_image_url text not null,
  notes text not null default '',
  rule_checklist jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade existing backtest tables without deleting historical records.
alter table public.daytrade_backtests
  add column if not exists trading_day text,
  add column if not exists trade_duration_hours numeric,
  add column if not exists has_news boolean not null default false,
  add column if not exists news_details text not null default '',
  add column if not exists news_events jsonb not null default '[]'::jsonb,
  add column if not exists previous_imbalance_sessions text not null default 'None',
  add column if not exists liquidity_context text not null default 'None',
  add column if not exists accumulation_image_url text,
  add column if not exists imbalance_image_url text;

alter table public.daytrade_backtests
  alter column pair set default 'GBPUSD',
  alter column fib_low drop not null,
  alter column fib_high drop not null,
  alter column retracement_depth drop not null,
  alter column entry_price drop not null,
  alter column stop_price drop not null,
  alter column target_price drop not null,
  alter column planned_rr drop not null,
  alter column rule_checklist drop not null;

alter table public.daytrade_backtests
  drop constraint if exists daytrade_backtests_pair_gbpusd_check;
alter table public.daytrade_backtests
  add constraint daytrade_backtests_pair_gbpusd_check check (pair = 'GBPUSD') not valid;

alter table public.daytrade_backtests
  drop constraint if exists daytrade_backtests_trading_day_check;
alter table public.daytrade_backtests
  add constraint daytrade_backtests_trading_day_check
  check (trading_day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')) not valid;

alter table public.daytrade_live_trades enable row level security;
alter table public.daytrade_backtests enable row level security;

drop policy if exists "Users manage their own daytrade live trades"
  on public.daytrade_live_trades;
create policy "Users manage their own daytrade live trades"
  on public.daytrade_live_trades for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own daytrade backtests"
  on public.daytrade_backtests;
create policy "Users manage their own daytrade backtests"
  on public.daytrade_backtests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists daytrade_live_user_date_idx on public.daytrade_live_trades(user_id, trade_date desc);
create index if not exists daytrade_backtest_user_date_idx on public.daytrade_backtests(user_id, trade_date desc);

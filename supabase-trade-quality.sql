-- Run this once in the Supabase SQL editor to enable post-trade quality reviews.
alter table public.trades add column if not exists trade_quality text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trades_trade_quality_check'
  ) then
    alter table public.trades
      add constraint trades_trade_quality_check
      check (trade_quality is null or trade_quality in ('Good', 'Mid', 'Bad'));
  end if;
end $$;

create index if not exists trades_user_trade_quality_idx
  on public.trades (user_id, trade_quality)
  where trade_quality is not null;

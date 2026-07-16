create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  content text not null check (length(btrim(content)) > 0),
  image_url text not null default '',
  pair text check (pair is null or pair in ('AUDUSD', 'EURUSD', 'EURJPY', 'AUDJPY', 'GBPUSD', 'NZDJPY', 'EURAUD')),
  related_trade_id uuid references public.trades(id) on delete set null,
  related_discipline_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.journal_entries add column if not exists related_discipline_id uuid;

do $$
begin
  if to_regclass('public.trade_decisions') is null then
    raise exception 'Run supabase-trade-decisions.sql before this journal migration.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'journal_entries_related_discipline_id_fkey'
      and conrelid = 'public.journal_entries'::regclass
  ) then
    alter table public.journal_entries
      add constraint journal_entries_related_discipline_id_fkey
      foreign key (related_discipline_id)
      references public.trade_decisions(id)
      on delete set null;
  end if;
end $$;

create index if not exists journal_entries_user_date_idx
  on public.journal_entries (user_id, entry_date desc, created_at desc);

create index if not exists journal_entries_related_trade_idx
  on public.journal_entries (related_trade_id)
  where related_trade_id is not null;

create index if not exists journal_entries_related_discipline_idx
  on public.journal_entries (related_discipline_id)
  where related_discipline_id is not null;

alter table public.journal_entries enable row level security;

drop policy if exists "Users can read their own journal entries" on public.journal_entries;
drop policy if exists "Users can insert their own journal entries" on public.journal_entries;
drop policy if exists "Users can update their own journal entries" on public.journal_entries;
drop policy if exists "Users can delete their own journal entries" on public.journal_entries;

create policy "Users can read their own journal entries"
  on public.journal_entries
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own journal entries"
  on public.journal_entries
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      related_trade_id is null
      or exists (
        select 1 from public.trades
        where trades.id = related_trade_id and trades.user_id = auth.uid()
      )
    )
    and (
      related_discipline_id is null
      or exists (
        select 1 from public.trade_decisions
        where trade_decisions.id = related_discipline_id and trade_decisions.user_id = auth.uid()
      )
    )
  );

create policy "Users can update their own journal entries"
  on public.journal_entries
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      related_trade_id is null
      or exists (
        select 1 from public.trades
        where trades.id = related_trade_id and trades.user_id = auth.uid()
      )
    )
    and (
      related_discipline_id is null
      or exists (
        select 1 from public.trade_decisions
        where trade_decisions.id = related_discipline_id and trade_decisions.user_id = auth.uid()
      )
    )
  );

create policy "Users can delete their own journal entries"
  on public.journal_entries
  for delete
  to authenticated
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';

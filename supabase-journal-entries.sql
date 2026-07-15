create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  content text not null check (length(btrim(content)) > 0),
  image_url text not null default '',
  pair text check (pair is null or pair in ('AUDUSD', 'EURUSD', 'EURJPY', 'AUDJPY', 'GBPUSD', 'NZDJPY', 'EURAUD')),
  related_trade_id uuid references public.trades(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journal_entries_user_date_idx
  on public.journal_entries (user_id, entry_date desc, created_at desc);

create index if not exists journal_entries_related_trade_idx
  on public.journal_entries (related_trade_id)
  where related_trade_id is not null;

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
  );

create policy "Users can delete their own journal entries"
  on public.journal_entries
  for delete
  to authenticated
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';

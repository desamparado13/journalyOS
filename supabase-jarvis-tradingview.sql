create extension if not exists pgcrypto with schema extensions;

create table if not exists public.jarvis_webhook_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'TradingView',
  display_name text not null default 'Pot',
  token_hash text not null unique check (length(token_hash) = 64),
  token_prefix text not null check (length(token_prefix) between 4 and 16),
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jarvis_tradingview_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  webhook_token_id uuid not null references public.jarvis_webhook_tokens(id) on delete cascade,
  ticker text not null,
  timeframe text not null,
  event text not null,
  event_timestamp timestamptz not null,
  price numeric,
  mrh numeric,
  mrl numeric,
  bullish_break_count integer not null default 0 check (bullish_break_count >= 0),
  bearish_break_count integer not null default 0 check (bearish_break_count >= 0),
  candle jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'error')),
  processing_error text,
  processed_at timestamptz,
  pushover_status text not null default 'not_required' check (pushover_status in ('not_required', 'pending', 'sent', 'failed')),
  pushover_receipt text,
  pushover_attempted_at timestamptz,
  pushover_sent_at timestamptz,
  pushover_error text,
  received_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

alter table public.jarvis_tradingview_events add column if not exists pushover_status text not null default 'not_required';
alter table public.jarvis_tradingview_events add column if not exists pushover_receipt text;
alter table public.jarvis_tradingview_events add column if not exists pushover_attempted_at timestamptz;
alter table public.jarvis_tradingview_events add column if not exists pushover_sent_at timestamptz;
alter table public.jarvis_tradingview_events add column if not exists pushover_error text;
do $$ begin
  alter table public.jarvis_tradingview_events add constraint jarvis_events_pushover_status_check check (pushover_status in ('not_required', 'pending', 'sent', 'failed'));
exception when duplicate_object then null;
end $$;

create table if not exists public.jarvis_pair_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  timeframe text not null,
  status text not null check (status in ('WATCH')),
  event text not null,
  price numeric,
  mrh numeric,
  mrl numeric,
  bullish_break_count integer not null default 0,
  bearish_break_count integer not null default 0,
  last_candle_timestamp timestamptz not null,
  last_event_id uuid references public.jarvis_tradingview_events(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (user_id, ticker, timeframe)
);

create table if not exists public.jarvis_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.jarvis_tradingview_events(id) on delete cascade,
  ticker text not null,
  timeframe text not null,
  break_count integer not null,
  candle_timestamp timestamptz not null,
  dedupe_key text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index if not exists jarvis_events_user_received_idx on public.jarvis_tradingview_events (user_id, received_at desc);
create index if not exists jarvis_events_user_pair_idx on public.jarvis_tradingview_events (user_id, ticker, timeframe, event_timestamp desc);
create index if not exists jarvis_notifications_user_created_idx on public.jarvis_notifications (user_id, created_at desc);

alter table public.jarvis_webhook_tokens enable row level security;
alter table public.jarvis_tradingview_events enable row level security;
alter table public.jarvis_pair_state enable row level security;
alter table public.jarvis_notifications enable row level security;

revoke all on public.jarvis_webhook_tokens, public.jarvis_tradingview_events, public.jarvis_pair_state, public.jarvis_notifications from anon;
grant select, insert, update, delete on public.jarvis_webhook_tokens to authenticated;
grant select on public.jarvis_tradingview_events, public.jarvis_pair_state to authenticated;
grant select, update on public.jarvis_notifications to authenticated;

drop policy if exists "Users manage their own Jarvis webhook tokens" on public.jarvis_webhook_tokens;
create policy "Users manage their own Jarvis webhook tokens" on public.jarvis_webhook_tokens for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users read their own TradingView events" on public.jarvis_tradingview_events;
create policy "Users read their own TradingView events" on public.jarvis_tradingview_events for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users read their own Jarvis pair state" on public.jarvis_pair_state;
create policy "Users read their own Jarvis pair state" on public.jarvis_pair_state for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users manage their own Jarvis notifications" on public.jarvis_notifications;
create policy "Users manage their own Jarvis notifications" on public.jarvis_notifications for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.ingest_jarvis_tradingview_event(
  p_token text,
  p_ticker text,
  p_timeframe text,
  p_event text,
  p_event_timestamp timestamptz,
  p_price numeric,
  p_mrh numeric,
  p_mrl numeric,
  p_bullish_break_count integer,
  p_bearish_break_count integer,
  p_candle jsonb,
  p_raw_payload jsonb,
  p_dedupe_key text
) returns table(event_id uuid, is_duplicate boolean)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  token_row public.jarvis_webhook_tokens%rowtype;
  inserted_id uuid;
begin
  select * into token_row
  from public.jarvis_webhook_tokens
  where token_hash = encode(digest(p_token, 'sha256'), 'hex') and is_active = true;

  if token_row.id is null then
    raise exception 'invalid webhook token' using errcode = '28000';
  end if;

  update public.jarvis_webhook_tokens set last_used_at = now(), updated_at = now() where id = token_row.id;

  insert into public.jarvis_tradingview_events (
    user_id, webhook_token_id, ticker, timeframe, event, event_timestamp, price, mrh, mrl,
    bullish_break_count, bearish_break_count, candle, raw_payload, dedupe_key
  ) values (
    token_row.user_id, token_row.id, upper(p_ticker), p_timeframe, p_event, p_event_timestamp, p_price, p_mrh, p_mrl,
    greatest(coalesce(p_bullish_break_count, 0), 0), greatest(coalesce(p_bearish_break_count, 0), 0), p_candle, coalesce(p_raw_payload, '{}'::jsonb), p_dedupe_key
  ) on conflict (user_id, dedupe_key) do nothing returning id into inserted_id;

  if inserted_id is null then
    select id into inserted_id from public.jarvis_tradingview_events where user_id = token_row.user_id and dedupe_key = p_dedupe_key;
    return query select inserted_id, true;
  else
    return query select inserted_id, false;
  end if;
end;
$$;

drop function if exists public.claim_jarvis_pushover_delivery(uuid,text);
create function public.claim_jarvis_pushover_delivery(p_event_id uuid, p_token text)
returns table(event_id uuid, user_id uuid, ticker text, timeframe text, event text, event_timestamp timestamptz, price numeric, mrh numeric, mrl numeric)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  event_row public.jarvis_tradingview_events%rowtype;
begin
  select e.* into event_row
  from public.jarvis_tradingview_events e
  join public.jarvis_webhook_tokens token on token.id = e.webhook_token_id
  where e.id = p_event_id
    and token.is_active = true
    and token.token_hash = encode(digest(p_token, 'sha256'), 'hex')
  for update of e;

  if event_row.id is null then return; end if;
  if event_row.pushover_status = 'sent' then return; end if;
  if event_row.pushover_status = 'pending' and event_row.pushover_attempted_at > now() - interval '15 minutes' then return; end if;

  update public.jarvis_tradingview_events
  set pushover_status = 'pending', pushover_attempted_at = now(), pushover_error = null
  where id = event_row.id;

  return query select event_row.id, event_row.user_id, event_row.ticker, event_row.timeframe, event_row.event,
    event_row.event_timestamp, event_row.price, event_row.mrh, event_row.mrl;
end;
$$;

drop function if exists public.complete_jarvis_pushover_delivery(uuid,text,text,text,text);
create function public.complete_jarvis_pushover_delivery(p_event_id uuid, p_token text, p_status text, p_receipt text, p_error text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_status not in ('sent', 'failed') then raise exception 'invalid Pushover status'; end if;

  update public.jarvis_tradingview_events e
  set pushover_status = p_status,
      pushover_receipt = case when p_status = 'sent' then p_receipt else null end,
      pushover_sent_at = case when p_status = 'sent' then now() else null end,
      pushover_error = case when p_status = 'failed' then left(coalesce(p_error, 'Delivery failed.'), 500) else null end
  from public.jarvis_webhook_tokens token
  where e.id = p_event_id
    and token.id = e.webhook_token_id
    and token.is_active = true
    and token.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and e.pushover_status = 'pending';
end;
$$;

drop function if exists public.process_jarvis_tradingview_event(uuid);
create or replace function public.process_jarvis_tradingview_event(p_event_id uuid, p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  event_row public.jarvis_tradingview_events%rowtype;
  preferred_name text;
  raw_break_count integer;
  notification_key text;
begin
  select e.* into event_row
  from public.jarvis_tradingview_events e
  join public.jarvis_webhook_tokens token on token.id = e.webhook_token_id
  where e.id = p_event_id
    and token.is_active = true
    and token.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update of e;
  if event_row.id is null or event_row.processing_status <> 'received' then return; end if;

  if event_row.bullish_break_count >= 3 or event_row.bearish_break_count >= 3 then
    raw_break_count := greatest(event_row.bullish_break_count, event_row.bearish_break_count);
    select display_name into preferred_name from public.jarvis_webhook_tokens where id = event_row.webhook_token_id;
    notification_key := encode(extensions.digest(concat_ws('|', event_row.ticker, event_row.timeframe, raw_break_count::text, event_row.event_timestamp::text, coalesce(event_row.candle::text, '')), 'sha256'), 'hex');

    insert into public.jarvis_pair_state (user_id, ticker, timeframe, status, event, price, mrh, mrl, bullish_break_count, bearish_break_count, last_candle_timestamp, last_event_id, updated_at)
    values (event_row.user_id, event_row.ticker, event_row.timeframe, 'WATCH', event_row.event, event_row.price, event_row.mrh, event_row.mrl, event_row.bullish_break_count, event_row.bearish_break_count, event_row.event_timestamp, event_row.id, now())
    on conflict (user_id, ticker, timeframe) do update set status = 'WATCH', event = excluded.event, price = excluded.price, mrh = excluded.mrh, mrl = excluded.mrl, bullish_break_count = excluded.bullish_break_count, bearish_break_count = excluded.bearish_break_count, last_candle_timestamp = excluded.last_candle_timestamp, last_event_id = excluded.last_event_id, updated_at = now();

    insert into public.jarvis_notifications (user_id, event_id, ticker, timeframe, break_count, candle_timestamp, dedupe_key, message)
    values (event_row.user_id, event_row.id, event_row.ticker, event_row.timeframe, raw_break_count, event_row.event_timestamp, notification_key, concat(coalesce(nullif(preferred_name, ''), 'Trader'), ', ', event_row.ticker, ' now has ', raw_break_count, ' raw structural breaks. Reversal/Internal watch. No entry yet.'))
    on conflict (user_id, dedupe_key) do nothing;
  end if;

  update public.jarvis_tradingview_events set processing_status = 'processed', processing_error = null, processed_at = now() where id = event_row.id;
exception when others then
  update public.jarvis_tradingview_events set processing_status = 'error', processing_error = left(sqlerrm, 500), processed_at = now() where id = p_event_id;
end;
$$;

revoke all on function public.ingest_jarvis_tradingview_event(text,text,text,text,timestamptz,numeric,numeric,numeric,integer,integer,jsonb,jsonb,text) from public;
grant execute on function public.ingest_jarvis_tradingview_event(text,text,text,text,timestamptz,numeric,numeric,numeric,integer,integer,jsonb,jsonb,text) to anon, authenticated;
revoke all on function public.process_jarvis_tradingview_event(uuid,text) from public;
grant execute on function public.process_jarvis_tradingview_event(uuid,text) to anon, authenticated;
revoke all on function public.claim_jarvis_pushover_delivery(uuid,text) from public;
grant execute on function public.claim_jarvis_pushover_delivery(uuid,text) to anon, authenticated;
revoke all on function public.complete_jarvis_pushover_delivery(uuid,text,text,text,text) from public;
grant execute on function public.complete_jarvis_pushover_delivery(uuid,text,text,text,text) to anon, authenticated;

notify pgrst, 'reload schema';

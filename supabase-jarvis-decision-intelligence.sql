-- Jarvis Decision Intelligence v1
-- Run once in the Supabase SQL editor. This creates an auditable, per-user
-- event ledger linking observations, assessments, decisions, and outcomes.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.jarvis_decision_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_key text not null check (char_length(case_key) between 3 and 180),
  state text not null default 'open' check (state in ('open', 'resolved', 'archived')),
  pair text,
  setup text,
  direction text,
  source_type text not null default 'conversation' check (source_type in ('conversation', 'chart', 'forecast', 'trade', 'backtest', 'tradingview')),
  related_trade_id text,
  related_forecast_id text,
  related_backtest_id text,
  context jsonb not null default '{}'::jsonb,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, case_key)
);

create table if not exists public.jarvis_decision_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.jarvis_decision_cases(id) on delete cascade,
  event_type text not null check (event_type in ('observation', 'question', 'assessment', 'recommendation', 'user_decision', 'execution', 'outcome', 'reflection', 'correction')),
  topic text,
  summary text not null default '' check (char_length(summary) <= 2000),
  decision text,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 100)),
  evidence jsonb not null default '{}'::jsonb,
  source text not null default 'jarvis',
  model text,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 180),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists jarvis_decision_cases_user_updated_idx on public.jarvis_decision_cases (user_id, updated_at desc);
create index if not exists jarvis_decision_cases_user_pair_idx on public.jarvis_decision_cases (user_id, pair, setup, updated_at desc);
create index if not exists jarvis_decision_events_case_time_idx on public.jarvis_decision_events (case_id, occurred_at, id);
create index if not exists jarvis_decision_events_user_type_idx on public.jarvis_decision_events (user_id, event_type, occurred_at desc);

alter table public.jarvis_decision_cases enable row level security;
alter table public.jarvis_decision_events enable row level security;

revoke all on public.jarvis_decision_cases, public.jarvis_decision_events from anon;
grant select, insert, update, delete on public.jarvis_decision_cases, public.jarvis_decision_events to authenticated;

drop policy if exists "Users manage their own Jarvis decision cases" on public.jarvis_decision_cases;
create policy "Users manage their own Jarvis decision cases" on public.jarvis_decision_cases
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own Jarvis decision events" on public.jarvis_decision_events;
create policy "Users manage their own Jarvis decision events" on public.jarvis_decision_events
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.record_jarvis_decision_event(
  p_case_key text,
  p_event_type text,
  p_topic text default null,
  p_summary text default '',
  p_decision text default null,
  p_confidence numeric default null,
  p_evidence jsonb default '{}'::jsonb,
  p_source text default 'jarvis',
  p_model text default null,
  p_idempotency_key text default null,
  p_pair text default null,
  p_setup text default null,
  p_direction text default null,
  p_source_type text default 'conversation',
  p_related_trade_id text default null,
  p_related_forecast_id text default null,
  p_related_backtest_id text default null,
  p_context jsonb default '{}'::jsonb
) returns table(case_id uuid, event_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  selected_case_id uuid;
  selected_event_id uuid;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if p_event_type not in ('observation', 'question', 'assessment', 'recommendation', 'user_decision', 'execution', 'outcome', 'reflection', 'correction') then
    raise exception 'Unsupported Jarvis decision event type';
  end if;

  insert into public.jarvis_decision_cases (
    user_id, case_key, pair, setup, direction, source_type,
    related_trade_id, related_forecast_id, related_backtest_id, context
  ) values (
    actor_id, left(p_case_key, 180), nullif(p_pair, ''), nullif(p_setup, ''), nullif(p_direction, ''), p_source_type,
    nullif(p_related_trade_id, ''), nullif(p_related_forecast_id, ''), nullif(p_related_backtest_id, ''), coalesce(p_context, '{}'::jsonb)
  )
  on conflict (user_id, case_key) do update set
    pair = coalesce(excluded.pair, jarvis_decision_cases.pair),
    setup = coalesce(excluded.setup, jarvis_decision_cases.setup),
    direction = coalesce(excluded.direction, jarvis_decision_cases.direction),
    source_type = case when excluded.source_type = 'conversation' then jarvis_decision_cases.source_type else excluded.source_type end,
    related_trade_id = coalesce(excluded.related_trade_id, jarvis_decision_cases.related_trade_id),
    related_forecast_id = coalesce(excluded.related_forecast_id, jarvis_decision_cases.related_forecast_id),
    related_backtest_id = coalesce(excluded.related_backtest_id, jarvis_decision_cases.related_backtest_id),
    context = jarvis_decision_cases.context || excluded.context,
    updated_at = now()
  returning id into selected_case_id;

  insert into public.jarvis_decision_events (
    user_id, case_id, event_type, topic, summary, decision, confidence,
    evidence, source, model, idempotency_key, occurred_at
  ) values (
    actor_id, selected_case_id, p_event_type, nullif(p_topic, ''), left(coalesce(p_summary, ''), 2000),
    nullif(p_decision, ''), p_confidence, coalesce(p_evidence, '{}'::jsonb), coalesce(nullif(p_source, ''), 'jarvis'),
    nullif(p_model, ''), coalesce(nullif(p_idempotency_key, ''), gen_random_uuid()::text), now()
  )
  on conflict (user_id, idempotency_key) do update set idempotency_key = excluded.idempotency_key
  returning id into selected_event_id;

  return query select selected_case_id, selected_event_id;
end;
$$;

revoke all on function public.record_jarvis_decision_event(text,text,text,text,text,numeric,jsonb,text,text,text,text,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.record_jarvis_decision_event(text,text,text,text,text,numeric,jsonb,text,text,text,text,text,text,text,text,text,text,jsonb) to authenticated;

notify pgrst, 'reload schema';

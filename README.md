# Journaly OS

Premium trading journal for FX execution review.

## Stack

- Vite
- React
- TypeScript
- Lucide React icons
- LocalStorage persistence for immediate offline use
- Local signup/login with per-user journal storage
- Screenshot upload stored with each trade
- Light and dark themes

## Trade Fields

- Date and time
- Pair: AUDUSD, EURUSD, EURJPY, AUDJPY, GBPUSD, NZDJPY, EURAUD
- Setup: REVERSAL, Internal reversal, Liquidity sweep, Break and retest, Flag, Flag+, EU timed entry
- Direction: Long or Short
- MAE, starting at 0
- PnL in R, starting at 0
- Result: Win, Loss, or Breakeven
- Notes and screenshot

## Run Locally

PowerShell may block the `npm.ps1` shim on this machine, so use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
```

Build for production:

```powershell
npm.cmd run build
```

## Future Supabase Schema

Auth should move to Supabase Auth before production. The current local auth flow mirrors the expected shape by storing a user id and email in session state.

```sql
create table trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  trade_date date not null,
  trade_time time not null,
  pair text not null,
  setup text not null,
  direction text not null,
  mae numeric default 0,
  pnl_r numeric default 0,
  result text not null,
  notes text,
  screenshot_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

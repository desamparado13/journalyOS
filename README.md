# Journaly OS

Premium trading journal for FX execution review.

## Stack

- Vite
- React
- TypeScript
- Supabase Auth
- Supabase Postgres
- Lucide React icons
- Journaly V2 ZIP importer
- Journaly V2 backtesting ZIP importer
- Screenshot upload stored with each trade
- Light and dark themes

## Supabase Setup

The local app reads Supabase config from `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Run `supabase-schema.sql` once in the Supabase SQL editor to create the `trades`, `backtests`, and Journal tables plus row-level security policies. Then run `supabase-trade-decisions.sql` to create the Discipline log table, followed by `supabase-journal-entries.sql` to enable secure Journal links to Discipline entries.

If you already created the table before the importer existed, run the latest `supabase-schema.sql` again. It includes additive `alter table ... add column if not exists` statements for Journaly V2 import metadata.

If the app cannot load Discipline entries because `public.trade_decisions` is missing, run `supabase-trade-decisions.sql` against the Supabase project configured in `.env.local`. The script reloads the API schema cache when it finishes.

## Import Journaly V2 Trades

1. Sign in to Journaly OS.
2. Open **View trades**.
3. Use **Import Journaly V2** and select the ZIP export.

The trade importer reads `trades.json`, imports post-trade screenshots from `images/post-trade/`, normalizes old setup names, and skips duplicate rows using `source_app = Journaly V2` plus `legacy_id`.

## Backtesting Module

The Backtesting module includes:

- Analytics: total backtests, total R, win rate, profit factor, expectancy, max drawdown, average win, average loss
- Manual create/edit form
- Backtest trade list with screenshots and actions
- Filters for year, month, pair, setup, and result
- Journaly V2 backtesting ZIP import from `backtests.json` and `images/backtests/`

Run the latest `supabase-schema.sql` before using Backtesting. It creates the `backtests` table, row-level security policies, and a duplicate-safe import key.

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

## Notes

Screenshots are currently saved as data URLs in the `trades.screenshot_url` field. For production, move screenshots to Supabase Storage and save the public or signed URL in this column.

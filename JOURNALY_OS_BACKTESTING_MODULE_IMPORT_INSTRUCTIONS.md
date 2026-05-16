# Journaly OS Codex Backtesting Module And Import Instructions

Use this file to build the Journaly OS Backtesting module and import Journaly V2 backtesting exports.

## Source Export

The Journaly V2 backtesting export ZIP is generated from:

```text
public/backtesting/index.php?export=journaly_backtests_zip
```

The ZIP contains:

```text
backtests.json
README.md
images/backtests/*
```

## Import Goal

Build a Journaly OS Backtesting module that can store, view, analyze, and import historical backtest trades from Journaly V2.

The importer must:

1. Accept the Journaly V2 backtesting ZIP.
2. Extract and parse `backtests.json`.
3. Create one backtest trade per item in `backtests`.
4. Import screenshots from `images/backtests/`.
5. Avoid duplicate imports with `legacy_id`.
6. Show an import summary.

## Backtesting Module Requirements

Journaly OS should include these areas:

```text
Backtesting Dashboard
Backtest Trade List
Backtest Create/Edit Form
Backtest Screenshot Viewer
Backtest Import/Migration Page
Backtest Analytics
```

Recommended navigation:

```text
Journaly OS
  -> Backtesting
      -> Analytics
      -> Trades
      -> Import
```

## Data Model

Create a backtest trades table/model with fields equivalent to:

```text
id
user_id
trade_date
trade_time
pair
setup_type
direction
duration_minutes
stop_loss_pips
mae_pips
pnl_r
result
notes
scale_in
screenshot_path or screenshot_media_id
source_app
legacy_id
created_at
updated_at
```

Recommended unique key for imported data:

```text
(user_id, source_app, legacy_id)
```

Use:

```text
source_app = "Journaly V2"
legacy_id = backtest.legacy_id
```

## JSON Shape

`backtests.json` has this structure:

```json
{
  "schema": "journaly_v2.backtest_export",
  "schema_version": 1,
  "exported_at": "2026-05-16T00:00:00+08:00",
  "source_app": "Journaly V2",
  "source_user": {
    "id": 1,
    "name": "User Name",
    "email": "user@example.com"
  },
  "counts": {
    "backtests": 10,
    "screenshots_included": 8,
    "screenshots_missing": 0
  },
  "backtests": []
}
```

Each backtest item looks like:

```json
{
  "legacy_id": 123,
  "trade_date": "2026-03-24",
  "trade_time": "05:00:00",
  "pair": "EURUSD",
  "setup_type": "Break and Retest",
  "direction": "Long",
  "duration_minutes": 120,
  "stop_loss_pips": 12.5,
  "mae_pips": 4.2,
  "pnl_r": 1.75,
  "result": "Win",
  "notes": "Backtest notes",
  "scale_in": "No",
  "screenshot": {
    "original_path": "uploads/backtests/backtest_20260403_034622_6c8faa0bb21d.png",
    "archive_path": "images/backtests/123-backtest_20260403_034622_6c8faa0bb21d.png",
    "filename": "123-backtest_20260403_034622_6c8faa0bb21d.png"
  },
  "created_at": "2026-04-03 03:46:22"
}
```

`screenshot` can be `null`.

If the old screenshot path existed but the file was missing during export:

```json
{
  "original_path": "uploads/backtests/missing.png",
  "archive_path": null,
  "filename": null,
  "missing": true
}
```

## Field Mapping

Map these directly:

```text
legacy_id          -> journaly_v2_legacy_id or migration_legacy_id
trade_date         -> backtest trade date
trade_time         -> backtest trade time
pair               -> pair / symbol
setup_type         -> setup
direction          -> direction
duration_minutes   -> duration minutes
stop_loss_pips     -> stop loss pips
mae_pips           -> MAE pips
pnl_r              -> PnL in R
result             -> result
notes              -> notes
scale_in           -> scale-in label/value
created_at         -> created timestamp
```

## Screenshot Import

For each backtest:

1. Check `screenshot.archive_path`.
2. If it is non-empty, read that file from the ZIP.
3. Store it in Journaly OS media/storage.
4. Save the new media ID or storage path on the backtest trade.
5. Keep `screenshot.original_path` only as audit metadata.

Recommended imported media metadata:

```text
source_app: Journaly V2
source_type: backtest_screenshot
legacy_backtest_id: backtest.legacy_id
original_path: screenshot.original_path
archive_path: screenshot.archive_path
```

## Required UI Components

### Backtesting Dashboard

Show:

```text
Total backtests
Total R
Win rate
Profit factor
Expectancy R
Max drawdown R
Average win
Average loss
```

### Backtest Trade List

Columns:

```text
Date
Time
Pair
Setup
Direction
Stop Loss Pips
MAE Pips
PnL R
Result
Scale In
Screenshot
Actions
```

Filters:

```text
Year
Month
Pair
Setup
Result
```

### Backtest Create/Edit Form

Fields:

```text
Date
Time or hour
Pair
Setup
Direction
Duration
Stop loss pips
MAE pips
PnL R
Result, or derive from PnL R
Notes
Scale in
Screenshot upload
```

### Import Page

Allow:

```text
Upload Journaly V2 backtesting ZIP
Validate package
Preview counts
Run import
Show summary
Download error report if needed
```

## Duplicate Safety

The import must be idempotent.

Before creating a backtest, check:

```text
user_id = current user
source_app = "Journaly V2"
legacy_id = backtest.legacy_id
```

If it already exists, skip it by default.

## Validation Rules

Before import:

1. Confirm `schema` equals `journaly_v2.backtest_export`.
2. Confirm `schema_version` is `1`.
3. Confirm `backtests` is an array.
4. Confirm required fields exist: `legacy_id`, `trade_date`, `pair`, `setup_type`, `direction`, `pnl_r`, `result`.

For each screenshot:

1. If `screenshot.archive_path` exists, confirm the file exists inside the ZIP.
2. If missing, import the backtest without the image and log a warning.

## Result Summary

After import, show:

```text
Backtests in export
Backtests imported
Backtests skipped as duplicates
Screenshots imported
Screenshots missing
Failed rows
```

Compare imported counts against:

```text
counts.backtests
counts.screenshots_included
```

## Suggested Pseudocode

```text
open uploaded ZIP
read backtests.json
validate schema and schema_version

for each backtest in payload.backtests:
    if backtest exists for user with source_app Journaly V2 and legacy_id:
        skipped += 1
        continue

    screenshotRef = null
    if backtest.screenshot.archive_path:
        if ZIP contains backtest.screenshot.archive_path:
            screenshotRef = store screenshot from ZIP
            screenshotsImported += 1
        else:
            missingScreenshots += 1

    create backtest trade with mapped fields
    attach screenshotRef if available
    save source_app = Journaly V2
    save legacy_id = backtest.legacy_id
    imported += 1

return import summary
```

## Analytics Notes

Journaly OS can compute analytics from imported rows:

```text
total_r = sum(pnl_r)
win_rate = wins / total rows
expectancy = (win rate * average win R) - (loss rate * average loss R)
profit_factor = sum wins R / abs(sum losses R)
max_drawdown_r = largest peak-to-trough drawdown on cumulative R
win/loss streaks = consecutive pnl_r > 0 or pnl_r < 0
```

Sort analytics chronologically by:

```text
trade_date ASC, trade_time ASC, legacy_id ASC
```

## Notes

- `pnl_r` is already numeric R-multiple data.
- `trade_time` may be `HH:MM` or `HH:MM:SS`; normalize to Journaly OS format.
- Keep old `created_at` when possible.
- Do not use old image paths after import; store the files in Journaly OS storage.

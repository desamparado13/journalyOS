# Journaly OS Codex Import Instructions

Use this file to implement a Journaly V2 trade migration importer in Journaly OS.

## Source Export

The Journaly V2 export ZIP is generated from:

```text
public/trades/index.php?export=journaly_trades_zip
```

The ZIP contains:

```text
trades.json
README.md
images/post-trade/*
```

Only post-trade screenshots are included. Trade board captures / pre-trade board images are intentionally excluded.

## Import Goal

Import all Journaly V2 trades into Journaly OS seamlessly, including post-trade screenshots.

The importer must:

1. Accept the ZIP file.
2. Extract and parse `trades.json`.
3. Create one Journaly OS trade per item in `trades`.
4. Import post-trade screenshots from `images/post-trade/`.
5. Avoid duplicate imports by using `legacy_id`.
6. Report imported, skipped, missing-image, and failed counts.

## JSON Shape

`trades.json` has this structure:

```json
{
  "schema": "journaly_v2.trade_export",
  "schema_version": 1,
  "exported_at": "2026-05-16T00:00:00+08:00",
  "source_app": "Journaly V2",
  "source_user": {
    "id": 1,
    "name": "User Name",
    "email": "user@example.com"
  },
  "counts": {
    "trades": 10,
    "post_images_included": 8,
    "post_images_missing": 0
  },
  "excluded_fields": ["board_capture_path"],
  "trades": []
}
```

Each trade item looks like:

```json
{
  "legacy_id": 123,
  "trade_date": "2026-03-24",
  "trade_time": "05:32:00",
  "pair": "EURUSD",
  "setup_type": "Breakout",
  "direction": "Long",
  "duration_minutes": 45,
  "stop_loss_pips": 12.5,
  "mae_pips": 4.2,
  "pnl_r": 1.75,
  "result": "Win",
  "notes": "Trade notes",
  "post_image": {
    "original_path": "uploads/backtests/trade_20260407_043013_293203.png",
    "archive_path": "images/post-trade/123-trade_20260407_043013_293203.png",
    "filename": "123-trade_20260407_043013_293203.png"
  },
  "finalized_at": "2026-04-07 04:30:13",
  "created_at": "2026-04-07 04:25:00"
}
```

`post_image` can be `null` when no post-trade screenshot exists.

If an old screenshot path existed but the file was missing during export, `post_image` may be:

```json
{
  "original_path": "uploads/backtests/missing.png",
  "archive_path": null,
  "filename": null,
  "missing": true
}
```

## Field Mapping

Map these directly where Journaly OS has equivalent fields:

```text
legacy_id          -> journaly_v2_legacy_id or migration_legacy_id
trade_date         -> trade date
trade_time         -> trade time
pair               -> pair / symbol
setup_type         -> setup
direction          -> direction
duration_minutes   -> duration minutes
stop_loss_pips     -> stop loss pips
mae_pips           -> MAE pips
pnl_r              -> PnL in R
result             -> result
notes              -> notes
finalized_at       -> finalized timestamp
created_at         -> created timestamp
```

Do not import `board_capture_path`; it is intentionally excluded.

## Image Import

For each trade:

1. Check `post_image.archive_path`.
2. If it is non-empty, read that file from the ZIP.
3. Store it in Journaly OS media/storage as a post-trade screenshot.
4. Save the new Journaly OS storage path or media ID on the imported trade.
5. Keep `post_image.original_path` only as audit metadata, not as a live URL.

Recommended imported media metadata:

```text
source_app: Journaly V2
source_type: trade_post_image
legacy_trade_id: trade.legacy_id
original_path: post_image.original_path
archive_path: post_image.archive_path
```

## Duplicate Safety

The import must be idempotent.

Before creating a trade, check whether a Journaly OS trade already exists with:

```text
source_app = Journaly V2
legacy_id = trade.legacy_id
```

If it exists, skip it or update it according to Journaly OS migration policy. Default behavior should be skip.

Recommended unique key:

```text
(source_app, legacy_id)
```

Use:

```text
source_app = "Journaly V2"
legacy_id = trade.legacy_id
```

## Validation Rules

Before import:

1. Confirm `schema` equals `journaly_v2.trade_export`.
2. Confirm `schema_version` is `1`.
3. Confirm `trades` is an array.
4. Confirm required fields exist: `legacy_id`, `trade_date`, `trade_time`, `pair`, `setup_type`, `direction`, `pnl_r`, `result`.

For each post image:

1. If `post_image.archive_path` is present, ensure that file exists inside the ZIP.
2. If the file is missing, import the trade without the image and log a missing-image warning.

## Result Summary

After import, show:

```text
Trades in export
Trades imported
Trades skipped as duplicates
Post images imported
Post images missing
Failed rows
```

Also compare against `counts.trades` and `counts.post_images_included` from `trades.json`.

## Suggested Pseudocode

```text
open uploaded ZIP
read trades.json
validate schema and schema_version

for each trade in payload.trades:
    if trade with source_app Journaly V2 and legacy_id exists:
        skipped += 1
        continue

    imageRef = null
    if trade.post_image.archive_path:
        if ZIP contains trade.post_image.archive_path:
            imageRef = store image from ZIP as post-trade screenshot
            imagesImported += 1
        else:
            missingImages += 1

    create trade with mapped fields
    attach imageRef if available
    save source_app = Journaly V2
    save legacy_id = trade.legacy_id
    imported += 1

return import summary
```

## Notes

- `pnl_r` is already numeric R-multiple data.
- `result` values are usually `Win`, `Loss`, `Breakeven`, or running-state values depending on old data.
- `trade_time` may be `HH:MM` or `HH:MM:SS`; normalize to the Journaly OS preferred format.
- Keep original timestamps when possible.
- Do not rely on old file paths after import.

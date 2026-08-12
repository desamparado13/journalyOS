# Jarvis Historical Chart Audit v0.3

Independent second-pass vision audit completed on 2026-08-12.

## Coverage

- 54 source image records
- 53 unique screenshot files
- 5 Flag
- 9 Break and Retest
- 7 Liquidity Sweep
- 27 Internal Reversal
- 5 unique Reversal screenshots

The four archives whose names end in `(1)` contain byte-identical image files to their matching non-`(1)` archives and were excluded from the second pass.

## Label check

- Confirmed: 6
- Plausible: 34
- Questionable: 12
- Unclear: 1

## Visible technical grade

- Good: 7
- Mid: 36
- Bad: 9
- Unclear: 1

Grades describe only the setup/execution evidence visible in each screenshot. They do not use or infer P/L.

## Metadata conflict

One identical screenshot appears under two incompatible records:

- `018-2026-04-06-08-05-audjpy-internal-reversal-5500ffab.png`
- `004-2026-04-06-07-26-audusd-reversal-3cd1f7cc.png`

The pixels are identical while pair, time, and setup labels differ. Jarvis must treat this record as conflicted metadata, never as two independent examples or as reliable evidence for either label.

## Evidence policy

The filenames supplied historical labels but no previous written analysis. Jarvis therefore performed a new visual review rather than claiming to remember an unavailable prior review. Individual results are stored in `reference_images_analysis.json` and are retrieved only when relevant to the authenticated owner's question.

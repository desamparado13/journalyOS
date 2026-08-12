# Journaly OS Integration Guide

## Goal
Journaly OS is the source of truth. Jarvis is the intelligence layer. Jarvis should not rely on chat history alone.

## Minimum collections
1. strategy_rules
2. strategy_examples
3. trades
4. forecasts
5. post_trade_reviews
6. jarvis_pair_state

## Initial read-only tools
- get_strategy_rules()
- get_setup_examples(setup_type, tags)
- get_trade(trade_id)
- get_recent_trades(filters)
- get_active_forecasts()
- get_pair_state(pair)
- get_setup_statistics(setup_type, filters)
- get_account_risk()

## Later write tools
- create_forecast()
- update_forecast()
- classify_trade()
- add_trade_note()
- log_skipped_trade()
- attach_screenshot()

Keep actual broker execution separate until explicit safeguards are designed.

## Prompt assembly
For each Jarvis request, send:
1. permanent system prompt
2. relevant strategy rules
3. relevant labeled examples
4. current Journaly state
5. current chart/image if any
6. user's question

Do not send the entire database every time. Retrieve only relevant context.

## Similar-example retrieval
Match examples by setup family, JPY/non-JPY, trend state, liquidity-box context, line-break count/quality, trigger quality, and good/bad decision label.

## Live pair state
Suggested fields:
- pair
- timeframe
- PPA
- market_state
- MRH
- MRL
- line_break_count
- line_break_quality
- liquidity_box
- momentum
- setup_watch
- status
- forecast_note

## MRH/MRL engine
Eventually port the user's MRH/MRL Tracker v2 logic server-side.

Important behavior:
- pivot high/low initialization with left=1, right=1
- inside if high <= MRH and low >= MRL, excluding anchor candles
- breakUp if high > MRH
- breakDn if low < MRL
- no close requirement
- objective structure should be calculated by code
- Jarvis interprets discretionary context/quality

## Forecast lifecycle
FORECAST -> WATCH / ARMED -> CONFIRMED -> TAKEN or SKIPPED -> INVALIDATED / CLOSED

Store timestamps for each transition.

## Post-trade review
Store setup quality, execution quality, management quality, outcome, mistakes, rule version, screenshots, MAE, MFE, and realized R separately.

## Voice
Once text Jarvis is stable, connect the same backend tools to OpenAI Realtime. Voice and text should share exactly the same Journaly state and knowledge.

## Rollout
v0.1 - reads strategy + Journaly
v0.2 - post-trade reviews
v0.3 - labeled-example retrieval
v0.4 - persistent pair state
v0.5 - live market / TradingView events
v0.6 - voice
v1.0 - full trading assistant

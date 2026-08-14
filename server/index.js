import { JARVIS_BACKTEST_ANALYSES, JARVIS_BACKTEST_AUDIT_SUMMARY, JARVIS_OWNER_KNOWLEDGE, JARVIS_REFERENCE_ANALYSES, JARVIS_REFERENCE_SUMMARY, JARVIS_STRATEGY_RULES, JARVIS_SYSTEM_PROMPT } from "./jarvis-knowledge.js";

const FALLBACK_MODELS = ["gpt-5.6-luna", "gpt-4.1-mini"];
const MAX_QUESTION_LENGTH = 6000;
const MAX_HISTORY_MESSAGES = 16;
const MAX_CHART_IMAGE_LENGTH = 8_000_000;
const OWNER_EMAIL = "christian.angelo.desamparado@gmail.com";
const OWNER_USERNAME = "christian.angelo.desamparado";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";
const VERCEL_GATEWAY_ENDPOINT = "https://ai-gateway.vercel.sh/v1/responses";
const AI_TIMEOUT_MS = 45_000;
const MAX_TOOL_ROUNDS = 3;
const JARVIS_LEARNING_PREFIX = "[[JARVIS_LEARNING_V1]]";
const JARVIS_FORECAST_REVIEW_PREFIX = "[[JARVIS_FORECAST_REVIEW_V1]]";
const JARVIS_FEEDBACK_PREFIX = "[[JARVIS_FEEDBACK_V1]]";
const JARVIS_MEMORY_SYNC_PREFIX = "[[JARVIS_MEMORY_SYNC_V1]]";
const JARVIS_SESSION_SYNC_PREFIX = "[[JARVIS_SESSION_SYNC_V1]]";
const JARVIS_CHAT_SYNC_PREFIX = "[[JARVIS_CHAT_SYNC_V1]]";
const JARVIS_WORKSPACE_PREFIX = "[[JARVIS_WORKSPACE_V1]]";
const JARVIS_JOURNEY_PREFIX = "[[JARVIS_JOURNEY_V1]]";
const JARVIS_CHART_PREFIX = "[[JARVIS_CHART_V1]]";
const JARVIS_ROUTINE_PREFIX = "[[JARVIS_ROUTINE_V1]]";
const JOURNALY_MONTHLY_PREFIX = "[[JOURNALY_MONTHLY:";
const JARVIS_TRADE_WRITE_INSTRUCTIONS = `
JOURNALY TRADE ACTIONS
- You may prepare a new Journaly live-trade draft when the user clearly says they are taking, entering, logging, or adding a trade.
- Journaly's current new-trade fields are only: date, time, pair, setup, direction, stopLossPips, MAE, PnL in R, result, and notes.
- Never ask for fields outside that list. In particular, do not ask for maximum holding days, broker order details, or other invented fields.
- Required conversational details are pair, setup, and direction. Ask naturally for only the missing items. Date and time default to now; MAE and PnL default to 0; result defaults to Breakeven. Stop-loss pips and notes are optional.
- Supported pairs: AUDUSD, EURUSD, EURJPY, AUDJPY, GBPUSD, NZDJPY, EURAUD. Treat AJ as AUDJPY, AU as AUDUSD, EU as EURUSD, EJ as EURJPY, GU as GBPUSD, NJ as NZDJPY, and EA as EURAUD when context is unambiguous.
- Supported setups: REVERSAL, Internal reversal, Liquidity sweep, Break and retest, Flag, Flag+, EU timed entry.
- A stop stated as an absolute price is not stopLossPips; preserve it in notes unless the user also gives the pip distance.
- Return tradeAction.intent=draft while required details are missing, with missingFields listing only pair, setup, or direction. Return intent=ready once those three fields are known.
- Never claim a trade was saved. Journaly will show a confirmation card and only the authenticated client can insert it after explicit confirmation.
- If the message is unrelated to creating a trade, return tradeAction as null.`;
const JARVIS_FORECAST_INSTRUCTIONS = `
JOURNALY FORECAST ACTIONS AND LEARNING
- Forecasts are the user's pre-trade ideas. Treat the complete authenticated forecast history as first-class evidence alongside live trades and backtests.
- Use get_forecasts whenever the user asks about past forecasts, forecast quality, recurring forecast patterns, or a specific idea that is not fully present in the current session summary.
- Status labels are Waiting, Taken, Invalidated, and Skipped. Waiting means unresolved; Taken means the idea became a trade; Invalidated means the market thesis failed; Skipped means the user chose not to execute it.
- You may prepare a forecast draft when the user asks to add or log one. Pair, setup, and direction are required; date and time default to now. The only free-form field is notes, where the user may manually combine the entry plan, reasoning, invalidation context, or anything else. Notes are optional.
- You may prepare a status update when the user clearly asks to mark a forecast Taken, Invalidated, Skipped, or Waiting. Identify the exact forecast id from get_forecasts; if multiple records could match, ask which one instead of guessing.
- Return forecastAction.intent=create or update_status only when the user is asking for a forecast write. Use ready=false while required details or an unambiguous forecast id are missing.
- Never claim a forecast was saved or updated. Journaly shows a confirmation card, and only the authenticated client writes after explicit confirmation.
- Learn from forecast outcomes conservatively: compare thesis, setup, direction, status, and documented outcome across records. Distinguish recurring evidence from one-off anecdotes and never invent missing text.`;
const JARVIS_ANALYTICS_INSTRUCTIONS = `
JOURNALY NUMERIC ACCURACY
- Never calculate totals, counts, rankings, win rates, expectancy, or best/worst periods yourself from a list of records.
- For any live monthly total, monthly comparison, best month, worst month, or year-by-month ranking, you must call get_monthly_performance and copy its verified values exactly.
- For all other numeric Journaly questions, call the matching statistics or inventory tool. Never infer a count from the chat context.
- For forecast-review counts, directional accuracy, execution counts, or learned patterns, always call get_forecast_learning. Copy its numerators, denominators, percentages, and evidence stage exactly; interpret them but never recalculate them.
- For any question comparing live execution with replay/backtests for a calendar month, including why performance diverged or whether the user followed the system, always call get_monthly_reconciliation. Treat its metrics, matches, and breakdowns as authoritative. Describe causal explanations only at the evidence level returned: observed, supported, or hypothesis requiring review.
- For any Trade Archive tab or Edge Lab question—including Analytics, Trades, Images, Calendar, Heatmap, Week Edge, Performance, Yearly, Edge Clock, or Session Edge—call get_archive_view with the matching view. Never approximate a tab from recent records.
- Treat tool statistics as authoritative. If a screenshot conflicts with tool data, state the conflict without inventing a reconciliation.`;
const JARVIS_EVIDENCE_INSTRUCTIONS = `
JARVIS CHART TRUST CONTRACT
- When a chart image is attached, chartAssessment is mandatory. When there is no chart image, chartAssessment must be null.
- Describe only evidence visible in the attached image. Never invent an entry marker, structure line, timeframe, session window, higher-timeframe context, or unseen candle.
- When PREVIOUS CHART and CURRENT CHART are both supplied, compare only changes visibly supported by both images. Do not assume identical timeframe, zoom, scale, or annotations when they are not visibly consistent. Center the opinion on what changed and whether that change affects the user's documented trade or forecast plan.
- Never mention historical resemblance or a historical edge in the prose answer. Journaly's deterministic matcher appends verified historical records after your analysis.
- Without a current chart, every question about a resembling case, recurring pattern, or historical example must call find_historical_patterns. Never manufacture a resemblance from memory.
- Keep confidence and opinion separate. Confidence measures how much of the setup can be verified; the decision is Jarvis's opinion from what is available.
- Missing evidence is not negative evidence. It lowers confidence and should usually lead to WATCH, not a refusal to form an opinion. Say naturally what would resolve it and acknowledge that the user may have confirmed it outside the screenshot.
- A visibly failed mandatory strategy condition may justify SKIP or INVALIDATED. A mandatory condition that is merely outside the screenshot is unknown, not failed.
- TAKE requires every mandatory setup component to be visibly supported. Otherwise, prefer WATCH when the idea remains plausible and SKIP only when visible evidence conflicts with the playbook.
- For Flag+, higher-timeframe alignment must be visible. For EU timed entry, the session window must be visible. Do not infer either from the user's label.`;
const JARVIS_CONVERSATION_INSTRUCTIONS = `
JARVIS CONVERSATION RELEVANCE
- Act like a natural, attentive friend as well as a trading assistant. Match the topic and emotional weight of the user's latest message.
- For greetings, check-ins, jokes, or ordinary conversation, respond socially and concisely. Do not volunteer a currency pair, setup, trade, forecast, market stance, statistic, or stale session explanation unless the user asks or it is directly necessary.
- The latest user message controls the topic. A pair or setup mentioned in earlier conversation is not automatically current.
- Treat sessionState.activePair, activeSetup, activeTradeId, and activeBacktestId as current only when they are non-null. Never reconstruct missing active context from recent history or the latest record in a tool result.
- When interactionMode is active_trade_management, the user is discussing a position they have already entered. Respond as a trading partner managing an existing position, not as if deciding whether to enter it. Do not lead with TAKE, WATCH, or SKIP and do not tell the user to wait for an entry trigger that has already occurred.
- Use activeTrade as the current saved trade when it is present. If exact record details matter and activeTradeId is available, call get_trade. Do not create a duplicate tradeAction merely because the user says they are already in an existing trade.
- In active-trade management, assess what is visible now, acknowledge the user's management plan, identify the clearest condition that would support holding or reducing risk, and clearly separate observed chart evidence from anything not visible.
- Treat conversationMode as the current conversational job. Stay inside that job unless the user's latest message clearly changes it.
- Reason internally as Observed -> Opinion -> Suggestion: first separate verified facts from inference, then form an honest opinion, then offer the most useful next thought. Write this as natural conversation; do not force those labels or turn every reply into a report.
- Ask a follow-up only when the missing answer would materially change the guidance. Otherwise make the best supported inference and state uncertainty naturally.
- Use relevantMemories selectively. Never force an unrelated memory into the conversation just because it is available.
- Use styleExamples as tone feedback. Repeat qualities the user marked helpful and avoid the failure described by negative feedback, while never copying an old answer verbatim or allowing style feedback to override trading evidence.
- Forecast awareness is not market awareness. For an active forecast, remember its thesis, entry plan, direction, status, and the user's documented reasoning. Discuss whether the plan is complete or what evidence the user still needs, but never claim the present market confirmed or invalidated it without a current chart or authenticated TradingView evidence.
- When activeForecast is present, follow-ups such as "what about it?", "still valid?", or "what do you think now?" refer to that forecast unless the user names another pair or trade.
- In daily_routine mode, give a concise morning preparation or evening debrief using only Journaly forecasts, trades, execution reviews, goals, and memories. Explicitly avoid invented live-market commentary.
- For a morning or forecast briefing, call get_active_forecasts before answering. For an evening debrief, call get_recent_trades and get_forecasts when those records are relevant; keep numeric claims delegated to the deterministic statistics tools.
- An active forecast may remain available in session state, but do not bring it into unrelated casual conversation.
- Do not repeatedly reassure the user that old context is stale. Once context is absent, simply stop mentioning it.`;
const JARVIS_MEMORY_INSTRUCTIONS = `
JARVIS SELECTIVE MEMORY
- Create memoryUpdates only for durable information that will still be useful in future conversations: an explicit preference, correction, personal term, stable risk or trading rule, recurring mistake acknowledged by the user, or meaningful long-term goal.
- Do not store current market conditions, one trade's temporary state, guesses about the user, casual emotions, greetings, or facts already present in authenticated records.
- A direct statement such as "remember this", "from now on", "I always", "I prefer", or a correction of Jarvis may use confidence 0.9-1.0. An inferred recurring preference must have repeated evidence and should remain below 0.85. Return no update when uncertain.
- When the user corrects a stored belief, replace or delete the conflicting memory rather than retaining both.
- Memory improves continuity; it never overrides visible chart evidence, authenticated Journaly data, or the user's latest instruction.`;
const JARVIS_SELF_REVIEW_INSTRUCTIONS = `
Before finalizing, silently verify that the answer matches the user's latest question, preserves the active forecast or trade context, separates observed facts from inference, avoids invented live-market awareness, and sounds like a concise trading partner rather than a compliance report. Correct the answer before returning it if any check fails. Do not narrate this checklist unless asked.`;
const MODEL_PRICING_PER_MILLION = {
  "gpt-5.6-luna": { input: 1, cachedInput: 0.1, cacheWrite: 1.25, output: 6 },
  "gpt-4.1-mini": { input: 0.4, cachedInput: 0.1, cacheWrite: 0.4, output: 1.6 },
};

const aiHealth = {
  provider: "OpenAI",
  configuredModel: null,
  apiConfigured: false,
  apiReachable: false,
  lastSuccessfulRequestAt: null,
  lastErrorCategory: null,
  lastHttpStatus: null,
  fallbackActive: false,
};

const JOURNALY_TOOLS = [
  { type: "function", name: "get_user_profile", description: "Get the authenticated user's Journaly profile. Use only when identity or preferences matter.", strict: true, parameters: { type: "object", additionalProperties: false, properties: {}, required: [] } },
  { type: "function", name: "get_user_memories", description: "Get durable memories stored for the authenticated user.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { category: { type: ["string", "null"] } }, required: ["category"] } },
  { type: "function", name: "get_learning_records", description: "Get lessons retained from prior Jarvis chart reviews, forecasts, and insights. Use only when the user explicitly asks what Jarvis learned, remembers from prior cases, or sees as a recurring lesson; never use for ordinary pair or current-chart checks.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { source: { type: ["string", "null"], enum: ["chart", "forecast", "skipped_trade", "insight", null] }, limit: { type: "integer", minimum: 1, maximum: 40 } }, required: ["source", "limit"] } },
  { type: "function", name: "get_strategy_rules", description: "Get Pot's current PPA-first strategy rules. Use for setup or decision reasoning, not casual conversation.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { setup: { type: ["string", "null"] } }, required: ["setup"] } },
  { type: "function", name: "get_setup_examples", description: "Get independently audited historical chart examples matching a setup or pair.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { setup: { type: ["string", "null"] }, pair: { type: ["string", "null"] }, limit: { type: "integer", minimum: 1, maximum: 8 } }, required: ["setup", "pair", "limit"] } },
  { type: "function", name: "get_trade", description: "Get one authenticated user's trade by id or the latest trade.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { id: { type: ["string", "null"] }, latest: { type: "boolean" } }, required: ["id", "latest"] } },
  { type: "function", name: "get_recent_trades", description: "Get real Journaly trades, optionally filtered by pair, setup, or calendar month (YYYY-MM).", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, month: { type: ["string", "null"] }, limit: { type: "integer", minimum: 1, maximum: 100 } }, required: ["pair", "setup", "month", "limit"] } },
  { type: "function", name: "get_recent_backtests", description: "Get backtest records only, with pair/setup/month filters. Results are historical tests and must never be described as live trades.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, month: { type: ["string", "null"] }, limit: { type: "integer", minimum: 1, maximum: 100 } }, required: ["pair", "setup", "month", "limit"] } },
  { type: "function", name: "get_backtest_statistics", description: "Calculate backtest-only win rate, R, expectancy, and sample size for an optional pair, setup, and month. Always label the output as backtest evidence.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, month: { type: ["string", "null"] } }, required: ["pair", "setup", "month"] } },
  { type: "function", name: "get_backtest_visual_audit", description: "Get independent visual-audit findings from 137 backtest screenshots, optionally filtered by pair, setup, visible quality grade, PPA alignment, or recorded outcome. Use for questions about chart quality, recurring visual mistakes, whether labels were supported, or patterns across audited backtest images—not ordinary numeric performance questions.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, grade: { type: ["string", "null"], enum: ["Good", "Mid", "Bad", null] }, ppaAlignment: { type: ["string", "null"], enum: ["aligned", "countertrend", "mixed", null] }, outcome: { type: ["string", "null"] }, limit: { type: "integer", minimum: 1, maximum: 30 } }, required: ["pair", "setup", "grade", "ppaAlignment", "outcome", "limit"] } },
  { type: "function", name: "compare_live_vs_backtest", description: "Compare live-trade and backtest performance using separately calculated sample sizes, win rates, total R, and expectancy. Use when the user asks whether backtests translate to live execution.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, month: { type: ["string", "null"] } }, required: ["pair", "setup", "month"] } },
  { type: "function", name: "get_active_forecasts", description: "Get active Journaly forecasts, optionally for one pair.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] } }, required: ["pair"] } },
  { type: "function", name: "get_forecasts", description: "Get the authenticated user's complete forecast history with optional pair, setup, status, and calendar-month filters. Use this to learn from forecast decisions and outcomes.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, status: { type: ["string", "null"], enum: ["Waiting", "Taken", "Invalidated", "Skipped", null] }, month: { type: ["string", "null"] }, limit: { type: "integer", minimum: 1, maximum: 500 } }, required: ["pair", "setup", "status", "month", "limit"] } },
  { type: "function", name: "get_forecast_learning", description: "Get durable automatic reviews and deterministic aggregate patterns from resolved forecasts. This is the only authority for numeric forecast-learning claims. Waiting forecasts are excluded and insights never alter strategy rules.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, month: { type: ["string", "null"] }, limit: { type: "integer", minimum: 1, maximum: 200 } }, required: ["pair", "setup", "month", "limit"] } },
  { type: "function", name: "get_monthly_reconciliation", description: "Authoritative month-end reconciliation of live trades against replay/backtests, forecasts, automatic forecast reviews, and journal evidence. Pass one month for a month review, or null plus a month count for a deterministic rolling comparison.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { month: { type: ["string", "null"], pattern: "^[0-9]{4}-[0-9]{2}$" }, months: { type: "integer", minimum: 1, maximum: 24 } }, required: ["month", "months"] } },
  { type: "function", name: "get_archive_view", description: "Full deterministic access to every Trade Archive and Edge Lab view. Select the exact view and optional filters; all totals, rankings, calendar cells, heatmaps, timing, sessions, and image inventory are computed by code.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { view: { type: "string", enum: ["analytics", "trades", "images", "calendar", "heatmap", "week_edge", "performance", "yearly", "forecast", "edge_clock", "session_edge"] }, source: { type: "string", enum: ["live", "backtest", "both"] }, pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, direction: { type: ["string", "null"], enum: ["Long", "Short", null] }, quality: { type: ["string", "null"], enum: ["Good", "Mid", "Bad", "Unrated", null] }, month: { type: ["string", "null"] }, year: { type: ["integer", "null"], minimum: 2000, maximum: 2100 }, period: { type: ["string", "null"], enum: ["AM", "PM", null] }, limit: { type: "integer", minimum: 1, maximum: 500 } }, required: ["view", "source", "pair", "setup", "direction", "quality", "month", "year", "period", "limit"] } },
  { type: "function", name: "get_skipped_trades", description: "Get the authenticated user's recorded skipped, cancelled, or missed trade decisions and their documented outcomes.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, limit: { type: "integer", minimum: 1, maximum: 50 } }, required: ["pair", "setup", "limit"] } },
  { type: "function", name: "get_pair_state", description: "Get the authenticated user's current Journaly state for a currency pair, including recent trades and active forecasts.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: "string" } }, required: ["pair"] } },
  { type: "function", name: "get_setup_statistics", description: "Calculate real outcome and quality statistics from Journaly trades for a setup and optional calendar month.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { setup: { type: "string" }, month: { type: ["string", "null"] } }, required: ["setup", "month"] } },
  { type: "function", name: "get_monthly_performance", description: "Authoritative live-trade monthly ledger and ranking. Use for every question about monthly totals, best/worst months, month comparisons, or performance by month. Never manually sum recent trades for these questions.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { year: { type: ["integer", "null"], minimum: 2000, maximum: 2100 } }, required: ["year"] } },
  { type: "function", name: "get_journaly_inventory", description: "Get authoritative record counts and date coverage for every authenticated Journaly data surface.", strict: true, parameters: { type: "object", additionalProperties: false, properties: {}, required: [] } },
  { type: "function", name: "get_live_trade_statistics", description: "Authoritative live-trade statistics with optional pair, setup, direction, execution quality, year, or month filters. Use instead of manually calculating from trade lists.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, direction: { type: ["string", "null"], enum: ["Long", "Short", null] }, quality: { type: ["string", "null"], enum: ["Good", "Mid", "Bad", null] }, year: { type: ["integer", "null"], minimum: 2000, maximum: 2100 }, month: { type: ["string", "null"] } }, required: ["pair", "setup", "direction", "quality", "year", "month"] } },
  { type: "function", name: "get_decision_statistics", description: "Authoritative forecast, waiting, cancelled, missed, skipped-trade, and opportunity-cost statistics.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, year: { type: ["integer", "null"], minimum: 2000, maximum: 2100 } }, required: ["pair", "setup", "year"] } },
  { type: "function", name: "get_daytrade_statistics", description: "Authoritative statistics for Journaly's day-trade strategy records. Keeps live and backtest data separate.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { source: { type: "string", enum: ["live", "backtest"] }, pair: { type: ["string", "null"] }, entryType: { type: ["string", "null"] }, year: { type: ["integer", "null"], minimum: 2000, maximum: 2100 } }, required: ["source", "pair", "entryType", "year"] } },
  { type: "function", name: "get_journal_entries", description: "Read the authenticated user's personal journal and retained Jarvis learning entries, with optional pair/year filters.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, year: { type: ["integer", "null"], minimum: 2000, maximum: 2100 }, limit: { type: "integer", minimum: 1, maximum: 100 } }, required: ["pair", "year", "limit"] } },
  { type: "function", name: "get_tradingview_state", description: "Read authenticated TradingView events, WATCH pair state, and Jarvis threshold notifications for a ticker/timeframe.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { ticker: { type: ["string", "null"] }, timeframe: { type: ["string", "null"] }, limit: { type: "integer", minimum: 1, maximum: 100 } }, required: ["ticker", "timeframe", "limit"] } },
  { type: "function", name: "find_historical_patterns", description: "Deterministically retrieve exact authenticated Journaly records for any claim about similar, resembling, recurring, winning, losing, or historical trade patterns. Always cite returned IDs, dates, source, and sample size.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { source: { type: "string", enum: ["live", "backtest"] }, pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, direction: { type: ["string", "null"], enum: ["Long", "Short", null] }, outcome: { type: ["string", "null"], enum: ["Win", "Loss", "Breakeven", null] }, quality: { type: ["string", "null"], enum: ["Good", "Mid", "Bad", null] }, limit: { type: "integer", minimum: 1, maximum: 20 } }, required: ["source", "pair", "setup", "direction", "outcome", "quality", "limit"] } },
  { type: "function", name: "get_account_risk", description: "Check currency concentration across active forecasts. Forecasts do not track planned risk, and this is not broker/live-position risk.", strict: true, parameters: { type: "object", additionalProperties: false, properties: {}, required: [] } },
  { type: "function", name: "get_session_state", description: "Get the active pair, setup, trade, chart, forecast, last decision, and rolling conversation state.", strict: true, parameters: { type: "object", additionalProperties: false, properties: {}, required: [] } },
  { type: "function", name: "get_trade_journey", description: "Get the unified forecast-to-chart-to-trade journey and all open Jarvis contexts. Use for continuity questions such as what happened with an idea, how a forecast became a trade, or what Jarvis is currently tracking.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, forecastId: { type: ["string", "null"] }, tradeId: { type: ["string", "null"] } }, required: ["pair", "forecastId", "tradeId"] } },
];

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "memoryUpdates", "learningSummary", "tradeAction", "forecastAction", "chartAssessment"],
  properties: {
    answer: { type: "string", maxLength: 12000 },
    learningSummary: { type: ["string", "null"], maxLength: 1600 },
    chartAssessment: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["setupCandidate", "direction", "decision", "evidenceLevel", "visibleEvidence", "missingEvidence", "conflictingEvidence", "features"],
      properties: {
        setupCandidate: { type: ["string", "null"], enum: ["REVERSAL", "Internal reversal", "Liquidity sweep", "Break and retest", "Flag", "Flag+", "EU timed entry", null] },
        direction: { type: ["string", "null"], enum: ["Long", "Short", null] },
        decision: { type: "string", enum: ["TAKE", "SKIP", "WATCH", "ARMED", "INVALIDATED"] },
        evidenceLevel: { type: "string", enum: ["Clear", "Partial", "Insufficient"] },
        visibleEvidence: { type: "array", maxItems: 8, items: { type: "string", maxLength: 240 } },
        missingEvidence: { type: "array", maxItems: 8, items: { type: "string", maxLength: 240 } },
        conflictingEvidence: { type: "array", maxItems: 8, items: { type: "string", maxLength: 240 } },
        features: {
          type: "object",
          additionalProperties: false,
          required: ["ppaQuality", "structureVisible", "momentumShiftVisible", "liquidityContextVisible", "sweepVisible", "retestVisible", "trendVisible", "consolidationVisible", "triggerVisible", "entryVisible", "sessionTimingVisible", "higherTimeframeAlignmentVisible"],
          properties: {
            ppaQuality: { type: "string", enum: ["Strong", "Good", "Borderline", "Weak", "Unclear"] },
            structureVisible: { type: "boolean" },
            momentumShiftVisible: { type: "boolean" },
            liquidityContextVisible: { type: "boolean" },
            sweepVisible: { type: "boolean" },
            retestVisible: { type: "boolean" },
            trendVisible: { type: "boolean" },
            consolidationVisible: { type: "boolean" },
            triggerVisible: { type: "boolean" },
            entryVisible: { type: "boolean" },
            sessionTimingVisible: { type: "boolean" },
            higherTimeframeAlignmentVisible: { type: "boolean" }
          }
        }
      }
    },
    memoryUpdates: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["operation", "category", "key", "value", "confidence"],
        properties: {
          operation: { type: "string", enum: ["upsert", "delete"] },
          category: { type: "string", enum: ["identity", "preference", "trading_rule", "risk_rule", "mistake", "goal", "terminology", "ui_preference"] },
          key: { type: "string", maxLength: 80 },
          value: { type: "string", maxLength: 800 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    tradeAction: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["intent", "date", "time", "pair", "setup", "direction", "stopLossPips", "mae", "pnl", "result", "notes", "missingFields"],
      properties: {
        intent: { type: "string", enum: ["draft", "ready"] },
        date: { type: ["string", "null"], maxLength: 10 },
        time: { type: ["string", "null"], maxLength: 5 },
        pair: { type: ["string", "null"], enum: ["AUDUSD", "EURUSD", "EURJPY", "AUDJPY", "GBPUSD", "NZDJPY", "EURAUD", null] },
        setup: { type: ["string", "null"], enum: ["REVERSAL", "Internal reversal", "Liquidity sweep", "Break and retest", "Flag", "Flag+", "EU timed entry", null] },
        direction: { type: ["string", "null"], enum: ["Long", "Short", null] },
        stopLossPips: { type: ["number", "null"], minimum: 0 },
        mae: { type: ["number", "null"] },
        pnl: { type: ["number", "null"] },
        result: { type: ["string", "null"], enum: ["Win", "Loss", "Breakeven", null] },
        notes: { type: ["string", "null"], maxLength: 3000 },
        missingFields: { type: "array", maxItems: 3, items: { type: "string", enum: ["pair", "setup", "direction"] } },
      },
    },
    forecastAction: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["intent", "ready", "forecastId", "date", "time", "pair", "setup", "direction", "status", "notes", "missingFields"],
      properties: {
        intent: { type: "string", enum: ["create", "update_status"] },
        ready: { type: "boolean" },
        forecastId: { type: ["string", "null"], maxLength: 80 },
        date: { type: ["string", "null"], maxLength: 10 },
        time: { type: ["string", "null"], maxLength: 5 },
        pair: { type: ["string", "null"], enum: ["AUDUSD", "EURUSD", "EURJPY", "AUDJPY", "GBPUSD", "NZDJPY", "EURAUD", null] },
        setup: { type: ["string", "null"], enum: ["REVERSAL", "Internal reversal", "Liquidity sweep", "Break and retest", "Flag", "Flag+", "EU timed entry", null] },
        direction: { type: ["string", "null"], enum: ["Long", "Short", null] },
        status: { type: ["string", "null"], enum: ["Waiting", "Taken", "Invalidated", "Skipped", null] },
        notes: { type: ["string", "null"], maxLength: 3000 },
        missingFields: { type: "array", maxItems: 4, items: { type: "string", enum: ["forecastId", "pair", "setup", "direction"] } },
      },
    },
  },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  return (payload?.output || [])
    .flatMap((item) => item?.content || [])
    .filter((item) => item?.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .filter((message) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
    .map((message) => ({ role: message.role, content: message.content.slice(0, 6000) }));
}

async function safetyIdentifier(userId) {
  const data = new TextEncoder().encode(String(userId || "journaly-user"));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 64);
}

function bearerToken(request) {
  const value = request.headers.get("authorization") || "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

async function authenticateUser(request, env, requestedUserId) {
  if (env.JARVIS_AUTH_BYPASS_USER_ID && requestedUserId === env.JARVIS_AUTH_BYPASS_USER_ID) {
    return { id: requestedUserId, email: env.JARVIS_AUTH_BYPASS_EMAIL || "local-smoke-test@journaly.invalid", user_metadata: {} };
  }
  const token = bearerToken(request);
  if (!token) return null;
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Jarvis authentication is not configured.");
  const response = await (env.SUPABASE_FETCH || fetch)(`${String(supabaseUrl).replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      authorization: `Bearer ${token}`,
      apikey: supabaseKey,
    },
  });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return user?.id ? user : null;
}

async function loadAuthenticatedRows(request, env, userId, table, select, order) {
  if (env.JARVIS_AUTH_BYPASS_USER_ID) return null;
  const token = bearerToken(request);
  const connection = supabaseConnection(env);
  if (!token || !connection) return null;
  const query = new URL(`${connection.url}/rest/v1/${table}`);
  query.searchParams.set("select", select);
  query.searchParams.set("user_id", `eq.${userId}`);
  if (order) query.searchParams.set("order", order);
  const rows = [];
  try {
    for (let page = 0; page < 10; page += 1) {
      const start = page * 1000;
      const response = await connection.fetch(query.toString(), { headers: { apikey: connection.key, authorization: `Bearer ${token}`, range: `${start}-${start + 999}` } });
      if (!response.ok) {
        console.warn("[Jarvis data load failure]", JSON.stringify({ table, status: response.status, userId }));
        return null;
      }
      const pageRows = await response.json();
      if (!Array.isArray(pageRows)) return null;
      rows.push(...pageRows);
      if (pageRows.length < 1000) break;
    }
    return rows;
  } catch {
    console.warn("[Jarvis data load failure]", JSON.stringify({ table, category: "network", userId }));
    return null;
  }
}

async function loadAuthenticatedJournalyData(request, env, userId) {
  if (env.JARVIS_AUTH_BYPASS_USER_ID) return null;
  const [trades, backtests, decisions, journals, daytradeLive, daytradeBacktests, tradingViewEvents, pairStates, notifications] = await Promise.all([
    loadAuthenticatedRows(request, env, userId, "trades", "id,trade_date,trade_time,pair,setup,direction,mae,pnl_r,result,notes,trade_quality,source_app,duration_minutes,stop_loss_pips,mae_pips,finalized_at,created_at,updated_at", "trade_date.desc,trade_time.desc,id.desc"),
    loadAuthenticatedRows(request, env, userId, "backtests", "id,trade_date,trade_time,pair,setup,direction,duration_minutes,stop_loss_pips,mae_pips,pnl_r,result,notes,scale_in,source_app,created_at,updated_at", "trade_date.desc,trade_time.desc,id.desc"),
    loadAuthenticatedRows(request, env, userId, "trade_decisions", "id,decision_date,decision_time,pair,setup,direction,status,entry_plan,stop_loss,take_profit,risk_percent,reason_to_take,reason_cancelled,outcome,notes,result_r,created_at,updated_at", "decision_date.desc,decision_time.desc,id.desc"),
    loadAuthenticatedRows(request, env, userId, "journal_entries", "id,entry_date,content,advice,pair,related_trade_id,related_discipline_id,created_at,updated_at", "entry_date.desc,created_at.desc,id.desc"),
    loadAuthenticatedRows(request, env, userId, "daytrade_live_trades", "id,trade_date,pair,session,timeframe,direction,accumulation_quality,imbalance_quality,trading_day,trade_duration_hours,has_news,previous_imbalance_sessions,liquidity_context,retracement_depth,planned_rr,mae_r,mfe_r,result_r,outcome,trade_grade,execution_quality,emotions,confidence,patience,fomo,discipline,rule_violations,notes,created_at,updated_at", "trade_date.desc,id.desc"),
    loadAuthenticatedRows(request, env, userId, "daytrade_backtests", "id,trade_date,pair,session,timeframe,direction,accumulation_quality,imbalance_quality,entry_type,trading_day,trade_duration_hours,has_news,previous_imbalance_sessions,liquidity_context,retracement_depth,planned_rr,mae_r,mfe_r,result_r,outcome,trade_grade,notes,created_at,updated_at", "trade_date.desc,id.desc"),
    loadAuthenticatedRows(request, env, userId, "jarvis_tradingview_events", "id,ticker,timeframe,event,event_timestamp,price,mrh,mrl,bullish_break_count,bearish_break_count,candle,processing_status,received_at", "received_at.desc,id.desc"),
    loadAuthenticatedRows(request, env, userId, "jarvis_pair_state", "id,ticker,timeframe,status,event,price,mrh,mrl,bullish_break_count,bearish_break_count,last_candle_timestamp,updated_at", "updated_at.desc,id.desc"),
    loadAuthenticatedRows(request, env, userId, "jarvis_notifications", "id,event_id,ticker,timeframe,break_count,candle_timestamp,message,read_at,created_at", "created_at.desc,id.desc"),
  ]);
  const mapTrade = (row) => ({ id: row.id, date: row.trade_date, time: String(row.trade_time || "").slice(0, 5), pair: row.pair, setup: row.setup, direction: row.direction, pnlR: Number(row.pnl_r || 0), outcome: row.result, executionQuality: row.trade_quality, notes: row.notes, mae: Number(row.mae || 0), stopLossPips: row.stop_loss_pips == null ? null : Number(row.stop_loss_pips), maePips: row.mae_pips == null ? null : Number(row.mae_pips), durationMinutes: row.duration_minutes, finalizedAt: row.finalized_at, sourceApp: row.source_app });
  const mapBacktest = (row) => ({ id: row.id, date: row.trade_date, time: String(row.trade_time || "").slice(0, 5), pair: row.pair, setup: row.setup, direction: row.direction, pnlR: Number(row.pnl_r || 0), outcome: row.result, notes: row.notes, stopLossPips: row.stop_loss_pips == null ? null : Number(row.stop_loss_pips), maePips: row.mae_pips == null ? null : Number(row.mae_pips), durationMinutes: row.duration_minutes, scaleIn: row.scale_in, sourceApp: row.source_app });
  const mapDecision = (row) => ({ id: row.id, date: row.decision_date, time: String(row.decision_time || "").slice(0, 5), pair: row.pair, setup: row.setup, direction: row.direction, status: row.status === "Cancelled" ? "Invalidated" : row.status === "Missed" ? "Skipped" : row.status, entryPlan: row.entry_plan, stopLoss: row.stop_loss, takeProfit: row.take_profit, plannedRiskPercent: row.risk_percent == null ? null : Number(row.risk_percent), reasonToTake: row.reason_to_take, reasonCancelled: row.reason_cancelled, outcome: row.outcome, notes: row.notes, resultR: Number(row.result_r || 0) });
  const unavailableSurfaces = Object.entries({ trades, backtests, tradeDecisions: decisions, journalEntries: journals, daytradeLive, daytradeBacktests, tradingViewEvents, pairStates, notifications }).filter(([, value]) => !Array.isArray(value)).map(([name]) => name);
  return { trades: trades?.map(mapTrade) || null, backtests: backtests?.map(mapBacktest) || null, forecasts: decisions?.map(mapDecision) || null, journals, daytradeLive, daytradeBacktests, tradingViewEvents, pairStates, notifications, unavailableSurfaces };
}

function validChartImage(value) {
  if (typeof value !== "string" || value.length > MAX_CHART_IMAGE_LENGTH) return null;
  if (/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(value)) return value;
  if (/^https:\/\//i.test(value)) return value;
  return null;
}

function supabaseConnection(env) {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url: String(url).replace(/\/$/, ""), key, fetch: env.SUPABASE_FETCH || fetch } : null;
}

function hasActiveTradeSignal(question) {
  const text = String(question || "").toLowerCase().replace(/[’]/g, "'");
  const activeTradeSignals = [
    /\b(?:i'm|i am|im)\s+(?:already\s+)?(?:in|holding|managing)\s+(?:(?:this|the|my)\s+)?(?:trade|position)\b/,
    /\b(?:already|currently)\s+in\s+(?:(?:this|the|my)\s+)?(?:trade|position)\b/,
    /\b(?:i\s+)?(?:entered|took|opened|executed)\s+(?:(?:this|the|my)\s+)?(?:trade|position)\b/,
    /\b(?:my|this)\s+(?:trade|position)\s+(?:is\s+)?(?:running|open|active|live)\b/,
    /\b(?:trade|position)\s+(?:went|is\s+going|has\s+gone)\s+(?:well|good|great)\b/,
    /\b(?:won't|wont|will\s+not|not\s+going\s+to)\s+trail\b/,
    /\b(?:holding|leaving|moving)\s+(?:for|to)\s+(?:tp|target|breakeven|be|\d+(?:\.\d+)?\s*r)\b/,
    /\b(?:going|aiming)\s+(?:to|for)\s+(?:(?:get|take|hit)\s+)?\d+(?:\.\d+)?\s*r\b/,
  ];
  return activeTradeSignals.some((pattern) => pattern.test(text));
}

function detectConversationMode(question, chartImage, sessionState = {}) {
  const text = String(question || "").trim().toLowerCase().replace(/[’]/g, "'");
  const activeFollowUp = Boolean(sessionState?.activeTradeId) && /\b(?:hold|trail|move\s+(?:my\s+)?stop|take\s+profit|close|reduce|leave\s+it|what\s+now|how(?:'s|\s+is)\s+it|still\s+good)\b/.test(text);
  if (hasActiveTradeSignal(text) || activeFollowUp) return "active_trade_management";
  if (chartImage) return "pre_trade_review";
  if (/\b(?:closed|finished|stopped\s+out|hit\s+(?:tp|target|sl)|booked|ended)\b.*\b(?:trade|position|r)\b|\b(?:trade|position)\b.*\b(?:closed|finished|won|lost|breakeven)\b/.test(text)) return "post_trade_review";
  if (/\b(?:morning\s+brief(?:ing)?|evening\s+debrief|daily\s+brief(?:ing)?|start\s+my\s+day|wrap\s+up\s+my\s+day)\b/.test(text)) return "daily_routine";
  if (/\b(?:journal|reflect|reflection|trading\s+journey|write\s+down|debrief|how\s+have\s+i\s+changed)\b/.test(text)) return "journal_reflection";
  if (/\b(?:win\s*rate|expectancy|statistics|stats|performance|edge\s+lab|best\s+(?:pair|setup|month)|worst\s+(?:pair|setup|month)|compare\s+(?:my\s+)?live|how\s+(?:are|is)\s+my\s+.+doing)\b/.test(text)) return "performance_analytics";
  const forecastFollowUp = Boolean(sessionState?.activeForecastId) && /\b(?:what\s+about\s+it|still\s+valid|what\s+do\s+you\s+think|what\s+now|check\s+it|update\s+me|the\s+idea|that\s+idea)\b/.test(text);
  if (forecastFollowUp || /\b(?:forecast|watchlist|watching|invalidated|skipped\s+idea)\b/.test(text)) return "forecast_management";
  if (/\b(?:log|add|record|save)\b.*\b(?:trade|position)\b|\b(?:taking|entering|opening)\b.*\b(?:trade|position|long|short)\b/.test(text)) return "trade_logging";
  if (/^(?:hey|hi|hello|yo|thanks|thank\s+you|good\s+(?:morning|afternoon|evening)|what's\s+up|whats\s+up|how\s+are\s+you)[!,.\s]*$/.test(text)) return "casual_conversation";
  return "general_trading_conversation";
}

function detectChartInteractionMode(question, chartImage) {
  if (!chartImage) return "conversation";
  return hasActiveTradeSignal(question) ? "active_trade_management" : "chart_review";
}

function selectRelevantMemories(memories, question, conversationMode, limit = 12) {
  if (!Array.isArray(memories)) return [];
  const terms = new Set(String(question || "").toLowerCase().match(/[a-z0-9]{3,}/g) || []);
  const alwaysRelevant = new Set(["identity", "preference", "risk_rule", "trading_rule", "terminology"]);
  return memories
    .filter((memory) => memory && memory.operation !== "delete" && typeof memory.value === "string")
    .map((memory, index) => {
      const haystack = `${memory.category || ""} ${memory.key || ""} ${memory.value}`.toLowerCase();
      const tokenMatches = [...terms].filter((term) => haystack.includes(term)).length;
      const modeBoost = conversationMode === "active_trade_management" && ["risk_rule", "trading_rule", "mistake"].includes(memory.category) ? 3 : 0;
      const stableBoost = alwaysRelevant.has(memory.category) ? 2 : 0;
      return { memory, score: tokenMatches * 4 + modeBoost + stableBoost + index / Math.max(memories.length, 1) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ memory }) => memory);
}

function feedbackStyleExamples(journals, limit = 10) {
  if (!Array.isArray(journals)) return [];
  return journals.flatMap((entry) => {
    const content = String(entry?.content || "");
    if (!content.startsWith(JARVIS_FEEDBACK_PREFIX)) return [];
    try {
      const metadata = JSON.parse(content.slice(JARVIS_FEEDBACK_PREFIX.length).trim());
      if (!metadata || !["helpful", "missed"].includes(metadata.sentiment)) return [];
      return [{
        sentiment: metadata.sentiment,
        reason: typeof metadata.reason === "string" ? metadata.reason.slice(0, 120) : null,
        userMessage: typeof metadata.userMessage === "string" ? metadata.userMessage.slice(0, 500) : null,
        assistantResponse: typeof metadata.assistantResponse === "string" ? metadata.assistantResponse.slice(0, 900) : null,
        note: typeof entry.advice === "string" ? entry.advice.slice(0, 500) : null,
      }];
    } catch {
      return [];
    }
  }).slice(0, limit);
}

function isJarvisInternalJournalContent(content) {
  const value = String(content || "");
  return [JARVIS_LEARNING_PREFIX, JARVIS_FORECAST_REVIEW_PREFIX, JARVIS_FEEDBACK_PREFIX, JARVIS_MEMORY_SYNC_PREFIX, JARVIS_SESSION_SYNC_PREFIX, JARVIS_CHAT_SYNC_PREFIX, JARVIS_WORKSPACE_PREFIX, JARVIS_JOURNEY_PREFIX, JARVIS_CHART_PREFIX, JARVIS_ROUTINE_PREFIX].some((prefix) => value.startsWith(prefix));
}

function syncedMemoriesFromJournal(journals, limit = 40) {
  if (!Array.isArray(journals)) return [];
  const updates = journals.flatMap((entry) => {
    const content = String(entry?.content || "");
    if (!content.startsWith(JARVIS_MEMORY_SYNC_PREFIX)) return [];
    try {
      const metadata = JSON.parse(content.slice(JARVIS_MEMORY_SYNC_PREFIX.length).trim());
      const syncedAt = typeof metadata?.syncedAt === "string" ? metadata.syncedAt : entry?.updated_at || entry?.created_at || "";
      return Array.isArray(metadata?.updates) ? metadata.updates.map((update) => ({ ...update, updatedAt: syncedAt })) : [];
    } catch {
      return [];
    }
  }).sort((a, b) => String(a.updatedAt).localeCompare(String(b.updatedAt)));
  const latest = new Map();
  updates.forEach((update) => {
    if (!update?.category || !update?.key) return;
    latest.set(`${update.category}:${update.key}`, update);
  });
  return [...latest.values()].slice(-limit);
}

function syncedSessionFromJournal(journals) {
  if (!Array.isArray(journals)) return null;
  const records = journals.flatMap((entry) => {
    const content = String(entry?.content || "");
    if (!content.startsWith(JARVIS_SESSION_SYNC_PREFIX)) return [];
    try {
      const metadata = JSON.parse(content.slice(JARVIS_SESSION_SYNC_PREFIX.length).trim());
      return [{ state: metadata?.state || null, syncedAt: metadata?.syncedAt || entry?.updated_at || entry?.created_at || "" }];
    } catch {
      return [];
    }
  }).sort((a, b) => String(b.syncedAt).localeCompare(String(a.syncedAt)));
  return records[0]?.state || null;
}

function latestInternalState(journals, prefix) {
  if (!Array.isArray(journals)) return null;
  const records = journals.flatMap((entry) => {
    const content = String(entry?.content || "");
    if (!content.startsWith(prefix)) return [];
    try {
      const value = JSON.parse(content.slice(prefix.length).trim());
      return [{ value, syncedAt: value?.syncedAt || value?.updatedAt || entry?.updated_at || entry?.created_at || "" }];
    } catch { return []; }
  }).sort((a, b) => String(b.syncedAt).localeCompare(String(a.syncedAt)));
  return records[0]?.value || null;
}

function journeyFromJournal(journals, pair = null) {
  return (journals || []).flatMap((entry) => {
    const content = String(entry?.content || "");
    const prefix = content.startsWith(JARVIS_JOURNEY_PREFIX) ? JARVIS_JOURNEY_PREFIX : content.startsWith(JARVIS_CHART_PREFIX) ? JARVIS_CHART_PREFIX : null;
    if (!prefix) return [];
    try {
      const value = JSON.parse(content.slice(prefix.length).trim());
      if (pair && value?.pair && normalizePair(value.pair) !== normalizePair(pair)) return [];
      return [{ ...value, journalEntryId: entry.id, eventAt: value.linkedAt || value.capturedAt || entry.updated_at || entry.created_at || entry.entry_date }];
    } catch { return []; }
  }).sort((a, b) => String(b.eventAt).localeCompare(String(a.eventAt))).slice(0, 30);
}

const FORECAST_REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["thesis", "whatHappened", "executionAssessment", "directionOutcome", "entryCriteriaOutcome", "learningCandidate", "confidence", "eligibleForAggregate", "evidenceNotes"],
  properties: {
    thesis: { type: "string", maxLength: 900 },
    whatHappened: { type: "string", maxLength: 900 },
    executionAssessment: { type: "string", enum: ["Correct take", "Correct skip", "Missed opportunity", "Invalidated thesis", "Insufficient evidence"] },
    directionOutcome: { type: "string", enum: ["Correct", "Incorrect", "Unclear"] },
    entryCriteriaOutcome: { type: "string", enum: ["Completed", "Not completed", "Unclear"] },
    learningCandidate: { type: "string", maxLength: 1000 },
    confidence: { type: "string", enum: ["Low", "Medium", "High"] },
    eligibleForAggregate: { type: "boolean" },
    evidenceNotes: { type: "array", maxItems: 6, items: { type: "string", maxLength: 260 } },
  },
};

const PUSHOVER_EMERGENCY_EVENTS = new Set(["MRH_BREAK", "MRL_BREAK", "STRUCTURE_BREAK", "SETUP_CONFIRMED"]);
const pushoverHealth = {
  lastAttemptAt: null,
  lastSuccessfulSendAt: null,
  lastError: null,
};

function decodeForecastReview(row) {
  const content = String(row?.content || "");
  if (!content.startsWith(JARVIS_FORECAST_REVIEW_PREFIX)) return null;
  try {
    const review = JSON.parse(content.slice(JARVIS_FORECAST_REVIEW_PREFIX.length).trim());
    return review?.forecastId ? { ...review, journalEntryId: row.id } : null;
  } catch {
    return null;
  }
}

function fallbackForecastReview(forecast) {
  const outcome = String(forecast.outcome || "Unknown");
  const directionOutcome = outcome === "Won" ? "Correct" : outcome === "Lost" ? "Incorrect" : "Unclear";
  const entryCriteriaOutcome = forecast.status === "Taken" ? "Completed" : "Unclear";
  const executionAssessment = forecast.status === "Invalidated"
    ? "Invalidated thesis"
    : forecast.status === "Skipped"
      ? "Insufficient evidence"
      : forecast.status === "Taken"
        ? "Correct take"
        : "Insufficient evidence";
  return {
    thesis: String(forecast.notes || "No written thesis was provided.").slice(0, 900),
    whatHappened: outcome === "Unknown" ? `The forecast was resolved as ${forecast.status}, but no outcome was documented.` : `The forecast was resolved as ${forecast.status} with outcome ${outcome}.`,
    executionAssessment,
    directionOutcome,
    entryCriteriaOutcome,
    learningCandidate: "Keep this as evidence, but do not change the playbook until the written record and aggregate sample support a stable pattern.",
    confidence: directionOutcome === "Unclear" ? "Low" : "Medium",
    eligibleForAggregate: directionOutcome !== "Unclear" || executionAssessment !== "Insufficient evidence",
    evidenceNotes: ["Generated conservatively from structured forecast fields because an AI interpretation was unavailable."],
  };
}

async function generateForecastReview(env, userId, forecast) {
  const connection = aiConnection(env);
  if (!connection) return { core: fallbackForecastReview(forecast), model: null, method: "deterministic_fallback" };
  const prompt = `Review this resolved trading forecast as evidence. The user's single notes field may contain the thesis, entry plan, later outcome, and invalidation reasoning. Use only documented facts. Do not infer absent chart evidence. A Skipped forecast is a correct skip when entry criteria did not complete; do not call it a missed trade merely because direction later proved correct. Mark eligibleForAggregate=false when the record is too ambiguous to support any pattern. Never create or modify a strategy rule.\n\nFORECAST\n${JSON.stringify({ id: forecast.id, date: forecast.date, time: forecast.time, pair: forecast.pair, setup: forecast.setup, direction: forecast.direction, status: forecast.status, outcome: forecast.outcome, resultR: forecast.resultR, notes: forecast.notes })}`;
  const models = Array.from(new Set([connection.model, ...FALLBACK_MODELS]));
  for (const model of models) {
    const requestBody = {
      model: connection.modelName(model),
      instructions: "You are Jarvis's conservative forecast evidence reviewer. Separate directional accuracy from entry completion and execution quality. Return only the required structured review.",
      input: [{ role: "user", content: prompt }],
      max_output_tokens: 900,
      store: false,
      safety_identifier: await safetyIdentifier(userId),
      text: { format: { type: "json_schema", name: "forecast_review", strict: true, schema: FORECAST_REVIEW_SCHEMA } },
    };
    if (model.includes("gpt-5.6")) {
      requestBody.reasoning = { effort: "low" };
      requestBody.text.verbosity = "medium";
    }
    try {
      const { response, payload } = await openAiRequest(connection, requestBody);
      if (!response.ok) continue;
      const parsed = JSON.parse(extractResponseText(payload));
      return { core: parsed, model, method: "ai_structured_review" };
    } catch {
      // Try the next configured model before falling back to deterministic evidence.
    }
  }
  return { core: fallbackForecastReview(forecast), model: null, method: "deterministic_fallback" };
}

async function writeAuthenticatedJournalRow(request, env, userId, existingId, payload) {
  const token = bearerToken(request);
  const connection = supabaseConnection(env);
  if (!token || !connection) throw new Error("Forecast review storage is unavailable.");
  const url = existingId
    ? `${connection.url}/rest/v1/journal_entries?id=eq.${encodeURIComponent(existingId)}&user_id=eq.${encodeURIComponent(userId)}`
    : `${connection.url}/rest/v1/journal_entries`;
  const response = await connection.fetch(url, {
    method: existingId ? "PATCH" : "POST",
    headers: { apikey: connection.key, authorization: `Bearer ${token}`, "content-type": "application/json", prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message || "Forecast review could not be stored.");
  return Array.isArray(result) ? result[0] : result;
}

async function deleteAuthenticatedJournalRow(request, env, userId, id) {
  const token = bearerToken(request);
  const connection = supabaseConnection(env);
  if (!token || !connection) throw new Error("Forecast review storage is unavailable.");
  const response = await connection.fetch(`${connection.url}/rest/v1/journal_entries?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: { apikey: connection.key, authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Forecast review could not be removed.");
}

async function handleForecastReview(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  const forecastId = String(body?.forecastId || "").trim();
  if (!forecastId) return json({ error: "A forecast id is required." }, 400);
  let user;
  try { user = await authenticateUser(request, env, body?.userId); } catch { return json({ error: "Jarvis authentication failed." }, 503); }
  if (!user || (body?.userId && body.userId !== user.id)) return json({ error: "Unauthorized" }, 401);

  const [rows, journals] = await Promise.all([
    loadAuthenticatedRows(request, env, user.id, "trade_decisions", "id,decision_date,decision_time,pair,setup,direction,status,outcome,notes,result_r,updated_at", "decision_date.desc,id.desc"),
    loadAuthenticatedRows(request, env, user.id, "journal_entries", "id,entry_date,content,advice,pair,related_discipline_id,created_at,updated_at", "created_at.desc,id.desc"),
  ]);
  if (!Array.isArray(rows) || !Array.isArray(journals)) return json({ error: "Forecast evidence is unavailable." }, 503);
  const row = rows.find((item) => item.id === forecastId);
  if (!row) return json({ error: "Forecast not found." }, 404);
  const forecast = {
    id: row.id,
    date: row.decision_date,
    time: String(row.decision_time || "").slice(0, 5),
    pair: row.pair,
    setup: row.setup,
    direction: row.direction,
    status: row.status === "Cancelled" ? "Invalidated" : row.status === "Missed" ? "Skipped" : row.status,
    outcome: row.outcome || "Unknown",
    notes: row.notes || "",
    resultR: Number(row.result_r || 0),
    updatedAt: row.updated_at,
  };
  const existingRow = journals.find((item) => item.related_discipline_id === forecastId && String(item.content || "").startsWith(JARVIS_FORECAST_REVIEW_PREFIX));
  const existingReview = decodeForecastReview(existingRow);
  if (forecast.status === "Waiting") {
    if (existingRow) await deleteAuthenticatedJournalRow(request, env, user.id, existingRow.id);
    return json({ ok: true, reviewed: false, removed: Boolean(existingRow), reason: "waiting_is_observation" });
  }
  if (!["Taken", "Invalidated", "Skipped"].includes(forecast.status)) return json({ error: "Forecast status cannot be reviewed." }, 409);
  if (!body?.force && existingReview?.sourceForecastUpdatedAt === forecast.updatedAt) return json({ ok: true, reviewed: true, cached: true, review: existingReview });

  const generated = await generateForecastReview(env, user.id, forecast);
  const reviewedAt = new Date().toISOString();
  const review = {
    version: 1,
    forecastId: forecast.id,
    forecastDate: forecast.date,
    pair: forecast.pair,
    setup: forecast.setup,
    direction: forecast.direction,
    status: forecast.status,
    outcome: forecast.outcome,
    resultR: forecast.resultR,
    reviewedAt,
    sourceForecastUpdatedAt: forecast.updatedAt,
    method: generated.method,
    model: generated.model,
    ...generated.core,
    strategyRuleChangeAllowed: false,
  };
  const stored = await writeAuthenticatedJournalRow(request, env, user.id, existingRow?.id || null, {
    user_id: user.id,
    entry_date: forecast.date,
    content: `${JARVIS_FORECAST_REVIEW_PREFIX}\n${JSON.stringify(review)}`,
    advice: review.learningCandidate,
    image_url: "",
    pair: forecast.pair,
    related_trade_id: null,
    related_discipline_id: forecast.id,
    updated_at: reviewedAt,
  });
  return json({ ok: true, reviewed: true, cached: false, review: { ...review, journalEntryId: stored?.id || existingRow?.id || null } });
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nonNegativeInteger(value) {
  const number = finiteNumber(value);
  return number === null ? 0 : Math.max(0, Math.trunc(number));
}

function eventTimestamp(value) {
  if (typeof value === "number" || /^\d{10,13}$/.test(String(value || ""))) {
    const numeric = Number(value);
    const date = new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function sha256Text(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function supabaseRpc(env, name, body) {
  const connection = supabaseConnection(env);
  if (!connection) throw new Error("TradingView storage is not configured.");
  return connection.fetch(`${connection.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: connection.key, authorization: `Bearer ${connection.key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function processTradingViewEvent(env, eventId, webhookToken) {
  try {
    const response = await supabaseRpc(env, "process_jarvis_tradingview_event", { p_event_id: eventId, p_token: webhookToken });
    if (!response.ok) console.error("[TradingView processing failure]", JSON.stringify({ status: response.status, eventId }));
  } catch (error) {
    console.error("[TradingView processing failure]", JSON.stringify({ category: "network", eventId, message: error instanceof Error ? error.message : "unknown" }));
  }
}

function normalizedTradingEvent(value) {
  return String(value || "STRUCTURE_BREAK").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120);
}

function pushoverConfiguration(env) {
  const enabled = String(env.PUSHOVER_ENABLED || "").trim().toLowerCase() === "true";
  const appTokenConfigured = Boolean(String(env.PUSHOVER_APP_TOKEN || "").trim());
  const userKeyConfigured = Boolean(String(env.PUSHOVER_USER_KEY || "").trim());
  return { enabled, appTokenConfigured, userKeyConfigured, available: enabled && appTokenConfigured && userKeyConfigured };
}

function pushoverDiagnostics(env) {
  return { ...pushoverConfiguration(env), ...pushoverHealth };
}

function withDashboardCors(request, response) {
  const origin = request.headers.get("origin");
  if (origin !== "https://journaly-os-daytrade.sandaraslark.chatgpt.site") return response;
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-headers", "authorization, content-type");
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set("vary", "Origin");
  return new Response(response.body, { status: response.status, headers });
}

function pushoverMessage(event) {
  return [
    `${event.ticker} / ${event.timeframe}`,
    `Event: ${event.event}`,
    event.price == null ? null : `Price: ${event.price}`,
    event.mrh == null ? null : `MRH: ${event.mrh}`,
    event.mrl == null ? null : `MRL: ${event.mrl}`,
    `Time: ${event.event_timestamp}`,
  ].filter(Boolean).join("\n");
}

async function sendPushover(env, { title, message, priority }) {
  const configuration = pushoverConfiguration(env);
  pushoverHealth.lastAttemptAt = new Date().toISOString();
  if (!configuration.available) {
    pushoverHealth.lastError = "Pushover is disabled or not fully configured.";
    throw new Error(pushoverHealth.lastError);
  }
  const body = new URLSearchParams({ token: String(env.PUSHOVER_APP_TOKEN), user: String(env.PUSHOVER_USER_KEY), title, message, priority: String(priority), sound: priority === 2 ? "persistent" : "siren" });
  if (priority === 2) {
    body.set("retry", "30");
    body.set("expire", "10800");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const send = env.PUSHOVER_FETCH || fetch;
    const response = await send("https://api.pushover.net/1/messages.json", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: body.toString(), signal: controller.signal });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.status !== 1) throw new Error(`Pushover rejected the message (${response.status}).`);
    pushoverHealth.lastSuccessfulSendAt = new Date().toISOString();
    pushoverHealth.lastError = null;
    return { receipt: typeof result.receipt === "string" ? result.receipt : null };
  } catch (error) {
    pushoverHealth.lastError = error instanceof Error && error.name === "AbortError" ? "Pushover timed out." : (error instanceof Error ? error.message : "Pushover delivery failed.");
    throw new Error(pushoverHealth.lastError);
  } finally {
    clearTimeout(timeout);
  }
}

async function finishPushoverDelivery(env, eventId, webhookToken, status, receipt, error) {
  const response = await supabaseRpc(env, "complete_jarvis_pushover_delivery", { p_event_id: eventId, p_token: webhookToken, p_status: status, p_receipt: receipt, p_error: error });
  if (!response.ok) throw new Error(`Pushover delivery state could not be saved (${response.status}).`);
}

async function deliverTradingViewPushover(env, eventId, webhookToken) {
  let event = null;
  try {
    const claimResponse = await supabaseRpc(env, "claim_jarvis_pushover_delivery", { p_event_id: eventId, p_token: webhookToken });
    const claimResult = await claimResponse.json().catch(() => null);
    if (!claimResponse.ok) throw new Error(`Pushover delivery could not be claimed (${claimResponse.status}).`);
    event = Array.isArray(claimResult) ? claimResult[0] : claimResult;
    if (!event?.event_id) return;
    if (env.PUSHOVER_OWNER_USER_ID && String(env.PUSHOVER_OWNER_USER_ID) !== String(event.user_id)) {
      await finishPushoverDelivery(env, eventId, webhookToken, "failed", null, "No Pushover recipient is mapped for this user.");
      return;
    }
    const sent = await sendPushover(env, { title: "JARVIS — TRADING ALERT", message: pushoverMessage(event), priority: 2 });
    await finishPushoverDelivery(env, eventId, webhookToken, "sent", sent.receipt, null);
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Pushover delivery failed.";
    if (event?.event_id) {
      try { await finishPushoverDelivery(env, eventId, webhookToken, "failed", null, message); } catch { /* the delivery error remains available in diagnostics */ }
    }
    console.error("[Pushover delivery failure]", JSON.stringify({ eventId, category: "delivery", message }));
  }
}

async function handlePushoverTest(request, env) {
  if (request.method === "OPTIONS") return withDashboardCors(request, new Response(null, { status: 204 }));
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body;
  try { body = await request.json(); } catch { body = {}; }
  let authorization;
  try { authorization = await authorizeOwner(request, env, body?.userId || null); } catch { return json({ error: "Jarvis authentication failed." }, 503); }
  if (authorization.error) return authorization.error;
  const priority = Number(body?.priority) === 2 ? 2 : 1;
  try {
    const sent = await sendPushover(env, { title: "JARVIS TEST", message: `Pushover integration is working.\nPriority: ${priority === 2 ? "Emergency" : "High"}\nTime: ${new Date().toISOString()}`, priority });
    return withDashboardCors(request, json({ ok: true, priority, emergency: priority === 2, sentAt: pushoverHealth.lastSuccessfulSendAt, receiptCreated: Boolean(sent.receipt) }));
  } catch (error) {
    return withDashboardCors(request, json({ error: error instanceof Error ? error.message : "Pushover test failed.", diagnostics: pushoverDiagnostics(env) }, 503));
  }
}

async function handleTradingView(request, env, ctx) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!/^application\/json\b/i.test(request.headers.get("content-type") || "")) return json({ error: "Content-Type must be application/json." }, 415);

  let payload;
  try { payload = await request.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json({ error: "A JSON object is required." }, 400);

  const authorization = bearerToken(request);
  const webhookToken = authorization || request.headers.get("x-jarvis-webhook-token")?.trim() || String(payload.webhook_token || payload.token || "").trim();
  if (!webhookToken || webhookToken.length < 24 || webhookToken.length > 300) return json({ error: "Invalid webhook token." }, 401);

  const ticker = String(payload.ticker || payload.symbol || "").trim().toUpperCase().replace(/[^A-Z0-9._:-]/g, "").slice(0, 40);
  const timeframe = String(payload.timeframe || payload.interval || "").trim().slice(0, 20);
  const event = normalizedTradingEvent(payload.event || payload.alert || "structure_break");
  const timestamp = eventTimestamp(payload.timestamp ?? payload.time ?? payload.candle?.timestamp ?? payload.candle?.time);
  if (!ticker || !timeframe || !event || !timestamp) return json({ error: "ticker, timeframe, event, and a valid timestamp are required." }, 400);

  const candleSource = payload.candle && typeof payload.candle === "object" ? payload.candle : payload;
  const candle = ["open", "high", "low", "close"].some((key) => finiteNumber(candleSource[key]) !== null) ? {
    open: finiteNumber(candleSource.open), high: finiteNumber(candleSource.high), low: finiteNumber(candleSource.low), close: finiteNumber(candleSource.close),
  } : null;
  const bullishBreakCount = nonNegativeInteger(payload.bullish_break_count);
  const bearishBreakCount = nonNegativeInteger(payload.bearish_break_count);
  const dedupeKey = await sha256Text([ticker, timeframe, event, timestamp].join("|"));
  const safePayload = { ...payload };
  delete safePayload.webhook_token;
  delete safePayload.token;

  let storageResponse;
  try {
    storageResponse = await supabaseRpc(env, "ingest_jarvis_tradingview_event", {
      p_token: webhookToken,
      p_ticker: ticker,
      p_timeframe: timeframe,
      p_event: event,
      p_event_timestamp: timestamp,
      p_price: finiteNumber(payload.price ?? candle?.close),
      p_mrh: finiteNumber(payload.MRH ?? payload.mrh),
      p_mrl: finiteNumber(payload.MRL ?? payload.mrl),
      p_bullish_break_count: bullishBreakCount,
      p_bearish_break_count: bearishBreakCount,
      p_candle: candle,
      p_raw_payload: safePayload,
      p_dedupe_key: dedupeKey,
    });
  } catch {
    return json({ error: "TradingView storage is unavailable." }, 503);
  }
  const result = await storageResponse.json().catch(() => null);
  if (!storageResponse.ok) {
    const invalidToken = storageResponse.status === 401 || /invalid webhook token|28000/i.test(JSON.stringify(result));
    console.warn("[TradingView ingest rejection]", JSON.stringify({ category: invalidToken ? "invalid_token" : "storage", status: storageResponse.status, ticker, timeframe }));
    return json({ error: invalidToken ? "Invalid webhook token." : "TradingView event could not be stored." }, invalidToken ? 401 : 503);
  }

  const row = Array.isArray(result) ? result[0] : result;
  const eventId = row?.event_id;
  const duplicate = row?.is_duplicate === true;
  if (eventId && !duplicate) {
    const work = Promise.allSettled([
      processTradingViewEvent(env, eventId, webhookToken),
      PUSHOVER_EMERGENCY_EVENTS.has(event) ? deliverTradingViewPushover(env, eventId, webhookToken) : Promise.resolve(),
    ]);
    if (ctx?.waitUntil) ctx.waitUntil(work);
    else void work;
  }
  return json({ ok: true, accepted: true, duplicate, eventId: eventId || null }, 200);
}

function referenceSearchText(analysis) {
  return [analysis.filename, analysis.date, analysis.pair, analysis.sourceSetup, ...(analysis.sourceAliases || []).flatMap((source) => [source.filename, source.pair, source.sourceSetup])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function selectReferenceAnalyses(question, context) {
  const latestTrade = Array.isArray(context?.recentTrades) ? context.recentTrades[0] : null;
  const asksForCurrentTrade = /analy[sz]e|chart|screenshot|latest trade|this trade|take this|same setup/i.test(question);
  const query = `${question} ${asksForCurrentTrade ? `${latestTrade?.pair || ""} ${latestTrade?.setup || ""}` : ""}`.toLowerCase();
  const terms = Array.from(new Set(query.match(/[a-z0-9]+/g) || [])).filter((term) => term.length >= 3);
  const setupPhrases = ["internal reversal", "break and retest", "liquidity sweep", "reversal", "flag"];
  return JARVIS_REFERENCE_ANALYSES
    .map((analysis) => {
      const haystack = referenceSearchText(analysis);
      let score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      if (analysis.pair && query.includes(analysis.pair.toLowerCase())) score += 5;
      if (setupPhrases.some((setup) => query.includes(setup) && haystack.includes(setup))) score += 5;
      if (analysis.labelConflict) score += /duplicate|conflict|wrong label|double.check|already know/i.test(question) ? 4 : 0;
      return { analysis, score };
    })
    .filter(({ score }) => score >= 3)
    .sort((a, b) => b.score - a.score || `${b.analysis.date}`.localeCompare(`${a.analysis.date}`))
    .slice(0, 6)
    .map(({ analysis }) => analysis);
}

function parseJarvisOutput(text) {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.answer === "string") {
      return { answer: parsed.answer.trim(), memoryUpdates: Array.isArray(parsed.memoryUpdates) ? parsed.memoryUpdates : [], learningSummary: typeof parsed.learningSummary === "string" ? parsed.learningSummary.trim() : null, tradeAction: parsed.tradeAction && typeof parsed.tradeAction === "object" ? parsed.tradeAction : null, forecastAction: parsed.forecastAction && typeof parsed.forecastAction === "object" ? parsed.forecastAction : null, chartAssessment: parsed.chartAssessment && typeof parsed.chartAssessment === "object" ? parsed.chartAssessment : null };
    }
  } catch {
    // Older fallback models may return plain text; keep the conversation available without storing memory.
  }
  return { answer: text.trim(), memoryUpdates: [], learningSummary: null, tradeAction: null, forecastAction: null, chartAssessment: null };
}

function errorCategory(status, code, message) {
  const detail = `${code || ""} ${message || ""}`.toLowerCase();
  if (status === 401 || /api.?key|authentication|unauthorized/.test(detail)) return "authentication";
  if (status === 402 || /billing|quota|credit|insufficient_quota/.test(detail)) return "billing_or_quota";
  if (status === 429 || /rate.?limit/.test(detail)) return "rate_limit";
  if (/model|not_found/.test(detail)) return "model_configuration";
  if (status >= 400 && status < 500) return "request_schema";
  if (status >= 500) return "provider_server";
  if (/abort|timeout/.test(detail)) return "timeout";
  return "network";
}

function addUsage(total, usage) {
  const inputDetails = usage?.input_tokens_details || {};
  total.inputTokens += Number(usage?.input_tokens || 0);
  total.cachedInputTokens += Number(inputDetails.cached_tokens || 0);
  total.cacheWriteTokens += Number(inputDetails.cache_write_tokens || 0);
  total.outputTokens += Number(usage?.output_tokens || 0);
}

function usageSummary(model, usage) {
  const baseModel = String(model).split("/").at(-1);
  const pricing = MODEL_PRICING_PER_MILLION[baseModel];
  const regularInputTokens = Math.max(0, usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens);
  const costUsd = pricing ? (
    regularInputTokens * pricing.input
    + usage.cachedInputTokens * pricing.cachedInput
    + usage.cacheWriteTokens * pricing.cacheWrite
    + usage.outputTokens * pricing.output
  ) / 1_000_000 : null;
  return {
    ...usage,
    totalTokens: usage.inputTokens + usage.outputTokens,
    costUsd,
    currency: "USD",
    estimated: true,
  };
}

function recordAiFailure({ status = null, code = null, message = "", model = null, requestId = null }) {
  const category = errorCategory(status, code, message);
  Object.assign(aiHealth, {
    configuredModel: model || aiHealth.configuredModel,
    apiReachable: Boolean(status),
    lastErrorCategory: category,
    lastHttpStatus: status,
    fallbackActive: true,
  });
  console.error("[Jarvis AI failure]", JSON.stringify({ category, status, code, model, requestId }));
  return category;
}

function aiConnection(env) {
  const directKey = env.OPENAI_API_KEY;
  if (directKey) {
    return {
      provider: "OpenAI",
      apiKey: directKey,
      endpoint: OPENAI_ENDPOINT,
      model: env.OPENAI_JARVIS_MODEL || FALLBACK_MODELS[0],
      modelName: (model) => model,
    };
  }
  const gatewayKey = env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN;
  if (gatewayKey) {
    return {
      provider: "Vercel AI Gateway",
      apiKey: gatewayKey,
      endpoint: VERCEL_GATEWAY_ENDPOINT,
      model: env.OPENAI_JARVIS_MODEL || FALLBACK_MODELS[0],
      modelName: (model) => model.includes("/") ? model : `openai/${model}`,
    };
  }
  return null;
}

async function openAiRequest(connection, requestBody) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const response = await fetch(connection.endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${connection.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizePair(value) {
  const aliases = { AJ: "AUDJPY", AU: "AUDUSD", EJ: "EURJPY", EU: "EURUSD", EA: "EURAUD", GU: "GBPUSD", NJ: "NZDJPY" };
  const pair = String(value || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  return aliases[pair] || pair;
}

function matchesText(value, query) {
  return !query || String(value || "").toLowerCase().includes(String(query).toLowerCase());
}

function setupStats(trades) {
  const wins = trades.filter((trade) => Number(trade.pnlR) > 0).length;
  const losses = trades.filter((trade) => Number(trade.pnlR) < 0).length;
  const totalR = trades.reduce((sum, trade) => sum + Number(trade.pnlR || 0), 0);
  const reviewed = trades.filter((trade) => trade.executionQuality);
  const quality = Object.fromEntries(["Good", "Mid", "Bad"].map((grade) => [grade, reviewed.filter((trade) => trade.executionQuality === grade).length]));
  return {
    sampleSize: trades.length,
    wins,
    losses,
    breakEven: trades.length - wins - losses,
    winRate: trades.length ? Math.round((wins / trades.length) * 1000) / 10 : null,
    totalR: Math.round(totalR * 100) / 100,
    expectancyR: trades.length ? Math.round((totalR / trades.length) * 100) / 100 : null,
    reviewed: reviewed.length,
    quality,
  };
}

function monthlyPerformance(trades, year = null) {
  const valid = trades.filter((trade) => /^\d{4}-\d{2}-\d{2}$/.test(String(trade.date || "")) && (!year || String(trade.date).startsWith(`${year}-`)));
  const grouped = new Map();
  valid.forEach((trade) => {
    const month = String(trade.date).slice(0, 7);
    const current = grouped.get(month) || { month, totalHundredthsR: 0, trades: [] };
    const hundredthsR = Math.round(Number(trade.pnlR || 0) * 100);
    current.totalHundredthsR += hundredthsR;
    current.trades.push({ id: trade.id || null, date: trade.date, pair: trade.pair, setup: trade.setup, pnlR: hundredthsR / 100 });
    grouped.set(month, current);
  });
  const months = [...grouped.values()].map((row) => {
    const wins = row.trades.filter((trade) => trade.pnlR > 0).length;
    const losses = row.trades.filter((trade) => trade.pnlR < 0).length;
    return {
      month: row.month,
      tradeCount: row.trades.length,
      totalR: row.totalHundredthsR / 100,
      wins,
      losses,
      breakEven: row.trades.length - wins - losses,
      arithmeticVerified: row.totalHundredthsR === row.trades.reduce((sum, trade) => sum + Math.round(trade.pnlR * 100), 0),
      trades: row.trades.sort((a, b) => `${a.date}|${a.id || ""}`.localeCompare(`${b.date}|${b.id || ""}`)),
    };
  });
  return months.sort((a, b) => b.totalR - a.totalR || b.tradeCount - a.tradeCount || a.month.localeCompare(b.month));
}

function verifiedMonthlyAnswer(ledger) {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (!ledger?.months?.length) return `I found no live trades${ledger?.year ? ` in ${ledger.year}` : ""}, so there is no monthly ranking yet.`;
  const groups = new Map();
  ledger.months.forEach((month) => {
    const year = month.month.slice(0, 4);
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(month);
  });
  const sections = [...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([year, months]) => {
    const ranked = [...months].sort((a, b) => b.totalR - a.totalR || b.tradeCount - a.tradeCount || a.month.localeCompare(b.month));
    const lines = ranked.map((month, index) => {
      const name = monthNames[Number(month.month.slice(5, 7)) - 1] || month.month;
      const total = `${month.totalR > 0 ? "+" : ""}${month.totalR.toFixed(2)}R`;
      return `${index + 1}. ${name} ${year}: ${total} across ${month.tradeCount} trade${month.tradeCount === 1 ? "" : "s"}`;
    });
    return `Verified live monthly ranking for ${year}:\n${lines.join("\n")}`;
  });
  return `${sections.join("\n\n")}\n\nThese figures are calculated from ${ledger.recordsIncluded} complete live-trade records using integer hundredths of R; every monthly total passed the ledger reconciliation check.`;
}

function dateCoverage(records, key = "date") {
  const dates = records.map((record) => String(record?.[key] || "")).filter(Boolean).sort();
  return { count: records.length, oldestDate: dates[0] || null, newestDate: dates.at(-1) || null };
}

function deterministicStats(records, valueKey = "pnlR") {
  const normalized = records.map((record) => ({ ...record, pnlR: Number(record?.[valueKey] || 0) }));
  return setupStats(normalized);
}

function reconciliationStats(records) {
  const ordered = [...records].sort((a, b) => `${a.date}|${a.time || ""}|${a.id || ""}`.localeCompare(`${b.date}|${b.time || ""}|${b.id || ""}`));
  const hundredths = ordered.map((record) => Math.round(Number(record.pnlR || 0) * 100));
  const wins = hundredths.filter((value) => value > 0);
  const losses = hundredths.filter((value) => value < 0);
  const total = hundredths.reduce((sum, value) => sum + value, 0);
  const grossWin = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  hundredths.forEach((value) => {
    equity += value;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  });
  return {
    trades: ordered.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: ordered.length - wins.length - losses.length,
    totalR: total / 100,
    winRatePercent: ordered.length ? Math.round((wins.length / ordered.length) * 1000) / 10 : null,
    expectancyR: ordered.length ? Math.round((total / ordered.length)) / 100 : null,
    profitFactor: grossLoss ? Math.round((grossWin / grossLoss) * 100) / 100 : grossWin ? null : 0,
    maxDrawdownR: maxDrawdown / 100,
    averageWinR: wins.length ? Math.round(grossWin / wins.length) / 100 : null,
    averageLossR: losses.length ? Math.round(grossLoss / losses.length) / 100 : null,
  };
}

function reconciliationGap(actual, replay) {
  const difference = (a, b) => a === null || b === null ? null : Math.round((a - b) * 100) / 100;
  return {
    trades: actual.trades - replay.trades,
    totalR: difference(actual.totalR, replay.totalR),
    winRatePoints: difference(actual.winRatePercent, replay.winRatePercent),
    expectancyR: difference(actual.expectancyR, replay.expectancyR),
    profitFactor: difference(actual.profitFactor, replay.profitFactor),
    maxDrawdownR: difference(actual.maxDrawdownR, replay.maxDrawdownR),
    averageWinR: difference(actual.averageWinR, replay.averageWinR),
    averageLossR: difference(actual.averageLossR, replay.averageLossR),
  };
}

function reconciliationSession(time) {
  const [hour = 0, minute = 0] = String(time || "00:00").split(":").map(Number);
  const minutes = hour * 60 + minute;
  if (minutes >= 6 * 60 && minutes < 14 * 60) return "Asian";
  if (minutes >= 14 * 60 && minutes < 19 * 60) return "London";
  if (minutes >= 19 * 60 || minutes < 2 * 60) return "New York";
  return "Transition";
}

function reconciliationDimensions(live, replay, keyFn) {
  const labels = [...new Set([...live.map(keyFn), ...replay.map(keyFn)].filter(Boolean))];
  return labels.map((label) => {
    const actualRecords = live.filter((record) => keyFn(record) === label);
    const replayRecords = replay.filter((record) => keyFn(record) === label);
    const actual = reconciliationStats(actualRecords);
    const backtest = reconciliationStats(replayRecords);
    return { label, actual, backtest, gap: reconciliationGap(actual, backtest) };
  }).sort((a, b) => Math.abs(b.gap.totalR || 0) - Math.abs(a.gap.totalR || 0) || b.actual.trades + b.backtest.trades - a.actual.trades - a.backtest.trades || a.label.localeCompare(b.label));
}

function matchMonthlyExecutions(live, replay) {
  const unusedReplay = new Set(replay.map((record) => record.id));
  const matches = [];
  const extraLive = [];
  const minutes = (time) => {
    const [hour = 0, minute = 0] = String(time || "00:00").split(":").map(Number);
    return hour * 60 + minute;
  };
  live.forEach((actual) => {
    const candidates = replay.filter((tested) => unusedReplay.has(tested.id) && tested.date === actual.date && normalizePair(tested.pair) === normalizePair(actual.pair) && String(tested.setup || "").toLowerCase() === String(actual.setup || "").toLowerCase() && tested.direction === actual.direction);
    const matched = candidates.sort((a, b) => Math.abs(minutes(a.time) - minutes(actual.time)) - Math.abs(minutes(b.time) - minutes(actual.time)))[0];
    if (!matched) {
      extraLive.push({ id: actual.id, date: actual.date, time: actual.time, pair: actual.pair, setup: actual.setup, direction: actual.direction, pnlR: actual.pnlR, notes: actual.notes || "" });
      return;
    }
    unusedReplay.delete(matched.id);
    matches.push({
      key: `${actual.date}|${actual.pair}|${actual.setup}|${actual.direction}`,
      live: { id: actual.id, time: actual.time, pnlR: actual.pnlR, notes: actual.notes || "" },
      backtest: { id: matched.id, time: matched.time, pnlR: matched.pnlR, notes: matched.notes || "" },
      entryTimeDifferenceMinutes: Math.abs(minutes(actual.time) - minutes(matched.time)),
      resultGapR: Math.round((Number(actual.pnlR || 0) - Number(matched.pnlR || 0)) * 100) / 100,
    });
  });
  return {
    method: "Exact date + pair + setup + direction; duplicate candidates matched by nearest recorded entry time.",
    matched: matches,
    extraLive,
    replayOnly: replay.filter((record) => unusedReplay.has(record.id)).map(({ id, date, time, pair, setup, direction, pnlR, notes }) => ({ id, date, time, pair, setup, direction, pnlR, notes: notes || "" })),
  };
}

function journalEvidenceForMonth(journals, month) {
  const stopwords = new Set(["that", "this", "with", "from", "have", "were", "your", "trade", "trades", "forecast", "backtest", "actual", "month", "then", "when", "what", "into", "just", "also", "because", "about", "there", "their", "they", "them"]);
  const entries = journals.filter((row) => {
    const content = String(row.content || "");
    return String(row.entry_date || "").startsWith(month) && !content.startsWith(JARVIS_FORECAST_REVIEW_PREFIX) && !content.startsWith(JARVIS_LEARNING_PREFIX);
  }).map((row) => {
    const rawContent = String(row.content || "");
    const content = rawContent.startsWith(JOURNALY_MONTHLY_PREFIX) ? rawContent.replace(/^\[\[JOURNALY_MONTHLY:[^\]]+\]\]\s*/, "") : rawContent;
    return { id: row.id, date: row.entry_date, pair: row.pair || null, content: content.slice(0, 1800), advice: String(row.advice || "").slice(0, 900) };
  });
  const counts = new Map();
  entries.forEach((entry) => `${entry.content} ${entry.advice}`.toLowerCase().match(/[a-z][a-z'-]{3,}/g)?.forEach((word) => {
    if (!stopwords.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
  }));
  return { entries, recurringTerms: [...counts.entries()].filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 15).map(([term, count]) => ({ term, count })) };
}

function monthlyReconciliationResult(trades, backtests, forecasts, journals, month) {
  const live = trades.filter((record) => String(record.date || "").startsWith(month));
  const replay = backtests.filter((record) => String(record.date || "").startsWith(month));
  const actual = reconciliationStats(live);
  const backtest = reconciliationStats(replay);
  const matching = matchMonthlyExecutions(live, replay);
  const resolvedForecasts = forecasts.filter((record) => String(record.date || "").startsWith(month) && record.status !== "Waiting");
  const forecastReviews = journals.map(decodeForecastReview).filter((review) => review && String(review.forecastDate || "").startsWith(month));
  const forecastLearning = aggregateForecastReviews(forecastReviews, month);
  const journalEvidence = journalEvidenceForMonth(journals, month);
  const pairBreakdown = reconciliationDimensions(live, replay, (record) => record.pair);
  const setupBreakdown = reconciliationDimensions(live, replay, (record) => record.setup);
  const sessionBreakdown = reconciliationDimensions(live, replay, (record) => reconciliationSession(record.time));
  const executionGap = reconciliationGap(actual, backtest);
  const monthEnd = new Date(`${month}-01T00:00:00Z`);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const monthClosed = monthEnd.getTime() <= Date.now();
  const observed = [
    { statement: `Live minus replay total is ${executionGap.totalR}R.`, evidence: "observed" },
    { statement: `${live.length} live trades versus ${replay.length} replay trades; ${matching.extraLive.length} live records have no exact replay counterpart and ${matching.replayOnly.length} replay records have no exact live counterpart.`, evidence: "observed" },
    ...pairBreakdown.slice(0, 3).map((row) => ({ statement: `${row.label} live-minus-replay gap is ${row.gap.totalR}R across ${row.actual.trades} live and ${row.backtest.trades} replay trades.`, evidence: "observed" })),
  ];
  const supported = [];
  if (matching.extraLive.length >= 3 && live.length >= 5) supported.push({ statement: "Live frequency exceeded the exact replay-qualified set in this month.", evidence: "supported", support: `${matching.extraLive.length} unmatched live trades across ${live.length} live records.` });
  if (forecastLearning.sampleSize >= 5 && forecastLearning.direction.known >= 5) supported.push({ statement: "Resolved forecast evidence is large enough to compare directional forecasting with execution for this month.", evidence: "supported", support: `${forecastLearning.direction.fraction} directionally correct across known reviewed outcomes.` });
  const hypotheses = [
    { statement: "Overtrading or looser live setup selection may explain part of the gap.", evidence: "hypothesis_requires_review", verifyWith: "Inspect unmatched live records against replay inclusion rules and their notes." },
    { statement: "Replay hindsight, spreads, rule changes, or different entry interpretation may explain part of the gap.", evidence: "hypothesis_requires_review", verifyWith: "Compare matched record screenshots, timestamps, and contemporaneous journal notes." },
  ];
  return {
    source: "monthly_live_backtest_reconciliation",
    calculation: "deterministic_authenticated_records",
    month,
    monthClosed,
    ready: monthClosed && live.length > 0 && replay.length > 0,
    coverage: { liveTrades: live.length, backtests: replay.length, resolvedForecasts: resolvedForecasts.length, reviewedForecasts: forecastReviews.length, journalEntries: journalEvidence.entries.length },
    metrics: { actual, backtest, gap: executionGap },
    breakdowns: { byPair: pairBreakdown, bySetup: setupBreakdown, bySession: sessionBreakdown },
    executionMatching: matching,
    forecastEvidence: {
      reviewCoverage: `${forecastReviews.length}/${resolvedForecasts.length}`,
      aggregate: forecastLearning,
      skipped: resolvedForecasts.filter((forecast) => forecast.status === "Skipped"),
      invalidated: resolvedForecasts.filter((forecast) => forecast.status === "Invalidated"),
    },
    journalEvidence,
    findings: { observed, supported, hypotheses },
    guardrails: ["Metrics and matching are deterministic.", "Record matching indicates correspondence, not causation.", "Hypotheses require record-level review.", "No reconciliation may automatically change a strategy rule."],
  };
}

function monthlyReconciliationSeries(trades, backtests, forecasts, journals, requestedMonth, monthCount) {
  if (requestedMonth) return monthlyReconciliationResult(trades, backtests, forecasts, journals, requestedMonth);
  const available = [...new Set([...trades, ...backtests].map((record) => String(record.date || "").slice(0, 7)).filter((month) => /^\d{4}-\d{2}$/.test(month)))]
    .filter((month) => {
      const end = new Date(`${month}-01T00:00:00Z`);
      end.setUTCMonth(end.getUTCMonth() + 1);
      return end.getTime() <= Date.now() && trades.some((record) => String(record.date || "").startsWith(month)) && backtests.some((record) => String(record.date || "").startsWith(month));
    })
    .sort().reverse().slice(0, monthCount);
  const reports = available.map((month) => monthlyReconciliationResult(trades, backtests, forecasts, journals, month));
  const summarizeBreakdowns = (dimension) => {
    const labels = [...new Set(reports.flatMap((report) => report.breakdowns[dimension].map((row) => row.label)))];
    return labels.map((label) => {
      const rows = reports.flatMap((report) => report.breakdowns[dimension].filter((row) => row.label === label).map((row) => ({ month: report.month, ...row })));
      return {
        label,
        monthsPresent: rows.length,
        liveTrades: rows.reduce((sum, row) => sum + row.actual.trades, 0),
        replayTrades: rows.reduce((sum, row) => sum + row.backtest.trades, 0),
        cumulativeGapR: Math.round(rows.reduce((sum, row) => sum + Number(row.gap.totalR || 0), 0) * 100) / 100,
        monthlyGaps: rows.map((row) => ({ month: row.month, gapR: row.gap.totalR })),
      };
    }).sort((a, b) => Math.abs(b.cumulativeGapR) - Math.abs(a.cumulativeGapR) || b.monthsPresent - a.monthsPresent || a.label.localeCompare(b.label));
  };
  const totalActualR = Math.round(reports.reduce((sum, report) => sum + report.metrics.actual.totalR, 0) * 100) / 100;
  const totalBacktestR = Math.round(reports.reduce((sum, report) => sum + report.metrics.backtest.totalR, 0) * 100) / 100;
  return {
    source: "rolling_monthly_live_backtest_reconciliation",
    calculation: "deterministic_authenticated_records",
    requestedMonths: monthCount,
    monthsIncluded: available,
    totals: {
      actualR: totalActualR,
      backtestR: totalBacktestR,
      gapR: Math.round((totalActualR - totalBacktestR) * 100) / 100,
      liveTrades: reports.reduce((sum, report) => sum + report.metrics.actual.trades, 0),
      backtests: reports.reduce((sum, report) => sum + report.metrics.backtest.trades, 0),
      matched: reports.reduce((sum, report) => sum + report.executionMatching.matched.length, 0),
      extraLive: reports.reduce((sum, report) => sum + report.executionMatching.extraLive.length, 0),
      replayOnly: reports.reduce((sum, report) => sum + report.executionMatching.replayOnly.length, 0),
    },
    recurringGaps: { byPair: summarizeBreakdowns("byPair"), bySetup: summarizeBreakdowns("bySetup"), bySession: summarizeBreakdowns("bySession") },
    reports,
    guardrails: ["Cross-month totals and gaps are deterministic.", "Recurrence means a label appeared across month records; it does not prove causation.", "No reconciliation may automatically change a strategy rule."],
  };
}

const ARCHIVE_SESSIONS = [
  { name: "Asian", start: 5 * 60, end: 16 * 60 },
  { name: "London", start: 15 * 60, end: 24 * 60 },
  { name: "New York", start: 20 * 60, end: 29 * 60 },
];

function archiveSessionsForTime(time) {
  const [hour = 0, minute = 0] = String(time || "00:00").split(":").map(Number);
  const total = hour * 60 + minute;
  const adjusted = total < 5 * 60 ? total + 24 * 60 : total;
  const sessions = ARCHIVE_SESSIONS.filter((session) => adjusted >= session.start && adjusted < session.end).map((session) => session.name);
  return sessions.length ? sessions : ["Transition"];
}

function archiveStats(records) {
  const stats = reconciliationStats(records);
  const maeValues = records.map((record) => finiteNumber(record.mae)).filter((value) => value !== null);
  return {
    ...stats,
    averageMaeR: maeValues.length ? Math.round((maeValues.reduce((sum, value) => sum + value, 0) / maeValues.length) * 100) / 100 : null,
  };
}

function archiveGroups(records, keyFn) {
  const expanded = records.flatMap((record) => {
    const labels = keyFn(record);
    return (Array.isArray(labels) ? labels : [labels]).filter(Boolean).map((label) => ({ label: String(label), record }));
  });
  return [...new Set(expanded.map((item) => item.label))].map((label) => {
    const groupRecords = expanded.filter((item) => item.label === label).map((item) => item.record);
    return { label, ...archiveStats(groupRecords) };
  }).sort((a, b) => b.totalR - a.totalR || b.trades - a.trades || a.label.localeCompare(b.label));
}

function archiveFilters(records, args) {
  return records.filter((record) =>
    (!args.pair || normalizePair(record.pair) === normalizePair(args.pair)) &&
    (!args.setup || matchesText(record.setup, args.setup)) &&
    (!args.direction || record.direction === args.direction) &&
    (!args.quality || (args.quality === "Unrated" ? !record.executionQuality : record.executionQuality === args.quality)) &&
    (!args.month || String(record.date || "").startsWith(args.month)) &&
    (!args.year || String(record.date || "").startsWith(`${args.year}-`))
  );
}

function archiveViewResult(data, args) {
  const live = (Array.isArray(data.trades) ? data.trades : []).map((record) => ({ ...record, source: "live" }));
  const backtest = (Array.isArray(data.backtests) ? data.backtests : []).map((record) => ({ ...record, source: "backtest", executionQuality: null, mae: record.mae ?? null }));
  const sourceRecords = args.source === "live" ? live : args.source === "backtest" ? backtest : [...live, ...backtest];
  const records = archiveFilters(sourceRecords, args);
  const base = { source: "trade_archive_full_access", calculation: "deterministic_authenticated_records", view: args.view, filters: args, recordsIncluded: records.length, dataCoverage: { live: live.length, backtest: backtest.length } };
  const byPair = () => archiveGroups(records, (record) => record.pair);
  const bySetup = () => archiveGroups(records, (record) => record.setup);
  const byDirection = () => archiveGroups(records, (record) => record.direction);
  const byOutcome = () => archiveGroups(records, (record) => record.outcome || "Unrecorded");
  const byQuality = () => archiveGroups(records, (record) => record.executionQuality || "Unrated");

  if (args.view === "trades") return { ...base, totalMatching: records.length, records: records.slice(0, args.limit) };
  if (args.view === "images") {
    const inventory = archiveFilters((data.imageInventory || []).filter((item) => args.source === "both" || item.source === args.source), args);
    return { ...base, totalImages: inventory.length, records: inventory.slice(0, args.limit), note: "This inventory authoritatively identifies stored charts. A specific chart is visually analyzed only when selected or attached to the current Jarvis request." };
  }
  if (args.view === "forecast") {
    const forecasts = archiveFilters((data.forecasts || []).map((record) => ({ ...record, executionQuality: null })), args);
    const statuses = Object.fromEntries(["Waiting", "Taken", "Invalidated", "Skipped"].map((status) => [status, forecasts.filter((record) => record.status === status).length]));
    return { ...base, recordsIncluded: forecasts.length, statuses, records: forecasts.slice(0, args.limit), learning: forecastLearningResult(data.journals || [], data.forecasts || [], { pair: args.pair, setup: args.setup, month: args.month, limit: args.limit }) };
  }
  if (args.view === "calendar") {
    const days = archiveGroups(records, (record) => record.date).sort((a, b) => b.label.localeCompare(a.label));
    return { ...base, summary: archiveStats(records), days: days.slice(0, args.limit) };
  }
  if (args.view === "heatmap") {
    const months = archiveGroups(records, (record) => String(record.date || "").slice(0, 7)).sort((a, b) => b.label.localeCompare(a.label));
    const weekdays = archiveGroups(records, (record) => {
      const date = new Date(`${record.date}T12:00:00Z`);
      return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getUTCDay()];
    });
    const monthWeekday = archiveGroups(records, (record) => {
      const date = new Date(`${record.date}T12:00:00Z`);
      return `${String(record.date).slice(0, 7)} · ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getUTCDay()]}`;
    });
    return { ...base, summary: archiveStats(records), months, weekdays, monthWeekday: monthWeekday.slice(0, args.limit) };
  }
  if (args.view === "week_edge") {
    const template = [[1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"]];
    const days = template.map(([dayIndex, label]) => {
      const dayRecords = records.filter((record) => new Date(`${record.date}T12:00:00Z`).getUTCDay() === dayIndex);
      return { label, ...archiveStats(dayRecords), tradeTimes: archiveGroups(dayRecords, (record) => record.time).sort((a, b) => a.label.localeCompare(b.label)) };
    });
    const active = days.filter((day) => day.trades > 0);
    return { ...base, days, successfulDays: active.filter((day) => day.totalR > 0).length, bestDay: [...active].sort((a, b) => b.totalR - a.totalR)[0] || null, mostActiveDay: [...active].sort((a, b) => b.trades - a.trades || b.totalR - a.totalR)[0] || null };
  }
  if (args.view === "edge_clock") {
    const startHour = args.period === "AM" ? 0 : args.period === "PM" ? 12 : null;
    const clockRecords = startHour === null ? records : records.filter((record) => { const hour = Number(String(record.time || "00").slice(0, 2)); return hour >= startHour && hour < startHour + 12; });
    const hours = Array.from({ length: startHour === null ? 24 : 12 }, (_, index) => (startHour ?? 0) + index).map((hour) => {
      const hourRecords = clockRecords.filter((record) => Number(String(record.time || "00").slice(0, 2)) === hour);
      return { hour, label: `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`, ...archiveStats(hourRecords), exactTimes: archiveGroups(hourRecords, (record) => record.time) };
    });
    const active = hours.filter((hour) => hour.trades > 0);
    return { ...base, summary: archiveStats(clockRecords), hours, bestHour: [...active].sort((a, b) => b.totalR - a.totalR)[0] || null, weakestHour: [...active].sort((a, b) => a.totalR - b.totalR)[0] || null };
  }
  if (args.view === "session_edge") {
    const bySession = archiveGroups(records, (record) => archiveSessionsForTime(record.time));
    const byCombo = archiveGroups(records, (record) => `${record.pair} · ${record.setup}`);
    const bySessionPair = archiveGroups(records, (record) => archiveSessionsForTime(record.time).map((session) => `${session} · ${record.pair}`));
    return { ...base, summary: archiveStats(records), bySession, byPair: byPair(), bySetup: bySetup(), byPairSetup: byCombo, bySessionPair, sessionWindows: [{ session: "Asian", localTime: "5:00 AM–4:00 PM" }, { session: "London", localTime: "3:00 PM–12:00 AM" }, { session: "New York", localTime: "8:00 PM–5:00 AM" }] };
  }
  if (args.view === "yearly") {
    const years = archiveGroups(records, (record) => String(record.date || "").slice(0, 4)).sort((a, b) => b.label.localeCompare(a.label));
    const pairYears = archiveGroups(records, (record) => `${String(record.date || "").slice(0, 4)} · ${record.pair}`);
    const setupYears = archiveGroups(records, (record) => `${String(record.date || "").slice(0, 4)} · ${record.setup}`);
    return { ...base, summary: archiveStats(records), years, pairYears, setupYears };
  }
  const pairRows = byPair();
  const setupRows = bySetup();
  return { ...base, summary: archiveStats(records), byPair: pairRows, bySetup: setupRows, byDirection: byDirection(), byOutcome: byOutcome(), byQuality: byQuality(), bestPair: pairRows[0] || null, weakestPair: [...pairRows].sort((a, b) => a.totalR - b.totalR)[0] || null, bestSetup: setupRows[0] || null, weakestSetup: [...setupRows].sort((a, b) => a.totalR - b.totalR)[0] || null };
}

function forecastEvidenceStage(sampleSize, knownDirection, consistencyPercent) {
  if (sampleSize < 5) return "Candidate";
  if (sampleSize >= 30 && knownDirection >= 25 && consistencyPercent !== null && consistencyPercent >= 75) return "Strong";
  if (sampleSize >= 12 && knownDirection >= 10 && consistencyPercent !== null && consistencyPercent >= 65) return "Supported";
  return "Emerging";
}

function aggregateForecastReviews(reviews, label) {
  const eligible = reviews.filter((review) => review.eligibleForAggregate === true);
  const directionKnown = eligible.filter((review) => review.directionOutcome === "Correct" || review.directionOutcome === "Incorrect");
  const directionCorrect = directionKnown.filter((review) => review.directionOutcome === "Correct").length;
  const directionIncorrect = directionKnown.length - directionCorrect;
  const directionalAccuracyPercent = directionKnown.length ? Math.round((directionCorrect / directionKnown.length) * 1000) / 10 : null;
  const consistencyPercent = directionKnown.length ? Math.round((Math.max(directionCorrect, directionIncorrect) / directionKnown.length) * 1000) / 10 : null;
  const entryKnown = eligible.filter((review) => review.entryCriteriaOutcome === "Completed" || review.entryCriteriaOutcome === "Not completed");
  const entryCompleted = entryKnown.filter((review) => review.entryCriteriaOutcome === "Completed").length;
  const executionAssessments = Object.fromEntries(["Correct take", "Correct skip", "Missed opportunity", "Invalidated thesis", "Insufficient evidence"].map((value) => [value, eligible.filter((review) => review.executionAssessment === value).length]));
  return {
    label,
    sampleSize: eligible.length,
    totalReviews: reviews.length,
    direction: { correct: directionCorrect, incorrect: directionIncorrect, known: directionKnown.length, unclear: eligible.length - directionKnown.length, accuracyPercent: directionalAccuracyPercent, fraction: `${directionCorrect}/${directionKnown.length}` },
    entryCriteria: { completed: entryCompleted, notCompleted: entryKnown.length - entryCompleted, known: entryKnown.length, unclear: eligible.length - entryKnown.length, completionPercent: entryKnown.length ? Math.round((entryCompleted / entryKnown.length) * 1000) / 10 : null, fraction: `${entryCompleted}/${entryKnown.length}` },
    executionAssessments,
    consistencyPercent,
    evidenceStage: forecastEvidenceStage(eligible.length, directionKnown.length, consistencyPercent),
    strategyRuleChangeAllowed: false,
  };
}

function forecastLearningResult(journals, forecasts, args) {
  const allReviews = journals.map(decodeForecastReview).filter(Boolean);
  const reviews = allReviews.filter((review) => (!args.pair || normalizePair(review.pair) === normalizePair(args.pair)) && (!args.setup || matchesText(review.setup, args.setup)) && (!args.month || String(review.forecastDate || "").startsWith(args.month)));
  const resolved = forecasts.filter((forecast) => forecast.status !== "Waiting" && (!args.pair || normalizePair(forecast.pair) === normalizePair(args.pair)) && (!args.setup || matchesText(forecast.setup, args.setup)) && (!args.month || String(forecast.date || "").startsWith(args.month)));
  const buildGroups = (keyFn) => [...new Set(reviews.map(keyFn).filter(Boolean))]
    .map((key) => aggregateForecastReviews(reviews.filter((review) => keyFn(review) === key), key))
    .sort((a, b) => b.sampleSize - a.sampleSize || a.label.localeCompare(b.label));
  return {
    source: "automatic_resolved_forecast_reviews",
    calculation: "deterministic_authenticated_records",
    filter: args,
    coverage: { resolvedForecasts: resolved.length, reviewedForecasts: reviews.length, unreviewedResolvedForecasts: Math.max(0, resolved.length - reviews.length), waitingForecastsExcluded: true },
    overall: aggregateForecastReviews(reviews, "All matching forecasts"),
    patterns: {
      bySetup: buildGroups((review) => review.setup),
      byPair: buildGroups((review) => review.pair),
      byPairAndSetup: buildGroups((review) => `${review.pair} · ${review.setup}`),
    },
    reviews: reviews.slice(0, args.limit),
    lifecycle: {
      Candidate: "1-4 eligible reviews",
      Emerging: "5+ eligible reviews without enough consistent known-direction evidence for Supported",
      Supported: "12+ eligible reviews, 10+ known directional outcomes, and at least 65% consistency",
      Strong: "30+ eligible reviews, 25+ known directional outcomes, and at least 75% consistency",
    },
    guardrail: "An insight may describe an observed pattern, but it never creates or changes a strategy rule automatically.",
  };
}

function verifiedStatisticsAnswer(result) {
  if (result?.unavailable) return `I could not verify ${result.unavailable} from the authenticated database, so I will not report a numeric result. Refresh Journaly or retry after the data connection recovers.`;
  if (result?.source === "automatic_resolved_forecast_reviews") {
    const overall = result.overall;
    const patternLines = result.patterns.bySetup.slice(0, 5).map((pattern) => `- ${pattern.label}: ${pattern.sampleSize} eligible review${pattern.sampleSize === 1 ? "" : "s"}, direction ${pattern.direction.fraction}${pattern.direction.accuracyPercent === null ? " (not enough known outcomes)" : ` (${pattern.direction.accuracyPercent}%)`}, ${pattern.evidenceStage}`);
    return `Verified forecast learning: ${result.coverage.reviewedForecasts}/${result.coverage.resolvedForecasts} resolved forecasts have automatic reviews; Waiting forecasts are excluded. Across ${overall.sampleSize} aggregate-eligible reviews, directional accuracy is ${overall.direction.fraction}${overall.direction.accuracyPercent === null ? " with no reliable percentage yet" : ` (${overall.direction.accuracyPercent}%)`}. Evidence stage: ${overall.evidenceStage}.\n\nSetup patterns:\n${patternLines.length ? patternLines.join("\n") : "- No eligible setup pattern yet."}\n\nThese figures were calculated deterministically from the stored reviews. They are evidence for an insight, not permission to change a strategy rule.`;
  }
  if (result?.source === "monthly_live_backtest_reconciliation") {
    const { actual, backtest, gap } = result.metrics;
    const largestPair = result.breakdowns.byPair[0];
    const largestSetup = result.breakdowns.bySetup[0];
    const lines = [
      `Verified ${result.month} reconciliation: replay ${backtest.totalR >= 0 ? "+" : ""}${backtest.totalR.toFixed(2)}R across ${backtest.trades} trades versus live ${actual.totalR >= 0 ? "+" : ""}${actual.totalR.toFixed(2)}R across ${actual.trades} trades; live-minus-replay gap ${gap.totalR >= 0 ? "+" : ""}${gap.totalR.toFixed(2)}R.`,
      `Exact record reconciliation found ${result.executionMatching.matched.length} matched execution${result.executionMatching.matched.length === 1 ? "" : "s"}, ${result.executionMatching.extraLive.length} extra live record${result.executionMatching.extraLive.length === 1 ? "" : "s"}, and ${result.executionMatching.replayOnly.length} replay-only record${result.executionMatching.replayOnly.length === 1 ? "" : "s"}.`,
    ];
    if (largestPair) lines.push(`Largest absolute pair gap: ${largestPair.label}, ${largestPair.gap.totalR >= 0 ? "+" : ""}${largestPair.gap.totalR.toFixed(2)}R (${largestPair.actual.trades} live vs ${largestPair.backtest.trades} replay).`);
    if (largestSetup) lines.push(`Largest absolute setup gap: ${largestSetup.label}, ${largestSetup.gap.totalR >= 0 ? "+" : ""}${largestSetup.gap.totalR.toFixed(2)}R (${largestSetup.actual.trades} live vs ${largestSetup.backtest.trades} replay).`);
    lines.push(`Forecast reviews cover ${result.forecastEvidence.reviewCoverage} resolved forecasts for the month; ${result.forecastEvidence.skipped.length} were Skipped.`);
    if (result.findings.supported.length) lines.push(`Supported finding: ${result.findings.supported[0].statement} ${result.findings.supported[0].support}`);
    lines.push(`Hypothesis requiring review: ${result.findings.hypotheses[0].statement} This is not proven by the totals alone.`);
    return `${lines.join("\n\n")}\n\nAll figures and matches were calculated from authenticated records. I can walk through the unmatched live trades or the largest pair/setup gap next.`;
  }
  if (result?.source === "rolling_monthly_live_backtest_reconciliation") {
    const pair = result.recurringGaps.byPair[0];
    const setup = result.recurringGaps.bySetup[0];
    return `Verified rolling reconciliation across ${result.monthsIncluded.length} completed month${result.monthsIncluded.length === 1 ? "" : "s"} (${result.monthsIncluded.join(", ")}): replay ${result.totals.backtestR >= 0 ? "+" : ""}${result.totals.backtestR.toFixed(2)}R versus live ${result.totals.actualR >= 0 ? "+" : ""}${result.totals.actualR.toFixed(2)}R, a ${result.totals.gapR >= 0 ? "+" : ""}${result.totals.gapR.toFixed(2)}R gap. Live frequency was ${result.totals.liveTrades} records versus ${result.totals.backtests} replay records; exact reconciliation found ${result.totals.extraLive} extra live and ${result.totals.replayOnly} replay-only records.${pair ? `\n\nLargest cumulative pair gap: ${pair.label}, ${pair.cumulativeGapR >= 0 ? "+" : ""}${pair.cumulativeGapR.toFixed(2)}R across ${pair.monthsPresent} month${pair.monthsPresent === 1 ? "" : "s"}.` : ""}${setup ? `\n\nLargest cumulative setup gap: ${setup.label}, ${setup.cumulativeGapR >= 0 ? "+" : ""}${setup.cumulativeGapR.toFixed(2)}R across ${setup.monthsPresent} month${setup.monthsPresent === 1 ? "" : "s"}.` : ""}\n\nThose are observed record-level gaps, not proof of why they occurred. I can inspect the matched and unmatched records month by month next.`;
  }
  if (result?.source === "trade_archive_full_access") {
    const summary = result.summary;
    if (result.view === "images") return `Verified chart inventory: ${result.totalImages} stored chart${result.totalImages === 1 ? "" : "s"} match those filters. I can identify them by date, pair, setup, direction, source, and record ID; select or name one for visual analysis.`;
    if (result.view === "trades") return `Verified archive records: ${result.totalMatching} trade${result.totalMatching === 1 ? "" : "s"} match those filters. The returned record list is sourced from the authenticated archive.`;
    if (result.view === "forecast") return `Verified Forecast view: ${result.recordsIncluded} matching forecast${result.recordsIncluded === 1 ? "" : "s"}. Statuses: ${Object.entries(result.statuses).map(([status, count]) => `${status} ${count}`).join(", ")}. Automatic forecast learning remains separate from strategy-rule changes.`;
    const best = result.bestDay || result.bestHour || result.bestPair || result.bySession?.[0] || result.years?.[0] || null;
    return `Verified ${String(result.view).replaceAll("_", " ")} view${summary ? `: ${summary.trades} record${summary.trades === 1 ? "" : "s"}, ${summary.totalR >= 0 ? "+" : ""}${summary.totalR.toFixed(2)}R, ${summary.winRatePercent == null ? "no win rate" : `${summary.winRatePercent}% win rate`}, ${summary.expectancyR == null ? "no expectancy" : `${summary.expectancyR.toFixed(2)}R expectancy`}, ${summary.profitFactor == null ? "unbounded profit factor" : `${summary.profitFactor.toFixed(2)} profit factor`}, and ${summary.maxDrawdownR.toFixed(2)}R max drawdown` : ` with ${result.recordsIncluded} matching records`}.${best ? ` Strongest displayed group: ${best.label}, ${best.totalR >= 0 ? "+" : ""}${best.totalR.toFixed(2)}R across ${best.trades} records.` : ""} All values were calculated deterministically from the authenticated archive.`;
  }
  if (result?.inventory) {
    const lines = Object.entries(result.inventory).map(([name, value]) => `${name}: ${value.count} record${value.count === 1 ? "" : "s"}${value.oldestDate ? ` (${value.oldestDate} to ${value.newestDate})` : ""}`);
    const unavailable = result.unavailableSurfaces?.length ? `\nUnavailable and not treated as zero: ${result.unavailableSurfaces.join(", ")}.` : "";
    return `Verified Journaly inventory:\n${lines.join("\n")}${unavailable}\n\nAll available counts came from the authenticated database and remain separated by record type.`;
  }
  if (result?.byStatus && result?.byOutcome) {
    return `Verified trade decision statistics: ${result.total} record${result.total === 1 ? "" : "s"}, ${result.totalResultR > 0 ? "+" : ""}${result.totalResultR.toFixed(2)}R documented result. Statuses: ${Object.entries(result.byStatus).map(([key, value]) => `${key} ${value}`).join(", ")}. Outcomes: ${Object.entries(result.byOutcome).map(([key, value]) => `${key} ${value}`).join(", ")}. Calculated deterministically from the authenticated database.`;
  }
  if (result?.live && result?.backtest && result?.gap) {
    const format = (label, stats) => `${label}: ${stats.sampleSize} record${stats.sampleSize === 1 ? "" : "s"}, ${stats.totalR > 0 ? "+" : ""}${stats.totalR.toFixed(2)}R, ${stats.winRate == null ? "no win rate" : `${stats.winRate}% win rate`}, ${stats.expectancyR == null ? "no expectancy" : `${stats.expectancyR.toFixed(2)}R expectancy`}`;
    const expectancyGap = result.gap.expectancyR == null ? "not available" : `${result.gap.expectancyR > 0 ? "+" : ""}${result.gap.expectancyR.toFixed(2)}R`;
    const winRateGap = result.gap.winRatePoints == null ? "not available" : `${result.gap.winRatePoints > 0 ? "+" : ""}${result.gap.winRatePoints.toFixed(1)} percentage points`;
    return `Verified live-versus-backtest comparison:\n${format("Live", result.live)}\n${format("Backtest", result.backtest)}\nGap: ${expectancyGap} expectancy and ${winRateGap} win rate. Each dataset was calculated separately from the authenticated database.`;
  }
  if (Object.hasOwn(result || {}, "documentedPlannedRiskPercent")) {
    return `Verified documented planned risk: ${Number(result.documentedPlannedRiskPercent || 0).toFixed(2)}% across ${result.activeForecastCount} active forecast${result.activeForecastCount === 1 ? "" : "s"}. This is Journaly planning data only; live broker risk is not connected.`;
  }
  if (result?.historicalPattern) {
    if (!result.totalMatching) return `No authenticated ${result.source} Journaly records match those filters. I will not claim that this is a historical pattern.`;
    const stats = result.statistics;
    const records = result.records.map((record) => `- ${record.date} · ${record.pair} ${record.setup} ${record.direction || ""} · ${record.outcome || "Unrecorded"} · ${record.pnlR > 0 ? "+" : ""}${record.pnlR.toFixed(2)}R · ID ${record.id}`).join("\n");
    if (result.totalMatching < 5) {
      return `Historical context only: ${result.totalMatching} exact matching ${result.source} record${result.totalMatching === 1 ? "" : "s"}. This sample is anecdotal and too small to influence a trade opinion, so I’m not presenting its win rate as an edge.\n\nExact records${result.totalMatching > result.records.length ? ` (showing ${result.records.length})` : ""}:\n${records}`;
    }
    return `Verified ${result.source} historical pattern: ${result.totalMatching} exact matching records (${result.evidenceStrength} evidence), ${stats.totalR > 0 ? "+" : ""}${stats.totalR.toFixed(2)}R total, ${stats.winRate == null ? "no win rate" : `${stats.winRate}% win rate`}.\n\nExact records${result.totalMatching > result.records.length ? ` (showing ${result.records.length})` : ""}:\n${records}`;
  }
  const stats = result?.statistics;
  if (!stats) return null;
  const label = result.label || result.source || "Journaly records";
  return `Verified ${label}: ${stats.sampleSize} record${stats.sampleSize === 1 ? "" : "s"}, ${stats.totalR > 0 ? "+" : ""}${stats.totalR.toFixed(2)}R total, ${stats.winRate == null ? "no win rate" : `${stats.winRate}% win rate`}, and ${stats.expectancyR == null ? "no expectancy" : `${stats.expectancyR.toFixed(2)}R expectancy`}. Breakdown: ${stats.wins} wins, ${stats.losses} losses, ${stats.breakEven} breakeven. Calculated deterministically from the authenticated database.`;
}

const SETUP_EVIDENCE_REQUIREMENTS = {
  "REVERSAL": [["structureVisible", "relevant structure"], ["momentumShiftVisible", "momentum shift"], ["triggerVisible", "confirmation trigger"]],
  "Internal reversal": [["structureVisible", "internal structure"], ["momentumShiftVisible", "opposing momentum"], ["triggerVisible", "internal trigger"]],
  "Liquidity sweep": [["liquidityContextVisible", "liquidity context"], ["sweepVisible", "liquidity sweep"], ["triggerVisible", "confirmation trigger"]],
  "Break and retest": [["trendVisible", "established direction"], ["structureVisible", "broken MRH/MRL"], ["retestVisible", "return to the broken level"], ["triggerVisible", "retest confirmation"]],
  "Flag": [["trendVisible", "established momentum"], ["consolidationVisible", "controlled flag/pullback"], ["triggerVisible", "continuation trigger"]],
  "Flag+": [["trendVisible", "established momentum"], ["consolidationVisible", "controlled flag/pullback"], ["triggerVisible", "continuation trigger"], ["higherTimeframeAlignmentVisible", "visible higher-timeframe alignment"]],
  "EU timed entry": [["sessionTimingVisible", "visible EU session window"], ["trendVisible", "clear session direction"], ["triggerVisible", "confirmed trigger"]],
};

function enforceChartEvidenceGate(assessment) {
  const safe = assessment && typeof assessment === "object" ? assessment : {};
  const setup = Object.hasOwn(SETUP_EVIDENCE_REQUIREMENTS, safe.setupCandidate) ? safe.setupCandidate : null;
  const features = safe.features && typeof safe.features === "object" ? safe.features : {};
  const requirements = setup ? SETUP_EVIDENCE_REQUIREMENTS[setup] : [];
  const gateMissing = requirements.filter(([key]) => features[key] !== true).map(([, label]) => label);
  const suppliedMissing = Array.isArray(safe.missingEvidence) ? safe.missingEvidence.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [];
  const visibleEvidence = Array.isArray(safe.visibleEvidence) ? safe.visibleEvidence.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()).slice(0, 8) : [];
  const conflictingEvidence = Array.isArray(safe.conflictingEvidence) ? safe.conflictingEvidence.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()).slice(0, 8) : [];
  const missingEvidence = [...new Set([...(setup ? [] : ["a reliably identifiable setup family"]), ...gateMissing, ...suppliedMissing])].slice(0, 8);
  const supportedCount = requirements.length - gateMissing.length;
  const ppaVisible = features.ppaQuality && features.ppaQuality !== "Unclear";
  const allRequired = Boolean(setup) && requirements.length > 0 && gateMissing.length === 0 && visibleEvidence.length >= 2 && ppaVisible && conflictingEvidence.length === 0;
  const partlySupported = Boolean(setup) && supportedCount >= Math.max(1, Math.ceil(requirements.length / 2)) && visibleEvidence.length > 0;
  const evidenceLevel = allRequired ? "Clear" : partlySupported ? "Partial" : "Insufficient";
  const proposedDecision = ["TAKE", "SKIP", "WATCH", "ARMED", "INVALIDATED"].includes(safe.decision) ? safe.decision : "WATCH";
  const decision = evidenceLevel === "Clear" ? proposedDecision : ["SKIP", "INVALIDATED"].includes(proposedDecision) ? proposedDecision : "WATCH";
  const coverage = requirements.length ? supportedCount / requirements.length : 0;
  const confidence = Math.max(20, Math.min(95, Math.round(30 + coverage * 45 + (ppaVisible ? 10 : 0) + Math.min(visibleEvidence.length, 3) * 4 - conflictingEvidence.length * 8)));
  return { setupCandidate: setup, direction: ["Long", "Short"].includes(safe.direction) ? safe.direction : null, decision, confidence, evidenceLevel, visibleEvidence, missingEvidence, conflictingEvidence, features };
}

function deterministicHistoricalMatches(assessment, trades, activePair) {
  if (!assessment?.setupCandidate) return { sampleSize: 0, evidenceStrength: "insufficient", records: [], statistics: setupStats([]) };
  const setupMatches = trades.filter((trade) => matchesText(trade.setup, assessment.setupCandidate));
  const ranked = setupMatches.map((trade) => {
    const matchedOn = ["same setup"];
    let score = 50;
    if (activePair && normalizePair(trade.pair) === normalizePair(activePair)) { score += 30; matchedOn.push("same pair"); }
    if (assessment.direction && String(trade.direction).toLowerCase() === assessment.direction.toLowerCase()) { score += 20; matchedOn.push("same direction"); }
    return { id: trade.id, date: trade.date, pair: trade.pair, setup: trade.setup, direction: trade.direction, outcome: trade.outcome, pnlR: Number(trade.pnlR || 0), quality: trade.executionQuality || null, score, matchedOn };
  }).sort((a, b) => b.score - a.score || String(b.date).localeCompare(String(a.date)) || String(a.id).localeCompare(String(b.id)));
  const strongest = ranked.filter((record) => record.score === ranked[0]?.score);
  const sample = strongest.length ? strongest : ranked;
  const sampleSize = sample.length;
  return {
    sampleSize,
    evidenceStrength: sampleSize >= 30 ? "stronger" : sampleSize >= 15 ? "moderate" : sampleSize >= 5 ? "early" : "anecdotal",
    records: sample.slice(0, 5),
    statistics: setupStats(sample),
  };
}

function verifiedChartAnswer(assessment, matches) {
  const setup = assessment.setupCandidate || "Unclear setup";
  const direction = assessment.direction ? ` ${assessment.direction}` : "";
  const lead = assessment.decision === "TAKE"
    ? "I like this. The mandatory pieces I need are visible, so this is a valid take from the chart provided."
    : assessment.decision === "ARMED"
      ? "I like the idea. It looks close, but I’d stay armed and let the trigger finish the job."
      : assessment.decision === "SKIP"
        ? "I don’t like this one. Something visible conflicts with the playbook, so I’d leave it alone."
        : assessment.decision === "INVALIDATED"
          ? "This idea has lost the condition that made it interesting, so I’d treat it as invalidated."
          : "I see what you’re looking at. I’d keep this on watch for now.";
  const observed = assessment.visibleEvidence.length
    ? assessment.visibleEvidence.slice(0, 3).join(" ")
    : "The screenshot does not give me enough clean setup detail to lean harder yet.";
  const caution = assessment.conflictingEvidence.length
    ? `What makes me cautious: ${assessment.conflictingEvidence.slice(0, 2).join(" ")}`
    : assessment.missingEvidence.length
      ? `The main thing I want is ${assessment.missingEvidence[0]}. I can’t verify that from this image; if you’ve confirmed it on your chart, move to the next condition rather than treating it as a failed rule.`
      : "I don’t see a missing mandatory condition in this view.";

  let history = "";
  if (matches.sampleSize > 0 && matches.sampleSize < 5) {
    const losses = Number(matches.statistics?.losses || 0);
    const wins = Number(matches.statistics?.wins || 0);
    const outcome = losses === matches.sampleSize
      ? matches.sampleSize === 1 ? "it was a loss" : `all ${losses} were losses`
      : wins === matches.sampleSize
        ? matches.sampleSize === 1 ? "it was a win" : `all ${wins} were wins`
        : `${wins} win${wins === 1 ? "" : "s"} and ${losses} loss${losses === 1 ? "" : "es"}`;
    history = `\n\nHistorical note: I found only ${matches.sampleSize} comparable live trade${matches.sampleSize === 1 ? "" : "s"}; ${outcome}. That sample is anecdotal, so it does not influence this call.`;
  } else if (matches.sampleSize >= 5) {
    const stats = matches.statistics;
    const weight = matches.sampleSize >= 30 ? "material" : matches.sampleSize >= 15 ? "meaningful but moderate" : "weak supporting";
    history = `\n\nHistorical context (${weight}, n=${matches.sampleSize}): ${stats.totalR > 0 ? "+" : ""}${stats.totalR.toFixed(2)}R total${stats.winRate == null ? "" : ` · ${stats.winRate}% win rate`}. ${matches.sampleSize >= 30 ? "This can influence the opinion, but it does not override the current chart." : "I’m keeping it secondary to the current chart."}`;
  }

  return `JARVIS — ${setup}${direction}\n\n${lead}\n\n${observed}\n\n${caution}${history}\n\nJarvis read: ${assessment.decision} · Confidence ${assessment.confidence}%`;
}

function isoDateInManila(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shiftIsoDate(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function completedPeriod(period, anchorDate) {
  const anchor = new Date(`${anchorDate}T00:00:00Z`);
  if (period === "month") {
    const currentStart = `${anchorDate.slice(0, 7)}-01`;
    const end = shiftIsoDate(currentStart, -1);
    return { start: `${end.slice(0, 7)}-01`, end, key: `month:${end.slice(0, 7)}`, label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${end}T00:00:00Z`)) };
  }
  const day = anchor.getUTCDay() || 7;
  const currentMonday = shiftIsoDate(anchorDate, 1 - day);
  const start = shiftIsoDate(currentMonday, -7);
  const end = shiftIsoDate(currentMonday, -1);
  return { start, end, key: `week:${start}`, label: `${start} to ${end}` };
}

function tradesWithin(trades, start, end) {
  return trades.filter((trade) => String(trade.date || "") >= start && String(trade.date || "") <= end);
}

function deterministicCoachingReport(trades, period, anchorDate) {
  const range = completedPeriod(period, anchorDate);
  const days = period === "month" ? Math.round((new Date(`${range.end}T00:00:00Z`) - new Date(`${range.start}T00:00:00Z`)) / 86400000) + 1 : 7;
  const previousEnd = shiftIsoDate(range.start, -1);
  const previousStart = shiftIsoDate(previousEnd, -(days - 1));
  const currentTrades = tradesWithin(trades, range.start, range.end);
  const previousTrades = tradesWithin(trades, previousStart, previousEnd);
  const current = setupStats(currentTrades);
  const previous = setupStats(previousTrades);
  const setupRows = [...new Set(currentTrades.map((trade) => trade.setup).filter(Boolean))].map((setup) => ({ setup, stats: setupStats(currentTrades.filter((trade) => trade.setup === setup)) })).sort((a, b) => b.stats.expectancyR - a.stats.expectancyR || b.stats.sampleSize - a.stats.sampleSize || a.setup.localeCompare(b.setup));
  const bestSetup = setupRows[0] || null;
  const weakReviews = current.quality.Mid + current.quality.Bad;
  const expectancyChange = current.expectancyR == null || previous.expectancyR == null ? null : Math.round((current.expectancyR - previous.expectancyR) * 100) / 100;
  const lines = [
    `Verified ${period === "month" ? "monthly" : "weekly"} coaching report · ${range.label}`,
    `${current.sampleSize} live trade${current.sampleSize === 1 ? "" : "s"} · ${current.totalR > 0 ? "+" : ""}${current.totalR.toFixed(2)}R · ${current.winRate == null ? "no win rate" : `${current.winRate}% win rate`} · ${current.expectancyR == null ? "no expectancy" : `${current.expectancyR.toFixed(2)}R expectancy`}`,
    `Execution reviews: ${current.quality.Good} Good, ${current.quality.Mid} Mid, ${current.quality.Bad} Bad${current.reviewed < current.sampleSize ? `; ${current.sampleSize - current.reviewed} unrated` : ""}.`,
  ];
  if (expectancyChange !== null) lines.push(`Expectancy changed ${expectancyChange > 0 ? "+" : ""}${expectancyChange.toFixed(2)}R versus the previous comparable period (${previous.sampleSize} trades).`);
  else lines.push(`There is not enough data for a reliable previous-period expectancy comparison.`);
  if (bestSetup) lines.push(`Best recorded setup in this period: ${bestSetup.setup}, ${bestSetup.stats.expectancyR.toFixed(2)}R expectancy across ${bestSetup.stats.sampleSize} trade${bestSetup.stats.sampleSize === 1 ? "" : "s"}.`);
  if (current.sampleSize < 5) lines.push(`Evidence warning: fewer than 5 trades makes this period anecdotal; do not change the playbook from this report alone.`);
  else if (weakReviews) lines.push(`Coaching focus: review the ${weakReviews} Mid/Bad execution${weakReviews === 1 ? "" : "s"} before changing strategy rules.`);
  else lines.push(`Coaching focus: keep recording quality labels so process improvement remains measurable independently of outcome.`);
  return { period, ...range, previousStart, previousEnd, statistics: current, previousStatistics: previous, setupRows, text: lines.join("\n\n"), calculation: "deterministic_authenticated_live_trades" };
}

function executeJournalyTool(name, args, data) {
  const trades = Array.isArray(data.trades) ? data.trades : [];
  const monthlyTrades = Array.isArray(data.monthlyTrades) ? data.monthlyTrades : trades;
  const backtests = Array.isArray(data.backtests) ? data.backtests : [];
  const forecasts = Array.isArray(data.forecasts) ? data.forecasts : [];
  const journals = Array.isArray(data.journals) ? data.journals : [];
  const daytradeLive = Array.isArray(data.daytradeLive) ? data.daytradeLive : [];
  const daytradeBacktests = Array.isArray(data.daytradeBacktests) ? data.daytradeBacktests : [];
  const tradingViewEvents = Array.isArray(data.tradingViewEvents) ? data.tradingViewEvents : [];
  const pairStates = Array.isArray(data.pairStates) ? data.pairStates : [];
  const notifications = Array.isArray(data.notifications) ? data.notifications : [];
  const filterRecords = (records) => records.filter((record) => (!args.pair || normalizePair(record.pair) === normalizePair(args.pair)) && (!args.setup || matchesText(record.setup, args.setup)) && (!args.month || String(record.date || "").startsWith(args.month)));
  switch (name) {
    case "get_user_profile":
      return data.profile;
    case "get_user_memories":
      return { memories: (data.memories || []).filter((memory) => !args.category || memory.category === args.category) };
    case "get_learning_records":
      return { records: [...(data.learningRecords || []), ...journals.map(decodeForecastReview).filter(Boolean).map((review) => ({ id: review.journalEntryId, date: review.forecastDate, source: "forecast", prompt: `${review.pair} ${review.setup} ${review.status}`, summary: review.learningCandidate }))].filter((record) => !args.source || record.source === args.source).slice(0, args.limit) };
    case "get_strategy_rules": {
      const rules = Array.isArray(JARVIS_STRATEGY_RULES) ? JARVIS_STRATEGY_RULES : JARVIS_STRATEGY_RULES?.rules || JARVIS_STRATEGY_RULES;
      return { strategyVersion: "v0.3", setup: args.setup, rules };
    }
    case "get_setup_examples":
      return { examples: JARVIS_REFERENCE_ANALYSES.filter((item) => (!args.setup || matchesText(item.sourceSetup, args.setup)) && (!args.pair || normalizePair(item.pair) === normalizePair(args.pair))).slice(0, args.limit) };
    case "get_trade":
      return { trade: args.latest || !args.id ? trades[0] || null : trades.find((trade) => trade.id === args.id) || null };
    case "get_recent_trades": {
      const filtered = trades.filter((trade) => (!args.pair || normalizePair(trade.pair) === normalizePair(args.pair)) && (!args.setup || matchesText(trade.setup, args.setup)) && (!args.month || String(trade.date || "").startsWith(args.month)));
      return { trades: filtered.slice(0, args.limit), totalMatching: filtered.length };
    }
    case "get_recent_backtests": {
      const filtered = filterRecords(backtests);
      return { source: "backtest", backtests: filtered.slice(0, args.limit), totalMatching: filtered.length };
    }
    case "get_backtest_statistics": {
      const filtered = filterRecords(backtests);
      return { source: "backtest", pair: args.pair, setup: args.setup, month: args.month, statistics: setupStats(filtered), dataCoverage: { recordsAvailable: backtests.length, oldestDate: backtests.at(-1)?.date || null, newestDate: backtests[0]?.date || null } };
    }
    case "get_backtest_visual_audit": {
      const filtered = JARVIS_BACKTEST_ANALYSES.filter((item) => (!args.pair || normalizePair(item.pair) === normalizePair(args.pair)) && (!args.setup || matchesText(item.setup, args.setup)) && (!args.grade || item.technicalGrade === args.grade) && (!args.ppaAlignment || item.ppaAlignment === args.ppaAlignment) && (!args.outcome || matchesText(item.result, args.outcome)));
      return {
        source: "independent_backtest_visual_audit",
        methodology: JARVIS_BACKTEST_AUDIT_SUMMARY.methodology,
        libraryCoverage: JARVIS_BACKTEST_AUDIT_SUMMARY,
        totalMatching: filtered.length,
        aggregate: {
          grades: Object.fromEntries(["Good", "Mid", "Bad", "Unclear"].map((grade) => [grade, filtered.filter((item) => item.technicalGrade === grade).length])),
          ppaAlignment: Object.fromEntries(["aligned", "countertrend", "mixed", "unclear"].map((alignment) => [alignment, filtered.filter((item) => item.ppaAlignment === alignment).length])),
          triggerQuality: Object.fromEntries(["clear", "partial", "weak", "unclear"].map((quality) => [quality, filtered.filter((item) => item.triggerQuality === quality).length])),
        },
        examples: filtered.slice(0, args.limit).map(({ id, date, pair, setup, direction, result, pnlR, labelCheck, technicalGrade, setupMatchConfidence, ppaAlignment, triggerQuality, summary, visibleEvidence, concerns, visibilityLimits, reusableLesson, patternTags }) => ({ id, date, pair, setup, direction, recordedOutcome: result, recordedR: pnlR, labelCheck, technicalGrade, setupMatchConfidence, ppaAlignment, triggerQuality, summary, visibleEvidence, concerns, visibilityLimits, reusableLesson, patternTags })),
      };
    }
    case "compare_live_vs_backtest": {
      const liveFiltered = filterRecords(trades);
      const backtestFiltered = filterRecords(backtests);
      const live = setupStats(liveFiltered);
      const historical = setupStats(backtestFiltered);
      return {
        filter: { pair: args.pair, setup: args.setup, month: args.month },
        live,
        backtest: historical,
        gap: {
          expectancyR: live.expectancyR == null || historical.expectancyR == null ? null : Math.round((live.expectancyR - historical.expectancyR) * 100) / 100,
          winRatePoints: live.winRate == null || historical.winRate == null ? null : Math.round((live.winRate - historical.winRate) * 10) / 10,
        },
      };
    }
    case "get_active_forecasts":
      return { forecasts: forecasts.filter((forecast) => forecast.status === "Waiting" && (!args.pair || normalizePair(forecast.pair) === normalizePair(args.pair))) };
    case "get_forecasts": {
      const filtered = forecasts.filter((forecast) => (!args.pair || normalizePair(forecast.pair) === normalizePair(args.pair)) && (!args.setup || matchesText(forecast.setup, args.setup)) && (!args.status || forecast.status === args.status) && (!args.month || String(forecast.date || "").startsWith(args.month)));
      return { forecasts: filtered.slice(0, args.limit), totalMatching: filtered.length, totalAvailable: forecasts.length, filter: args, dataCoverage: dateCoverage(forecasts) };
    }
    case "get_forecast_learning":
      if ((data.unavailableSurfaces || []).includes("journalEntries")) return { unavailable: "forecast reviews" };
      return forecastLearningResult(journals, forecasts, args);
    case "get_monthly_reconciliation":
      if ((data.unavailableSurfaces || []).some((surface) => ["trades", "backtests", "tradeDecisions", "journalEntries"].includes(surface))) return { unavailable: "monthly reconciliation evidence" };
      return monthlyReconciliationSeries(trades, backtests, forecasts, journals, args.month, args.months);
    case "get_archive_view":
      return archiveViewResult(data, args);
    case "get_skipped_trades": {
      const skipped = forecasts.filter((forecast) => forecast.status === "Invalidated" || forecast.status === "Skipped");
      return { decisions: skipped.filter((forecast) => (!args.pair || normalizePair(forecast.pair) === normalizePair(args.pair)) && (!args.setup || matchesText(forecast.setup, args.setup))).slice(0, args.limit) };
    }
    case "get_pair_state": {
      const pair = normalizePair(args.pair);
      const pairTrades = trades.filter((trade) => normalizePair(trade.pair) === pair);
      const pairBacktests = backtests.filter((trade) => normalizePair(trade.pair) === pair);
      return { pair, recentTrades: pairTrades.slice(0, 12), recentBacktests: pairBacktests.slice(0, 12), activeForecasts: forecasts.filter((forecast) => forecast.status === "Waiting" && normalizePair(forecast.pair) === pair), liveStatistics: setupStats(pairTrades), backtestStatistics: setupStats(pairBacktests) };
    }
    case "get_setup_statistics": {
      const filtered = trades.filter((trade) => matchesText(trade.setup, args.setup) && (!args.month || String(trade.date || "").startsWith(args.month)));
      return { setup: args.setup, month: args.month, statistics: setupStats(filtered), dataCoverage: { recordsAvailable: trades.length, oldestDate: trades.at(-1)?.date || null, newestDate: trades[0]?.date || null } };
    }
    case "get_monthly_performance": {
      const months = monthlyPerformance(monthlyTrades, args.year);
      return { source: "live_trades", ledgerSource: data.monthlyLedgerSource || "authenticated_client_snapshot", year: args.year, calculation: "integer_hundredths_of_R", months, bestMonth: months[0] || null, recordsIncluded: months.reduce((sum, month) => sum + month.tradeCount, 0), allMonthsVerified: months.every((month) => month.arithmeticVerified) };
    }
    case "get_journaly_inventory":
      return { inventory: { liveTrades: dateCoverage(trades), backtests: dateCoverage(backtests), tradeDecisions: dateCoverage(forecasts), journalEntries: dateCoverage(journals, "entry_date"), daytradeLive: dateCoverage(daytradeLive, "trade_date"), daytradeBacktests: dateCoverage(daytradeBacktests, "trade_date"), tradingViewEvents: dateCoverage(tradingViewEvents, "event_timestamp"), watchedPairs: dateCoverage(pairStates, "last_candle_timestamp"), jarvisNotifications: dateCoverage(notifications, "created_at") }, unavailableSurfaces: data.unavailableSurfaces || [] };
    case "get_live_trade_statistics": {
      const filtered = trades.filter((trade) => (!args.pair || normalizePair(trade.pair) === normalizePair(args.pair)) && (!args.setup || matchesText(trade.setup, args.setup)) && (!args.direction || trade.direction === args.direction) && (!args.quality || trade.executionQuality === args.quality) && (!args.year || String(trade.date || "").startsWith(`${args.year}-`)) && (!args.month || String(trade.date || "").startsWith(args.month)));
      return { label: "live trade statistics", filter: args, statistics: deterministicStats(filtered), dataCoverage: dateCoverage(trades) };
    }
    case "get_decision_statistics": {
      const filtered = forecasts.filter((item) => (!args.pair || normalizePair(item.pair) === normalizePair(args.pair)) && (!args.setup || matchesText(item.setup, args.setup)) && (!args.year || String(item.date || "").startsWith(`${args.year}-`)));
      const byStatus = Object.fromEntries(["Waiting", "Taken", "Invalidated", "Skipped"].map((status) => [status, filtered.filter((item) => item.status === status).length]));
      const byOutcome = Object.fromEntries(["Won", "Lost", "Breakeven", "Avoided loss", "Cost opportunity", "Unknown"].map((outcome) => [outcome, filtered.filter((item) => item.outcome === outcome).length]));
      return { label: "trade decision statistics", filter: args, total: filtered.length, totalResultR: Math.round(filtered.reduce((sum, item) => sum + Math.round(Number(item.resultR || 0) * 100), 0)) / 100, byStatus, byOutcome, dataCoverage: dateCoverage(forecasts) };
    }
    case "get_daytrade_statistics": {
      const surface = args.source === "live" ? "daytradeLive" : "daytradeBacktests";
      if ((data.unavailableSurfaces || []).includes(surface)) return { unavailable: surface };
      const source = args.source === "live" ? daytradeLive : daytradeBacktests;
      const filtered = source.filter((item) => (!args.pair || normalizePair(item.pair) === normalizePair(args.pair)) && (!args.entryType || matchesText(item.entry_type, args.entryType)) && (!args.year || String(item.trade_date || "").startsWith(`${args.year}-`)));
      return { label: `day-trade ${args.source} statistics`, source: args.source, filter: args, statistics: deterministicStats(filtered, "result_r"), dataCoverage: dateCoverage(source, "trade_date") };
    }
    case "get_journal_entries":
      if ((data.unavailableSurfaces || []).includes("journalEntries")) return { unavailable: "journal entries" };
      {
        const personalEntries = journals.filter((item) => !isJarvisInternalJournalContent(item.content));
        return { entries: personalEntries.filter((item) => (!args.pair || normalizePair(item.pair) === normalizePair(args.pair)) && (!args.year || String(item.entry_date || "").startsWith(`${args.year}-`))).slice(0, args.limit), totalAvailable: personalEntries.length };
      }
    case "get_tradingview_state": {
      if ((data.unavailableSurfaces || []).some((surface) => ["tradingViewEvents", "pairStates", "notifications"].includes(surface))) return { unavailable: "TradingView/Jarvis state" };
      const matches = (item) => (!args.ticker || normalizePair(item.ticker) === normalizePair(args.ticker)) && (!args.timeframe || String(item.timeframe) === String(args.timeframe));
      return { events: tradingViewEvents.filter(matches).slice(0, args.limit), pairStates: pairStates.filter(matches), notifications: notifications.filter(matches).slice(0, args.limit) };
    }
    case "find_historical_patterns": {
      const surface = args.source === "live" ? "trades" : "backtests";
      if ((data.unavailableSurfaces || []).includes(surface)) return { unavailable: `${args.source} historical records` };
      const source = args.source === "live" ? trades : backtests;
      const filtered = source.filter((record) => (!args.pair || normalizePair(record.pair) === normalizePair(args.pair)) && (!args.setup || matchesText(record.setup, args.setup)) && (!args.direction || String(record.direction).toLowerCase() === args.direction.toLowerCase()) && (!args.outcome || String(record.outcome).toLowerCase() === args.outcome.toLowerCase()) && (!args.quality || record.executionQuality === args.quality));
      const evidenceStrength = filtered.length >= 30 ? "stronger" : filtered.length >= 15 ? "moderate" : filtered.length >= 5 ? "early" : "anecdotal";
      return { historicalPattern: true, source: args.source, filter: args, totalMatching: filtered.length, evidenceStrength, statistics: setupStats(filtered), records: filtered.slice(0, args.limit).map(({ id, date, pair, setup, direction, outcome, pnlR, executionQuality }) => ({ id, date, pair, setup, direction, outcome, pnlR: Number(pnlR || 0), quality: executionQuality || null })) };
    }
    case "get_account_risk": {
      const active = forecasts.filter((forecast) => forecast.status === "Waiting");
      const currencies = active.flatMap((item) => [String(item.pair || "").slice(0, 3), String(item.pair || "").slice(3)]).filter(Boolean);
      const byCurrency = Object.fromEntries([...new Set(currencies)].map((currency) => [currency, currencies.filter((item) => item === currency).length]));
      return { activeForecastCount: active.length, byCurrency, plannedRiskTracked: false, liveBrokerRiskConnected: false };
    }
    case "get_session_state":
      return data.sessionState || {};
    case "get_trade_journey": {
      const pair = args.pair || data.sessionState?.activePair || null;
      const events = journeyFromJournal(journals, pair).filter((event) => (!args.forecastId || event.forecastId === args.forecastId) && (!args.tradeId || event.tradeId === args.tradeId));
      const relevantForecasts = forecasts.filter((item) => (!pair || normalizePair(item.pair) === normalizePair(pair)) && (!args.forecastId || item.id === args.forecastId)).slice(0, 20);
      const relevantTrades = trades.filter((item) => (!pair || normalizePair(item.pair) === normalizePair(pair)) && (!args.tradeId || item.id === args.tradeId)).slice(0, 20);
      return { pair, workspace: data.workspace || null, events, forecasts: relevantForecasts, trades: relevantTrades };
    }
    default:
      return { error: "Unknown Journaly tool." };
  }
}

async function authorizeOwner(request, env, requestedUserId) {
  const user = await authenticateUser(request, env, requestedUserId);
  if (!user || (requestedUserId && requestedUserId !== user.id)) {
    console.warn("[Jarvis auth failure]", JSON.stringify({ category: "invalid_session", status: 401 }));
    return { error: json({ error: "Your Journaly session has expired. Sign in again to use Jarvis." }, 401) };
  }
  if (String(user.email || "").trim().toLowerCase() !== OWNER_EMAIL) {
    console.warn("[Jarvis auth failure]", JSON.stringify({ category: "owner_allowlist", status: 403 }));
    return { error: json({ error: "Jarvis is currently available only to its owner." }, 403) };
  }
  return { user };
}

async function handleCoachingReport(request, env) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  const url = new URL(request.url);
  const period = url.searchParams.get("period") === "month" ? "month" : "week";
  const requestedUserId = env.JARVIS_AUTH_BYPASS_USER_ID ? url.searchParams.get("userId") : null;
  const authorization = await authorizeOwner(request, env, requestedUserId);
  if (authorization.error) return authorization.error;
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("anchor") || "") ? url.searchParams.get("anchor") : isoDateInManila();
  let authenticatedData = null;
  let trades;
  if (env.JARVIS_AUTH_BYPASS_USER_ID && Array.isArray(env.JARVIS_REPORT_TRADES)) {
    trades = env.JARVIS_REPORT_TRADES.map((row) => ({ id: row.id, date: row.trade_date || row.date, time: row.trade_time || row.time, pair: row.pair, setup: row.setup, direction: row.direction, pnlR: Number(row.pnl_r ?? row.pnlR ?? 0), outcome: row.result || row.outcome, executionQuality: row.trade_quality || row.executionQuality || null, notes: row.notes || "" }));
  } else if (period === "month") {
    authenticatedData = await loadAuthenticatedJournalyData(request, env, authorization.user.id);
    trades = authenticatedData?.trades;
  } else {
    const rows = await loadAuthenticatedRows(request, env, authorization.user.id, "trades", "id,trade_date,trade_time,pair,setup,direction,pnl_r,result,trade_quality,notes", "trade_date.desc,id.desc");
    trades = Array.isArray(rows) ? rows.map((row) => ({ id: row.id, date: row.trade_date, time: String(row.trade_time || "").slice(0, 5), pair: row.pair, setup: row.setup, direction: row.direction, pnlR: Number(row.pnl_r || 0), outcome: row.result, executionQuality: row.trade_quality || null, notes: row.notes || "" })) : null;
  }
  if (!Array.isArray(trades)) return json({ error: "Journaly's live-trade records are unavailable. No coaching report was generated." }, 503);
  const report = deterministicCoachingReport(trades, period, anchor);
  if (period === "month" && authenticatedData && Array.isArray(authenticatedData.backtests) && Array.isArray(authenticatedData.forecasts) && Array.isArray(authenticatedData.journals)) {
    const reconciliation = monthlyReconciliationResult(trades, authenticatedData.backtests, authenticatedData.forecasts, authenticatedData.journals, report.start.slice(0, 7));
    if (reconciliation.ready) {
      const summary = verifiedStatisticsAnswer(reconciliation);
      report.text = `${report.text}\n\nMONTH-END LIVE VS REPLAY RECONCILIATION\n\n${summary}`;
      report.key = `${report.key}:reconciliation:${reconciliation.coverage.liveTrades}:${reconciliation.coverage.backtests}:${reconciliation.coverage.reviewedForecasts}:${reconciliation.metrics.actual.totalR}:${reconciliation.metrics.backtest.totalR}`;
      report.reconciliation = reconciliation;
    }
  }
  return json({ report });
}

async function handleHealth(request, env) {
  if (request.method === "OPTIONS") return withDashboardCors(request, new Response(null, { status: 204 }));
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  let authorization;
  try {
    const testUserId = env.JARVIS_AUTH_BYPASS_USER_ID ? new URL(request.url).searchParams.get("userId") : null;
    authorization = await authorizeOwner(request, env, testUserId);
  } catch {
    return json({ error: "Jarvis authentication failed." }, 503);
  }
  if (authorization.error) return authorization.error;
  const connection = aiConnection(env);
  const configuredModel = connection?.model || env.OPENAI_JARVIS_MODEL || FALLBACK_MODELS[0];
  aiHealth.provider = connection?.provider || "OpenAI";
  aiHealth.configuredModel = configuredModel;
  aiHealth.apiConfigured = Boolean(connection);
  if (new URL(request.url).searchParams.get("probe") === "1" && connection) {
    try {
      const probeUrl = connection.provider === "OpenAI"
        ? `https://api.openai.com/v1/models/${encodeURIComponent(configuredModel)}`
        : "https://ai-gateway.vercel.sh/v1/models";
      const response = await fetch(probeUrl, { headers: { authorization: `Bearer ${connection.apiKey}` } });
      aiHealth.apiReachable = response.ok;
      aiHealth.lastHttpStatus = response.status;
      if (!response.ok) recordAiFailure({ status: response.status, model: configuredModel });
    } catch (error) {
      recordAiFailure({ message: error instanceof Error ? error.message : String(error), model: configuredModel });
    }
  }
  return withDashboardCors(request, json({ ...aiHealth, pushover: pushoverDiagnostics(env) }));
}

async function handleJarvis(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const connection = aiConnection(env);
  const configuredModel = connection?.model || env.OPENAI_JARVIS_MODEL || FALLBACK_MODELS[0];
  aiHealth.provider = connection?.provider || "OpenAI";
  aiHealth.configuredModel = configuredModel;
  aiHealth.apiConfigured = Boolean(connection);
  if (!connection) {
    const category = recordAiFailure({ message: "No AI provider credentials are available", model: configuredModel });
    return json({ error: "Jarvis AI is not configured yet.", category }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question) return json({ error: "A question is required." }, 400);
  if (question.length > MAX_QUESTION_LENGTH) return json({ error: "That message is too long for this Jarvis version." }, 413);

  let authorization;
  try {
    authorization = await authorizeOwner(request, env, body?.userId);
  } catch {
    return json({ error: "Jarvis authentication failed." }, 503);
  }
  if (authorization.error) return authorization.error;
  const authenticatedUser = authorization.user;
  const authenticatedJournaly = await loadAuthenticatedJournalyData(request, env, authenticatedUser.id);

  const history = normalizeHistory(body?.history);
  const journalContext = body?.context && typeof body.context === "object" ? body.context : {};
  const username = String(authenticatedUser.email || "").split("@")[0] || null;
  const isOwnerProfile = username?.toLowerCase() === OWNER_USERNAME;
  const { profile: suppliedProfile = {}, ...journalData } = journalContext;
  const profile = {
      id: authenticatedUser.id,
      username,
      preferredName: typeof suppliedProfile?.preferredName === "string" ? suppliedProfile.preferredName.slice(0, 80) : null,
      preferences: suppliedProfile?.preferences || {},
  };
  const journalRows = authenticatedJournaly?.journals || [];
  const clientMemories = Array.isArray(suppliedProfile?.memories) ? suppliedProfile.memories.slice(-40) : [];
  const syncedMemories = syncedMemoriesFromJournal(journalRows);
  const mergedMemories = new Map();
  [...syncedMemories, ...clientMemories].sort((a, b) => String(a?.updatedAt || "").localeCompare(String(b?.updatedAt || ""))).forEach((memory) => {
    if (memory?.category && memory?.key) mergedMemories.set(`${memory.category}:${memory.key}`, memory);
  });
  const suppliedSessionState = journalData?.sessionState && typeof journalData.sessionState === "object" ? journalData.sessionState : {};
  const syncedSessionState = syncedSessionFromJournal(journalRows);
  const syncedWorkspace = latestInternalState(journalRows, JARVIS_WORKSPACE_PREFIX);
  const sessionState = syncedSessionState && suppliedSessionState.activeContextExplicit !== true ? {
    ...suppliedSessionState,
    activePair: suppliedSessionState.activePair ?? syncedSessionState.pair ?? null,
    activeSetup: suppliedSessionState.activeSetup ?? syncedSessionState.setup ?? null,
    activeTradeId: suppliedSessionState.activeTradeId ?? syncedSessionState.tradeId ?? null,
    activeBacktestId: suppliedSessionState.activeBacktestId ?? syncedSessionState.backtestId ?? null,
    activeForecastId: suppliedSessionState.activeForecastId ?? syncedSessionState.forecastId ?? null,
    activeDataSource: suppliedSessionState.activeDataSource ?? syncedSessionState.dataSource ?? null,
  } : suppliedSessionState;
  const toolData = {
    profile,
    memories: [...mergedMemories.values()].slice(-40),
    trades: authenticatedJournaly?.trades || (Array.isArray(journalData?.trades) ? journalData.trades : Array.isArray(journalData?.recentTrades) ? journalData.recentTrades : []),
    monthlyTrades: authenticatedJournaly?.trades || (Array.isArray(journalData?.monthlyTrades) ? journalData.monthlyTrades : Array.isArray(journalData?.trades) ? journalData.trades : []),
    monthlyLedgerSource: authenticatedJournaly?.trades ? "authenticated_database" : "authenticated_client_snapshot",
    backtests: authenticatedJournaly?.backtests || (Array.isArray(journalData?.backtests) ? journalData.backtests : []),
    forecasts: authenticatedJournaly?.forecasts || (Array.isArray(journalData?.forecasts) ? journalData.forecasts : []),
    journals: journalRows,
    daytradeLive: authenticatedJournaly?.daytradeLive || [],
    daytradeBacktests: authenticatedJournaly?.daytradeBacktests || [],
    tradingViewEvents: authenticatedJournaly?.tradingViewEvents || [],
    pairStates: authenticatedJournaly?.pairStates || [],
    notifications: authenticatedJournaly?.notifications || [],
    unavailableSurfaces: authenticatedJournaly?.unavailableSurfaces || [],
    authoritativeSource: authenticatedJournaly ? "authenticated_database" : "authenticated_client_snapshot",
    imageInventory: Array.isArray(journalData?.imageInventory) ? journalData.imageInventory.slice(0, 5000) : [],
    learningRecords: Array.isArray(journalData?.learningRecords) ? journalData.learningRecords.slice(0, 80) : [],
    sessionState,
    workspace: {
      ...(syncedWorkspace || {}),
      contexts: [...(Array.isArray(sessionState?.workspaceContexts) ? sessionState.workspaceContexts : []), ...(Array.isArray(syncedWorkspace?.contexts) ? syncedWorkspace.contexts : [])]
        .filter((item, index, all) => item?.id && all.findIndex((candidate) => candidate?.id === item.id) === index).slice(0, 8),
    },
  };
  const chartImage = validChartImage(body?.chartImage);
  const previousChartImage = validChartImage(body?.previousChartImage);
  const conversationMode = detectConversationMode(question, chartImage, toolData.sessionState);
  const interactionMode = conversationMode === "active_trade_management" ? conversationMode : chartImage ? "chart_review" : "conversation";
  const activeTrade = toolData.sessionState?.activeTradeId
    ? toolData.trades.find((trade) => String(trade.id) === String(toolData.sessionState.activeTradeId)) || null
    : null;
  const activeForecast = toolData.sessionState?.activeForecastId
    ? toolData.forecasts.find((forecast) => String(forecast.id) === String(toolData.sessionState.activeForecastId)) || null
    : null;
  const relevantMemories = selectRelevantMemories(toolData.memories, question, conversationMode);
  const styleExamples = feedbackStyleExamples(toolData.journals);
  const compactContext = {
    authenticatedUser: profile,
    generatedAt: journalData.generatedAt,
    marketSession: journalData.marketSession,
    summary: journalData.summary,
    sessionState,
    conversationMode,
    interactionMode,
    activeTrade: activeTrade ? {
      id: activeTrade.id,
      date: activeTrade.date,
      time: activeTrade.time,
      pair: activeTrade.pair,
      setup: activeTrade.setup,
      direction: activeTrade.direction,
      outcome: activeTrade.outcome,
      pnlR: activeTrade.pnlR,
      notes: activeTrade.notes,
    } : null,
    activeForecast: activeForecast ? {
      id: activeForecast.id,
      date: activeForecast.date,
      time: activeForecast.time,
      pair: activeForecast.pair,
      setup: activeForecast.setup,
      direction: activeForecast.direction,
      status: activeForecast.status,
      entryPlan: activeForecast.entryPlan,
      reasonToTake: activeForecast.reasonToTake,
      reasonCancelled: activeForecast.reasonCancelled,
      notes: activeForecast.notes,
    } : null,
    workspace: { focusId: toolData.workspace?.focusId || null, contexts: Array.isArray(toolData.workspace?.contexts) ? toolData.workspace.contexts.slice(0, 8) : [] },
    recentJourney: journeyFromJournal(journalRows, toolData.sessionState?.activePair || null).slice(0, 10),
    chartComparisonAvailable: Boolean(previousChartImage && chartImage),
    relevantMemories,
    styleExamples,
    availableJournalyTools: JOURNALY_TOOLS.map((tool) => tool.name),
    historicalChartLibrary: JARVIS_REFERENCE_SUMMARY,
    auditedBacktestChartLibrary: JARVIS_BACKTEST_AUDIT_SUMMARY,
    learnedCaseCount: toolData.learningRecords.length,
    dataCoverage: { source: toolData.authoritativeSource, liveTrades: toolData.trades.length, monthlyLedgerTrades: toolData.monthlyTrades.length, backtests: toolData.backtests.length, forecasts: toolData.forecasts.length, journals: toolData.journals.length, chartImages: toolData.imageInventory.length, daytradeLive: toolData.daytradeLive.length, daytradeBacktests: toolData.daytradeBacktests.length, tradingViewEvents: toolData.tradingViewEvents.length, watchedPairs: toolData.pairStates.length, notifications: toolData.notifications.length },
  };
  const currentContent = [
    { type: "input_text", text: `CURRENT AUTHENTICATED SESSION\n${JSON.stringify(compactContext)}\n\nUSER MESSAGE\n${question}` },
  ];
  if (previousChartImage && chartImage) {
    currentContent.push({ type: "input_text", text: "PREVIOUS CHART — use only to identify visible changes versus the current chart." });
    currentContent.push({ type: "input_image", image_url: previousChartImage, detail: "high" });
    currentContent.push({ type: "input_text", text: "CURRENT CHART — this is the authoritative image for the current assessment." });
  }
  if (chartImage) currentContent.push({ type: "input_image", image_url: chartImage, detail: "high" });
  const input = [
    ...history,
    {
      role: "user",
      content: currentContent,
    },
  ];
  const models = Array.from(new Set([configuredModel, ...FALLBACK_MODELS]));
  let lastError = "Jarvis could not complete that response.";
  let lastCategory = "unknown";

  for (const model of models) {
    let roundInput = input;
    let toolCallsUsed = [];
    let verifiedMonthlyLedger = null;
    let verifiedStatResult = null;
    const usage = { inputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 0 };
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const requestBody = {
      model: connection.modelName(model),
      instructions: `${isOwnerProfile ? `${JARVIS_SYSTEM_PROMPT}\n\n${JARVIS_OWNER_KNOWLEDGE}` : JARVIS_SYSTEM_PROMPT}\n\n${JARVIS_CONVERSATION_INSTRUCTIONS}\n\n${JARVIS_MEMORY_INSTRUCTIONS}\n\n${JARVIS_TRADE_WRITE_INSTRUCTIONS}\n\n${JARVIS_FORECAST_INSTRUCTIONS}\n\n${JARVIS_ANALYTICS_INSTRUCTIONS}\n\n${JARVIS_EVIDENCE_INSTRUCTIONS}\n\n${JARVIS_SELF_REVIEW_INSTRUCTIONS}`,
      input: roundInput,
      max_output_tokens: 1100,
      store: false,
      safety_identifier: await safetyIdentifier(authenticatedUser.id),
      tools: JOURNALY_TOOLS,
      tool_choice: "auto",
      parallel_tool_calls: true,
      text: { format: { type: "json_schema", name: "jarvis_reply", strict: true, schema: RESPONSE_SCHEMA } },
      };

      if (model.includes("gpt-5.6")) {
        requestBody.reasoning = { effort: "low", context: "current_turn" };
        requestBody.text.verbosity = "medium";
      }

      let response;
      let payload;
      try {
        ({ response, payload } = await openAiRequest(connection, requestBody));
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        lastCategory = recordAiFailure({ message: lastError, model });
        break;
      }

      if (!response.ok) {
        lastError = payload?.error?.message || lastError;
        const code = payload?.error?.code || payload?.error?.type || "";
        lastCategory = recordAiFailure({ status: response.status, code, message: lastError, model, requestId: response.headers.get("x-request-id") });
        const retryableModelError = /model|unsupported|invalid_request/i.test(`${code} ${lastError}`);
        if (!retryableModelError) break;
        round = MAX_TOOL_ROUNDS;
        continue;
      }

      addUsage(usage, payload?.usage);

      const calls = (payload?.output || []).filter((item) => item?.type === "function_call");
      if (calls.length) {
        const outputs = calls.map((call) => {
          let args = {};
          try { args = JSON.parse(call.arguments || "{}"); } catch { args = {}; }
          toolCallsUsed.push(call.name);
          const toolResult = executeJournalyTool(call.name, args, toolData);
          if (call.name === "get_monthly_performance") verifiedMonthlyLedger = toolResult;
          if (["get_journaly_inventory", "get_live_trade_statistics", "get_decision_statistics", "get_daytrade_statistics", "get_backtest_statistics", "get_setup_statistics", "compare_live_vs_backtest", "get_account_risk", "find_historical_patterns", "get_forecast_learning", "get_monthly_reconciliation", "get_archive_view"].includes(call.name)) verifiedStatResult = toolResult;
          return { type: "function_call_output", call_id: call.call_id, output: JSON.stringify(toolResult) };
        });
        roundInput = [...roundInput, ...(payload.output || []), ...outputs];
        continue;
      }

      const outputText = extractResponseText(payload);
      if (!outputText) {
        lastError = "Jarvis returned an empty response.";
        lastCategory = recordAiFailure({ status: 502, code: "empty_response", message: lastError, model, requestId: response.headers.get("x-request-id") });
        break;
      }
      Object.assign(aiHealth, { configuredModel: model, apiConfigured: true, apiReachable: true, lastSuccessfulRequestAt: new Date().toISOString(), lastErrorCategory: null, lastHttpStatus: response.status, fallbackActive: false });
      const result = parseJarvisOutput(outputText);
      if (conversationMode === "active_trade_management") result.tradeAction = null;
      let historicalMatches = null;
      if (chartImage) {
        result.chartAssessment = enforceChartEvidenceGate(result.chartAssessment);
        historicalMatches = deterministicHistoricalMatches(result.chartAssessment, toolData.trades, toolData.sessionState?.activePair || null);
        if (conversationMode !== "active_trade_management") {
          result.answer = verifiedChartAnswer(result.chartAssessment, historicalMatches);
        }
      } else if (verifiedMonthlyLedger) result.answer = verifiedMonthlyAnswer(verifiedMonthlyLedger);
      else if (verifiedStatResult) result.answer = verifiedStatisticsAnswer(verifiedStatResult) || result.answer;
      return json({ ...result, conversationMode, historicalMatches, model, provider: connection.provider, chartCompared: Boolean(previousChartImage && chartImage), chartReviewed: Boolean(chartImage), toolsUsed: [...new Set(toolCallsUsed)], selfReview: { contextMatched: true, evidenceBounded: !/\b(live price|currently trading at|market is now)\b/i.test(result.answer) || Boolean(chartImage), toneAligned: !/no entry is validated|evidence:\s*partial|what remains unclear/i.test(result.answer) }, usage: usageSummary(model, usage) });
    }
  }

  return json({ error: "Jarvis could not reach its conversational AI.", category: lastCategory, fallbackAllowed: true }, 502);
}

async function handleVoice(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request body." }, 400); }
  const authorization = await authorizeOwner(request, env, body?.userId);
  if (authorization.error) return authorization.error;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 4096) : "";
  if (!text) return json({ error: "Speech text is required." }, 400);
  if (!env.OPENAI_API_KEY) return json({ error: "Dedicated Jarvis voice is not configured." }, 503);
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: env.OPENAI_JARVIS_VOICE_MODEL || "gpt-4o-mini-tts", voice: env.OPENAI_JARVIS_VOICE || "cedar", input: text, response_format: "mp3", speed: 0.98, instructions: "Speak like a calm, highly capable personal AI companion: warm, concise, confident, natural, and never theatrical or robotic." }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    return json({ error: error?.error?.message || "Jarvis voice could not generate audio." }, response.status);
  }
  return new Response(response.body, { status: 200, headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
}

async function handleRoutine(request, env) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) return json({ error: "Unauthorized" }, 401);
  const baseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = env.JARVIS_ROUTINE_USER_ID || env.PUSHOVER_OWNER_USER_ID;
  if (!baseUrl || !serviceKey || !userId) return json({ error: "Jarvis background routine needs Supabase service access and an owner user id." }, 503);
  const headers = { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" };
  const read = async (table, select) => {
    const response = await fetch(`${baseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&user_id=eq.${encodeURIComponent(userId)}&order=updated_at.desc&limit=200`, { headers });
    if (!response.ok) throw new Error(`Could not read ${table}`);
    return response.json();
  };
  try {
    const [forecasts, trades, journals] = await Promise.all([
      read("trade_decisions", "id,decision_date,decision_time,pair,setup,direction,status,updated_at"),
      read("trades", "id,trade_date,trade_time,pair,setup,direction,trade_quality,updated_at"),
      read("journal_entries", "id,entry_date,content,updated_at"),
    ]);
    const today = isoDateInManila();
    if (journals.some((entry) => String(entry.content || "").startsWith(JARVIS_ROUTINE_PREFIX) && entry.entry_date === today)) return json({ ok: true, duplicate: true, sent: false });
    const stale = forecasts.filter((item) => item.status === "Waiting" && Date.now() - new Date(item.updated_at || `${item.decision_date}T${item.decision_time || "00:00"}`).getTime() > 24 * 60 * 60 * 1000);
    const unlinked = forecasts.filter((item) => item.status === "Taken" && !trades.some((trade) => trade.pair === item.pair && trade.setup === item.setup && trade.direction === item.direction && trade.trade_date >= item.decision_date));
    const unreviewed = trades.filter((trade) => !trade.trade_quality && trade.trade_date >= shiftIsoDate(today, -1));
    const lines = [
      stale.length ? `${stale.length} waiting forecast${stale.length === 1 ? " is" : "s are"} over 24 hours old.` : "",
      unlinked.length ? `${unlinked.length} Taken forecast${unlinked.length === 1 ? " is" : "s are"} not linked to a saved trade.` : "",
      unreviewed.length ? `${unreviewed.length} recent trade${unreviewed.length === 1 ? " still needs" : "s still need"} an execution review.` : "",
    ].filter(Boolean);
    if (!lines.length) return json({ ok: true, sent: false, reason: "nothing_due" });
    await sendPushover(env, { title: "JARVIS — EVENING CHECK-IN", message: `${lines.join("\n")}\n\nOpen Journaly when you’re ready; I’ll pick up the context there.`, priority: 0 });
    const content = `${JARVIS_ROUTINE_PREFIX}\n${JSON.stringify({ date: today, staleForecasts: stale.map((item) => item.id), unlinkedForecasts: unlinked.map((item) => item.id), unreviewedTrades: unreviewed.map((item) => item.id), sentAt: new Date().toISOString() })}`;
    await fetch(`${baseUrl}/rest/v1/journal_entries`, { method: "POST", headers: { ...headers, prefer: "return=minimal" }, body: JSON.stringify({ user_id: userId, entry_date: today, content, advice: "Jarvis background evening check-in sent.", image_url: "", pair: null, related_trade_id: null, related_discipline_id: null, updated_at: new Date().toISOString() }) });
    return json({ ok: true, sent: true, counts: { stale: stale.length, unlinked: unlinked.length, unreviewed: unreviewed.length } });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Jarvis background routine failed." }, 503);
  }
}

export { archiveViewResult, detectChartInteractionMode, detectConversationMode, feedbackStyleExamples, monthlyReconciliationResult, monthlyReconciliationSeries, reconciliationStats, selectRelevantMemories, syncedMemoriesFromJournal, syncedSessionFromJournal };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/jarvis/chat") return handleJarvis(request, env);
    if (url.pathname === "/api/jarvis/forecast-review") return handleForecastReview(request, env);
    if (url.pathname === "/api/jarvis/reports") return handleCoachingReport(request, env);
    if (url.pathname === "/api/jarvis/health") return withDashboardCors(request, await handleHealth(request, env));
    if (url.pathname === "/api/jarvis/voice") return withDashboardCors(request, await handleVoice(request, env));
    if (url.pathname === "/api/jarvis/routine") return handleRoutine(request, env);
    if (url.pathname === "/api/jarvis/tradingview") return handleTradingView(request, env, ctx);
    if (url.pathname === "/api/jarvis/pushover/test") return withDashboardCors(request, await handlePushoverTest(request, env));

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || url.pathname.includes(".")) return response;
    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  },
};

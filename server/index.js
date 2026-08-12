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
const JARVIS_ANALYTICS_INSTRUCTIONS = `
JOURNALY NUMERIC ACCURACY
- Never calculate totals, counts, rankings, win rates, expectancy, or best/worst periods yourself from a list of records.
- For any live monthly total, monthly comparison, best month, worst month, or year-by-month ranking, you must call get_monthly_performance and copy its verified values exactly.
- For all other numeric Journaly questions, call the matching statistics or inventory tool. Never infer a count from the chat context.
- Treat tool statistics as authoritative. If a screenshot conflicts with tool data, state the conflict without inventing a reconciliation.`;
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
  { type: "function", name: "get_learning_records", description: "Get lessons retained from prior Jarvis chart reviews and insights. Use only when the user explicitly asks what Jarvis learned, remembers from prior cases, or sees as a recurring lesson; never use for ordinary pair or current-chart checks.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { source: { type: ["string", "null"], enum: ["chart", "skipped_trade", "insight", null] }, limit: { type: "integer", minimum: 1, maximum: 40 } }, required: ["source", "limit"] } },
  { type: "function", name: "get_strategy_rules", description: "Get Pot's current PPA-first strategy rules. Use for setup or decision reasoning, not casual conversation.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { setup: { type: ["string", "null"] } }, required: ["setup"] } },
  { type: "function", name: "get_setup_examples", description: "Get independently audited historical chart examples matching a setup or pair.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { setup: { type: ["string", "null"] }, pair: { type: ["string", "null"] }, limit: { type: "integer", minimum: 1, maximum: 8 } }, required: ["setup", "pair", "limit"] } },
  { type: "function", name: "get_trade", description: "Get one authenticated user's trade by id or the latest trade.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { id: { type: ["string", "null"] }, latest: { type: "boolean" } }, required: ["id", "latest"] } },
  { type: "function", name: "get_recent_trades", description: "Get real Journaly trades, optionally filtered by pair, setup, or calendar month (YYYY-MM).", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, month: { type: ["string", "null"] }, limit: { type: "integer", minimum: 1, maximum: 100 } }, required: ["pair", "setup", "month", "limit"] } },
  { type: "function", name: "get_recent_backtests", description: "Get backtest records only, with pair/setup/month filters. Results are historical tests and must never be described as live trades.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, month: { type: ["string", "null"] }, limit: { type: "integer", minimum: 1, maximum: 100 } }, required: ["pair", "setup", "month", "limit"] } },
  { type: "function", name: "get_backtest_statistics", description: "Calculate backtest-only win rate, R, expectancy, and sample size for an optional pair, setup, and month. Always label the output as backtest evidence.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, month: { type: ["string", "null"] } }, required: ["pair", "setup", "month"] } },
  { type: "function", name: "get_backtest_visual_audit", description: "Get independent visual-audit findings from 137 backtest screenshots, optionally filtered by pair, setup, visible quality grade, PPA alignment, or recorded outcome. Use for questions about chart quality, recurring visual mistakes, whether labels were supported, or patterns across audited backtest images—not ordinary numeric performance questions.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, grade: { type: ["string", "null"], enum: ["Good", "Mid", "Bad", null] }, ppaAlignment: { type: ["string", "null"], enum: ["aligned", "countertrend", "mixed", null] }, outcome: { type: ["string", "null"] }, limit: { type: "integer", minimum: 1, maximum: 30 } }, required: ["pair", "setup", "grade", "ppaAlignment", "outcome", "limit"] } },
  { type: "function", name: "compare_live_vs_backtest", description: "Compare live-trade and backtest performance using separately calculated sample sizes, win rates, total R, and expectancy. Use when the user asks whether backtests translate to live execution.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, month: { type: ["string", "null"] } }, required: ["pair", "setup", "month"] } },
  { type: "function", name: "get_active_forecasts", description: "Get active Journaly forecasts, optionally for one pair.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] } }, required: ["pair"] } },
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
  { type: "function", name: "get_account_risk", description: "Get documented planned risk from active Journaly forecasts. This is not broker/live-position risk.", strict: true, parameters: { type: "object", additionalProperties: false, properties: {}, required: [] } },
  { type: "function", name: "get_session_state", description: "Get the active pair, setup, trade, chart, forecast, last decision, and rolling conversation state.", strict: true, parameters: { type: "object", additionalProperties: false, properties: {}, required: [] } },
];

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "memoryUpdates", "learningSummary", "tradeAction"],
  properties: {
    answer: { type: "string", maxLength: 12000 },
    learningSummary: { type: ["string", "null"], maxLength: 1600 },
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
  const mapDecision = (row) => ({ id: row.id, date: row.decision_date, time: String(row.decision_time || "").slice(0, 5), pair: row.pair, setup: row.setup, direction: row.direction, status: row.status, entryPlan: row.entry_plan, stopLoss: row.stop_loss, takeProfit: row.take_profit, plannedRiskPercent: row.risk_percent == null ? null : Number(row.risk_percent), reasonToTake: row.reason_to_take, reasonCancelled: row.reason_cancelled, outcome: row.outcome, notes: row.notes, resultR: Number(row.result_r || 0) });
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
  const event = String(payload.event || payload.alert || "structure_break").trim().slice(0, 120);
  const timestamp = eventTimestamp(payload.timestamp ?? payload.time ?? payload.candle?.timestamp ?? payload.candle?.time);
  if (!ticker || !timeframe || !event || !timestamp) return json({ error: "ticker, timeframe, event, and a valid timestamp are required." }, 400);

  const candleSource = payload.candle && typeof payload.candle === "object" ? payload.candle : payload;
  const candle = ["open", "high", "low", "close"].some((key) => finiteNumber(candleSource[key]) !== null) ? {
    open: finiteNumber(candleSource.open), high: finiteNumber(candleSource.high), low: finiteNumber(candleSource.low), close: finiteNumber(candleSource.close),
  } : null;
  const bullishBreakCount = nonNegativeInteger(payload.bullish_break_count);
  const bearishBreakCount = nonNegativeInteger(payload.bearish_break_count);
  const dedupeKey = await sha256Text([ticker, timeframe, bullishBreakCount, bearishBreakCount, timestamp, candle?.open ?? "", candle?.high ?? "", candle?.low ?? "", candle?.close ?? ""].join("|"));
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
    const work = processTradingViewEvent(env, eventId, webhookToken);
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
      return { answer: parsed.answer.trim(), memoryUpdates: Array.isArray(parsed.memoryUpdates) ? parsed.memoryUpdates : [], learningSummary: typeof parsed.learningSummary === "string" ? parsed.learningSummary.trim() : null, tradeAction: parsed.tradeAction && typeof parsed.tradeAction === "object" ? parsed.tradeAction : null };
    }
  } catch {
    // Older fallback models may return plain text; keep the conversation available without storing memory.
  }
  return { answer: text.trim(), memoryUpdates: [], learningSummary: null, tradeAction: null };
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

function verifiedStatisticsAnswer(result) {
  if (result?.unavailable) return `I could not verify ${result.unavailable} from the authenticated database, so I will not report a numeric result. Refresh Journaly or retry after the data connection recovers.`;
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
  const stats = result?.statistics;
  if (!stats) return null;
  const label = result.label || result.source || "Journaly records";
  return `Verified ${label}: ${stats.sampleSize} record${stats.sampleSize === 1 ? "" : "s"}, ${stats.totalR > 0 ? "+" : ""}${stats.totalR.toFixed(2)}R total, ${stats.winRate == null ? "no win rate" : `${stats.winRate}% win rate`}, and ${stats.expectancyR == null ? "no expectancy" : `${stats.expectancyR.toFixed(2)}R expectancy`}. Breakdown: ${stats.wins} wins, ${stats.losses} losses, ${stats.breakEven} breakeven. Calculated deterministically from the authenticated database.`;
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
      return { records: (data.learningRecords || []).filter((record) => !args.source || record.source === args.source).slice(0, args.limit) };
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
    case "get_skipped_trades": {
      const skipped = forecasts.filter((forecast) => forecast.status === "Cancelled" || forecast.status === "Missed");
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
      const byStatus = Object.fromEntries(["Waiting", "Taken", "Cancelled", "Missed"].map((status) => [status, filtered.filter((item) => item.status === status).length]));
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
      return { entries: journals.filter((item) => (!args.pair || normalizePair(item.pair) === normalizePair(args.pair)) && (!args.year || String(item.entry_date || "").startsWith(`${args.year}-`))).slice(0, args.limit), totalAvailable: journals.length };
    case "get_tradingview_state": {
      if ((data.unavailableSurfaces || []).some((surface) => ["tradingViewEvents", "pairStates", "notifications"].includes(surface))) return { unavailable: "TradingView/Jarvis state" };
      const matches = (item) => (!args.ticker || normalizePair(item.ticker) === normalizePair(args.ticker)) && (!args.timeframe || String(item.timeframe) === String(args.timeframe));
      return { events: tradingViewEvents.filter(matches).slice(0, args.limit), pairStates: pairStates.filter(matches), notifications: notifications.filter(matches).slice(0, args.limit) };
    }
    case "get_account_risk": {
      const active = forecasts.filter((forecast) => forecast.status === "Waiting");
      return { documentedPlannedRiskPercent: active.reduce((sum, item) => sum + Number(item.plannedRiskPercent || 0), 0), activeForecastCount: active.length, liveBrokerRiskConnected: false };
    }
    case "get_session_state":
      return data.sessionState || {};
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

async function handleHealth(request, env) {
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
  return json(aiHealth);
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
  const toolData = {
    profile,
    memories: Array.isArray(suppliedProfile?.memories) ? suppliedProfile.memories.slice(-40) : [],
    trades: authenticatedJournaly?.trades || (Array.isArray(journalData?.trades) ? journalData.trades : Array.isArray(journalData?.recentTrades) ? journalData.recentTrades : []),
    monthlyTrades: authenticatedJournaly?.trades || (Array.isArray(journalData?.monthlyTrades) ? journalData.monthlyTrades : Array.isArray(journalData?.trades) ? journalData.trades : []),
    monthlyLedgerSource: authenticatedJournaly?.trades ? "authenticated_database" : "authenticated_client_snapshot",
    backtests: authenticatedJournaly?.backtests || (Array.isArray(journalData?.backtests) ? journalData.backtests : []),
    forecasts: authenticatedJournaly?.forecasts || (Array.isArray(journalData?.forecasts) ? journalData.forecasts : []),
    journals: authenticatedJournaly?.journals || [],
    daytradeLive: authenticatedJournaly?.daytradeLive || [],
    daytradeBacktests: authenticatedJournaly?.daytradeBacktests || [],
    tradingViewEvents: authenticatedJournaly?.tradingViewEvents || [],
    pairStates: authenticatedJournaly?.pairStates || [],
    notifications: authenticatedJournaly?.notifications || [],
    unavailableSurfaces: authenticatedJournaly?.unavailableSurfaces || [],
    authoritativeSource: authenticatedJournaly ? "authenticated_database" : "authenticated_client_snapshot",
    learningRecords: Array.isArray(journalData?.learningRecords) ? journalData.learningRecords.slice(0, 80) : [],
    sessionState: journalData?.sessionState || {},
  };
  const compactContext = {
    authenticatedUser: profile,
    generatedAt: journalData.generatedAt,
    marketSession: journalData.marketSession,
    summary: journalData.summary,
    sessionState: journalData.sessionState,
    availableJournalyTools: JOURNALY_TOOLS.map((tool) => tool.name),
    historicalChartLibrary: JARVIS_REFERENCE_SUMMARY,
    auditedBacktestChartLibrary: JARVIS_BACKTEST_AUDIT_SUMMARY,
    learnedCaseCount: toolData.learningRecords.length,
    dataCoverage: { source: toolData.authoritativeSource, liveTrades: toolData.trades.length, monthlyLedgerTrades: toolData.monthlyTrades.length, backtests: toolData.backtests.length, forecasts: toolData.forecasts.length, journals: toolData.journals.length, daytradeLive: toolData.daytradeLive.length, daytradeBacktests: toolData.daytradeBacktests.length, tradingViewEvents: toolData.tradingViewEvents.length, watchedPairs: toolData.pairStates.length, notifications: toolData.notifications.length },
  };
  const chartImage = validChartImage(body?.chartImage);
  const currentContent = [
    { type: "input_text", text: `CURRENT AUTHENTICATED SESSION\n${JSON.stringify(compactContext)}\n\nUSER MESSAGE\n${question}` },
  ];
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
      instructions: `${isOwnerProfile ? `${JARVIS_SYSTEM_PROMPT}\n\n${JARVIS_OWNER_KNOWLEDGE}` : JARVIS_SYSTEM_PROMPT}\n\n${JARVIS_TRADE_WRITE_INSTRUCTIONS}\n\n${JARVIS_ANALYTICS_INSTRUCTIONS}`,
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
          if (["get_journaly_inventory", "get_live_trade_statistics", "get_decision_statistics", "get_daytrade_statistics", "get_backtest_statistics", "get_setup_statistics", "compare_live_vs_backtest", "get_account_risk"].includes(call.name)) verifiedStatResult = toolResult;
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
      if (verifiedMonthlyLedger) result.answer = verifiedMonthlyAnswer(verifiedMonthlyLedger);
      else if (verifiedStatResult) result.answer = verifiedStatisticsAnswer(verifiedStatResult) || result.answer;
      return json({ ...result, model, provider: connection.provider, chartReviewed: Boolean(chartImage), toolsUsed: [...new Set(toolCallsUsed)], usage: usageSummary(model, usage) });
    }
  }

  return json({ error: "Jarvis could not reach its conversational AI.", category: lastCategory, fallbackAllowed: true }, 502);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/jarvis/chat") return handleJarvis(request, env);
    if (url.pathname === "/api/jarvis/health") return handleHealth(request, env);
    if (url.pathname === "/api/jarvis/tradingview") return handleTradingView(request, env, ctx);

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || url.pathname.includes(".")) return response;
    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  },
};

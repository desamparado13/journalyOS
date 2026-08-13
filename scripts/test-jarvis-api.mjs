import { readFile } from "node:fs/promises";

const envText = await readFile(".env.local", "utf8");
const keyLine = envText.split(/\r?\n/).find((value) => value.startsWith("OPENAI_API_KEY="));
const apiKey = keyLine?.slice("OPENAI_API_KEY=".length).trim().replace(/^['"]|['"]$/g, "");
if (!apiKey) throw new Error("OPENAI_API_KEY is not available for the Jarvis smoke test.");

const worker = (await import(`../dist/server/index.js?test=${Date.now()}`)).default;
const ownerEnv = {
  OPENAI_API_KEY: apiKey,
  OPENAI_JARVIS_MODEL: "gpt-5.6-luna",
  JARVIS_AUTH_BYPASS_USER_ID: "local-smoke-test",
  JARVIS_AUTH_BYPASS_EMAIL: "christian.angelo.desamparado@gmail.com",
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};

const context = {
  generatedAt: "2026-08-12T12:00:00+08:00",
  profile: {
    preferredName: "Pot",
    preferences: { familiarity: "high", humor: "medium", empathy: "medium", directness: "high", verbosity: "concise" },
    memories: [{ category: "risk_rule", key: "risk_per_trade", value: "0.5%", confidence: 1 }],
  },
  marketSession: { label: "New York", status: "Open" },
  summary: { totalTrades: 4, reviewedTrades: 4, goodExecutions: 2, activeForecasts: 1, learnedCases: 1 },
  sessionState: { activePair: "AUDJPY", activeSetup: "Internal Reversal", lastChartAvailable: true, lastJarvisDecision: "WATCH" },
  trades: [
    { id: "t4", date: "2026-08-10", pair: "AUDJPY", setup: "Internal Reversal", direction: "Buy", outcome: "Loss", pnlR: -1, executionQuality: "Good", notes: "Valid trigger; stopped normally." },
    { id: "t3", date: "2026-08-07", pair: "AUDJPY", setup: "Internal Reversal", direction: "Sell", outcome: "Win", pnlR: 2, executionQuality: "Good", notes: "Clean momentum shift." },
    { id: "t2", date: "2026-08-04", pair: "EURUSD", setup: "Internal Reversal", direction: "Buy", outcome: "Loss", pnlR: -1, executionQuality: "Mid", notes: "Trigger was not unique." },
    { id: "t1", date: "2026-07-28", pair: "GBPUSD", setup: "Flag", direction: "Buy", outcome: "Win", pnlR: 2, executionQuality: "Bad", notes: "Anticipatory entry." },
    ...[2, 2.64, 0, 2.06, -0.35, 2, 2, -0.5, 2, -1].map((pnlR, index) => ({ id: `apr-${index + 1}`, date: `2026-04-${String([6, 6, 10, 14, 15, 17, 20, 28, 29, 30][index]).padStart(2, "0")}`, pair: index === 9 ? "EURUSD" : "AUDJPY", setup: index === 9 ? "Break and retest" : "Flag", direction: "Buy", outcome: pnlR > 0 ? "Win" : pnlR < 0 ? "Loss" : "Breakeven", pnlR, executionQuality: null, notes: "Monthly accuracy fixture." })),
  ],
  backtests: [
    { id: "b4", date: "2026-08-11", pair: "AUDJPY", setup: "Internal Reversal", direction: "Buy", outcome: "Win", pnlR: 2, notes: "Confirmed engulf after PPA shift.", hasScreenshot: true },
    { id: "b3", date: "2026-08-09", pair: "AUDJPY", setup: "Internal Reversal", direction: "Sell", outcome: "Win", pnlR: 2, notes: "Clean retest." },
    { id: "b2", date: "2026-08-06", pair: "AUDJPY", setup: "Internal Reversal", direction: "Buy", outcome: "Loss", pnlR: -1, notes: "Valid setup, normal loss." },
    { id: "b1", date: "2026-08-02", pair: "EURUSD", setup: "Liquidity sweep", direction: "Sell", outcome: "Win", pnlR: 2, notes: "Sweep plus bearish PPA." },
  ],
  forecasts: [
    { id: "f1", date: "2026-08-12", pair: "AUDJPY", setup: "Internal Reversal", direction: "Buy", status: "Waiting", plannedRiskPercent: 0.5, entryPlan: "Wait for a strong bullish engulf." },
    { id: "f0", date: "2026-08-08", pair: "EURUSD", setup: "Liquidity sweep", direction: "Sell", status: "Cancelled", reasonCancelled: "PPA stayed bullish", outcome: "Avoided loss", resultR: -1 },
  ],
  learningRecords: [{ date: "2026-08-09", source: "chart", prompt: "Review this liquidity sweep", summary: "Visible sweep was present, but bearish PPA confirmation was missing; the case remained a skip rather than a valid short." }],
};

async function ask(question, history = []) {
  const request = new Request("http://local/api/jarvis/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: "local-smoke-test", question, history, context }),
  });
  const response = await worker.fetch(request, ownerEnv);
  const payload = await response.json();
  if (!response.ok) throw new Error(`${question}: ${response.status} ${payload.error || payload.category || "unknown error"}`);
  return payload;
}

const results = [];
const webhookCalls = [];
const webhookBackground = [];
let webhookIngestCount = 0;
const webhookEnv = {
  ...ownerEnv,
  NEXT_PUBLIC_SUPABASE_URL: "https://journaly-test.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  SUPABASE_FETCH: async (url, init) => {
    const body = JSON.parse(init.body);
    webhookCalls.push({ url, body });
    if (String(url).endsWith("/ingest_jarvis_tradingview_event")) {
      webhookIngestCount += 1;
      return new Response(JSON.stringify([{ event_id: "00000000-0000-4000-8000-000000000001", is_duplicate: webhookIngestCount > 1 }]), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (String(url).endsWith("/process_jarvis_tradingview_event")) return new Response(null, { status: 204 });
    return new Response("Not found", { status: 404 });
  },
};
const makeWebhookRequest = () => new Request("http://local/api/jarvis/tradingview", {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer jtv_${"a".repeat(43)}` },
  body: JSON.stringify({ ticker: "AUDJPY", timeframe: "15", event: "structure_break", timestamp: "2026-08-12T12:00:00Z", price: 102.2, MRH: 102.4, MRL: 101.9, bullish_break_count: 3, bearish_break_count: 0, candle: { open: 102, high: 102.5, low: 101.95, close: 102.2 } }),
});
const webhookRequest = makeWebhookRequest();
const webhookResponse = await worker.fetch(webhookRequest, webhookEnv, { waitUntil(promise) { webhookBackground.push(promise); } });
const webhookPayload = await webhookResponse.json();
await Promise.all(webhookBackground);
results.push({ test: "TradingView immediate intake and background processing", pass: webhookResponse.status === 200 && webhookPayload.accepted === true && webhookCalls.length === 2 && webhookCalls[0].body.p_ticker === "AUDJPY" && webhookCalls[0].body.p_bullish_break_count === 3 && webhookCalls[0].body.p_raw_payload.webhook_token == null, status: webhookResponse.status });

const duplicateResponse = await worker.fetch(makeWebhookRequest(), webhookEnv, { waitUntil(promise) { webhookBackground.push(promise); } });
const duplicatePayload = await duplicateResponse.json();
results.push({ test: "TradingView duplicate suppression", pass: duplicateResponse.status === 200 && duplicatePayload.duplicate === true && webhookCalls.length === 3, status: duplicateResponse.status });

const reportEnv = { ...ownerEnv, JARVIS_REPORT_TRADES: context.trades.map((trade) => ({ ...trade, trade_date: trade.date, pnl_r: trade.pnlR, result: trade.outcome, trade_quality: trade.executionQuality })) };
const weeklyReportResponse = await worker.fetch(new Request("http://local/api/jarvis/reports?period=week&anchor=2026-08-12&userId=local-smoke-test"), reportEnv);
const weeklyReport = await weeklyReportResponse.json();
results.push({ test: "deterministic weekly coaching report", pass: weeklyReportResponse.ok && weeklyReport.report?.key === "week:2026-08-03" && weeklyReport.report?.statistics?.sampleSize === 2 && weeklyReport.report?.statistics?.totalR === 1 && /fewer than 5|anecdotal/i.test(weeklyReport.report?.text || ""), status: weeklyReportResponse.status });

const hi = await ask("hi jarvis");
results.push({ test: "natural greeting and spend metering", pass: /\b(hey|hi|yo|good|what|pot)\b/i.test(hi.answer) && !/intelligence ready|i'm with you/i.test(hi.answer) && Number.isFinite(hi.usage?.costUsd) && hi.usage.costUsd > 0, tools: hi.toolsUsed, costUsd: hi.usage?.costUsd });

const howAreYou = await ask("how are you");
results.push({ test: "casual conversation", pass: Boolean(howAreYou.answer) && howAreYou.answer !== hi.answer && !/i'm with you|temporarily unavailable/i.test(howAreYou.answer), tools: howAreYou.toolsUsed });

const loss = await ask("damn another loss");
results.push({ test: "loss empathy", pass: /loss|rough|check|review|trade/i.test(loss.answer) && !/motivational|intelligence ready/i.test(loss.answer), tools: loss.toolsUsed });

const goodLoss = await ask("what does good loss mean");
results.push({ test: "good loss explanation", pass: /valid|rule|process|execution|setup/i.test(goodLoss.answer) && (goodLoss.toolsUsed || []).length === 0, tools: goodLoss.toolsUsed });

const pair = await ask("check AJ");
results.push({ test: "AJ pair context", pass: /AUDJPY|AJ|forecast|internal/i.test(pair.answer) && (pair.toolsUsed || []).some((tool) => tool === "get_pair_state" || tool === "get_session_state"), tools: pair.toolsUsed });

const firstTurn = await ask("would you take this internal?");
const continuityHistory = [
  { role: "user", content: "would you take this internal?" },
  { role: "assistant", content: firstTurn.answer },
];
const followUp = await ask("what if it engulfs?", continuityHistory);
results.push({ test: "conversation continuity", pass: /engulf|trigger|confirm|internal|watch|take|armed/i.test(followUp.answer), tools: followUp.toolsUsed });

const tradeDraft = await ask("Jarvis, log my AJ long as an Internal reversal with a 14 pip stop.");
results.push({ test: "confirmed trade draft", pass: tradeDraft.tradeAction?.intent === "ready" && tradeDraft.tradeAction?.pair === "AUDJPY" && tradeDraft.tradeAction?.setup === "Internal reversal" && tradeDraft.tradeAction?.direction === "Long" && tradeDraft.tradeAction?.stopLossPips === 14 && Array.isArray(tradeDraft.tradeAction?.missingFields) && tradeDraft.tradeAction.missingFields.length === 0 && /confirm|ready|add/i.test(tradeDraft.answer), tradeAction: tradeDraft.tradeAction });

const stats = await ask("how have my Internals performed this month?");
results.push({ test: "real setup statistics", pass: (stats.toolsUsed || []).some((tool) => tool === "get_setup_statistics" || tool === "get_live_trade_statistics") && /3|33\.3|0R|internal/i.test(stats.answer), tools: stats.toolsUsed, answer: stats.answer });

const monthly = await ask("Rank my best live trading months in 2026.");
results.push({ test: "authoritative monthly performance", pass: (monthly.toolsUsed || []).includes("get_monthly_performance") && /April|2026-04/i.test(monthly.answer) && /10\.85R?/i.test(monthly.answer) && /10 trades?/i.test(monthly.answer), tools: monthly.toolsUsed, answer: monthly.answer });

const inventory = await ask("How many records do you have access to across all of Journaly?");
results.push({ test: "authoritative Journaly inventory", pass: (inventory.toolsUsed || []).includes("get_journaly_inventory") && /liveTrades: 14 records/i.test(inventory.answer) && /backtests: 4 records/i.test(inventory.answer) && /tradeDecisions: 2 records/i.test(inventory.answer) && /authenticated database/i.test(inventory.answer), tools: inventory.toolsUsed, answer: inventory.answer });

const databaseRows = {
  trades: [
    { id: "db-t1", trade_date: "2026-04-01", trade_time: "09:00", pair: "AUDJPY", setup: "Flag", direction: "Long", mae: 0, pnl_r: 2, result: "Win", notes: "", trade_quality: "Good" },
    { id: "db-t2", trade_date: "2026-04-02", trade_time: "09:00", pair: "EURUSD", setup: "Break and retest", direction: "Short", mae: 0, pnl_r: -1, result: "Loss", notes: "", trade_quality: "Good" },
  ],
  backtests: [{ id: "db-b1", trade_date: "2026-03-01", trade_time: "09:00", pair: "AUDJPY", setup: "Flag", direction: "Long", pnl_r: 2, result: "Win", notes: "" }],
  trade_decisions: [{ id: "db-d1", decision_date: "2026-04-03", decision_time: "09:00", pair: "AUDJPY", setup: "Flag", direction: "Long", status: "Waiting", outcome: "Unknown", result_r: 0 }],
};
const fullAccessEnv = { ...ownerEnv, JARVIS_AUTH_BYPASS_USER_ID: undefined, JARVIS_AUTH_BYPASS_EMAIL: undefined, NEXT_PUBLIC_SUPABASE_URL: "https://journaly-test.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key", SUPABASE_FETCH: async (url) => {
  if (String(url).includes("/auth/v1/user")) return Response.json({ id: "database-user", email: "christian.angelo.desamparado@gmail.com" });
  const table = String(url).match(/\/rest\/v1\/([^?]+)/)?.[1];
  return Response.json(databaseRows[table] || []);
} };
const fullAccessRequest = new Request("http://local/api/jarvis/chat", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer test-user-token" }, body: JSON.stringify({ userId: "database-user", question: "How many records do you have access to across all of Journaly?", context }) });
const fullAccessResponse = await worker.fetch(fullAccessRequest, fullAccessEnv);
const fullAccess = await fullAccessResponse.json();
results.push({ test: "database overrides client snapshot", pass: fullAccessResponse.ok && /liveTrades: 2 records/i.test(fullAccess.answer) && /backtests: 1 record/i.test(fullAccess.answer) && /tradeDecisions: 1 record/i.test(fullAccess.answer) && !/liveTrades: 14 records/i.test(fullAccess.answer), tools: fullAccess.toolsUsed, answer: fullAccess.answer });

const learning = await ask("what have you learned from my saved charts and skipped trades?");
results.push({ test: "persistent learning retrieval", pass: /skip|chart|sweep|PPA|lesson|pattern/i.test(learning.answer) && (learning.toolsUsed || []).some((tool) => tool === "get_learning_records" || tool === "get_skipped_trades"), tools: learning.toolsUsed });

const backtestStats = await ask("how have my AUDJPY Internal Reversal backtests performed?");
results.push({ test: "backtest-only analytics", pass: /backtest|historical/i.test(backtestStats.answer) && /3|66\.7|1R|internal/i.test(backtestStats.answer) && (backtestStats.toolsUsed || []).includes("get_backtest_statistics"), tools: backtestStats.toolsUsed });

const liveVsBacktest = await ask("compare my live trades against my backtests for AUDJPY Internals");
results.push({ test: "live versus backtest comparison", pass: /live/i.test(liveVsBacktest.answer) && /backtest/i.test(liveVsBacktest.answer) && (liveVsBacktest.toolsUsed || []).includes("compare_live_vs_backtest"), tools: liveVsBacktest.toolsUsed });

const historicalPattern = await ask("Show me the exact losing AUDJPY Internal Reversal live trades this resembles historically.");
results.push({ test: "deterministic historical pattern citations", pass: (historicalPattern.toolsUsed || []).includes("find_historical_patterns") && /t4|ID t4/i.test(historicalPattern.answer) && /1 exact matching record|1 exact matching/i.test(historicalPattern.answer) && /anecdotal/i.test(historicalPattern.answer) && !/0% win rate/i.test(historicalPattern.answer), tools: historicalPattern.toolsUsed, answer: historicalPattern.answer });

const chartGateRequest = new Request("http://local/api/jarvis/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: "local-smoke-test", question: "Is this a valid Internal Reversal entry?", chartImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", context }) });
const chartGateResponse = await worker.fetch(chartGateRequest, ownerEnv);
const chartGate = await chartGateResponse.json();
results.push({ test: "conversational chart evidence gate", pass: chartGateResponse.ok && chartGate.chartReviewed === true && /JARVIS —/i.test(chartGate.answer) && /Confidence \d+%/i.test(chartGate.answer) && /watch|skip|invalidated/i.test(chartGate.answer) && !/Evidence-gated chart review|Evidence: Partial|No entry is validated/i.test(chartGate.answer) && chartGate.chartAssessment?.decision !== "TAKE", answer: chartGate.answer });

const visualAudit = await ask("what recurring visual quality problems did you find across my audited backtest charts?");
results.push({ test: "audited backtest chart retrieval", pass: /137|PPA|countertrend|trigger|visual|chart/i.test(visualAudit.answer) && (visualAudit.toolsUsed || []).includes("get_backtest_visual_audit"), tools: visualAudit.toolsUsed });

const blockedRequest = new Request("http://local/api/jarvis/chat", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ userId: "other-user", question: "hi jarvis", context }),
});
const blockedResponse = await worker.fetch(blockedRequest, { ...ownerEnv, JARVIS_AUTH_BYPASS_USER_ID: "other-user", JARVIS_AUTH_BYPASS_EMAIL: "another.user@example.com" });
results.push({ test: "owner-only isolation", pass: blockedResponse.status === 403, status: blockedResponse.status });

const healthResponse = await worker.fetch(new Request("http://local/api/jarvis/health?probe=1&userId=local-smoke-test"), ownerEnv);
const health = await healthResponse.json();
results.push({ test: "developer AI health", pass: healthResponse.ok && health.provider === "OpenAI" && health.apiConfigured === true && health.apiReachable === true && health.fallbackActive === false, status: healthResponse.status });

process.env.OPENAI_API_KEY = apiKey;
process.env.OPENAI_JARVIS_MODEL = "gpt-5.6-luna";
process.env.JARVIS_AUTH_BYPASS_USER_ID = "local-smoke-test";
process.env.JARVIS_AUTH_BYPASS_EMAIL = "christian.angelo.desamparado@gmail.com";
const { handleVercelJarvis } = await import(`../server/vercel-adapter.js?test=${Date.now()}`);
let vercelStatus = 0;
let vercelBody = "";
await handleVercelJarvis(
  { method: "GET", url: "/api/jarvis/health?userId=local-smoke-test", headers: { host: "local.vercel.test", "x-forwarded-proto": "https" } },
  {
    status(value) { vercelStatus = value; return this; },
    setHeader() {},
    send(value) { vercelBody = Buffer.from(value).toString("utf8"); },
  },
);
const vercelHealth = JSON.parse(vercelBody);
results.push({ test: "Vercel Jarvis API route", pass: vercelStatus === 200 && vercelHealth.apiConfigured === true, status: vercelStatus });

const outageRequest = new Request("http://local/api/jarvis/chat", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ userId: "local-smoke-test", question: "hi jarvis", context }),
});
const outageResponse = await worker.fetch(outageRequest, { ...ownerEnv, OPENAI_API_KEY: "invalid-test-key" });
const outage = await outageResponse.json();
results.push({
  test: "safe genuine-outage fallback",
  pass: outageResponse.status === 502 && outage.fallbackAllowed === true && outage.category === "authentication" && !JSON.stringify(outage).includes("invalid-test-key"),
  status: outageResponse.status,
  category: outage.category,
});

console.log(JSON.stringify({ provider: "OpenAI", model: hi.model, results }, null, 2));
if (results.some((result) => !result.pass)) process.exitCode = 1;

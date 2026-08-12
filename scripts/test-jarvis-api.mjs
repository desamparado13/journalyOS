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

const stats = await ask("how have my Internals performed this month?");
results.push({ test: "real setup statistics", pass: (stats.toolsUsed || []).includes("get_setup_statistics") && /3|33\.3|0R|internal/i.test(stats.answer), tools: stats.toolsUsed });

const learning = await ask("what have you learned from my saved charts and skipped trades?");
results.push({ test: "persistent learning retrieval", pass: /skip|chart|sweep|PPA|lesson|pattern/i.test(learning.answer) && (learning.toolsUsed || []).some((tool) => tool === "get_learning_records" || tool === "get_skipped_trades"), tools: learning.toolsUsed });

const backtestStats = await ask("how have my AUDJPY Internal Reversal backtests performed?");
results.push({ test: "backtest-only analytics", pass: /backtest|historical/i.test(backtestStats.answer) && /3|66\.7|1R|internal/i.test(backtestStats.answer) && (backtestStats.toolsUsed || []).includes("get_backtest_statistics"), tools: backtestStats.toolsUsed });

const liveVsBacktest = await ask("compare my live trades against my backtests for AUDJPY Internals");
results.push({ test: "live versus backtest comparison", pass: /live/i.test(liveVsBacktest.answer) && /backtest/i.test(liveVsBacktest.answer) && (liveVsBacktest.toolsUsed || []).includes("compare_live_vs_backtest"), tools: liveVsBacktest.toolsUsed });

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

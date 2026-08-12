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
  summary: { totalTrades: 4, reviewedTrades: 4, goodExecutions: 2, activeForecasts: 1 },
  sessionState: { activePair: "AUDJPY", activeSetup: "Internal Reversal", lastChartAvailable: true, lastJarvisDecision: "WATCH" },
  trades: [
    { id: "t4", date: "2026-08-10", pair: "AUDJPY", setup: "Internal Reversal", direction: "Buy", outcome: "Loss", pnlR: -1, executionQuality: "Good", notes: "Valid trigger; stopped normally." },
    { id: "t3", date: "2026-08-07", pair: "AUDJPY", setup: "Internal Reversal", direction: "Sell", outcome: "Win", pnlR: 2, executionQuality: "Good", notes: "Clean momentum shift." },
    { id: "t2", date: "2026-08-04", pair: "EURUSD", setup: "Internal Reversal", direction: "Buy", outcome: "Loss", pnlR: -1, executionQuality: "Mid", notes: "Trigger was not unique." },
    { id: "t1", date: "2026-07-28", pair: "GBPUSD", setup: "Flag", direction: "Buy", outcome: "Win", pnlR: 2, executionQuality: "Bad", notes: "Anticipatory entry." },
  ],
  forecasts: [{ id: "f1", date: "2026-08-12", pair: "AUDJPY", setup: "Internal Reversal", direction: "Buy", status: "Waiting", plannedRiskPercent: 0.5, entryPlan: "Wait for a strong bullish engulf." }],
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
results.push({ test: "natural greeting", pass: /\b(hey|hi|yo|good|what|pot)\b/i.test(hi.answer) && !/intelligence ready|i'm with you/i.test(hi.answer), tools: hi.toolsUsed });

const howAreYou = await ask("how are you");
results.push({ test: "casual conversation", pass: Boolean(howAreYou.answer) && howAreYou.answer !== hi.answer && !/i'm with you|temporarily unavailable/i.test(howAreYou.answer), tools: howAreYou.toolsUsed });

const loss = await ask("damn another loss");
results.push({ test: "loss empathy", pass: /loss|rough|check|review|trade/i.test(loss.answer) && !/motivational|intelligence ready/i.test(loss.answer), tools: loss.toolsUsed });

const goodLoss = await ask("what does good loss mean");
results.push({ test: "good loss explanation", pass: /valid|rule|process|execution|setup/i.test(goodLoss.answer) && (goodLoss.toolsUsed || []).length === 0, tools: goodLoss.toolsUsed });

const pair = await ask("check AJ");
results.push({ test: "AJ pair tool", pass: /AUDJPY|AJ|forecast|internal/i.test(pair.answer) && (pair.toolsUsed || []).includes("get_pair_state"), tools: pair.toolsUsed });

const firstTurn = await ask("would you take this internal?");
const continuityHistory = [
  { role: "user", content: "would you take this internal?" },
  { role: "assistant", content: firstTurn.answer },
];
const followUp = await ask("what if it engulfs?", continuityHistory);
results.push({ test: "conversation continuity", pass: /engulf|trigger|confirm|internal|watch|take|armed/i.test(followUp.answer), tools: followUp.toolsUsed });

const stats = await ask("how have my Internals performed this month?");
results.push({ test: "real setup statistics", pass: (stats.toolsUsed || []).includes("get_setup_statistics") && /3|33\.3|0R|internal/i.test(stats.answer), tools: stats.toolsUsed });

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

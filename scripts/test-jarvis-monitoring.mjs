import assert from "node:assert/strict";
import { buildAutopilotSnapshot, buildJarvisContextGraph, buildMonitoringState, compareAutopilotSnapshots, detectConversationMode, lastJarvisAlertResult, verifiedLastAlertAnswer, verifiedMonitoringAnswer } from "../server/index.js";

const now = "2026-08-14T12:00:00.000Z";
const state = buildMonitoringState({
  memories: [
    { operation: "upsert", category: "project", key: "tax_documents", value: "Finish the tax documents", sensitivity: "normal", followUpAt: "2026-08-14T08:00:00.000Z" },
  ],
  forecasts: [
    { id: "forecast-stale", date: "2026-08-12", time: "08:00", pair: "AUDUSD", setup: "Internal reversal", direction: "Long", status: "Waiting" },
    { id: "forecast-taken", date: "2026-08-14", time: "07:00", pair: "NZDJPY", setup: "Break and retest", direction: "Long", status: "Taken" },
  ],
  trades: [
    { id: "trade-review", date: "2026-08-10", time: "09:00", pair: "EURUSD", setup: "Break and retest", direction: "Short", executionQuality: null, finalizedAt: null, notes: "", screenshot: "", maeRecorded: false, maePips: null, outcome: "Win" },
  ],
  sessionState: { activePair: "GBPUSD", activeSetup: "Internal reversal" },
}, now);

assert.equal(state.source, "authenticated_journaly_monitoring_state");
assert.equal(state.counts.high, 2);
assert.equal(state.counts.medium, 2);
assert.equal(state.counts.low, 1);
assert.equal(state.items[0].priority, "high");
assert.ok(state.items.some((item) => item.id === "forecast:forecast-stale:stale"));
assert.ok(state.items.some((item) => item.id.startsWith("trade:trade-review:incomplete:")));
assert.match(state.items.find((item) => item.id.startsWith("trade:trade-review:"))?.detail || "", /Forgotten trade.*final review.*execution rating.*notes.*chart.*MAE/i);
assert.match(verifiedMonitoringAnswer(state), /deserves your attention first/i);
assert.match(verifiedMonitoringAnswer(state), /tax documents/i);
assert.equal(detectConversationMode("Jarvis, what are you monitoring?", null, {}), "daily_routine");
assert.equal(detectConversationMode("What currently needs attention?", null, {}), "daily_routine");
assert.equal(detectConversationMode("Mission Control status", null, {}), "daily_routine");
assert.equal(detectConversationMode("Why did you notify me?", null, {}), "daily_routine");

const graph = buildJarvisContextGraph({
  sessionState: { activePair: "NZDJPY", activeTradeId: "trade-active", activeForecastId: "forecast-active", lastJarvisDecision: "WATCH", edgeBrowserContext: { url: "https://www.tradingview.com/chart/test", pair: "NZDJPY", timeframe: "15m", observedAt: now } },
  trades: [{ id: "trade-active", pair: "NZDJPY", setup: "Break and retest", finalizedAt: null }],
  forecasts: [{ id: "forecast-active", pair: "NZDJPY", setup: "Break and retest", status: "Taken" }],
});
assert.ok(graph.nodes.some((node) => node.type === "chart"));
assert.ok(graph.edges.some((edge) => edge.relation === "became_trade"));
assert.ok(graph.edges.some((edge) => edge.relation === "provides_evidence_for"));

const behavioral = buildMonitoringState({
  trades: [
    { id: "e1", date: "2026-08-14", notes: "Cut the trade too early due to fear.", finalizedAt: "2026-08-14T08:00:00Z", executionQuality: "Bad", screenshot: "chart", maeRecorded: true, outcome: "Win" },
    { id: "e2", date: "2026-08-13", notes: "Closed early because I was afraid.", finalizedAt: "2026-08-13T08:00:00Z", executionQuality: "Bad", screenshot: "chart", maeRecorded: true, outcome: "Win" },
  ],
  positionSizing: { riskPercent: 2, profileMode: "main", profiles: [{ riskPercent: 1 }] },
  sessionState: { activePair: "NZDJPY" },
  tradingViewEvents: [{ id: "tv1", ticker: "NZDJPY", event: "MRL_BREAK", event_timestamp: "2026-08-14T11:30:00.000Z" }],
}, now);
assert.ok(behavioral.items.some((item) => item.title === "Repeated early exits"));
assert.ok(behavioral.items.some((item) => item.title === "Position risk above profile"));
assert.ok(behavioral.items.some((item) => /invalidation signal/i.test(item.title)));

const firstSnapshot = buildAutopilotSnapshot(
  [{ id: "trade-1", updated_at: "2026-08-13T10:00:00Z", result: "Win" }],
  [{ id: "forecast-1", updated_at: "2026-08-13T10:00:00Z", status: "Waiting" }],
  "2026-08-13T12:00:00Z",
);
const nextSnapshot = buildAutopilotSnapshot(
  [{ id: "trade-1", updated_at: "2026-08-14T10:00:00Z", result: "Win" }, { id: "trade-2", updated_at: "2026-08-14T11:00:00Z", result: "Loss" }],
  [{ id: "forecast-1", updated_at: "2026-08-13T10:00:00Z", status: "Waiting" }],
  now,
);
const changes = compareAutopilotSnapshots(firstSnapshot, nextSnapshot);
assert.equal(changes.tradeChanges, 2);
assert.equal(changes.forecastChanges, 0);

const storedAlert = lastJarvisAlertResult([{ id: "journal-1", content: `[[JARVIS_PROACTIVE_V1]]\n${JSON.stringify({ id: "alert-1", title: "Morning briefing", text: "Briefing text", trigger: { summary: "AUDUSD forecast waited over 24 hours" }, createdAt: now })}` }]);
assert.equal(storedAlert.found, true);
assert.match(verifiedLastAlertAnswer(storedAlert), /AUDUSD forecast waited over 24 hours/);

const clear = buildMonitoringState({}, now);
assert.match(verifiedMonitoringAnswer(clear), /everything.*clear/i);

console.log("Jarvis monitoring state, priority ranking, and routing passed.");

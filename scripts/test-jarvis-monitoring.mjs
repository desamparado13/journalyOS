import assert from "node:assert/strict";
import { buildMonitoringState, detectConversationMode, verifiedMonitoringAnswer } from "../server/index.js";

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
    { id: "trade-review", date: "2026-08-14", time: "09:00", pair: "EURUSD", setup: "Break and retest", direction: "Short", executionQuality: null },
  ],
  sessionState: { activePair: "GBPUSD", activeSetup: "Internal reversal" },
}, now);

assert.equal(state.source, "authenticated_journaly_monitoring_state");
assert.equal(state.counts.high, 2);
assert.equal(state.counts.medium, 2);
assert.equal(state.counts.low, 1);
assert.equal(state.items[0].priority, "high");
assert.ok(state.items.some((item) => item.id === "forecast:forecast-stale:stale"));
assert.ok(state.items.some((item) => item.id === "trade:trade-review:review"));
assert.match(verifiedMonitoringAnswer(state), /deserves your attention first/i);
assert.match(verifiedMonitoringAnswer(state), /tax documents/i);
assert.equal(detectConversationMode("Jarvis, what are you monitoring?", null, {}), "daily_routine");
assert.equal(detectConversationMode("What currently needs attention?", null, {}), "daily_routine");
assert.equal(detectConversationMode("Mission Control status", null, {}), "daily_routine");

const clear = buildMonitoringState({}, now);
assert.match(verifiedMonitoringAnswer(clear), /everything.*clear/i);

console.log("Jarvis monitoring state, priority ranking, and routing passed.");

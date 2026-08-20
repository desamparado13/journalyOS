import assert from "node:assert/strict";
import worker from "../server/index.js";

const originalFetch = globalThis.fetch;
const pushoverCalls = [];
const journalWrites = [];

globalThis.fetch = async (url, init = {}) => {
  const target = String(url);
  if (target === "https://api.pushover.net/1/messages.json") {
    pushoverCalls.push(new URLSearchParams(init.body));
    return Response.json({ status: 1, request: "autopilot-routine-test" });
  }
  if (target.includes("/rest/v1/trade_decisions?")) return Response.json([
    { id: "forecast-1", decision_date: "2026-08-10", decision_time: "08:00", pair: "AUDUSD", setup: "Internal reversal", direction: "Long", status: "Waiting", outcome: null, result_r: 0, notes: "Waiting for structure", created_at: "2026-08-10T00:00:00Z", updated_at: "2026-08-10T00:00:00Z" },
  ]);
  if (target.includes("/rest/v1/trades?")) return Response.json([
    { id: "trade-1", trade_date: "2026-08-10", trade_time: "09:00", pair: "EURUSD", setup: "Break and retest", direction: "Short", mae: null, mae_pips: null, result: "Win", notes: "", trade_quality: null, screenshot_url: "", finalized_at: null, created_at: "2026-08-10T01:00:00Z", updated_at: "2026-08-10T01:00:00Z" },
    { id: "trade-finalized", trade_date: "2026-08-09", trade_time: "09:00", pair: "AUDJPY", setup: "Break and retest", direction: "Long", mae: null, mae_pips: null, result: "Loss", notes: "", trade_quality: null, screenshot_url: "chart", finalized_at: "2026-08-09T10:00:00Z", created_at: "2026-08-09T01:00:00Z", updated_at: "2026-08-09T10:00:00Z" },
  ]);
  if (target.includes("/rest/v1/jarvis_tradingview_events?")) return Response.json([]);
  if (target.includes("/rest/v1/journal_entries?") && (!init.method || init.method === "GET")) return Response.json([]);
  if (target.includes("/rest/v1/journal_entries") && init.method === "POST") {
    journalWrites.push(JSON.parse(init.body));
    return new Response(null, { status: 201 });
  }
  return originalFetch(url, init);
};

try {
  const response = await worker.fetch(new Request("http://local/api/jarvis/routine-morning", {
    headers: { authorization: "Bearer test-cron-secret" },
  }), {
    CRON_SECRET: "test-cron-secret",
    PUSHOVER_OWNER_USER_ID: "autopilot-test-user",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    PUSHOVER_ENABLED: "true",
    PUSHOVER_APP_TOKEN: "test-app-token",
    PUSHOVER_USER_KEY: "test-user-key",
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.period, "morning");
  assert.equal(payload.counts.medium, 2);
  assert.equal(pushoverCalls.length, 1);
  assert.equal(pushoverCalls[0].get("title"), "JARVIS · Morning briefing");
  assert.equal(journalWrites.length, 2);
  assert.match(journalWrites[0].content, /^\[\[JARVIS_PROACTIVE_V1\]\]/);
  assert.match(journalWrites[0].content, /"trigger"/);
  assert.doesNotMatch(journalWrites[0].content, /AUDJPY incomplete trade/i);
  assert.match(journalWrites[1].content, /^\[\[JARVIS_ROUTINE_V1\]\]/);
  assert.match(journalWrites[1].content, /"snapshot"/);
  console.log("Jarvis Autopilot morning briefing, Pushover, trigger persistence, and snapshot passed.");
} finally {
  globalThis.fetch = originalFetch;
}

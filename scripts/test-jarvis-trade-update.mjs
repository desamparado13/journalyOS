import assert from "node:assert/strict";
import worker from "../server/index.js";

const modelPayload = {
  answer: "I've updated the trade.",
  learningSummary: null,
  memoryUpdates: [],
  tradeAction: {
    intent: "update_pending",
    tradeId: "trade-1",
    date: null,
    time: null,
    pair: "NZDJPY",
    setup: "Break and retest",
    direction: "Long",
    stopLossPips: null,
    mae: 0,
    pnl: 1,
    result: "Win",
    notes: "Closed early due to fear.",
    missingFields: [],
  },
  forecastAction: null,
  positionSizingAction: null,
  positionProfileAction: null,
  chartAssessment: null,
};

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => Response.json({ output_text: JSON.stringify(modelPayload), usage: {} });

try {
  const response = await worker.fetch(new Request("http://local/api/jarvis/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userId: "pending-trade-update-test",
      question: "Update my NZDJPY trade to +1R and note that I closed early due to fear.",
      chartImage: "data:image/png;base64,test",
      context: {
        sessionState: { activeTradeId: "trade-1", activePair: "NZDJPY", activeSetup: "Break and retest" },
        trades: [{ id: "trade-1", date: "2026-08-13", time: "21:00", pair: "NZDJPY", setup: "Break and retest", direction: "Long", outcome: "Breakeven", pnlR: 0, mae: 0, notes: "", finalizedAt: null }],
      },
    }),
  }), {
    OPENAI_API_KEY: "test-key",
    OPENAI_JARVIS_MODEL: "test-model",
    JARVIS_AUTH_BYPASS_USER_ID: "pending-trade-update-test",
    JARVIS_AUTH_BYPASS_EMAIL: "christian.angelo.desamparado@gmail.com",
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.tradeAction?.intent, "update_pending");
  assert.equal(payload.tradeAction?.tradeId, "trade-1");
  assert.equal(payload.tradeAction?.pnl, 1);
  assert.equal(payload.tradeAction?.result, "Win");
  assert.equal(payload.tradeAction?.notes, "Closed early due to fear.");
  assert.equal(payload.conversationMode, "post_trade_review", "an update request with an image must not route to pre-trade chart review");
  assert.match(payload.answer, /prepared/i, "server must not claim an unconfirmed update was saved");
  assert.match(payload.answer, /Confirm the action card/i);
  assert.doesNotMatch(payload.answer, /WATCH|TAKE|SKIP/, "chart analysis must not overwrite a pending trade update");
  assert.match(payload.answer, /final screenshot/i);
  console.log("Jarvis pending-trade update regression: passed");
} finally {
  globalThis.fetch = originalFetch;
}

import assert from "node:assert/strict";
import worker, { detectChartInteractionMode, detectConversationMode, feedbackStyleExamples, selectRelevantMemories, syncedMemoriesFromJournal, syncedSessionFromJournal } from "../server/index.js";

const chart = "data:image/png;base64,test";
const activeTradeMessages = [
  "jarvis trade went well so far, i think im going to get 2r and wont trail it cause its friday already",
  "im already in the trade, check my recent trades",
  "I took this position and I am holding for 2R",
  "my trade is running",
];
const chartReviewMessages = [
  "should I take this trade?",
  "analyze this setup",
  "is this a good break and retest?",
];

for (const message of activeTradeMessages) {
  assert.equal(detectChartInteractionMode(message, chart), "active_trade_management", message);
}
for (const message of chartReviewMessages) {
  assert.equal(detectChartInteractionMode(message, chart), "chart_review", message);
}
assert.equal(detectChartInteractionMode(activeTradeMessages[0], null), "conversation");
assert.equal(detectConversationMode(activeTradeMessages[0], null, {}), "active_trade_management");
assert.equal(detectConversationMode("should I take this trade?", chart, {}), "pre_trade_review");
assert.equal(detectConversationMode("my trade closed at 2R", null, {}), "post_trade_review");
assert.equal(detectConversationMode("how are my Internals doing?", null, {}), "performance_analytics");
assert.equal(detectConversationMode("I want to reflect on my trading journey", null, {}), "journal_reflection");
assert.equal(detectConversationMode("thanks", null, {}), "casual_conversation");
assert.equal(detectConversationMode("should I hold?", null, { activeTradeId: "trade-1" }), "active_trade_management");
assert.equal(detectConversationMode("what about it?", null, { activeForecastId: "forecast-1" }), "forecast_management");
assert.equal(detectConversationMode("give me my morning briefing", null, {}), "daily_routine");
assert.equal(detectConversationMode("My sister is visiting tomorrow", null, {}), "personal_conversation");
assert.equal(detectConversationMode("I have been feeling more confident at work", null, {}), "personal_conversation");
assert.equal(detectConversationMode("Can we talk about my relationship?", null, {}), "personal_conversation");
assert.equal(detectConversationMode("Calculate my EURUSD position risk", null, {}), "general_trading_conversation");

const relevantMemories = selectRelevantMemories([
  { operation: "upsert", category: "risk_rule", key: "fixed_target", value: "Pot prefers fixed 2R targets." },
  { operation: "upsert", category: "goal", key: "unrelated_goal", value: "Learn a new language." },
  { operation: "upsert", category: "preference", key: "response_tone", value: "Keep trading replies concise and natural." },
], "Should I hold this trade to 2R?", "active_trade_management", 2);
assert.deepEqual(relevantMemories.map((memory) => memory.key), ["fixed_target", "response_tone"]);

const personalMemories = selectRelevantMemories([
  { operation: "upsert", category: "relationship", key: "sister_visit", value: "Pot's sister is visiting this weekend.", source: "explicit", sensitivity: "normal", followUpAt: "2026-08-13T08:00:00Z" },
  { operation: "upsert", category: "project", key: "fitness_goal", value: "Pot is rebuilding a consistent gym routine.", source: "explicit", sensitivity: "normal", followUpAt: null },
  { operation: "upsert", category: "trading_rule", key: "fixed_target", value: "Use fixed targets.", source: "explicit", sensitivity: "normal", followUpAt: null },
], "How is life going?", "personal_conversation", 2);
assert.deepEqual(personalMemories.map((memory) => memory.key), ["sister_visit", "fitness_goal"]);

const feedbackExamples = feedbackStyleExamples([{
  content: '[[JARVIS_FEEDBACK_V1]]\n{"sentiment":"missed","reason":"too_strict","userMessage":"How is my trade?","assistantResponse":"No entry validated."}',
  advice: "The response was too strict or sounded like an auditor.",
}]);
assert.equal(feedbackExamples[0]?.reason, "too_strict");

const syncedMemories = syncedMemoriesFromJournal([
  { content: '[[JARVIS_MEMORY_SYNC_V1]]\n{"syncedAt":"2026-08-14T08:00:00Z","updates":[{"operation":"upsert","category":"preference","key":"tone","value":"Formal","confidence":1}]}' },
  { content: '[[JARVIS_MEMORY_SYNC_V1]]\n{"syncedAt":"2026-08-14T09:00:00Z","updates":[{"operation":"upsert","category":"preference","key":"tone","value":"Natural and concise","confidence":1}]}' },
]);
assert.equal(syncedMemories[0]?.value, "Natural and concise");
const syncedSession = syncedSessionFromJournal([
  { content: '[[JARVIS_SESSION_SYNC_V1]]\n{"syncedAt":"2026-08-14T09:00:00Z","state":{"pair":"AUDUSD","forecastId":"forecast-1"}}' },
]);
assert.equal(syncedSession?.pair, "AUDUSD");

const modelAnswer = "You are already in this NZDJPY trade. The move is progressing toward your target, so I would manage the open position rather than reassess the entry.";
const modelPayload = {
  answer: modelAnswer,
  learningSummary: null,
  memoryUpdates: [],
  tradeAction: {
    intent: "ready",
    date: "2026-08-14",
    time: "08:00",
    pair: "NZDJPY",
    setup: "Break and retest",
    direction: "Long",
    stopLossPips: null,
    mae: 0,
    pnl: 0,
    result: "Breakeven",
    notes: "Open trade targeting 2R.",
    missingFields: [],
  },
  forecastAction: null,
  positionSizingAction: null,
  chartAssessment: {
    setupCandidate: "Break and retest",
    direction: "Long",
    decision: "WATCH",
    evidenceLevel: "Partial",
    visibleEvidence: ["Price has moved above the marked recent high."],
    missingEvidence: ["the original trigger"],
    conflictingEvidence: [],
    features: {
      ppaQuality: "Good",
      structureVisible: true,
      momentumShiftVisible: true,
      liquidityContextVisible: false,
      sweepVisible: false,
      retestVisible: false,
      trendVisible: true,
      consolidationVisible: false,
      triggerVisible: false,
      entryVisible: true,
      sessionTimingVisible: false,
      higherTimeframeAlignmentVisible: false,
    },
  },
};

const originalFetch = globalThis.fetch;
let capturedModelRequest = null;
globalThis.fetch = async (_url, init) => {
  capturedModelRequest = JSON.parse(init.body);
  return Response.json({ output_text: JSON.stringify(modelPayload), usage: {} });
};
try {
  const request = new Request("http://local/api/jarvis/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userId: "interaction-routing-test",
      question: activeTradeMessages[0],
      chartImage: chart,
      previousChartImage: "data:image/png;base64,previous",
      context: {
        sessionState: { activeTradeId: "trade-1", activeForecastId: "forecast-1", activePair: "NZDJPY", activeSetup: "Break and retest" },
        trades: [{ id: "trade-1", date: "2026-08-14", time: "08:00", pair: "NZDJPY", setup: "Break and retest", direction: "Long", outcome: "Breakeven", pnlR: 0, notes: "Open trade targeting 2R." }],
        forecasts: [{ id: "forecast-1", date: "2026-08-14", time: "07:00", pair: "NZDJPY", setup: "Break and retest", direction: "Long", status: "Waiting", entryPlan: "Wait for the retest to hold.", notes: "Documented before entry." }],
      },
    }),
  });
  const response = await worker.fetch(request, {
    OPENAI_API_KEY: "test-key",
    OPENAI_JARVIS_MODEL: "test-model",
    JARVIS_AUTH_BYPASS_USER_ID: "interaction-routing-test",
    JARVIS_AUTH_BYPASS_EMAIL: "christian.angelo.desamparado@gmail.com",
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.answer, modelAnswer, "active-trade answer must not be replaced by the pre-entry chart formatter");
  assert.equal(payload.tradeAction, null, "an existing active trade must not create a duplicate trade draft");
  assert.equal(payload.conversationMode, "active_trade_management");
  assert.equal(payload.chartCompared, true);
  const currentTurn = capturedModelRequest.input.at(-1).content;
  assert.equal(currentTurn.filter((item) => item.type === "input_image").length, 2);
  assert.match(currentTurn[0].text, /"activeForecast":\{"id":"forecast-1"/);
} finally {
  globalThis.fetch = originalFetch;
}

let companionRequest = null;
globalThis.fetch = async (_url, init) => {
  companionRequest = JSON.parse(init.body);
  return Response.json({
    output_text: JSON.stringify({
      answer: "That sounds like a big day. I’ll remember to ask how your sister’s visit went.",
      learningSummary: null,
      memoryUpdates: [{ operation: "upsert", category: "life_event", key: "sister_visit", value: "Pot's sister is visiting tomorrow.", confidence: 0.98, source: "explicit", sensitivity: "normal", followUpAt: "2026-08-15T12:00:00+08:00" }],
      tradeAction: null,
      forecastAction: null,
      positionSizingAction: null,
      chartAssessment: null,
    }),
    usage: {},
  });
};
try {
  const response = await worker.fetch(new Request("http://local/api/jarvis/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: "companion-routing-test", question: "My sister is visiting tomorrow. Remember to ask me how it went.", context: { profile: { preferredName: "Pot", companionSettings: { personalMemoryEnabled: true, inferenceMode: "balanced", sensitiveMemoryEnabled: false, proactiveFollowups: true } }, sessionState: {} } }),
  }), {
    OPENAI_API_KEY: "test-key",
    OPENAI_JARVIS_MODEL: "test-model",
    JARVIS_AUTH_BYPASS_USER_ID: "companion-routing-test",
    JARVIS_AUTH_BYPASS_EMAIL: "christian.angelo.desamparado@gmail.com",
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.conversationMode, "personal_conversation");
  assert.equal(payload.memoryUpdates[0].category, "life_event");
  assert.equal(payload.memoryUpdates[0].followUpAt, "2026-08-15T12:00:00+08:00");
  assert.match(companionRequest.instructions, /JARVIS LIFE COMPANION/);
  assert.match(companionRequest.input.at(-1).content[0].text, /"personalMemoryEnabled":true/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Jarvis intelligence routing and companion context: 35/35 passed");

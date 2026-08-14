import assert from "node:assert/strict";
import worker, { calculateJournalyPositionSize, managePositionProfiles } from "../server/index.js";

const profiles = [
  { id: "main-1", balance: 1000, type: "Main", platform: "Exness", riskPercent: 1.5 },
  { id: "funded-1", balance: 7500, type: "Funded", platform: "5ers", riskPercent: 0.5 },
  { id: "funded-2", balance: 100000, type: "Funded", platform: "MT5", riskPercent: 1 },
];
const updatedProfile = managePositionProfiles({ operation: "update", rowId: null, matchBalance: 7500, matchType: "Funded", matchPlatform: null, balance: null, type: null, platform: null, riskPercent: 1, profileMode: null }, { profiles, profileMode: "main" });
assert.equal(updatedProfile.ready, true);
assert.equal(updatedProfile.rowId, "funded-1");
assert.equal(updatedProfile.platform, "5ers");
assert.equal(updatedProfile.riskPercent, 1);
const renamedPlatform = managePositionProfiles({ operation: "update", rowId: null, matchBalance: 1000, matchType: null, matchPlatform: "Exness", balance: null, type: null, platform: "FTMO", riskPercent: null, profileMode: null }, { profiles, profileMode: "main" });
assert.equal(renamedPlatform.platform, "FTMO");
const ambiguousProfile = managePositionProfiles({ operation: "update", rowId: null, matchBalance: null, matchType: "Funded", matchPlatform: null, balance: null, type: null, platform: null, riskPercent: 0.75, profileMode: null }, { profiles, profileMode: "main" });
assert.equal(ambiguousProfile.ready, false);
assert.deepEqual(ambiguousProfile.candidateIds, ["funded-1", "funded-2"]);
const addedProfile = managePositionProfiles({ operation: "add", rowId: null, matchBalance: null, matchType: null, matchPlatform: null, balance: 25000, type: "Funded", platform: "FTMO", riskPercent: 0.5, profileMode: null }, { profiles, profileMode: "main" });
assert.equal(addedProfile.ready, true);
const halfMode = managePositionProfiles({ operation: "set_mode", rowId: null, matchBalance: null, matchType: null, matchPlatform: null, balance: null, type: null, platform: null, riskPercent: null, profileMode: "half" }, { profiles, profileMode: "main" });
assert.equal(halfMode.ready, true);

const eurusd = calculateJournalyPositionSize({
  applyToCalculator: true,
  pair: "EURUSD",
  accountBalance: 10000,
  riskPercent: 1,
  entryPrice: 1.1,
  stopLossPrice: 1.095,
  takeProfitPrice: 1.11,
  quoteToUsdRate: null,
});
assert.equal(eurusd.ready, true);
assert.equal(eurusd.quoteToUsdRate, 1);
assert.equal(eurusd.result.direction, "Long");
assert.ok(Math.abs(eurusd.result.stopPips - 50) < 1e-9);
assert.ok(Math.abs(eurusd.result.lots - 0.2) < 1e-9);
assert.ok(Math.abs(eurusd.result.units - 20000) < 1e-6);
assert.ok(Math.abs(eurusd.result.rewardRisk - 2) < 1e-9);
assert.ok(Math.abs(eurusd.result.projectedProfit - 200) < 1e-6);

const audjpy = calculateJournalyPositionSize({
  applyToCalculator: false,
  pair: "AUDJPY",
  accountBalance: 5000,
  riskPercent: 1,
  entryPrice: 95,
  stopLossPrice: 94.5,
  takeProfitPrice: 94,
  quoteToUsdRate: 1 / 150,
});
assert.equal(audjpy.ready, true);
assert.equal(audjpy.applyToCalculator, true, "every ready sizing request should populate the calculator");
assert.equal(audjpy.result.direction, "Long");
assert.ok(Math.abs(audjpy.result.stopPips - 50) < 1e-9);
assert.ok(Math.abs(audjpy.result.lots - 0.15) < 1e-9);
assert.equal(audjpy.result.takeProfitValid, false);
assert.equal(audjpy.result.rewardRisk, null);

const missingRate = calculateJournalyPositionSize({
  applyToCalculator: false,
  pair: "NZDJPY",
  accountBalance: 10000,
  riskPercent: 1,
  entryPrice: 92,
  stopLossPrice: 91.8,
  takeProfitPrice: null,
  quoteToUsdRate: null,
});
assert.equal(missingRate.ready, false);
assert.equal(missingRate.applyToCalculator, true, "the calculator action remains armed while Jarvis asks for missing inputs");
assert.deepEqual(missingRate.missingFields, ["quoteToUsdRate"]);
assert.equal(missingRate.result, null);

const originalFetch = globalThis.fetch;
let modelRound = 0;
globalThis.fetch = async () => {
  modelRound += 1;
  if (modelRound === 1) {
    return Response.json({
      output: [{
        type: "function_call",
        name: "calculate_position_size",
        call_id: "position-size-1",
        arguments: JSON.stringify({ applyToCalculator: true, pair: "EURUSD", accountBalance: 10000, riskPercent: 1, entryPrice: 1.1, stopLossPrice: 1.095, takeProfitPrice: 1.11, quoteToUsdRate: 1 }),
      }],
      usage: {},
    });
  }
  return Response.json({
    output_text: JSON.stringify({
      answer: "placeholder model prose",
      memoryUpdates: [],
      learningSummary: null,
      tradeAction: null,
      forecastAction: null,
      positionSizingAction: null,
      positionProfileAction: null,
      chartAssessment: null,
    }),
    usage: {},
  });
};
try {
  const response = await worker.fetch(new Request("http://local/api/jarvis/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: "position-sizing-test", question: "Jarvis fill my calculator: EURUSD entry 1.1000 stop 1.0950 target 1.1100", context: { positionSizing: { pair: "EURUSD", accountBalance: 10000, riskPercent: 1, entryPrice: null, stopLossPrice: null, takeProfitPrice: null, quoteToUsdRate: 1 }, sessionState: {} } }),
  }), {
    OPENAI_API_KEY: "test-key",
    OPENAI_JARVIS_MODEL: "test-model",
    JARVIS_AUTH_BYPASS_USER_ID: "position-sizing-test",
    JARVIS_AUTH_BYPASS_EMAIL: "christian.angelo.desamparado@gmail.com",
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.positionSizingAction.ready, true);
  assert.equal(payload.positionSizingAction.applyToCalculator, true);
  assert.ok(Math.abs(payload.positionSizingAction.result.lots - 0.2) < 1e-9);
  assert.match(payload.answer, /0\.2 standard lots/i);
  assert.match(payload.answer, /filled Journaly's Position Sizing tab/i);
  assert.deepEqual(payload.toolsUsed, ["calculate_position_size"]);
} finally {
  globalThis.fetch = originalFetch;
}

modelRound = 0;
globalThis.fetch = async () => {
  modelRound += 1;
  if (modelRound === 1) {
    return Response.json({
      output: [{
        type: "function_call",
        name: "manage_position_profiles",
        call_id: "profile-update-1",
        arguments: JSON.stringify({ operation: "update", rowId: null, matchBalance: 7500, matchType: "Funded", matchPlatform: null, balance: null, type: null, platform: null, riskPercent: 1, profileMode: null }),
      }],
      usage: {},
    });
  }
  return Response.json({
    output_text: JSON.stringify({ answer: "placeholder", memoryUpdates: [], learningSummary: null, tradeAction: null, forecastAction: null, positionSizingAction: null, positionProfileAction: null, chartAssessment: null }),
    usage: {},
  });
};
try {
  const response = await worker.fetch(new Request("http://local/api/jarvis/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: "position-sizing-test", question: "Change my 7,500 Funded profile to 1% risk", context: { positionSizing: { profiles, profileMode: "main" }, sessionState: {} } }),
  }), {
    OPENAI_API_KEY: "test-key",
    OPENAI_JARVIS_MODEL: "test-model",
    JARVIS_AUTH_BYPASS_USER_ID: "position-sizing-test",
    JARVIS_AUTH_BYPASS_EMAIL: "christian.angelo.desamparado@gmail.com",
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.positionProfileAction.ready, true);
  assert.equal(payload.positionProfileAction.rowId, "funded-1");
  assert.equal(payload.positionProfileAction.riskPercent, 1);
  assert.match(payload.answer, /updated/i);
  assert.deepEqual(payload.toolsUsed, ["manage_position_profiles"]);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Jarvis position sizing and profile control: passed");

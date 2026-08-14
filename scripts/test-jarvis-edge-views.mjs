import assert from "node:assert/strict";
import { archiveViewResult, detectConversationMode, requestedArchiveViews, verifiedArchiveViewsAnswer } from "../server/index.js";

const question = "analyze Edge pls, edge clock, session edge and week edge, what have you noticed?";
assert.equal(detectConversationMode(question, null, {}), "performance_analytics");
assert.deepEqual(requestedArchiveViews(question), ["edge_clock", "session_edge", "week_edge"]);

const data = {
  trades: [
    { id: "1", date: "2026-08-10", time: "09:15", pair: "NZDJPY", setup: "Break and retest", direction: "Long", outcome: "Win", pnlR: 2 },
    { id: "2", date: "2026-08-12", time: "21:10", pair: "AUDUSD", setup: "Internal reversal", direction: "Short", outcome: "Loss", pnlR: -1 },
    { id: "3", date: "2026-08-13", time: "15:30", pair: "EURUSD", setup: "Flag", direction: "Long", outcome: "Win", pnlR: 1 },
  ],
  backtests: [],
};
const filters = { source: "both", pair: null, setup: null, direction: null, quality: null, month: null, year: null, period: null, limit: 500 };
const results = requestedArchiveViews(question).map((view) => archiveViewResult(data, { ...filters, view }));
const answer = verifiedArchiveViewsAnswer(results);

assert.match(answer, /all 3 requested Edge views/i);
assert.match(answer, /Edge Clock/);
assert.match(answer, /Session Edge/);
assert.match(answer, /Week Edge/);
assert.match(answer, /strongest/i);
assert.match(answer, /weakest/i);

console.log("Jarvis multi-view Edge analysis passed.");

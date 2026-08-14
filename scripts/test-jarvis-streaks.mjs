import assert from "node:assert/strict";
import { detectConversationMode, requestedProactiveDelay, tradeStreakResult, verifiedTradeStreakAnswer } from "../server/index.js";

const trades = [
  { id: "1", date: "2025-12-30", time: "09:00", outcome: "Win", pnlR: 1, pair: "AUDUSD", setup: "Break and retest", direction: "Long" },
  { id: "2", date: "2025-12-31", time: "09:00", outcome: "Win", pnlR: 2, pair: "EURUSD", setup: "Internal reversal", direction: "Short" },
  { id: "3", date: "2026-01-02", time: "09:00", outcome: "Win", pnlR: 1, pair: "AUDUSD", setup: "Break and retest", direction: "Long" },
  { id: "4", date: "2026-01-03", time: "09:00", outcome: "Loss", pnlR: -1, pair: "AUDUSD", setup: "Break and retest", direction: "Long" },
  { id: "5", date: "2026-02-01", time: "09:00", outcome: "Win", pnlR: 1, pair: "NZDJPY", setup: "Internal reversal", direction: "Long" },
  { id: "6", date: "2026-02-02", time: "09:00", outcome: "Win", pnlR: 2, pair: "NZDJPY", setup: "Internal reversal", direction: "Long" },
];

const all = tradeStreakResult([...trades].reverse(), { year: null, pair: null, setup: null, direction: null });
assert.equal(all.bestWinStreak.count, 3);
assert.equal(all.bestWinStreak.startDate, "2025-12-30");
assert.equal(all.bestWinStreak.endDate, "2026-01-02");
assert.equal(all.currentWinStreak.count, 2);
assert.match(verifiedTradeStreakAnswer(all), /3 wins in a row/);
assert.match(verifiedTradeStreakAnswer(all), /2025–2026/);

const year = tradeStreakResult(trades, { year: 2026, pair: null, setup: null, direction: null });
assert.equal(year.bestWinStreak.count, 2);
assert.equal(detectConversationMode("jarvis whats my best win streak with year", null, {}), "performance_analytics");
assert.equal(detectConversationMode("i mean wins in a row", null, {}), "performance_analytics");
assert.deepEqual(requestedProactiveDelay("reply to me in 10 seconds"), { delaySeconds: 10, label: "10 seconds", message: "I'm back, Pot - the 10 seconds wait is up. I'm here." });
assert.equal(requestedProactiveDelay("reply in 2 minutes"), null, "server-backed short timers stay within the function execution window");

console.log("Jarvis streak routing and deterministic calculation passed.");

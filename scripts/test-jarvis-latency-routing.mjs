import assert from "node:assert/strict";
import { detectConversationMode, shouldUseFastConversationLane } from "../server/index.js";

const lane = (question, sessionState = {}, chartImage = null) => {
  const mode = detectConversationMode(question, chartImage, sessionState);
  return shouldUseFastConversationLane(mode, question, chartImage, sessionState);
};

assert.equal(lane("Hey Jarvis"), true);
assert.equal(lane("I had a rough day at work"), true);
assert.equal(lane("Remember that my interview is Monday"), true);
assert.equal(lane("Calculate my lot size for AUDJPY"), false);
assert.equal(lane("Change my MT5 profile risk to 1%"), false);
assert.equal(lane("How are my Internal Reversal trades doing?"), false);
assert.equal(lane("What do you think?", { activeTradeId: "trade-1" }), false);
assert.equal(lane("What do you see?", {}, "data:image/png;base64,abc"), false);

console.log("Jarvis fast/deep latency routing tests passed.");

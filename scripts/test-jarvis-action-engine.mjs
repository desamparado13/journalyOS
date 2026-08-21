import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const jarvisSource = await readFile(new URL("../src/Jarvis.tsx", import.meta.url), "utf8");
const appSource = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

assert.match(jarvisSource, /JARVIS_ACTION_RECEIPT_V1/, "verified actions need durable receipts");
assert.match(jarvisSource, /select\("id,pnl_r,result,finalized_at,screenshot_url,notes,mae"\)/, "trade updates need a read-after-write row");
assert.match(jarvisSource, /did not match the requested update/, "trade updates must reject mismatched persisted state");
assert.match(jarvisSource, /if \(!await onTradeCreated\((?:existing|data)\.id\)\)/, "trade success must verify the expected refreshed row");
assert.match(jarvisSource, /if \(!await onForecastChanged/, "forecast success must wait for refreshed UI state");
assert.match(appSource, /async function loadTrades\(expectedTradeId\?: string\): Promise<boolean>/, "trade refresh must report verification success");
assert.match(appSource, /loadedTrades\.some\(\(trade\) => trade\.id === expectedTradeId\)/, "trade refresh must contain the written row");
assert.match(appSource, /async function loadTradeDecisions\(expected\?:/, "forecast refresh must report verification success");
assert.match(appSource, /decision\.id === expected\.id && decision\.status === expected\.status/, "forecast refresh must contain the requested persisted status");
assert.match(jarvisSource, /function JarvisRichText/, "Jarvis replies need a structured rich-text renderer");
assert.match(jarvisSource, /renderJarvisInline/, "Jarvis replies need safe inline emphasis rendering");
assert.doesNotMatch(jarvisSource, /dangerouslySetInnerHTML/, "Jarvis rich text must not inject model-authored HTML");

console.log("Jarvis verified action engine tests passed.");

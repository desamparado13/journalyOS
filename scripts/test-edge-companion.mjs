import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { detectConversationMode, shouldUseFastConversationLane } from "../server/index.js";

await import("../browser-extension/context.js");
const parser = globalThis.JournalyEdgeContext;
assert.ok(parser, "the TradingView context parser is exposed");
assert.equal(parser.normalizePair("OANDA:NZDJPY"), "NZDJPY");
assert.equal(parser.normalizePair("unrelated tab"), null);

const context = parser.parseTradingViewContext({
  title: "NZDJPY · 15 · TradingView",
  url: "https://www.tradingview.com/chart/abc/?symbol=OANDA%3ANZDJPY",
  chartLabel: "New Zealand Dollar / Japanese Yen",
  intervalLabel: "15m",
});
assert.equal(context.pair, "NZDJPY");
assert.equal(context.timeframe, "15m");
assert.equal(context.source, "TradingView");
assert.match(context.observedAt, /^\d{4}-\d{2}-\d{2}T/);

const manifest = JSON.parse(await readFile(new URL("../browser-extension/manifest.json", import.meta.url), "utf8"));
const background = await readFile(new URL("../browser-extension/background.js", import.meta.url), "utf8");
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.version, "1.0.2");
assert.ok(manifest.host_permissions.includes("https://journaly-os.vercel.app/*"), "the production Vercel Journaly app is authorized");
assert.ok(manifest.content_scripts[0].matches.includes("https://journaly-os.vercel.app/*"), "the bridge loads on the production Vercel Journaly app");
assert.ok(!manifest.host_permissions.some((pattern) => pattern === "<all_urls>"), "the companion never requests unrestricted browsing access");
assert.ok(!manifest.permissions.includes("webRequest"), "the companion does not intercept network traffic");
assert.match(background, /captureVisibleTab/);
assert.match(background, /JOURNALY_EDGE_DISCONNECT/);
assert.match(background, /files: \["journaly-bridge\.js"\]/, "an already-open Journaly tab receives the extension bridge without a reload");
const mode = detectConversationMode("Jarvis, what context do you have from my Edge tab?", null, { edgeBrowserContext: context });
assert.equal(mode, "general_trading_conversation");
assert.equal(shouldUseFastConversationLane(mode, "Jarvis, what context do you have from my Edge tab?", null, { edgeBrowserContext: context }), false);

console.log("Journaly Edge Companion permissions and context parsing passed.");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../browser-extension/manifest.json", import.meta.url), "utf8"));
const background = await readFile(new URL("../browser-extension/background.js", import.meta.url), "utf8");
const bridge = await readFile(new URL("../browser-extension/journaly-bridge.js", import.meta.url), "utf8");

assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.name, "Journaly Local Bridge");
assert.equal(manifest.version, "2.0.0");
assert.deepEqual(manifest.permissions, [], "the local bridge needs no browser-control permissions");
assert.equal(manifest.action, undefined, "the bridge syncs automatically and needs no toolbar action");
assert.ok(manifest.host_permissions.includes("http://127.0.0.1:11434/*"), "the local Ollama API is authorized");
assert.ok(!manifest.host_permissions.some((pattern) => /tradingview/i.test(pattern)), "TradingView access is discontinued");
assert.ok(!manifest.host_permissions.some((pattern) => pattern === "<all_urls>"), "unrestricted browsing access is never requested");
assert.ok(!/captureVisibleTab|chrome\.tabs|chrome\.scripting|JOURNALY_EDGE_/i.test(background), "the service worker has no tab sharing or capture code");
assert.ok(!/JOURNALY_EDGE_/i.test(bridge), "the page bridge is local-model only");
assert.match(background, /JOURNALY_LOCAL_ANALYZE/);
assert.match(background, /127\.0\.0\.1:11434/);
assert.match(background, /find\(\(name\) => \/gemma\/i/, "only a local Gemma model is selected");
assert.match(bridge, /JOURNALY_LOCAL_READY/);

console.log("Journaly Local Bridge permissions and Ollama sync passed.");

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { decodeVoiceAudio } from "../server/index.js";

const payload = Buffer.alloc(700, 1).toString("base64");
const decoded = decodeVoiceAudio(`data:audio/webm;base64,${payload}`);

assert.ok(decoded, "valid webm audio should decode");
assert.equal(decoded.mimeType, "audio/webm");
assert.equal(decoded.extension, "webm");
assert.equal(decoded.bytes.byteLength, 700);
assert.equal(decodeVoiceAudio(`data:audio/webm;codecs=opus;base64,${payload}`)?.bytes.byteLength, 700);
assert.equal(decodeVoiceAudio("data:text/plain;base64,SGVsbG8="), null);
assert.equal(decodeVoiceAudio(`data:audio/webm;base64,${Buffer.alloc(100).toString("base64")}`), null);

const jarvisSource = await readFile(new URL("../src/Jarvis.tsx", import.meta.url), "utf8");
assert.match(jarvisSource, /continuousVoiceActive/, "continuous voice needs visible runtime state");
assert.match(jarvisSource, /function resumeContinuousVoice\(\)/, "continuous voice must resume after each spoken answer");
assert.match(jarvisSource, /audio\.onended[\s\S]{0,180}resumeContinuousVoice\(\)/, "dedicated voice completion must reopen the listening loop");
assert.match(jarvisSource, /Listening → answering aloud → listening again/, "the settings UI should explain continuous turn-taking");

console.log("Jarvis voice payload and continuous-loop tests passed.");

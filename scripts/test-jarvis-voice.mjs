import assert from "node:assert/strict";
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

console.log("Jarvis voice payload tests passed.");

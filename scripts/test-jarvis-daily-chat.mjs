import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const jarvis = await readFile(new URL("../src/Jarvis.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

assert.match(jarvis, /type JarvisConversations = Record<string, JarvisMessage\[\]>/, "daily chats need a date-keyed store");
assert.match(jarvis, /const \[selectedChatDate, setSelectedChatDate\] = useState\(localDateKey\)/, "Jarvis must open today's chat by default");
assert.match(jarvis, /timestampForChatDate\(targetDate\)/, "new replies must receive the selected chat date");
assert.match(jarvis, /groupMessagesByDate\(validStoredMessages\(saved\)/, "legacy flat history must migrate into daily chats");
assert.match(jarvis, /version: 2, conversations: storedConversations/, "daily chats must persist locally with an explicit version");
assert.match(jarvis, /version: 2, conversations: nextConversations, syncedAt/, "daily chats must sync across devices by date");
assert.match(jarvis, /max=\{localDateKey\(\)\}/, "the chat date picker must prevent future threads");
assert.match(jarvis, /chatDates\.has\(date\)/, "calendar days with history need a visible marker");
assert.match(styles, /\.jarvis-rail > :not\(\.jarvis-mini-calendar\):not\(\.jarvis-spend-card\)/, "the left rail must hide everything except calendar and GPT spend");
assert.match(styles, /\.jarvis-context-panel > :not\(\.jarvis-execution-card\)/, "the right panel must hide everything except Execution Pulse");

console.log("Jarvis daily chat and clean-panel tests passed.");

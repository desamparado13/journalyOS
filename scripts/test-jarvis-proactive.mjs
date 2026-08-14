import assert from "node:assert/strict";
import worker from "../server/index.js";

const originalFetch = globalThis.fetch;
const pushoverCalls = [];
const journalWrites = [];

globalThis.fetch = async (url, init = {}) => {
  const target = String(url);
  if (target === "https://api.pushover.net/1/messages.json") {
    pushoverCalls.push(new URLSearchParams(init.body));
    return Response.json({ status: 1, request: "proactive-test" });
  }
  if (target.includes("/rest/v1/journal_entries")) {
    journalWrites.push(JSON.parse(init.body));
    return new Response(null, { status: 201 });
  }
  return originalFetch(url, init);
};

try {
  const startedAt = Date.now();
  const response = await worker.fetch(new Request("http://local/api/jarvis/proactive", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: "proactive-test-user", delaySeconds: 1, message: "I'm back, Pot - the 1 second wait is up. I'm here." }),
  }), {
    JARVIS_AUTH_BYPASS_USER_ID: "proactive-test-user",
    JARVIS_AUTH_BYPASS_EMAIL: "christian.angelo.desamparado@gmail.com",
    PUSHOVER_ENABLED: "true",
    PUSHOVER_APP_TOKEN: "test-app-token",
    PUSHOVER_USER_KEY: "test-user-key",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.ok(Date.now() - startedAt >= 900);
  assert.equal(pushoverCalls.length, 1);
  assert.equal(pushoverCalls[0].get("title"), "JARVIS");
  assert.equal(journalWrites.length, 1);
  assert.match(journalWrites[0].content, /^\[\[JARVIS_PROACTIVE_V1\]\]/);
  assert.equal(payload.message.role, "jarvis");
  console.log("Jarvis proactive timer, Pushover delivery, persistence, and response passed.");
} finally {
  globalThis.fetch = originalFetch;
}

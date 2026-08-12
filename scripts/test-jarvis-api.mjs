import { readFile } from "node:fs/promises";

const envText = await readFile(".env.local", "utf8");
const keyLine = envText.split(/\r?\n/).find((value) => value.startsWith("OPENAI_API_KEY="));
const apiKey = keyLine?.slice("OPENAI_API_KEY=".length).trim().replace(/^['"]|['"]$/g, "");

if (!apiKey) throw new Error("OPENAI_API_KEY is not available for the Jarvis smoke test.");

const worker = (await import("../dist/server/index.js")).default;
const request = new Request("http://local/api/jarvis/chat", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    userId: "local-smoke-test",
    question: "Hi Jarvis. Please remember that my risk per trade is 0.5%. Also, do you know the internal reversal screenshots?",
    history: [],
    context: {
      profile: {
        preferredName: "Pot",
        preferences: { familiarity: "high", humor: "medium", directness: "high", verbosity: "concise" },
        memories: [],
      },
      summary: { totalTrades: 0 },
    },
  }),
});
const response = await worker.fetch(request, {
  OPENAI_API_KEY: apiKey,
  JARVIS_AUTH_BYPASS_USER_ID: "local-smoke-test",
  JARVIS_AUTH_BYPASS_EMAIL: "christian.angelo.desamparado@gmail.com",
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
});
const payload = await response.json();

const blockedRequest = new Request("http://local/api/jarvis/chat", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ userId: "other-user", question: "Open Jarvis for me." }),
});
const blockedResponse = await worker.fetch(blockedRequest, {
  OPENAI_API_KEY: apiKey,
  JARVIS_AUTH_BYPASS_USER_ID: "other-user",
  JARVIS_AUTH_BYPASS_EMAIL: "another.user@example.com",
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
});

console.log(JSON.stringify({
  status: response.status,
  model: payload.model || null,
  answerReceived: typeof payload.answer === "string" && payload.answer.length > 0,
  memoryUpdateReceived: Array.isArray(payload.memoryUpdates) && payload.memoryUpdates.some((update) => update.category === "risk_rule"),
  referenceAuditsUsed: payload.referenceAuditsUsed || 0,
  nonOwnerStatus: blockedResponse.status,
  errorCategory: payload.error ? "api_error" : null,
}));

if (!response.ok || !payload.answer || !Array.isArray(payload.memoryUpdates) || !payload.memoryUpdates.some((update) => update.category === "risk_rule") || payload.referenceAuditsUsed < 1 || blockedResponse.status !== 403) process.exitCode = 1;

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
    question: "Reply with one short sentence confirming Jarvis is ready for a trading conversation.",
    history: [],
    context: { summary: { totalTrades: 0 } },
  }),
});
const response = await worker.fetch(request, {
  OPENAI_API_KEY: apiKey,
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
});
const payload = await response.json();

console.log(JSON.stringify({
  status: response.status,
  model: payload.model || null,
  answerReceived: typeof payload.answer === "string" && payload.answer.length > 0,
  errorCategory: payload.error ? "api_error" : null,
}));

if (!response.ok || !payload.answer) process.exitCode = 1;

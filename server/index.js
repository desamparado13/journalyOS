import { JARVIS_SYSTEM_PROMPT } from "./jarvis-knowledge.js";

const FALLBACK_MODELS = ["gpt-5.6-luna", "gpt-4.1-mini"];
const MAX_QUESTION_LENGTH = 6000;
const MAX_HISTORY_MESSAGES = 16;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  return (payload?.output || [])
    .flatMap((item) => item?.content || [])
    .filter((item) => item?.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .filter((message) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
    .map((message) => ({ role: message.role, content: message.content.slice(0, 6000) }));
}

async function safetyIdentifier(userId) {
  const data = new TextEncoder().encode(String(userId || "journaly-user"));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 64);
}

async function handleJarvis(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!env.OPENAI_API_KEY) return json({ error: "Jarvis AI is not configured yet." }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question) return json({ error: "A question is required." }, 400);
  if (question.length > MAX_QUESTION_LENGTH) return json({ error: "That message is too long for this Jarvis version." }, 413);

  const history = normalizeHistory(body?.history);
  const journalContext = body?.context && typeof body.context === "object" ? body.context : {};
  const input = [
    ...history,
    {
      role: "user",
      content: `CURRENT JOURNALY CONTEXT\n${JSON.stringify(journalContext)}\n\nUSER MESSAGE\n${question}`,
    },
  ];
  const configuredModel = env.OPENAI_JARVIS_MODEL || FALLBACK_MODELS[0];
  const models = Array.from(new Set([configuredModel, ...FALLBACK_MODELS]));
  let lastError = "Jarvis could not complete that response.";

  for (const model of models) {
    const requestBody = {
      model,
      instructions: JARVIS_SYSTEM_PROMPT,
      input,
      max_output_tokens: 1100,
      store: false,
      safety_identifier: await safetyIdentifier(body?.userId),
    };

    if (model.startsWith("gpt-5.6")) {
      requestBody.reasoning = { effort: "low", context: "current_turn" };
      requestBody.text = { verbosity: "medium" };
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    const payload = await response.json().catch(() => ({}));

    if (response.ok) {
      const answer = extractResponseText(payload);
      if (!answer) return json({ error: "Jarvis returned an empty response." }, 502);
      return json({ answer, model });
    }

    lastError = payload?.error?.message || lastError;
    const code = payload?.error?.code || payload?.error?.type || "";
    const retryableModelError = /model|unsupported|invalid_request/i.test(`${code} ${lastError}`);
    if (!retryableModelError) break;
  }

  return json({ error: lastError }, 502);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/jarvis/chat") return handleJarvis(request, env);

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || url.pathname.includes(".")) return response;
    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  },
};

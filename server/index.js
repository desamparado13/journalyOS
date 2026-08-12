import { JARVIS_OWNER_KNOWLEDGE, JARVIS_REFERENCE_ANALYSES, JARVIS_REFERENCE_SUMMARY, JARVIS_SYSTEM_PROMPT } from "./jarvis-knowledge.js";

const FALLBACK_MODELS = ["gpt-5.6-luna", "gpt-4.1-mini"];
const MAX_QUESTION_LENGTH = 6000;
const MAX_HISTORY_MESSAGES = 16;
const MAX_CHART_IMAGE_LENGTH = 8_000_000;
const OWNER_USERNAME = "christiian.angelo.desamparado";

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "memoryUpdates"],
  properties: {
    answer: { type: "string", maxLength: 12000 },
    memoryUpdates: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["operation", "category", "key", "value", "confidence"],
        properties: {
          operation: { type: "string", enum: ["upsert", "delete"] },
          category: { type: "string", enum: ["identity", "preference", "trading_rule", "risk_rule", "mistake", "goal", "terminology", "ui_preference"] },
          key: { type: "string", maxLength: 80 },
          value: { type: "string", maxLength: 800 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  },
};

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

function bearerToken(request) {
  const value = request.headers.get("authorization") || "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

async function authenticateUser(request, env, requestedUserId) {
  if (env.JARVIS_AUTH_BYPASS_USER_ID && requestedUserId === env.JARVIS_AUTH_BYPASS_USER_ID) {
    return { id: requestedUserId, email: env.JARVIS_AUTH_BYPASS_EMAIL || "local-smoke-test@journaly.invalid", user_metadata: {} };
  }
  const token = bearerToken(request);
  if (!token) return null;
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Jarvis authentication is not configured.");
  const response = await fetch(`${String(supabaseUrl).replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      authorization: `Bearer ${token}`,
      apikey: supabaseKey,
    },
  });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return user?.id ? user : null;
}

function validChartImage(value) {
  if (typeof value !== "string" || value.length > MAX_CHART_IMAGE_LENGTH) return null;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(value)) return value;
  if (/^https:\/\//i.test(value)) return value;
  return null;
}

function referenceSearchText(analysis) {
  return [analysis.filename, analysis.date, analysis.pair, analysis.sourceSetup, ...(analysis.sourceAliases || []).flatMap((source) => [source.filename, source.pair, source.sourceSetup])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function selectReferenceAnalyses(question, context) {
  const latestTrade = Array.isArray(context?.recentTrades) ? context.recentTrades[0] : null;
  const asksForCurrentTrade = /analy[sz]e|chart|screenshot|latest trade|this trade|take this|same setup/i.test(question);
  const query = `${question} ${asksForCurrentTrade ? `${latestTrade?.pair || ""} ${latestTrade?.setup || ""}` : ""}`.toLowerCase();
  const terms = Array.from(new Set(query.match(/[a-z0-9]+/g) || [])).filter((term) => term.length >= 3);
  const setupPhrases = ["internal reversal", "break and retest", "liquidity sweep", "reversal", "flag"];
  return JARVIS_REFERENCE_ANALYSES
    .map((analysis) => {
      const haystack = referenceSearchText(analysis);
      let score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      if (analysis.pair && query.includes(analysis.pair.toLowerCase())) score += 5;
      if (setupPhrases.some((setup) => query.includes(setup) && haystack.includes(setup))) score += 5;
      if (analysis.labelConflict) score += /duplicate|conflict|wrong label|double.check|already know/i.test(question) ? 4 : 0;
      return { analysis, score };
    })
    .filter(({ score }) => score >= 3)
    .sort((a, b) => b.score - a.score || `${b.analysis.date}`.localeCompare(`${a.analysis.date}`))
    .slice(0, 6)
    .map(({ analysis }) => analysis);
}

function parseJarvisOutput(text) {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.answer === "string") {
      return { answer: parsed.answer.trim(), memoryUpdates: Array.isArray(parsed.memoryUpdates) ? parsed.memoryUpdates : [] };
    }
  } catch {
    // Older fallback models may return plain text; keep the conversation available without storing memory.
  }
  return { answer: text.trim(), memoryUpdates: [] };
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

  let authenticatedUser;
  try {
    authenticatedUser = await authenticateUser(request, env, body?.userId);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Jarvis authentication failed." }, 503);
  }
  if (!authenticatedUser || (body?.userId && body.userId !== authenticatedUser.id)) return json({ error: "Your Journaly session has expired. Sign in again to use Jarvis." }, 401);

  const history = normalizeHistory(body?.history);
  const journalContext = body?.context && typeof body.context === "object" ? body.context : {};
  const username = String(authenticatedUser.email || "").split("@")[0] || null;
  const isOwnerProfile = username?.toLowerCase() === OWNER_USERNAME;
  const referenceAnalyses = isOwnerProfile ? selectReferenceAnalyses(question, journalContext) : [];
  const { profile: suppliedProfile = {}, ...journalData } = journalContext;
  const trustedContext = {
    ...journalData,
    authenticatedUser: {
      id: authenticatedUser.id,
      username,
      preferredName: typeof suppliedProfile?.preferredName === "string" ? suppliedProfile.preferredName.slice(0, 80) : null,
      preferences: suppliedProfile?.preferences || {},
    },
    userMemory: Array.isArray(suppliedProfile?.memories) ? suppliedProfile.memories.slice(-40) : [],
    referenceLibrary: isOwnerProfile ? {
      ...JARVIS_REFERENCE_SUMMARY,
      relevantAudits: referenceAnalyses,
    } : { uniqueImageCount: 0, relevantAudits: [] },
  };
  const chartImage = validChartImage(body?.chartImage);
  const currentContent = [
    { type: "input_text", text: `CURRENT AUTHENTICATED JOURNALY CONTEXT\n${JSON.stringify(trustedContext)}\n\nUSER MESSAGE\n${question}` },
  ];
  if (chartImage) currentContent.push({ type: "input_image", image_url: chartImage, detail: "high" });
  const input = [
    ...history,
    {
      role: "user",
      content: currentContent,
    },
  ];
  const configuredModel = env.OPENAI_JARVIS_MODEL || FALLBACK_MODELS[0];
  const models = Array.from(new Set([configuredModel, ...FALLBACK_MODELS]));
  let lastError = "Jarvis could not complete that response.";

  for (const model of models) {
    const requestBody = {
      model,
      instructions: isOwnerProfile ? `${JARVIS_SYSTEM_PROMPT}\n\n${JARVIS_OWNER_KNOWLEDGE}` : JARVIS_SYSTEM_PROMPT,
      input,
      max_output_tokens: 1100,
      store: false,
      safety_identifier: await safetyIdentifier(authenticatedUser.id),
      text: { format: { type: "json_schema", name: "jarvis_reply", strict: true, schema: RESPONSE_SCHEMA } },
    };

    if (model.startsWith("gpt-5.6")) {
      requestBody.reasoning = { effort: "low", context: "current_turn" };
      requestBody.text.verbosity = "medium";
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
      const outputText = extractResponseText(payload);
      if (!outputText) return json({ error: "Jarvis returned an empty response." }, 502);
      const result = parseJarvisOutput(outputText);
      return json({ ...result, model, chartReviewed: Boolean(chartImage), referenceAuditsUsed: referenceAnalyses.length });
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

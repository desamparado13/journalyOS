import { JARVIS_OWNER_KNOWLEDGE, JARVIS_REFERENCE_ANALYSES, JARVIS_REFERENCE_SUMMARY, JARVIS_STRATEGY_RULES, JARVIS_SYSTEM_PROMPT } from "./jarvis-knowledge.js";

const FALLBACK_MODELS = ["gpt-5.6-luna", "gpt-4.1-mini"];
const MAX_QUESTION_LENGTH = 6000;
const MAX_HISTORY_MESSAGES = 16;
const MAX_CHART_IMAGE_LENGTH = 8_000_000;
const OWNER_EMAIL = "christian.angelo.desamparado@gmail.com";
const OWNER_USERNAME = "christian.angelo.desamparado";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";
const VERCEL_GATEWAY_ENDPOINT = "https://ai-gateway.vercel.sh/v1/responses";
const AI_TIMEOUT_MS = 45_000;
const MAX_TOOL_ROUNDS = 3;
const MODEL_PRICING_PER_MILLION = {
  "gpt-5.6-luna": { input: 1, cachedInput: 0.1, cacheWrite: 1.25, output: 6 },
  "gpt-4.1-mini": { input: 0.4, cachedInput: 0.1, cacheWrite: 0.4, output: 1.6 },
};

const aiHealth = {
  provider: "OpenAI",
  configuredModel: null,
  apiConfigured: false,
  apiReachable: false,
  lastSuccessfulRequestAt: null,
  lastErrorCategory: null,
  lastHttpStatus: null,
  fallbackActive: false,
};

const JOURNALY_TOOLS = [
  { type: "function", name: "get_user_profile", description: "Get the authenticated user's Journaly profile. Use only when identity or preferences matter.", strict: true, parameters: { type: "object", additionalProperties: false, properties: {}, required: [] } },
  { type: "function", name: "get_user_memories", description: "Get durable memories stored for the authenticated user.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { category: { type: ["string", "null"] } }, required: ["category"] } },
  { type: "function", name: "get_learning_records", description: "Get lessons retained from prior Jarvis chart reviews and insights. Use only when the user explicitly asks what Jarvis learned, remembers from prior cases, or sees as a recurring lesson; never use for ordinary pair or current-chart checks.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { source: { type: ["string", "null"], enum: ["chart", "skipped_trade", "insight", null] }, limit: { type: "integer", minimum: 1, maximum: 40 } }, required: ["source", "limit"] } },
  { type: "function", name: "get_strategy_rules", description: "Get Pot's current PPA-first strategy rules. Use for setup or decision reasoning, not casual conversation.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { setup: { type: ["string", "null"] } }, required: ["setup"] } },
  { type: "function", name: "get_setup_examples", description: "Get independently audited historical chart examples matching a setup or pair.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { setup: { type: ["string", "null"] }, pair: { type: ["string", "null"] }, limit: { type: "integer", minimum: 1, maximum: 8 } }, required: ["setup", "pair", "limit"] } },
  { type: "function", name: "get_trade", description: "Get one authenticated user's trade by id or the latest trade.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { id: { type: ["string", "null"] }, latest: { type: "boolean" } }, required: ["id", "latest"] } },
  { type: "function", name: "get_recent_trades", description: "Get real Journaly trades, optionally filtered by pair, setup, or calendar month (YYYY-MM).", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, month: { type: ["string", "null"] }, limit: { type: "integer", minimum: 1, maximum: 100 } }, required: ["pair", "setup", "month", "limit"] } },
  { type: "function", name: "get_active_forecasts", description: "Get active Journaly forecasts, optionally for one pair.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] } }, required: ["pair"] } },
  { type: "function", name: "get_skipped_trades", description: "Get the authenticated user's recorded skipped, cancelled, or missed trade decisions and their documented outcomes.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: ["string", "null"] }, setup: { type: ["string", "null"] }, limit: { type: "integer", minimum: 1, maximum: 50 } }, required: ["pair", "setup", "limit"] } },
  { type: "function", name: "get_pair_state", description: "Get the authenticated user's current Journaly state for a currency pair, including recent trades and active forecasts.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { pair: { type: "string" } }, required: ["pair"] } },
  { type: "function", name: "get_setup_statistics", description: "Calculate real outcome and quality statistics from Journaly trades for a setup and optional calendar month.", strict: true, parameters: { type: "object", additionalProperties: false, properties: { setup: { type: "string" }, month: { type: ["string", "null"] } }, required: ["setup", "month"] } },
  { type: "function", name: "get_account_risk", description: "Get documented planned risk from active Journaly forecasts. This is not broker/live-position risk.", strict: true, parameters: { type: "object", additionalProperties: false, properties: {}, required: [] } },
  { type: "function", name: "get_session_state", description: "Get the active pair, setup, trade, chart, forecast, last decision, and rolling conversation state.", strict: true, parameters: { type: "object", additionalProperties: false, properties: {}, required: [] } },
];

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "memoryUpdates", "learningSummary"],
  properties: {
    answer: { type: "string", maxLength: 12000 },
    learningSummary: { type: ["string", "null"], maxLength: 1600 },
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
  if (/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(value)) return value;
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
      return { answer: parsed.answer.trim(), memoryUpdates: Array.isArray(parsed.memoryUpdates) ? parsed.memoryUpdates : [], learningSummary: typeof parsed.learningSummary === "string" ? parsed.learningSummary.trim() : null };
    }
  } catch {
    // Older fallback models may return plain text; keep the conversation available without storing memory.
  }
  return { answer: text.trim(), memoryUpdates: [], learningSummary: null };
}

function errorCategory(status, code, message) {
  const detail = `${code || ""} ${message || ""}`.toLowerCase();
  if (status === 401 || /api.?key|authentication|unauthorized/.test(detail)) return "authentication";
  if (status === 402 || /billing|quota|credit|insufficient_quota/.test(detail)) return "billing_or_quota";
  if (status === 429 || /rate.?limit/.test(detail)) return "rate_limit";
  if (/model|not_found/.test(detail)) return "model_configuration";
  if (status >= 400 && status < 500) return "request_schema";
  if (status >= 500) return "provider_server";
  if (/abort|timeout/.test(detail)) return "timeout";
  return "network";
}

function addUsage(total, usage) {
  const inputDetails = usage?.input_tokens_details || {};
  total.inputTokens += Number(usage?.input_tokens || 0);
  total.cachedInputTokens += Number(inputDetails.cached_tokens || 0);
  total.cacheWriteTokens += Number(inputDetails.cache_write_tokens || 0);
  total.outputTokens += Number(usage?.output_tokens || 0);
}

function usageSummary(model, usage) {
  const baseModel = String(model).split("/").at(-1);
  const pricing = MODEL_PRICING_PER_MILLION[baseModel];
  const regularInputTokens = Math.max(0, usage.inputTokens - usage.cachedInputTokens - usage.cacheWriteTokens);
  const costUsd = pricing ? (
    regularInputTokens * pricing.input
    + usage.cachedInputTokens * pricing.cachedInput
    + usage.cacheWriteTokens * pricing.cacheWrite
    + usage.outputTokens * pricing.output
  ) / 1_000_000 : null;
  return {
    ...usage,
    totalTokens: usage.inputTokens + usage.outputTokens,
    costUsd,
    currency: "USD",
    estimated: true,
  };
}

function recordAiFailure({ status = null, code = null, message = "", model = null, requestId = null }) {
  const category = errorCategory(status, code, message);
  Object.assign(aiHealth, {
    configuredModel: model || aiHealth.configuredModel,
    apiReachable: Boolean(status),
    lastErrorCategory: category,
    lastHttpStatus: status,
    fallbackActive: true,
  });
  console.error("[Jarvis AI failure]", JSON.stringify({ category, status, code, model, requestId }));
  return category;
}

function aiConnection(env) {
  const directKey = env.OPENAI_API_KEY;
  if (directKey) {
    return {
      provider: "OpenAI",
      apiKey: directKey,
      endpoint: OPENAI_ENDPOINT,
      model: env.OPENAI_JARVIS_MODEL || FALLBACK_MODELS[0],
      modelName: (model) => model,
    };
  }
  const gatewayKey = env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN;
  if (gatewayKey) {
    return {
      provider: "Vercel AI Gateway",
      apiKey: gatewayKey,
      endpoint: VERCEL_GATEWAY_ENDPOINT,
      model: env.OPENAI_JARVIS_MODEL || FALLBACK_MODELS[0],
      modelName: (model) => model.includes("/") ? model : `openai/${model}`,
    };
  }
  return null;
}

async function openAiRequest(connection, requestBody) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const response = await fetch(connection.endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${connection.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizePair(value) {
  const aliases = { AJ: "AUDJPY", AU: "AUDUSD", EJ: "EURJPY", EU: "EURUSD", EA: "EURAUD", GU: "GBPUSD", NJ: "NZDJPY" };
  const pair = String(value || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  return aliases[pair] || pair;
}

function matchesText(value, query) {
  return !query || String(value || "").toLowerCase().includes(String(query).toLowerCase());
}

function setupStats(trades) {
  const wins = trades.filter((trade) => Number(trade.pnlR) > 0).length;
  const losses = trades.filter((trade) => Number(trade.pnlR) < 0).length;
  const totalR = trades.reduce((sum, trade) => sum + Number(trade.pnlR || 0), 0);
  const reviewed = trades.filter((trade) => trade.executionQuality);
  const quality = Object.fromEntries(["Good", "Mid", "Bad"].map((grade) => [grade, reviewed.filter((trade) => trade.executionQuality === grade).length]));
  return {
    sampleSize: trades.length,
    wins,
    losses,
    breakEven: trades.length - wins - losses,
    winRate: trades.length ? Math.round((wins / trades.length) * 1000) / 10 : null,
    totalR: Math.round(totalR * 100) / 100,
    expectancyR: trades.length ? Math.round((totalR / trades.length) * 100) / 100 : null,
    reviewed: reviewed.length,
    quality,
  };
}

function executeJournalyTool(name, args, data) {
  const trades = Array.isArray(data.trades) ? data.trades : [];
  const forecasts = Array.isArray(data.forecasts) ? data.forecasts : [];
  switch (name) {
    case "get_user_profile":
      return data.profile;
    case "get_user_memories":
      return { memories: (data.memories || []).filter((memory) => !args.category || memory.category === args.category) };
    case "get_learning_records":
      return { records: (data.learningRecords || []).filter((record) => !args.source || record.source === args.source).slice(0, args.limit) };
    case "get_strategy_rules": {
      const rules = Array.isArray(JARVIS_STRATEGY_RULES) ? JARVIS_STRATEGY_RULES : JARVIS_STRATEGY_RULES?.rules || JARVIS_STRATEGY_RULES;
      return { strategyVersion: "v0.3", setup: args.setup, rules };
    }
    case "get_setup_examples":
      return { examples: JARVIS_REFERENCE_ANALYSES.filter((item) => (!args.setup || matchesText(item.sourceSetup, args.setup)) && (!args.pair || normalizePair(item.pair) === normalizePair(args.pair))).slice(0, args.limit) };
    case "get_trade":
      return { trade: args.latest || !args.id ? trades[0] || null : trades.find((trade) => trade.id === args.id) || null };
    case "get_recent_trades": {
      const filtered = trades.filter((trade) => (!args.pair || normalizePair(trade.pair) === normalizePair(args.pair)) && (!args.setup || matchesText(trade.setup, args.setup)) && (!args.month || String(trade.date || "").startsWith(args.month)));
      return { trades: filtered.slice(0, args.limit), totalMatching: filtered.length };
    }
    case "get_active_forecasts":
      return { forecasts: forecasts.filter((forecast) => forecast.status === "Waiting" && (!args.pair || normalizePair(forecast.pair) === normalizePair(args.pair))) };
    case "get_skipped_trades": {
      const skipped = forecasts.filter((forecast) => forecast.status === "Cancelled" || forecast.status === "Missed");
      return { decisions: skipped.filter((forecast) => (!args.pair || normalizePair(forecast.pair) === normalizePair(args.pair)) && (!args.setup || matchesText(forecast.setup, args.setup))).slice(0, args.limit) };
    }
    case "get_pair_state": {
      const pair = normalizePair(args.pair);
      const pairTrades = trades.filter((trade) => normalizePair(trade.pair) === pair);
      return { pair, recentTrades: pairTrades.slice(0, 12), activeForecasts: forecasts.filter((forecast) => forecast.status === "Waiting" && normalizePair(forecast.pair) === pair), statistics: setupStats(pairTrades) };
    }
    case "get_setup_statistics": {
      const filtered = trades.filter((trade) => matchesText(trade.setup, args.setup) && (!args.month || String(trade.date || "").startsWith(args.month)));
      return { setup: args.setup, month: args.month, statistics: setupStats(filtered), dataCoverage: { recordsAvailable: trades.length, oldestDate: trades.at(-1)?.date || null, newestDate: trades[0]?.date || null } };
    }
    case "get_account_risk": {
      const active = forecasts.filter((forecast) => forecast.status === "Waiting");
      return { documentedPlannedRiskPercent: active.reduce((sum, item) => sum + Number(item.plannedRiskPercent || 0), 0), activeForecastCount: active.length, liveBrokerRiskConnected: false };
    }
    case "get_session_state":
      return data.sessionState || {};
    default:
      return { error: "Unknown Journaly tool." };
  }
}

async function authorizeOwner(request, env, requestedUserId) {
  const user = await authenticateUser(request, env, requestedUserId);
  if (!user || (requestedUserId && requestedUserId !== user.id)) {
    console.warn("[Jarvis auth failure]", JSON.stringify({ category: "invalid_session", status: 401 }));
    return { error: json({ error: "Your Journaly session has expired. Sign in again to use Jarvis." }, 401) };
  }
  if (String(user.email || "").trim().toLowerCase() !== OWNER_EMAIL) {
    console.warn("[Jarvis auth failure]", JSON.stringify({ category: "owner_allowlist", status: 403 }));
    return { error: json({ error: "Jarvis is currently available only to its owner." }, 403) };
  }
  return { user };
}

async function handleHealth(request, env) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
  let authorization;
  try {
    const testUserId = env.JARVIS_AUTH_BYPASS_USER_ID ? new URL(request.url).searchParams.get("userId") : null;
    authorization = await authorizeOwner(request, env, testUserId);
  } catch {
    return json({ error: "Jarvis authentication failed." }, 503);
  }
  if (authorization.error) return authorization.error;
  const connection = aiConnection(env);
  const configuredModel = connection?.model || env.OPENAI_JARVIS_MODEL || FALLBACK_MODELS[0];
  aiHealth.provider = connection?.provider || "OpenAI";
  aiHealth.configuredModel = configuredModel;
  aiHealth.apiConfigured = Boolean(connection);
  if (new URL(request.url).searchParams.get("probe") === "1" && connection) {
    try {
      const probeUrl = connection.provider === "OpenAI"
        ? `https://api.openai.com/v1/models/${encodeURIComponent(configuredModel)}`
        : "https://ai-gateway.vercel.sh/v1/models";
      const response = await fetch(probeUrl, { headers: { authorization: `Bearer ${connection.apiKey}` } });
      aiHealth.apiReachable = response.ok;
      aiHealth.lastHttpStatus = response.status;
      if (!response.ok) recordAiFailure({ status: response.status, model: configuredModel });
    } catch (error) {
      recordAiFailure({ message: error instanceof Error ? error.message : String(error), model: configuredModel });
    }
  }
  return json(aiHealth);
}

async function handleJarvis(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const connection = aiConnection(env);
  const configuredModel = connection?.model || env.OPENAI_JARVIS_MODEL || FALLBACK_MODELS[0];
  aiHealth.provider = connection?.provider || "OpenAI";
  aiHealth.configuredModel = configuredModel;
  aiHealth.apiConfigured = Boolean(connection);
  if (!connection) {
    const category = recordAiFailure({ message: "No AI provider credentials are available", model: configuredModel });
    return json({ error: "Jarvis AI is not configured yet.", category }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question) return json({ error: "A question is required." }, 400);
  if (question.length > MAX_QUESTION_LENGTH) return json({ error: "That message is too long for this Jarvis version." }, 413);

  let authorization;
  try {
    authorization = await authorizeOwner(request, env, body?.userId);
  } catch {
    return json({ error: "Jarvis authentication failed." }, 503);
  }
  if (authorization.error) return authorization.error;
  const authenticatedUser = authorization.user;

  const history = normalizeHistory(body?.history);
  const journalContext = body?.context && typeof body.context === "object" ? body.context : {};
  const username = String(authenticatedUser.email || "").split("@")[0] || null;
  const isOwnerProfile = username?.toLowerCase() === OWNER_USERNAME;
  const { profile: suppliedProfile = {}, ...journalData } = journalContext;
  const profile = {
      id: authenticatedUser.id,
      username,
      preferredName: typeof suppliedProfile?.preferredName === "string" ? suppliedProfile.preferredName.slice(0, 80) : null,
      preferences: suppliedProfile?.preferences || {},
  };
  const toolData = {
    profile,
    memories: Array.isArray(suppliedProfile?.memories) ? suppliedProfile.memories.slice(-40) : [],
    trades: Array.isArray(journalData?.trades) ? journalData.trades : Array.isArray(journalData?.recentTrades) ? journalData.recentTrades : [],
    forecasts: Array.isArray(journalData?.forecasts) ? journalData.forecasts : [],
    learningRecords: Array.isArray(journalData?.learningRecords) ? journalData.learningRecords.slice(0, 80) : [],
    sessionState: journalData?.sessionState || {},
  };
  const compactContext = {
    authenticatedUser: profile,
    generatedAt: journalData.generatedAt,
    marketSession: journalData.marketSession,
    summary: journalData.summary,
    sessionState: journalData.sessionState,
    availableJournalyTools: JOURNALY_TOOLS.map((tool) => tool.name),
    historicalChartLibrary: JARVIS_REFERENCE_SUMMARY,
    learnedCaseCount: toolData.learningRecords.length,
  };
  const chartImage = validChartImage(body?.chartImage);
  const currentContent = [
    { type: "input_text", text: `CURRENT AUTHENTICATED SESSION\n${JSON.stringify(compactContext)}\n\nUSER MESSAGE\n${question}` },
  ];
  if (chartImage) currentContent.push({ type: "input_image", image_url: chartImage, detail: "high" });
  const input = [
    ...history,
    {
      role: "user",
      content: currentContent,
    },
  ];
  const models = Array.from(new Set([configuredModel, ...FALLBACK_MODELS]));
  let lastError = "Jarvis could not complete that response.";
  let lastCategory = "unknown";

  for (const model of models) {
    let roundInput = input;
    let toolCallsUsed = [];
    const usage = { inputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0, outputTokens: 0 };
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const requestBody = {
      model: connection.modelName(model),
      instructions: isOwnerProfile ? `${JARVIS_SYSTEM_PROMPT}\n\n${JARVIS_OWNER_KNOWLEDGE}` : JARVIS_SYSTEM_PROMPT,
      input: roundInput,
      max_output_tokens: 1100,
      store: false,
      safety_identifier: await safetyIdentifier(authenticatedUser.id),
      tools: JOURNALY_TOOLS,
      tool_choice: "auto",
      parallel_tool_calls: true,
      text: { format: { type: "json_schema", name: "jarvis_reply", strict: true, schema: RESPONSE_SCHEMA } },
      };

      if (model.includes("gpt-5.6")) {
        requestBody.reasoning = { effort: "low", context: "current_turn" };
        requestBody.text.verbosity = "medium";
      }

      let response;
      let payload;
      try {
        ({ response, payload } = await openAiRequest(connection, requestBody));
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        lastCategory = recordAiFailure({ message: lastError, model });
        break;
      }

      if (!response.ok) {
        lastError = payload?.error?.message || lastError;
        const code = payload?.error?.code || payload?.error?.type || "";
        lastCategory = recordAiFailure({ status: response.status, code, message: lastError, model, requestId: response.headers.get("x-request-id") });
        const retryableModelError = /model|unsupported|invalid_request/i.test(`${code} ${lastError}`);
        if (!retryableModelError) break;
        round = MAX_TOOL_ROUNDS;
        continue;
      }

      addUsage(usage, payload?.usage);

      const calls = (payload?.output || []).filter((item) => item?.type === "function_call");
      if (calls.length) {
        const outputs = calls.map((call) => {
          let args = {};
          try { args = JSON.parse(call.arguments || "{}"); } catch { args = {}; }
          toolCallsUsed.push(call.name);
          return { type: "function_call_output", call_id: call.call_id, output: JSON.stringify(executeJournalyTool(call.name, args, toolData)) };
        });
        roundInput = [...roundInput, ...(payload.output || []), ...outputs];
        continue;
      }

      const outputText = extractResponseText(payload);
      if (!outputText) {
        lastError = "Jarvis returned an empty response.";
        lastCategory = recordAiFailure({ status: 502, code: "empty_response", message: lastError, model, requestId: response.headers.get("x-request-id") });
        break;
      }
      Object.assign(aiHealth, { configuredModel: model, apiConfigured: true, apiReachable: true, lastSuccessfulRequestAt: new Date().toISOString(), lastErrorCategory: null, lastHttpStatus: response.status, fallbackActive: false });
      const result = parseJarvisOutput(outputText);
      return json({ ...result, model, provider: connection.provider, chartReviewed: Boolean(chartImage), toolsUsed: [...new Set(toolCallsUsed)], usage: usageSummary(model, usage) });
    }
  }

  return json({ error: "Jarvis could not reach its conversational AI.", category: lastCategory, fallbackAllowed: true }, 502);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/jarvis/chat") return handleJarvis(request, env);
    if (url.pathname === "/api/jarvis/health") return handleHealth(request, env);

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || url.pathname.includes(".")) return response;
    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  },
};

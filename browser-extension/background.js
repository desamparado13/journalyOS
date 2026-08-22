const OLLAMA_BASE_URL = "http://127.0.0.1:11434";
let localModelCache = { checkedAt: 0, state: { installed: true, available: false, model: null } };

async function fetchWithTimeout(url, init = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function localModelState(force = false) {
  if (!force && Date.now() - localModelCache.checkedAt < 30000) return localModelCache.state;
  try {
    const response = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`, {}, 1800);
    if (!response.ok) throw new Error("Ollama unavailable");
    const payload = await response.json();
    const names = Array.isArray(payload?.models) ? payload.models.map((item) => String(item?.name || "")).filter(Boolean) : [];
    const model = names.find((name) => /gemma/i.test(name)) || null;
    localModelCache = { checkedAt: Date.now(), state: { installed: true, available: Boolean(model), model } };
  } catch {
    localModelCache = { checkedAt: Date.now(), state: { installed: true, available: false, model: null } };
  }
  return localModelCache.state;
}

async function runLocalAnalysis(message) {
  const state = await localModelState();
  if (!state.available || !state.model) return { ...state, analysis: null, error: "No local Ollama model is available." };
  const question = String(message?.question || "").slice(0, 4000);
  const context = String(message?.context || "").slice(0, 8000);
  const image = typeof message?.image === "string" && message.image.startsWith("data:image/") ? message.image.split(",")[1] : null;
  const startedAt = Date.now();
  const userMessage = { role: "user", content: `QUESTION\n${question}\n\nLIMITED CONTEXT\n${context}` };
  if (image && /gemma3/i.test(state.model)) userMessage.images = [image];
  const response = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: state.model,
      stream: false,
      messages: [
        { role: "system", content: "You are a private local analysis coprocessor. Extract the user's intent, relevant visible/context facts, contradictions, and the strongest question the final assistant must resolve. Be concise. Do not claim authenticated facts, execute actions, or make the final trading decision." },
        userMessage,
      ],
      options: { temperature: 0.1, num_ctx: 4096 },
    }),
  });
  if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
  const payload = await response.json();
  const analysis = String(payload?.message?.content || "").trim().slice(0, 5000);
  return { ...state, analysis: analysis || null, latencyMs: Date.now() - startedAt };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === "JOURNALY_LOCAL_GET_STATE") return sendResponse(await localModelState());
    if (message?.type === "JOURNALY_LOCAL_ANALYZE") return sendResponse(await runLocalAnalysis(message));
    return sendResponse({ installed: true, available: false, model: null });
  })().catch((error) => sendResponse({ installed: true, available: false, model: null, analysis: null, error: String(error?.message || error) }));
  return true;
});

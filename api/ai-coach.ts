const DEFAULT_MODEL = "gpt-4.1-mini";
const FALLBACK_MODELS = ["gpt-4.1-mini", "gpt-4o-mini"];
const INPUT_COST_PER_1M = 0.4;
const OUTPUT_COST_PER_1M = 1.6;

function estimateCost(inputTokens: number, outputTokens: number) {
  return (inputTokens / 1_000_000) * INPUT_COST_PER_1M + (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
    return;
  }

  const { question, context } = req.body || {};
  if (!question || typeof question !== "string") {
    res.status(400).json({ error: "Question is required." });
    return;
  }

  const configuredModel = process.env.OPENAI_COACH_MODEL || DEFAULT_MODEL;
  const modelsToTry = Array.from(new Set([configuredModel, ...FALLBACK_MODELS]));
  let response: Response | null = null;
  let payload: any = null;
  let model = configuredModel;

  for (const candidateModel of modelsToTry) {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: candidateModel,
        temperature: 0.35,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content:
              "You are Dara, the Journaly AI Coach and the user's trading companion. You are a direct but supportive trading mentor. Use the provided full compact journal rows, monthly projection data, and aggregate statistics to answer questions about live trades and backtests. Calculate from the data when needed, cite the relevant metric, and distinguish live trading from backtesting when useful. Give practical coaching with no financial advice guarantees. Focus on discipline, process, risk, behavior, expectancy, pairs, setups, sessions, drawdown, and consistency.",
          },
          {
            role: "user",
            content: JSON.stringify({ question, context }),
          },
        ],
      }),
    });
    payload = await response.json();
    model = candidateModel;

    const errorCode = payload?.error?.code || payload?.error?.type;
    const errorMessage = String(payload?.error?.message || "").toLowerCase();
    const shouldRetryModel =
      !response.ok &&
      candidateModel !== modelsToTry.at(-1) &&
      (errorCode === "model_not_found" || errorCode === "invalid_request_error" || errorMessage.includes("model"));

    if (!shouldRetryModel) break;
  }

  if (!response || !response.ok) {
    res.status(response?.status || 500).json({ error: payload?.error?.message || "OpenAI request failed." });
    return;
  }

  const inputTokens = Number(payload.usage?.prompt_tokens || 0);
  const outputTokens = Number(payload.usage?.completion_tokens || 0);

  res.status(200).json({
    answer: payload.choices?.[0]?.message?.content || "No coaching response returned.",
    model,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: Number(payload.usage?.total_tokens || inputTokens + outputTokens),
      estimatedCost: estimateCost(inputTokens, outputTokens),
    },
  });
}

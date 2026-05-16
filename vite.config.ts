import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const DEFAULT_MODEL = "gpt-4.1-mini";
const INPUT_COST_PER_1M = 0.4;
const OUTPUT_COST_PER_1M = 1.6;

function estimateCost(inputTokens: number, outputTokens: number) {
  return (inputTokens / 1_000_000) * INPUT_COST_PER_1M + (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;
}

function readRequestBody(req: any) {
  return new Promise<string>((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    plugins: [
      react(),
      {
        name: "journaly-ai-coach-dev-api",
        configureServer(server) {
          server.middlewares.use("/api/ai-coach", async (req: any, res: any) => {
            if (req.method !== "POST") {
              res.statusCode = 405;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "OPENAI_API_KEY is not configured. Add it to .env.local and restart npm run dev." }));
              return;
            }

            try {
              const { question, context } = JSON.parse(await readRequestBody(req));
              const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: env.OPENAI_COACH_MODEL || process.env.OPENAI_COACH_MODEL || DEFAULT_MODEL,
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
              const payload = await openAiResponse.json();

              if (!openAiResponse.ok) {
                res.statusCode = openAiResponse.status;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: payload?.error?.message || "OpenAI request failed." }));
                return;
              }

              const inputTokens = Number(payload.usage?.prompt_tokens || 0);
              const outputTokens = Number(payload.usage?.completion_tokens || 0);
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  answer: payload.choices?.[0]?.message?.content || "No coaching response returned.",
                  model: env.OPENAI_COACH_MODEL || process.env.OPENAI_COACH_MODEL || DEFAULT_MODEL,
                  usage: {
                    inputTokens,
                    outputTokens,
                    totalTokens: Number(payload.usage?.total_tokens || inputTokens + outputTokens),
                    estimatedCost: estimateCost(inputTokens, outputTokens),
                  },
                }),
              );
            } catch (error) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: error instanceof Error ? error.message : "AI Coach request failed." }));
            }
          });
        },
      },
    ],
  };
});

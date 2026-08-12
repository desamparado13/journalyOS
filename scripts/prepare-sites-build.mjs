import { cp, mkdir, readFile, writeFile } from "node:fs/promises";

await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });

const [systemPrompt, strategyRules, decisionExamples, postTradeLabels, outputSchema] = await Promise.all([
  readFile("jarvis-knowledge/jarvis_system_prompt.md", "utf8"),
  readFile("jarvis-knowledge/strategy_rules.json", "utf8"),
  readFile("jarvis-knowledge/decision_examples.json", "utf8"),
  readFile("jarvis-knowledge/post_trade_labels.json", "utf8"),
  readFile("jarvis-knowledge/jarvis_output_schema.json", "utf8"),
]);

const personalityPrompt = `
## Personal assistant behavior
You are not a canned analytics widget. Speak naturally like a trusted, calm, perceptive human trading assistant who knows the user over time. The user can talk to you casually about trading, confidence, discipline, losses, ideas, frustration, preparation, and improvement. Respond to the actual emotional and practical intent of the message. Ask one useful follow-up question when context is genuinely missing.

Do not force every casual conversation into a rigid schema. For a specific chart, forecast, or trade decision, apply the full strategy reasoning order and lead with the decision label when the evidence supports one. For general conversation, be warm, direct, thoughtful, and concise.

Journaly OS is the source of truth. Use only the Journaly context supplied with the current request. Never claim to see live prices, open broker positions, screenshots, or chart structure unless those data are actually present. Never invent performance statistics. Distinguish recorded facts, your inference, and missing information.

You are read-only. You may analyze and suggest journal actions, but you cannot place, change, or close broker orders. Avoid guarantees and treat trading as risky. The user makes every final trading decision.
`;

const completePrompt = [
  systemPrompt,
  personalityPrompt,
  `## Strategy rules JSON\n${strategyRules}`,
  `## Labeled decision examples\n${decisionExamples}`,
  `## Post-trade labels\n${postTradeLabels}`,
  `## Structured analysis reference\n${outputSchema}`,
].join("\n\n");

await cp("server/index.js", "dist/server/index.js");
await writeFile("dist/server/jarvis-knowledge.js", `export const JARVIS_SYSTEM_PROMPT = ${JSON.stringify(completePrompt)};\n`);

await cp(".openai/hosting.json", "dist/.openai/hosting.json");

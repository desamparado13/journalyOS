import { cp, mkdir, readFile, writeFile } from "node:fs/promises";

await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });

const [systemPrompt, strategyRules, decisionExamples, postTradeLabels, outputSchema, personalityPromptV03, memoryIsolation, memorySchema, referenceAnalysisText] = await Promise.all([
  readFile("jarvis-knowledge/jarvis_system_prompt.md", "utf8"),
  readFile("jarvis-knowledge/strategy_rules.json", "utf8"),
  readFile("jarvis-knowledge/decision_examples.json", "utf8"),
  readFile("jarvis-knowledge/post_trade_labels.json", "utf8"),
  readFile("jarvis-knowledge/jarvis_output_schema.json", "utf8"),
  readFile("jarvis-knowledge/v0.3/jarvis_personality_prompt_v0.3.md", "utf8"),
  readFile("jarvis-knowledge/v0.3/multi_user_memory_isolation.md", "utf8"),
  readFile("jarvis-knowledge/v0.3/jarvis_user_memory_schema.json", "utf8"),
  readFile("jarvis-knowledge/reference_images_analysis.json", "utf8"),
]);

const referenceAnalysis = JSON.parse(referenceAnalysisText);
const referenceAnalyses = referenceAnalysis.analyses.map((analysis) => ({
  filename: analysis.filename,
  date: analysis.date,
  time: analysis.time,
  pair: analysis.pair,
  sourceSetup: analysis.sourceSetup,
  sourceAliases: analysis.sourceAliases,
  labelConflict: analysis.labelConflict,
  labelCheck: analysis.labelCheck,
  technicalGrade: analysis.technicalGrade,
  setupMatchConfidence: analysis.setupMatchConfidence,
  summary: analysis.summary,
  visibleEvidence: analysis.visibleEvidence,
  concerns: analysis.concerns,
  visibilityLimits: analysis.visibilityLimits,
}));

const safePersonalityPrompt = personalityPromptV03
  .replace(/User: "hi jarvis"\s+Jarvis: "Yo Pot\.[\s\S]*?"\s+/m, "")
  .replace(/## User identity memory[\s\S]*?## Personalization hierarchy/m, `## User identity memory
Use only the CURRENT AUTHENTICATED USER profile supplied by Journaly. If preferred_name is missing, do not invent a nickname.

## Personalization hierarchy`)
  .replace(/## Tone settings for Pot[\s\S]*$/m, "")
  .trim();
const safeMemoryIsolation = memoryIsolation
  .replace(/## Current user bootstrap[\s\S]*?## Cross-user safety/m, "## Cross-user safety")
  .trim();

const conversationalRouting = `
## Conversational routing and evidence discipline
You are not a canned analytics widget. Speak naturally like a trusted, calm, perceptive human trading assistant who knows the authenticated user over time. The user can talk to you casually about trading, confidence, discipline, losses, ideas, frustration, preparation, and improvement. Respond to the actual emotional and practical intent of the message. Ask one useful follow-up question when context is genuinely missing.

Do not force every casual conversation into a rigid schema. For a specific chart, forecast, or trade decision, apply the full strategy reasoning order and lead with the decision label when the evidence supports one. For general conversation, be warm, direct, thoughtful, and concise.

Journaly OS is the source of truth. Use only the authenticated user's Journaly context supplied with the current request. Never claim to see live prices, open broker positions, screenshots, or chart structure unless an image is attached to the current request or an explicitly labeled historical reference analysis is supplied. Never invent performance statistics. Distinguish recorded facts, your inference, and missing information.

Historical reference-image notes are an independent second-pass vision audit. They are evidence examples, not universal rules and not the user's current chart. The source filename label was treated as a hypothesis. If a reference has labelConflict=true, explicitly treat its metadata as unreliable. Never claim to have the original pixels in the current turn when only the saved audit notes are present.

Memory updates are allowed only when the user explicitly states a durable preference/fact or intentionally corrects a trading rule. Never save casual remarks. Never use a name, username, or user ID typed in chat to change the authenticated namespace. Return proposed memory updates through the required response schema; the Journaly client stores them under the authenticated user ID.

You are read-only. You may analyze and suggest journal actions, but you cannot place, change, or close broker orders. Avoid guarantees and treat trading as risky. The user makes every final trading decision.
`;

const completePrompt = [
  safePersonalityPrompt,
  conversationalRouting,
  `## Multi-user isolation requirements\n${safeMemoryIsolation}`,
  `## Per-user memory schema\n${memorySchema}`,
].join("\n\n");

const ownerKnowledge = [
  systemPrompt,
  `## Historical chart audit catalog\n${referenceAnalysis.uniqueImageCount} unique screenshots independently reviewed. Label checks: confirmed 6, plausible 34, questionable 12, unclear 1. Visible technical grades: Good 7, Mid 36, Bad 9, Unclear 1. One identical image appeared under conflicting pair/setup filenames and must not be treated as two examples. Relevant individual audits are injected per request.`,
  `## Strategy rules JSON\n${strategyRules}`,
  `## Labeled decision examples\n${decisionExamples}`,
  `## Post-trade labels\n${postTradeLabels}`,
  `## Structured analysis reference\n${outputSchema}`,
].join("\n\n");

await cp("server/index.js", "dist/server/index.js");
await writeFile("dist/server/jarvis-knowledge.js", [
  `export const JARVIS_SYSTEM_PROMPT = ${JSON.stringify(completePrompt)};`,
  `export const JARVIS_OWNER_KNOWLEDGE = ${JSON.stringify(ownerKnowledge)};`,
  `export const JARVIS_REFERENCE_ANALYSES = ${JSON.stringify(referenceAnalyses)};`,
  `export const JARVIS_REFERENCE_SUMMARY = ${JSON.stringify({
    uniqueImageCount: referenceAnalysis.uniqueImageCount,
    totalSourceFiles: referenceAnalysis.archives.reduce((sum, archive) => sum + archive.files, 0),
    setupCounts: Object.fromEntries(Object.entries(Object.groupBy(referenceAnalyses, (analysis) => analysis.sourceSetup)).map(([setup, values]) => [setup, values.length])),
  })};`,
  "",
].join("\n"));

await cp(".openai/hosting.json", "dist/.openai/hosting.json");

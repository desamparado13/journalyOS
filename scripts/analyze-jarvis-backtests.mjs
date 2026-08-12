import { createHash } from "node:crypto";
import { extname } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import JSZip from "jszip";

const ARCHIVE_PATH = process.argv.find((value, index) => index > 1 && !value.startsWith("--")) || "journaly-v2-backtests-export-user-1-20260516-121036.zip";
const OUTPUT_PATH = "jarvis-knowledge/backtest_images_analysis.json";
const limitArg = process.argv.find((value) => value.startsWith("--limit="));
const concurrencyArg = process.argv.find((value) => value.startsWith("--concurrency="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Number.POSITIVE_INFINITY;
const concurrency = Math.max(1, Math.min(4, Number(concurrencyArg?.split("=")[1] || 2)));

function loadDotEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")];
  }));
}

function mimeFor(filename) {
  const extension = extname(filename).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  return "image/jpeg";
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text.trim();
  return (payload?.output || []).flatMap((item) => item?.content || []).filter((item) => item?.type === "output_text" && typeof item.text === "string").map((item) => item.text).join("\n").trim();
}

const reviewSchema = {
  type: "object",
  additionalProperties: false,
  required: ["labelCheck", "technicalGrade", "setupMatchConfidence", "ppaAlignment", "triggerQuality", "summary", "visibleEvidence", "concerns", "visibilityLimits", "reusableLesson", "patternTags"],
  properties: {
    labelCheck: { type: "string", enum: ["confirmed", "plausible", "questionable", "unclear"] },
    technicalGrade: { type: "string", enum: ["Good", "Mid", "Bad", "Unclear"] },
    setupMatchConfidence: { type: "integer", minimum: 0, maximum: 100 },
    ppaAlignment: { type: "string", enum: ["aligned", "countertrend", "mixed", "unclear"] },
    triggerQuality: { type: "string", enum: ["clear", "partial", "weak", "unclear"] },
    summary: { type: "string", maxLength: 520 },
    visibleEvidence: { type: "array", maxItems: 5, items: { type: "string", maxLength: 240 } },
    concerns: { type: "array", maxItems: 4, items: { type: "string", maxLength: 240 } },
    visibilityLimits: { type: "string", maxLength: 360 },
    reusableLesson: { type: "string", maxLength: 420 },
    patternTags: { type: "array", maxItems: 7, items: { type: "string", maxLength: 60 } },
  },
};

function summarize(analyses) {
  const countBy = (key) => Object.fromEntries(Object.entries(Object.groupBy(analyses, (item) => item[key] || "unknown")).map(([label, values]) => [label, values.length]));
  const totalUsage = analyses.reduce((total, item) => ({
    inputTokens: total.inputTokens + Number(item.usage?.input_tokens || 0),
    cachedInputTokens: total.cachedInputTokens + Number(item.usage?.input_tokens_details?.cached_tokens || 0),
    outputTokens: total.outputTokens + Number(item.usage?.output_tokens || 0),
  }), { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 });
  const regularInput = Math.max(0, totalUsage.inputTokens - totalUsage.cachedInputTokens);
  const estimatedCostUsd = (regularInput * 1 + totalUsage.cachedInputTokens * 0.1 + totalUsage.outputTokens * 6) / 1_000_000;
  return {
    analyzed: analyses.length,
    bySetup: countBy("setup"),
    byPair: countBy("pair"),
    byTechnicalGrade: countBy("technicalGrade"),
    byLabelCheck: countBy("labelCheck"),
    byPpaAlignment: countBy("ppaAlignment"),
    byTriggerQuality: countBy("triggerQuality"),
    usage: { ...totalUsage, estimatedCostUsd: Math.round(estimatedCostUsd * 1_000_000) / 1_000_000, currency: "USD" },
  };
}

async function analyze(record, apiKey, model, strategyRules) {
  const metadata = {
    id: record.id,
    date: record.date,
    time: record.time,
    pair: record.pair,
    setup: record.setup,
    direction: record.direction,
    recordedResult: record.result,
    recordedR: record.pnlR,
    stopLossPips: record.stopLossPips,
    maePips: record.maePips,
    scaleIn: record.scaleIn,
    notes: record.notes,
  };
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          store: false,
          instructions: `You are conducting an independent visual audit of one historical Journaly backtest chart. Apply the supplied PPA-first rules carefully. The stored setup label and outcome are metadata, not ground truth. Grade visible setup/process quality independently from P/L; a winning bad setup remains Bad and a losing valid setup can remain Good. Judge only visible chart evidence. Never invent entry timing, unseen higher-timeframe context, candle details, or annotations. State visibility limits precisely. Produce a reusable lesson without converting one case into a universal rule.\n\nSTRATEGY RULES\n${strategyRules}`,
          input: [{ role: "user", content: [
            { type: "input_text", text: `Audit this backtest carefully. RECORD METADATA\n${JSON.stringify(metadata)}\n\nCheck whether the chart visibly supports the recorded setup and direction. Separate visible evidence from outcome knowledge.` },
            { type: "input_image", image_url: `data:${record.mime};base64,${record.bytes.toString("base64")}`, detail: "original" },
          ] }],
          reasoning: { effort: "medium", context: "current_turn" },
          text: { format: { type: "json_schema", name: "journaly_backtest_audit", strict: true, schema: reviewSchema }, verbosity: "medium" },
          max_output_tokens: 2200,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload?.error?.message || `OpenAI request failed (${response.status})`);
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      const text = extractOutputText(payload);
      if (!text) throw new Error("The model returned no audit.");
      return { ...JSON.parse(text), model, usage: payload.usage || null };
    } catch (error) {
      lastError = error;
      if (!error.retryable || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 1500 * (2 ** attempt)));
    }
  }
  throw lastError;
}

async function main() {
  const localEnv = loadDotEnv(await readFile(".env.local", "utf8").catch(() => ""));
  const apiKey = process.env.OPENAI_API_KEY || localEnv.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required.");
  const model = process.env.OPENAI_JARVIS_REVIEW_MODEL || localEnv.OPENAI_JARVIS_REVIEW_MODEL || "gpt-5.6-luna";
  const strategyRules = await readFile("jarvis-knowledge/strategy_rules.json", "utf8");
  const zip = await JSZip.loadAsync(await readFile(ARCHIVE_PATH));
  const manifestEntry = zip.file("backtests.json");
  if (!manifestEntry) throw new Error("backtests.json is missing from the export.");
  const manifest = JSON.parse(await manifestEntry.async("string"));
  const previous = JSON.parse(await readFile(OUTPUT_PATH, "utf8").catch(() => '{"analyses":[]}'));
  const completed = new Map((previous.analyses || []).map((item) => [item.sha256, item]));
  const unique = new Map();
  for (const source of manifest.backtests || []) {
    const archivePath = source.screenshot?.archive_path;
    const imageEntry = archivePath ? zip.file(archivePath) : null;
    if (!imageEntry) continue;
    const bytes = await imageEntry.async("nodebuffer");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const alias = { id: String(source.legacy_id), date: source.trade_date, pair: source.pair, setup: source.setup_type, result: source.result, pnlR: Number(source.pnl_r || 0) };
    if (unique.has(sha256)) {
      unique.get(sha256).sourceAliases.push(alias);
      continue;
    }
    unique.set(sha256, {
      sha256,
      filename: source.screenshot.filename,
      archivePath,
      id: String(source.legacy_id),
      date: source.trade_date,
      time: source.trade_time,
      pair: source.pair,
      setup: source.setup_type,
      direction: source.direction,
      durationMinutes: source.duration_minutes,
      stopLossPips: source.stop_loss_pips,
      maePips: source.mae_pips,
      pnlR: Number(source.pnl_r || 0),
      result: source.result,
      notes: source.notes,
      scaleIn: source.scale_in,
      mime: mimeFor(source.screenshot.filename),
      bytes,
      sourceAliases: [alias],
    });
  }
  const records = [...unique.values()];
  const pending = records.filter((record) => !completed.has(record.sha256)).slice(0, limit);
  let saveChain = Promise.resolve();
  async function save() {
    const analyses = [...completed.values()].sort((a, b) => `${b.date || ""}-${b.time || ""}`.localeCompare(`${a.date || ""}-${a.time || ""}`));
    const output = {
      version: "1.0",
      generatedAt: new Date().toISOString(),
      sourceArchive: ARCHIVE_PATH,
      methodology: "Independent per-image OpenAI vision audit at original detail with medium reasoning. Stored labels and outcomes were treated as metadata; visible setup quality was graded independently from P/L.",
      manifestRecordCount: manifest.backtests?.length || 0,
      screenshotsPresent: records.length,
      uniqueImageCount: records.length,
      duplicateImageCount: (manifest.backtests?.length || 0) - records.length,
      summary: summarize(analyses),
      analyses,
    };
    await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  }
  function queueSave() {
    saveChain = saveChain.then(save);
    return saveChain;
  }

  console.log(`Backtest export: ${manifest.backtests?.length || 0} records, ${records.length} unique screenshots, ${completed.size} already audited, ${pending.length} pending with ${model} at concurrency ${concurrency}.`);
  let cursor = 0;
  let finished = 0;
  async function worker() {
    while (cursor < pending.length) {
      const index = cursor;
      cursor += 1;
      const record = pending[index];
      try {
        const review = await analyze(record, apiKey, model, strategyRules);
        completed.set(record.sha256, { sha256: record.sha256, filename: record.filename, archivePath: record.archivePath, id: record.id, date: record.date, time: record.time, pair: record.pair, setup: record.setup, direction: record.direction, result: record.result, pnlR: record.pnlR, stopLossPips: record.stopLossPips, maePips: record.maePips, scaleIn: record.scaleIn, notes: record.notes, sourceAliases: record.sourceAliases, labelConflict: new Set(record.sourceAliases.map((alias) => `${alias.pair}|${alias.setup}`)).size > 1, ...review });
        finished += 1;
        console.log(`[${finished}/${pending.length}] ${record.id} ${record.pair} ${record.setup}: ${review.labelCheck} / ${review.technicalGrade} / PPA ${review.ppaAlignment}`);
      } catch (error) {
        finished += 1;
        console.error(`[${finished}/${pending.length}] ${record.id} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      await queueSave();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  await saveChain;
  await save();
  const finalAnalyses = [...completed.values()];
  console.log(JSON.stringify({ completed: finalAnalyses.length, expected: records.length, summary: summarize(finalAnalyses) }, null, 2));
  if (finalAnalyses.length !== records.length) process.exitCode = 1;
}

await main();

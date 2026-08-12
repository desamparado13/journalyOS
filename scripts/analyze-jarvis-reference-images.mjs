import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import JSZip from "jszip";

const OUTPUT_PATH = "jarvis-knowledge/reference_images_analysis.json";
const DEFAULT_ARCHIVES = [
  "journaly-live-trades-flag-images-2026-08-10.zip",
  "journaly-live-trades-break-and-retest-images-2026-08-10.zip",
  "journaly-live-trades-liquidity-sweep-images-2026-08-10.zip",
  "journaly-live-trades-internal-reversal-images-2026-08-10.zip",
  "journaly-live-trades-reversal-images-2026-08-10.zip",
].map((name) => join(homedir(), "Downloads", name));

const cliArchives = process.argv.filter((value, index) => index > 1 && !value.startsWith("--"));
const limitArg = process.argv.find((value) => value.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Number.POSITIVE_INFINITY;
const archivePaths = cliArchives.length ? cliArchives : DEFAULT_ARCHIVES;

function loadDotEnv(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['\"]|['\"]$/g, "")];
      }),
  );
}

function setupFromArchive(path) {
  const match = basename(path).match(/journaly-live-trades-(.+?)-images-/i);
  return match?.[1]?.replaceAll("-", " ") || "unknown";
}

function parseFilename(filename, archiveSetup) {
  const stem = basename(filename, extname(filename));
  const match = stem.match(/^\d+-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-([a-z]+)-(.+)-([0-9a-f]+)$/i);
  if (!match) return { date: null, time: null, pair: null, sourceSetup: archiveSetup };
  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: `${match[4]}:${match[5]}`,
    pair: match[6].toUpperCase(),
    sourceSetup: match[7].replaceAll("-", " "),
  };
}

function mimeFor(filename) {
  const extension = extname(filename).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  return "image/jpeg";
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text.trim();
  return (payload?.output || [])
    .flatMap((item) => item?.content || [])
    .filter((item) => item?.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

async function loadUniqueImages(paths) {
  const unique = new Map();
  const archiveReport = [];

  for (const archivePath of paths) {
    const archiveSetup = setupFromArchive(archivePath);
    const zip = await JSZip.loadAsync(await readFile(archivePath));
    const files = Object.values(zip.files).filter((entry) => !entry.dir && /\.(png|jpe?g|webp|gif)$/i.test(entry.name));
    let duplicateCount = 0;

    for (const file of files) {
      const bytes = await file.async("nodebuffer");
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      if (unique.has(sha256)) {
        unique.get(sha256).sourceAliases.push({
          filename: basename(file.name),
          archive: basename(archivePath),
          ...parseFilename(file.name, archiveSetup),
        });
        duplicateCount += 1;
        continue;
      }
      const parsed = parseFilename(file.name, archiveSetup);
      unique.set(sha256, {
        sha256,
        filename: basename(file.name),
        archive: basename(archivePath),
        archiveSetup,
        ...parsed,
        sourceAliases: [{ filename: basename(file.name), archive: basename(archivePath), ...parsed }],
        mime: mimeFor(file.name),
        bytes,
      });
    }

    archiveReport.push({ archive: basename(archivePath), setup: archiveSetup, files: files.length, duplicateImages: duplicateCount });
  }

  return { images: [...unique.values()], archiveReport };
}

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["labelCheck", "technicalGrade", "setupMatchConfidence", "summary", "visibleEvidence", "concerns", "visibilityLimits"],
  properties: {
    labelCheck: { type: "string", enum: ["confirmed", "plausible", "questionable", "unclear"] },
    technicalGrade: { type: "string", enum: ["Good", "Mid", "Bad", "Unclear"] },
    setupMatchConfidence: { type: "integer", minimum: 0, maximum: 100 },
    summary: { type: "string", maxLength: 420 },
    visibleEvidence: { type: "array", maxItems: 4, items: { type: "string", maxLength: 220 } },
    concerns: { type: "array", maxItems: 3, items: { type: "string", maxLength: 220 } },
    visibilityLimits: { type: "string", maxLength: 320 },
  },
};

async function analyzeImage(image, apiKey, model, strategyRules) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      store: false,
      instructions: `You are performing a second-pass visual audit of a historical Journaly trading screenshot. Apply the supplied PPA-first strategy rules objectively. The archive label is a hypothesis, not ground truth. Judge only what the screenshot visibly supports. Do not infer P/L, execution timing, higher-timeframe context, or unseen candles. A Good/Mid/Bad grade means visible setup/execution quality, never trade outcome.\n\nSTRATEGY RULES\n${strategyRules}`,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: `Review ${image.filename}. Source label: ${image.sourceSetup}. Pair: ${image.pair || "unknown"}. Date/time: ${image.date || "unknown"} ${image.time || ""}. Double-check whether the visible chart supports the source label and give concise evidence.` },
          { type: "input_image", image_url: `data:${image.mime};base64,${image.bytes.toString("base64")}`, detail: "high" },
        ],
      }],
      reasoning: { effort: "low", context: "current_turn" },
      text: { format: { type: "json_schema", name: "journaly_chart_review", strict: true, schema }, verbosity: "low" },
      max_output_tokens: 800,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `OpenAI request failed (${response.status})`);
  const outputText = extractOutputText(payload);
  if (!outputText) throw new Error("The model returned no chart analysis.");
  return { ...JSON.parse(outputText), model };
}

async function main() {
  const localEnv = loadDotEnv(await readFile(".env.local", "utf8").catch(() => ""));
  const apiKey = process.env.OPENAI_API_KEY || localEnv.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required in the environment or .env.local.");
  const model = process.env.OPENAI_JARVIS_REVIEW_MODEL || localEnv.OPENAI_JARVIS_REVIEW_MODEL || "gpt-5.6-luna";
  const strategyRules = await readFile("jarvis-knowledge/strategy_rules.json", "utf8");
  const previous = JSON.parse(await readFile(OUTPUT_PATH, "utf8").catch(() => '{"analyses":[]}'));
  const completed = new Map((previous.analyses || []).map((item) => [item.sha256, item]));
  const { images, archiveReport } = await loadUniqueImages(archivePaths);
  const pending = images.filter((image) => !completed.has(image.sha256)).slice(0, limit);

  async function saveResults() {
    const analyses = [...completed.values()].map((analysis) => {
      const image = images.find((candidate) => candidate.sha256 === analysis.sha256);
      const sourceAliases = image?.sourceAliases || analysis.sourceAliases || [];
      return {
        ...analysis,
        sourceAliases,
        labelConflict: new Set(sourceAliases.map((source) => `${source.pair || "unknown"}|${source.sourceSetup}`)).size > 1,
      };
    });
    await writeFile(OUTPUT_PATH, `${JSON.stringify({
      version: "0.3",
      generatedAt: new Date().toISOString(),
      methodology: "Independent OpenAI vision review of unique chart screenshots. Source labels are hypotheses; grades reflect visible evidence only, never P/L.",
      archives: archiveReport,
      uniqueImageCount: images.length,
      analyses: analyses.sort((a, b) => `${b.date || ""}-${b.time || ""}`.localeCompare(`${a.date || ""}-${a.time || ""}`)),
    }, null, 2)}\n`);
  }

  console.log(`Found ${images.length} unique images; ${completed.size} already analyzed; reviewing ${pending.length} with ${model}.`);
  for (let index = 0; index < pending.length; index += 1) {
    const image = pending[index];
    process.stdout.write(`[${index + 1}/${pending.length}] ${image.pair || "?"} ${image.sourceSetup} ${image.date || ""} ... `);
    try {
      const review = await analyzeImage(image, apiKey, model, strategyRules);
      completed.set(image.sha256, {
        sha256: image.sha256,
        filename: image.filename,
        archive: image.archive,
        date: image.date,
        time: image.time,
        pair: image.pair,
        sourceSetup: image.sourceSetup,
        ...review,
      });
      console.log(`${review.labelCheck} / ${review.technicalGrade}`);
    } catch (error) {
      console.log(`failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    await saveResults();
  }
  await saveResults();
}

await main();

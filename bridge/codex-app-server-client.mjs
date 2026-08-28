import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { JARVIS_CHAT_OUTPUT_SCHEMA, JARVIS_CODEX_INSTRUCTIONS } from "./jarvis-chat-contract.mjs";

const TURN_TIMEOUT_MS = 3 * 60 * 1000;

function errorMessage(value, fallback) {
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object" && typeof value.message === "string") return value.message;
  return fallback;
}

function mergeRateLimitWindow(current, update) {
  if (!update || typeof update !== "object") return current || null;
  return { ...(current && typeof current === "object" ? current : {}), ...update };
}

function mergeRateLimitSnapshot(current, update) {
  if (!update || typeof update !== "object") return current || null;
  const merged = { ...(current && typeof current === "object" ? current : {}) };
  for (const [key, value] of Object.entries(update)) {
    if (value !== null && value !== undefined) merged[key] = value;
  }
  merged.primary = mergeRateLimitWindow(current?.primary, update.primary);
  merged.secondary = mergeRateLimitWindow(current?.secondary, update.secondary);
  return merged;
}

export function extractPartialJsonString(jsonText, key) {
  const source = String(jsonText || "");
  const marker = JSON.stringify(String(key));
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return "";
  let cursor = markerIndex + marker.length;
  while (/\s/.test(source[cursor] || "")) cursor += 1;
  if (source[cursor] !== ":") return "";
  cursor += 1;
  while (/\s/.test(source[cursor] || "")) cursor += 1;
  if (source[cursor] !== '"') return "";
  cursor += 1;
  let output = "";
  while (cursor < source.length) {
    const character = source[cursor++];
    if (character === '"') break;
    if (character !== "\\") { output += character; continue; }
    if (cursor >= source.length) break;
    const escaped = source[cursor++];
    const simple = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
    if (Object.hasOwn(simple, escaped)) { output += simple[escaped]; continue; }
    if (escaped === "u") {
      const code = source.slice(cursor, cursor + 4);
      if (!/^[0-9a-f]{4}$/i.test(code)) break;
      output += String.fromCharCode(Number.parseInt(code, 16));
      cursor += 4;
    }
  }
  return output;
}

export class CodexAppServerClient {
  constructor({ codexBin, model = "" }) {
    this.codexBin = codexBin;
    this.requestedModel = model.trim();
    this.computerRoot = path.resolve(process.env.JOURNALY_COMPUTER_ROOT || homedir());
    this.process = null;
    this.reader = null;
    this.temporaryDirectory = "";
    this.nextRequestId = 1;
    this.pendingRequests = new Map();
    this.turnWaiters = new Map();
    this.completedTurns = new Map();
    this.turnText = new Map();
    this.turnDeltaListeners = new Map();
    this.threads = new Map();
    this.startPromise = null;
    this.stderr = "";
    this.rateLimits = null;
    this.rateLimitsByLimitId = null;
    this.rateLimitResetCredits = null;
    this.rateLimitsUpdatedAt = null;
  }

  async start() {
    if (this.process && !this.process.killed) return;
    if (this.startPromise) return this.startPromise;
    this.startPromise = this.startInternal();
    try { await this.startPromise; }
    finally { this.startPromise = null; }
  }

  async startInternal() {
    this.temporaryDirectory = await mkdtemp(path.join(tmpdir(), "journaly-codex-chat-"));
    const environment = { ...process.env };
    if (process.versions.electron) environment.ELECTRON_RUN_AS_NODE = "1";
    this.process = spawn(process.execPath, [this.codexBin, "app-server", "--stdio"], {
      cwd: this.temporaryDirectory,
      env: environment,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.process.stderr.on("data", (chunk) => { this.stderr = `${this.stderr}${String(chunk)}`.slice(-12000); });
    this.process.once("error", (error) => this.failAll(error));
    this.process.once("close", (code) => {
      const details = this.stderr.trim();
      this.failAll(new Error(details || `Codex App Server exited with code ${code}.`));
      this.process = null;
      this.threads.clear();
    });
    this.reader = createInterface({ input: this.process.stdout });
    this.reader.on("line", (line) => this.handleLine(line));
    await this.request("initialize", {
      clientInfo: { name: "journaly_codex_desktop", title: "Journaly Codex Desktop", version: "0.2.0" },
      capabilities: { experimentalApi: false, requestAttestation: false },
    });
    this.notify("initialized");
    await this.readRateLimits().catch(() => null);
  }

  write(message) {
    if (!this.process?.stdin?.writable) throw new Error("Codex App Server is not running.");
    this.process.stdin.write(`${JSON.stringify(message)}\n`);
  }

  notify(method, params) {
    this.write(params === undefined ? { method } : { method, params });
  }

  request(method, params) {
    const id = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Codex App Server request ${method} timed out.`));
      }, TURN_TIMEOUT_MS);
      this.pendingRequests.set(id, { resolve, reject, timeout, method });
      this.write({ method, id, params });
    });
  }

  handleLine(line) {
    let message;
    try { message = JSON.parse(line); }
    catch { return; }
    if (Object.hasOwn(message, "id") && (Object.hasOwn(message, "result") || Object.hasOwn(message, "error"))) {
      const pending = this.pendingRequests.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.id);
      if (message.error) pending.reject(new Error(errorMessage(message.error, `Codex request ${pending.method} failed.`)));
      else pending.resolve(message.result);
      return;
    }
    if (Object.hasOwn(message, "id") && typeof message.method === "string") {
      this.write({ id: message.id, error: { code: -32001, message: "Journaly desktop does not support this interactive tool request." } });
      return;
    }
    if (message.method === "item/agentMessage/delta") {
      const turnId = message.params?.turnId;
      if (typeof turnId === "string") {
        const raw = `${this.turnText.get(turnId) || ""}${String(message.params?.delta || "")}`;
        this.turnText.set(turnId, raw);
        this.turnDeltaListeners.get(turnId)?.(raw);
      }
      return;
    }
    if (message.method === "account/rateLimits/updated") {
      const update = message.params?.rateLimits;
      this.rateLimits = mergeRateLimitSnapshot(this.rateLimits, update);
      const limitId = this.rateLimits?.limitId;
      if (limitId) this.rateLimitsByLimitId = { ...(this.rateLimitsByLimitId || {}), [limitId]: mergeRateLimitSnapshot(this.rateLimitsByLimitId?.[limitId], update) };
      this.rateLimitsUpdatedAt = new Date().toISOString();
      return;
    }
    if (message.method === "turn/completed") this.completeTurn(message.params?.turn);
  }

  async readRateLimits() {
    const response = await this.request("account/rateLimits/read");
    this.rateLimits = response?.rateLimits || null;
    this.rateLimitsByLimitId = response?.rateLimitsByLimitId || null;
    this.rateLimitResetCredits = response?.rateLimitResetCredits || null;
    this.rateLimitsUpdatedAt = new Date().toISOString();
    return this.rateLimitSnapshot();
  }

  rateLimitSnapshot() {
    return {
      rateLimits: this.rateLimits,
      rateLimitsByLimitId: this.rateLimitsByLimitId,
      rateLimitResetCredits: this.rateLimitResetCredits,
      updatedAt: this.rateLimitsUpdatedAt,
    };
  }

  async getRateLimits({ refresh = false } = {}) {
    await this.start();
    if (refresh) return this.readRateLimits();
    return this.rateLimitSnapshot();
  }

  completeTurn(turn) {
    if (!turn?.id) return;
    const waiter = this.turnWaiters.get(turn.id);
    if (!waiter) {
      this.completedTurns.set(turn.id, turn);
      return;
    }
    clearTimeout(waiter.timeout);
    this.turnWaiters.delete(turn.id);
    waiter.resolve(turn);
  }

  waitForTurn(turnId) {
    const completed = this.completedTurns.get(turnId);
    if (completed) {
      this.completedTurns.delete(turnId);
      return Promise.resolve(completed);
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.turnWaiters.delete(turnId);
        reject(new Error("Codex chat timed out after three minutes."));
      }, TURN_TIMEOUT_MS);
      this.turnWaiters.set(turnId, { resolve, reject, timeout });
    });
  }

  async getThread(conversationKey) {
    const existing = this.threads.get(conversationKey);
    if (existing) return existing;
    const params = {
      cwd: this.computerRoot,
      approvalPolicy: "never",
      sandbox: "danger-full-access",
      ephemeral: true,
      serviceName: "Journaly Jarvis",
      baseInstructions: JARVIS_CODEX_INSTRUCTIONS,
      developerInstructions: "You may use local computer and command tools to fulfill Christian's explicit desktop requests. Follow the desktop-access and confirmation rules in the base instructions. Return the exact output schema.",
    };
    if (this.requestedModel) params.model = this.requestedModel;
    const response = await this.request("thread/start", params);
    const value = { threadId: response?.thread?.id, model: response?.model || this.requestedModel || "Codex default" };
    if (!value.threadId) throw new Error("Codex App Server did not create a conversation thread.");
    this.threads.set(conversationKey, value);
    return value;
  }

  async chat({ conversationKey, prompt, images = [], onAnswerDelta = null }) {
    await this.start();
    const thread = await this.getThread(conversationKey);
    const input = [{ type: "text", text: prompt, text_elements: [] }];
    for (const image of images.slice(0, 2)) input.push({ type: "image", url: image.dataUrl, detail: "original" });
    const response = await this.request("turn/start", {
      threadId: thread.threadId,
      input,
      cwd: this.computerRoot,
      approvalPolicy: "never",
      sandboxPolicy: { type: "dangerFullAccess" },
      outputSchema: JARVIS_CHAT_OUTPUT_SCHEMA,
    });
    const turnId = response?.turn?.id;
    if (!turnId) throw new Error("Codex App Server did not start the Jarvis turn.");
    let streamedAnswerLength = 0;
    if (typeof onAnswerDelta === "function") {
      const listener = (raw) => {
        const answer = extractPartialJsonString(raw, "answer");
        if (answer.length <= streamedAnswerLength) return;
        const delta = answer.slice(streamedAnswerLength);
        streamedAnswerLength = answer.length;
        onAnswerDelta(delta, answer);
      };
      this.turnDeltaListeners.set(turnId, listener);
      listener(this.turnText.get(turnId) || "");
    }
    const completed = await this.waitForTurn(turnId).finally(() => this.turnDeltaListeners.delete(turnId));
    if (completed.status !== "completed") throw new Error(errorMessage(completed.error, "Codex could not complete this Jarvis response."));
    const streamedText = (this.turnText.get(turnId) || "").trim();
    this.turnText.delete(turnId);
    const itemText = Array.isArray(completed.items)
      ? completed.items.filter((item) => item?.type === "agentMessage").map((item) => item.text).join("").trim()
      : "";
    const raw = streamedText || itemText;
    if (!raw) throw new Error("Codex returned an empty Jarvis response.");
    const normalized = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    let payload;
    try { payload = JSON.parse(normalized); }
    catch { throw new Error("Codex returned an invalid structured Jarvis response."); }
    return { ...payload, provider: "Codex App Server", model: thread.model, usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 } };
  }

  failAll(error) {
    for (const pending of this.pendingRequests.values()) { clearTimeout(pending.timeout); pending.reject(error); }
    for (const waiter of this.turnWaiters.values()) { clearTimeout(waiter.timeout); waiter.reject(error); }
    this.pendingRequests.clear();
    this.turnWaiters.clear();
    this.turnDeltaListeners.clear();
  }

  async stop() {
    this.reader?.close();
    this.reader = null;
    const child = this.process;
    if (child && child.exitCode === null) {
      const closed = new Promise((resolve) => child.once("close", resolve));
      child.kill();
      await closed;
    }
    this.process = null;
    this.threads.clear();
    this.rateLimits = null;
    this.rateLimitsByLimitId = null;
    this.rateLimitResetCredits = null;
    this.rateLimitsUpdatedAt = null;
    if (this.temporaryDirectory) await rm(this.temporaryDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
    this.temporaryDirectory = "";
  }
}

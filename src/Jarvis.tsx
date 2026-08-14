import {
  Activity,
  ArrowUp,
  BarChart3,
  Bell,
  BookOpenCheck,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleDot,
  CircleDollarSign,
  Clock,
  Command,
  Crosshair,
  Eye,
  Gauge,
  HeartHandshake,
  ImagePlus,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Moon,
  Paperclip,
  Radio,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Square,
  Target,
  Trash2,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Sunrise,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { ChangeEvent, CSSProperties, FormEvent, PointerEvent as ReactPointerEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

const JARVIS_ORB_POSITION_KEY = "journaly-os-jarvis-orb-position";
const JARVIS_CHAT_KEY_PREFIX = "journaly-os-jarvis-chat";
const JARVIS_MEMORY_KEY_PREFIX = "journaly-os-jarvis-memory-v0.3";
const JARVIS_SPEND_KEY_PREFIX = "journaly-os-jarvis-spend-v1";
const JARVIS_REPORT_SEEN_KEY_PREFIX = "journaly-os-jarvis-report-seen-v1";
const JARVIS_ACTIVE_CONTEXT_KEY_PREFIX = "journaly-os-jarvis-active-context-v1";
const JARVIS_VOICE_REPLIES_KEY_PREFIX = "journaly-os-jarvis-voice-replies-v1";
const JARVIS_PROACTIVE_SEEN_KEY_PREFIX = "journaly-os-jarvis-proactive-seen-v1";
const JARVIS_MONITOR_NOTIFIED_KEY_PREFIX = "journaly-os-jarvis-monitor-notified-v1";
const JARVIS_OBSERVATION_SNAPSHOT_KEY_PREFIX = "journaly-os-jarvis-observation-v1";
const JARVIS_AUTOPILOT_BRIEFING_KEY_PREFIX = "journaly-os-jarvis-autopilot-briefing-v1";
const JARVIS_ORB_MARGIN = 8;
const OWNER_USERNAME = "christian.angelo.desamparado";
const LEGACY_FALLBACK_NOTICE = "AI conversation is temporarily unavailable, so this response uses Journaly’s local analytics.";
const JARVIS_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
const JARVIS_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const JARVIS_TRADE_PAIRS = new Set(["AUDUSD", "EURUSD", "EURJPY", "AUDJPY", "GBPUSD", "NZDJPY", "EURAUD"]);
const JARVIS_TRADE_SETUPS = new Set(["REVERSAL", "Internal reversal", "Liquidity sweep", "Break and retest", "Flag", "Flag+", "EU timed entry"]);
export const JARVIS_LEARNING_PREFIX = "[[JARVIS_LEARNING_V1]]";
export const JARVIS_FORECAST_REVIEW_PREFIX = "[[JARVIS_FORECAST_REVIEW_V1]]";
export const JARVIS_FEEDBACK_PREFIX = "[[JARVIS_FEEDBACK_V1]]";
export const JARVIS_MEMORY_SYNC_PREFIX = "[[JARVIS_MEMORY_SYNC_V1]]";
export const JARVIS_SESSION_SYNC_PREFIX = "[[JARVIS_SESSION_SYNC_V1]]";
export const JARVIS_CHAT_SYNC_PREFIX = "[[JARVIS_CHAT_SYNC_V1]]";
export const JARVIS_WORKSPACE_PREFIX = "[[JARVIS_WORKSPACE_V1]]";
export const JARVIS_JOURNEY_PREFIX = "[[JARVIS_JOURNEY_V1]]";
export const JARVIS_CHART_PREFIX = "[[JARVIS_CHART_V1]]";
export const JARVIS_ROUTINE_PREFIX = "[[JARVIS_ROUTINE_V1]]";
export const JARVIS_PROACTIVE_PREFIX = "[[JARVIS_PROACTIVE_V1]]";
export const JARVIS_GOOGLE_DRIVE_PREFIX = "[[JARVIS_GOOGLE_DRIVE_V1]]";
const SUPABASE_FREE_DATABASE_BYTES = 500 * 1024 * 1024;
const JARVIS_BRAIN_PREFIXES = [JARVIS_LEARNING_PREFIX, JARVIS_FORECAST_REVIEW_PREFIX, JARVIS_FEEDBACK_PREFIX, JARVIS_MEMORY_SYNC_PREFIX, JARVIS_SESSION_SYNC_PREFIX, JARVIS_CHAT_SYNC_PREFIX, JARVIS_WORKSPACE_PREFIX, JARVIS_JOURNEY_PREFIX, JARVIS_CHART_PREFIX, JARVIS_ROUTINE_PREFIX, JARVIS_PROACTIVE_PREFIX] as const;

type JarvisTrade = {
  id: string;
  date: string;
  time: string;
  pair: string;
  setup: string;
  direction: string;
  mae: number;
  maeRecorded: boolean;
  maePips: number | null;
  pnl: number;
  result: string;
  quality: "Good" | "Mid" | "Bad" | null;
  notes: string;
  screenshot: string;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type JarvisBacktest = {
  id: string;
  date: string;
  time: string;
  pair: string;
  setup: string;
  direction: string;
  durationMinutes: number | null;
  stopLossPips: number | null;
  maePips: number | null;
  pnl: number;
  result: string;
  notes: string;
  scaleIn: string;
  screenshot: string;
};

type JarvisForecast = {
  id: string;
  date: string;
  time: string;
  pair: string;
  setup: string;
  direction: string;
  status: string;
  entryPlan: string;
  riskPercent: number | null;
  reasonToTake: string;
  reasonCancelled: string;
  outcome: string;
  resultR: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type JarvisSession = {
  isOpen: boolean;
  label: string;
  status: string;
  detail: string;
  timeLabel: string;
};

type JarvisMessage = {
  id: string;
  role: "user" | "jarvis";
  title?: string;
  text: string;
  metrics?: Array<{ label: string; value: string; tone?: "good" | "warn" | "bad" }>;
  imagePreview?: string;
  attachmentName?: string;
  createdAt?: string;
};

type JarvisMonitorItem = {
  id: string;
  priority: "high" | "medium" | "low";
  category: "follow_up" | "forecast" | "trade_review" | "context" | "change";
  title: string;
  detail: string;
  prompt: string;
};

type JarvisObservationSnapshot = {
  savedAt: string;
  trades: Record<string, string>;
  forecasts: Record<string, string>;
};

type JarvisActiveContext = {
  pair: string | null;
  setup: string | null;
  tradeId: string | null;
  backtestId: string | null;
  forecastId: string | null;
  dataSource: "live" | "backtest" | "forecast" | null;
  updatedAt: string;
};

type JarvisWorkspace = {
  focusId: string | null;
  contexts: Array<JarvisActiveContext & { id: string; label: string }>;
  updatedAt: string;
};

type JarvisJourneyEvent = {
  id: string;
  at: string;
  kind: "forecast" | "chart" | "trade" | "result" | "lesson";
  title: string;
  detail: string;
  pair: string | null;
};

type JarvisFeedbackReason = "helpful" | "too_strict" | "too_long" | "misread_context" | "unnatural";

type JarvisSpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type JarvisSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: JarvisSpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type JarvisSpeechRecognitionConstructor = new () => JarvisSpeechRecognition;

type JarvisTradeAction = {
  intent: "draft" | "ready";
  date: string | null;
  time: string | null;
  pair: string | null;
  setup: string | null;
  direction: "Long" | "Short" | null;
  stopLossPips: number | null;
  mae: number | null;
  pnl: number | null;
  result: "Win" | "Loss" | "Breakeven" | null;
  notes: string | null;
  missingFields: Array<"pair" | "setup" | "direction">;
};

type JarvisForecastAction = {
  intent: "create" | "update_status";
  ready: boolean;
  forecastId: string | null;
  date: string | null;
  time: string | null;
  pair: string | null;
  setup: string | null;
  direction: "Long" | "Short" | null;
  status: "Waiting" | "Taken" | "Invalidated" | "Skipped" | null;
  notes: string | null;
  missingFields: Array<"forecastId" | "pair" | "setup" | "direction">;
};

type JarvisPositionSizingAction = {
  applyToCalculator: boolean;
  ready: boolean;
  pair: string | null;
  accountBalance: number | null;
  riskPercent: number | null;
  entryPrice: number | null;
  stopLossPrice: number | null;
  takeProfitPrice: number | null;
  quoteToUsdRate: number | null;
  missingFields: Array<"pair" | "accountBalance" | "riskPercent" | "entryPrice" | "stopLossPrice" | "quoteToUsdRate">;
  result: {
    direction: "Long" | "Short";
    stopPips: number;
    riskAmount: number;
    lots: number;
    miniLots: number;
    microLots: number;
    units: number;
    rewardPips: number | null;
    rewardRisk: number | null;
    projectedProfit: number | null;
    takeProfitValid: boolean | null;
  } | null;
};

type JarvisPositionSizingContext = {
  pair: string;
  accountBalance: number | null;
  riskPercent: number | null;
  entryPrice: number | null;
  stopLossPrice: number | null;
  takeProfitPrice: number | null;
  quoteToUsdRate: number | null;
  profiles: JarvisPositionProfileRow[];
  profileMode: "main" | "half";
};

type JarvisPositionProfileRow = {
  id: string;
  balance: number;
  type: string;
  platform: string;
  riskPercent: number;
};

type JarvisPositionProfileAction = {
  operation: "add" | "update" | "delete" | "set_mode";
  ready: boolean;
  rowId: string | null;
  profileMode: "main" | "half" | null;
  balance: number | null;
  type: string | null;
  platform: string | null;
  riskPercent: number | null;
  missingFields: Array<"profile" | "balance" | "riskPercent" | "change" | "profileMode">;
  candidateIds: string[];
};

type JarvisHealth = {
  provider: string;
  configuredModel: string | null;
  apiConfigured: boolean;
  apiReachable: boolean;
  lastSuccessfulRequestAt: string | null;
  lastErrorCategory: string | null;
  lastHttpStatus: number | null;
  fallbackActive: boolean;
};

type JarvisSpend = {
  month: string;
  totalUsd: number;
  lastRequestUsd: number;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  updatedAt: string | null;
};

type JarvisProps = {
  userId: string;
  username: string;
  displayName: string;
  trades: JarvisTrade[];
  backtests: JarvisBacktest[];
  forecasts: JarvisForecast[];
  session: JarvisSession;
  journalEntries: Array<{ id: string; date: string; content: string; advice: string; image?: string; createdAt?: string; updatedAt?: string }>;
  positionSizing: JarvisPositionSizingContext;
  onTradeCreated: () => void | Promise<void>;
  onForecastChanged: (forecast?: { id: string; status: NonNullable<JarvisForecastAction["status"]> }) => void | Promise<void>;
  onPositionSizingApply: (action: JarvisPositionSizingAction) => void;
  onPositionProfileApply: (action: JarvisPositionProfileAction) => void;
};

type JarvisLearningRecord = {
  id: string;
  date: string;
  source: "chart" | "forecast" | "skipped_trade" | "insight";
  prompt: string;
  summary: string;
};

type OrbPosition = { x: number; y: number };

type JarvisMemoryUpdate = {
  operation: "upsert" | "delete";
  category: "identity" | "preference" | "relationship" | "life_event" | "important_date" | "routine" | "interest" | "personal_value" | "project" | "wellbeing" | "boundary" | "trading_rule" | "risk_rule" | "mistake" | "goal" | "terminology" | "ui_preference";
  key: string;
  value: string;
  confidence: number;
  source: "explicit" | "inferred";
  sensitivity: "normal" | "sensitive";
  followUpAt: string | null;
};

type JarvisCompanionSettings = {
  personalMemoryEnabled: boolean;
  inferenceMode: "explicit_only" | "balanced";
  sensitiveMemoryEnabled: boolean;
  proactiveFollowups: boolean;
  autonomyMode: "observe" | "assist";
  handsFreeVoice: boolean;
};

type JarvisMemoryState = {
  preferredName: string | null;
  preferences: {
    familiarity: "low" | "medium" | "high";
    humor: "low" | "medium" | "high";
    empathy: "low" | "medium" | "high";
    directness: "low" | "medium" | "high";
    verbosity: "concise" | "balanced" | "detailed";
    lightSlang: boolean;
    mirrorLightSwearing: boolean;
  };
  companionSettings: JarvisCompanionSettings;
  memories: Array<JarvisMemoryUpdate & { updatedAt: string }>;
};

function normalizedUsername(username: string) {
  return username.trim().toLowerCase().split("@")[0];
}

function defaultJarvisMemory(username: string): JarvisMemoryState {
  const isOwnerProfile = normalizedUsername(username) === OWNER_USERNAME;
  return {
    preferredName: isOwnerProfile ? "Pot" : null,
    preferences: {
      familiarity: isOwnerProfile ? "high" : "medium",
      humor: isOwnerProfile ? "medium" : "low",
      empathy: "medium",
      directness: isOwnerProfile ? "high" : "medium",
      verbosity: isOwnerProfile ? "concise" : "balanced",
      lightSlang: isOwnerProfile,
      mirrorLightSwearing: isOwnerProfile,
    },
    companionSettings: {
      personalMemoryEnabled: true,
      inferenceMode: "balanced",
      sensitiveMemoryEnabled: false,
      proactiveFollowups: true,
      autonomyMode: "assist",
      handsFreeVoice: false,
    },
    memories: [],
  };
}

function readJarvisMemory(userId: string, username: string): JarvisMemoryState {
  const defaults = defaultJarvisMemory(username);
  try {
    const stored = JSON.parse(localStorage.getItem(`${JARVIS_MEMORY_KEY_PREFIX}:${userId}`) || "null");
    if (!stored || typeof stored !== "object") return defaults;
    return {
      ...defaults,
      ...stored,
      preferredName: typeof stored.preferredName === "string" ? stored.preferredName : defaults.preferredName,
      preferences: { ...defaults.preferences, ...(stored.preferences || {}) },
      companionSettings: { ...defaults.companionSettings, ...(stored.companionSettings || {}) },
      memories: Array.isArray(stored.memories) ? stored.memories.slice(-120) : [],
    };
  } catch {
    return defaults;
  }
}

function applyMemoryUpdates(state: JarvisMemoryState, updates: JarvisMemoryUpdate[]): JarvisMemoryState {
  let preferredName = state.preferredName;
  let companionSettings = state.companionSettings;
  let memories = [...state.memories];
  let changed = false;
  updates.filter((update) => update && update.confidence >= 0.7).forEach((update) => {
    const key = update.key.trim().slice(0, 80);
    if (!key) return;
    if (update.category === "preference" && key.startsWith("companion_")) {
      const settingMap = {
        companion_personal_memory: "personalMemoryEnabled",
        companion_inference_mode: "inferenceMode",
        companion_sensitive_memory: "sensitiveMemoryEnabled",
        companion_proactive_followups: "proactiveFollowups",
        companion_autonomy_mode: "autonomyMode",
        companion_hands_free_voice: "handsFreeVoice",
      } as const;
      const setting = settingMap[key as keyof typeof settingMap];
      if (setting) {
        const value = setting === "inferenceMode"
          ? (update.value === "explicit_only" ? "explicit_only" : "balanced")
          : setting === "autonomyMode"
            ? (update.value === "observe" ? "observe" : "assist")
            : update.value === "true";
        companionSettings = { ...companionSettings, [setting]: value };
        changed = true;
      }
      return;
    }
    if (update.category === "identity" && key.toLowerCase().replaceAll("-", "_") === "preferred_name") {
      const nextName = update.operation === "delete" ? null : update.value.trim().slice(0, 80) || null;
      if (preferredName !== nextName) { preferredName = nextName; changed = true; }
    }
    const existing = memories.find((memory) => memory.category === update.category && memory.key === key);
    const nextValue = update.value.trim().slice(0, 800);
    if (update.operation === "upsert" && existing?.value === nextValue && existing.confidence === update.confidence) return;
    if (update.operation === "delete" && !existing) return;
    memories = memories.filter((memory) => !(memory.category === update.category && memory.key === key));
    if (update.operation === "upsert") memories.push({ ...update, key, value: nextValue, source: update.source || "explicit", sensitivity: update.sensitivity || "normal", followUpAt: update.followUpAt || null, updatedAt: new Date().toISOString() });
    changed = true;
  });
  return changed ? { ...state, preferredName, companionSettings, memories: memories.slice(-120) } : state;
}

function allowedMemoryUpdates(updates: unknown, settings: JarvisCompanionSettings): JarvisMemoryUpdate[] {
  if (!Array.isArray(updates)) return [];
  const tradingCategories = new Set(["trading_rule", "risk_rule", "mistake", "terminology", "ui_preference"]);
  return updates.filter((value): value is JarvisMemoryUpdate => {
    if (!value || typeof value !== "object") return false;
    const update = value as Partial<JarvisMemoryUpdate>;
    if (!update.category || !update.key || !Number.isFinite(update.confidence) || Number(update.confidence) < 0.7) return false;
    if (update.operation === "delete") return true;
    if (update.category === "preference" && update.key.startsWith("companion_")) return true;
    if (!settings.personalMemoryEnabled && !tradingCategories.has(update.category)) return false;
    if (!settings.sensitiveMemoryEnabled && update.sensitivity === "sensitive") return false;
    if (settings.inferenceMode === "explicit_only" && update.source === "inferred") return false;
    return true;
  }).map((update) => ({
    ...update,
    source: update.source === "inferred" ? "inferred" : "explicit",
    sensitivity: update.sensitivity === "sensitive" ? "sensitive" : "normal",
    followUpAt: settings.proactiveFollowups && typeof update.followUpAt === "string" ? update.followUpAt : null,
  }));
}

function decodeLearningRecord(entry: JarvisProps["journalEntries"][number]): JarvisLearningRecord | null {
  if (!entry.content.startsWith(JARVIS_LEARNING_PREFIX)) return null;
  try {
    const metadata = JSON.parse(entry.content.slice(JARVIS_LEARNING_PREFIX.length).trim());
    if (!metadata || typeof metadata.prompt !== "string" || typeof entry.advice !== "string" || !entry.advice.trim()) return null;
    return {
      id: entry.id,
      date: entry.date,
      source: ["chart", "skipped_trade", "insight"].includes(metadata.source) ? metadata.source : "insight",
      prompt: metadata.prompt.slice(0, 1200),
      summary: entry.advice.trim().slice(0, 1600),
    };
  } catch {
    return null;
  }
}

function readOrbPosition(): OrbPosition | null {
  try {
    const saved = JSON.parse(localStorage.getItem(JARVIS_ORB_POSITION_KEY) || "null") as Partial<OrbPosition> | null;
    return saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)
      ? { x: Number(saved.x), y: Number(saved.y) }
      : null;
  } catch {
    return null;
  }
}

function clampOrbPosition(position: OrbPosition, width: number, height: number): OrbPosition {
  return {
    x: Math.min(Math.max(JARVIS_ORB_MARGIN, position.x), Math.max(JARVIS_ORB_MARGIN, window.innerWidth - width - JARVIS_ORB_MARGIN)),
    y: Math.min(Math.max(JARVIS_ORB_MARGIN, position.y), Math.max(JARVIS_ORB_MARGIN, window.innerHeight - height - JARVIS_ORB_MARGIN)),
  };
}

function readJarvisMessages(userId: string): JarvisMessage[] {
  try {
    const saved = JSON.parse(localStorage.getItem(`${JARVIS_CHAT_KEY_PREFIX}:${userId}`) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved
      .filter((message) => message && (message.role === "user" || message.role === "jarvis") && typeof message.text === "string")
      .map((message) => ({
        ...message,
        text: message.text.replace(`\n\n${LEGACY_FALLBACK_NOTICE}`, "").replace(LEGACY_FALLBACK_NOTICE, "").trim(),
      }))
      .filter((message) => message.text.length > 0)
      .slice(-30);
  } catch {
    return [];
  }
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function emptyJarvisSpend(): JarvisSpend {
  return { month: currentMonthKey(), totalUsd: 0, lastRequestUsd: 0, requests: 0, inputTokens: 0, outputTokens: 0, updatedAt: null };
}

function readJarvisSpend(userId: string): JarvisSpend {
  const empty = emptyJarvisSpend();
  try {
    const saved = JSON.parse(localStorage.getItem(`${JARVIS_SPEND_KEY_PREFIX}:${userId}`) || "null");
    if (!saved || saved.month !== empty.month) return empty;
    return {
      ...empty,
      totalUsd: Number(saved.totalUsd || 0),
      lastRequestUsd: Number(saved.lastRequestUsd || 0),
      requests: Number(saved.requests || 0),
      inputTokens: Number(saved.inputTokens || 0),
      outputTokens: Number(saved.outputTokens || 0),
      updatedAt: typeof saved.updatedAt === "string" ? saved.updatedAt : null,
    };
  } catch {
    return empty;
  }
}

function formatUsd(value: number) {
  const digits = value > 0 && value < 0.01 ? 4 : 2;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function utf8Bytes(value: unknown) {
  return new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value ?? "")).byteLength;
}

function formatDataSize(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Math.max(0, bytes);
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const digits = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  const formatted = value.toFixed(digits);
  return { value: formatted, unit: units[unitIndex], text: `${formatted} ${units[unitIndex]}` };
}

function estimateJarvisBrain(entries: JarvisProps["journalEntries"]) {
  const usage = { memory: 0, conversation: 0, charts: 0, learning: 0, other: 0 };
  let records = 0;
  entries.forEach((entry) => {
    const prefix = JARVIS_BRAIN_PREFIXES.find((candidate) => entry.content.startsWith(candidate));
    if (!prefix) return;
    records += 1;
    const bytes = utf8Bytes(entry.content) + utf8Bytes(entry.advice) + utf8Bytes(entry.image || "") + 250;
    if (prefix === JARVIS_MEMORY_SYNC_PREFIX) usage.memory += bytes;
    else if ([JARVIS_CHAT_SYNC_PREFIX, JARVIS_SESSION_SYNC_PREFIX, JARVIS_WORKSPACE_PREFIX, JARVIS_JOURNEY_PREFIX].some((candidate) => candidate === prefix)) usage.conversation += bytes;
    else if (prefix === JARVIS_CHART_PREFIX) usage.charts += bytes;
    else if ([JARVIS_LEARNING_PREFIX, JARVIS_FORECAST_REVIEW_PREFIX, JARVIS_FEEDBACK_PREFIX].some((candidate) => candidate === prefix)) usage.learning += bytes;
    else usage.other += bytes;
  });
  const totalBytes = Object.values(usage).reduce((sum, value) => sum + value, 0);
  return { ...usage, totalBytes, records, freeDatabaseReferencePercent: totalBytes / SUPABASE_FREE_DATABASE_BYTES * 100 };
}

const quickCommands = [
  { label: "Mission control", prompt: "Give me a concise Mission Control briefing. Prioritize my current goals, projects, routines, important dates, promised follow-ups, active forecasts, and open Journaly contexts. Tell me what matters now, what is waiting, and the best next action.", icon: Command },
  { label: "Life check-in", prompt: "Check in with me as my real-life companion. Use relevant personal context naturally, ask about one meaningful unfinished thread if there is one, and do not bring up trading unless I do.", icon: HeartHandshake },
  { label: "Morning briefing", prompt: "Give me my morning briefing using only Journaly: waiting forecasts, current plans, recent execution, risk rules, and what deserves my attention. Do not claim live market conditions.", icon: Sunrise },
  { label: "Forecast briefing", prompt: "Brief me on every waiting forecast: the documented thesis, what is complete, what still needs confirmation, and which ideas need a decision. Use Journaly only, not live market assumptions.", icon: Radio },
  { label: "Evening debrief", prompt: "Run my evening debrief from Journaly. Review today's forecasts, trades, execution decisions, lessons, and the one thing I should carry into the next session.", icon: Moon },
  { label: "Analyze latest trade", prompt: "Analyze my latest trade", icon: Crosshair },
  { label: "Recent mistakes", prompt: "Show me my recent mistakes", icon: Eye },
  { label: "Internal performance", prompt: "How are my Internals doing?", icon: BarChart3 },
  { label: "Forecast patterns", prompt: "What are you learning from my forecast history?", icon: BarChart3 },
  { label: "Risk check", prompt: "What is my risk right now?", icon: ShieldCheck },
  { label: "Jarvis calibration", prompt: "Run your weekly self-reflection. Based on my feedback and our recent conversations, tell me briefly what you understand better now, what you may still be getting wrong, and how you will adjust without changing my strategy rules.", icon: Sparkles },
] as const;

const pairAliases: Record<string, string> = {
  AJ: "AUDJPY",
  AU: "AUDUSD",
  EJ: "EURJPY",
  EU: "EURUSD",
  EA: "EURAUD",
  GU: "GBPUSD",
  NJ: "NZDJPY",
};

function formatR(value: number) {
  const normalized = Math.abs(value) < 0.005 ? 0 : value;
  return `${normalized > 0 ? "+" : ""}${normalized.toFixed(2)}R`;
}

function getPairFromPrompt(prompt: string, pairs: string[]) {
  const words: string[] = prompt.toUpperCase().match(/[A-Z]+/g) ?? [];
  const alias = words.map((word) => pairAliases[word]).find(Boolean);
  if (alias) return alias;
  return pairs.find((pair) => words.includes(pair));
}

function summarizeTrades(source: JarvisTrade[]) {
  const wins = source.filter((trade) => trade.pnl > 0).length;
  const totalR = source.reduce((sum, trade) => sum + trade.pnl, 0);
  return {
    wins,
    totalR,
    winRate: source.length ? Math.round((wins / source.length) * 100) : 0,
    expectancy: source.length ? totalR / source.length : 0,
  };
}

function latestFirst<T extends { date: string; time?: string }>(source: T[]) {
  return [...source].sort((a, b) => `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`));
}

function readJarvisActiveContext(userId: string): JarvisActiveContext | null {
  try {
    const saved = JSON.parse(localStorage.getItem(`${JARVIS_ACTIVE_CONTEXT_KEY_PREFIX}:${userId}`) || "null") as JarvisActiveContext | null;
    if (!saved || typeof saved.updatedAt !== "string") return null;
    const age = Date.now() - new Date(saved.updatedAt).getTime();
    if (!Number.isFinite(age) || age > 7 * 24 * 60 * 60 * 1000) return null;
    return saved;
  } catch {
    return null;
  }
}

function syncedMemoryUpdates(entries: JarvisProps["journalEntries"]): JarvisMemoryUpdate[] {
  return entries.flatMap((entry) => {
    if (!entry.content.startsWith(JARVIS_MEMORY_SYNC_PREFIX)) return [];
    try {
      const metadata = JSON.parse(entry.content.slice(JARVIS_MEMORY_SYNC_PREFIX.length).trim());
      const syncedAt = String(metadata?.syncedAt || entry.updatedAt || entry.createdAt || entry.date);
      return Array.isArray(metadata?.updates) ? [{ updates: metadata.updates as JarvisMemoryUpdate[], syncedAt }] : [];
    } catch {
      return [];
    }
  }).sort((a, b) => a.syncedAt.localeCompare(b.syncedAt)).flatMap((record) => record.updates);
}

function syncedActiveContext(entries: JarvisProps["journalEntries"]): { state: JarvisActiveContext | null; syncedAt: string } | undefined {
  const records = entries.flatMap((entry) => {
    if (!entry.content.startsWith(JARVIS_SESSION_SYNC_PREFIX)) return [];
    try {
      const metadata = JSON.parse(entry.content.slice(JARVIS_SESSION_SYNC_PREFIX.length).trim());
      return [{ state: metadata?.state as JarvisActiveContext | null, syncedAt: String(metadata?.syncedAt || entry.updatedAt || entry.createdAt || entry.date) }];
    } catch {
      return [];
    }
  }).sort((a, b) => b.syncedAt.localeCompare(a.syncedAt));
  return records[0];
}

function decodeLatestInternal<T>(entries: JarvisProps["journalEntries"], prefix: string): { value: T; entryId: string; syncedAt: string } | null {
  const records = entries.flatMap((entry) => {
    if (!entry.content.startsWith(prefix)) return [];
    try {
      const metadata = JSON.parse(entry.content.slice(prefix.length).trim());
      return [{ value: metadata, entryId: entry.id, syncedAt: String(metadata?.syncedAt || entry.updatedAt || entry.createdAt || entry.date) }];
    } catch {
      return [];
    }
  }).sort((a, b) => b.syncedAt.localeCompare(a.syncedAt));
  return (records[0] as { value: T; entryId: string; syncedAt: string } | undefined) || null;
}

function syncedMessages(entries: JarvisProps["journalEntries"]): { messages: JarvisMessage[]; entryId: string; syncedAt: string } | null {
  const record = decodeLatestInternal<{ messages?: JarvisMessage[]; syncedAt?: string }>(entries, JARVIS_CHAT_SYNC_PREFIX);
  if (!record || !Array.isArray(record.value.messages)) return null;
  return {
    entryId: record.entryId,
    syncedAt: record.syncedAt,
    messages: record.value.messages.filter((message) => message && (message.role === "user" || message.role === "jarvis") && typeof message.text === "string").slice(-40),
  };
}

function syncedProactiveMessages(entries: JarvisProps["journalEntries"]): JarvisMessage[] {
  return entries.flatMap((entry) => {
    if (!entry.content.startsWith(JARVIS_PROACTIVE_PREFIX)) return [];
    try {
      const metadata = JSON.parse(entry.content.slice(JARVIS_PROACTIVE_PREFIX.length).trim());
      if (typeof metadata?.text !== "string" || !metadata.text.trim()) return [];
      return [{
        id: `proactive:${String(metadata.id || entry.id)}`,
        role: "jarvis" as const,
        title: typeof metadata.title === "string" ? metadata.title : "Jarvis check-in",
        text: metadata.text.trim(),
        createdAt: String(metadata.createdAt || entry.updatedAt || entry.createdAt || entry.date),
      }];
    } catch {
      return [];
    }
  }).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

function emptyWorkspace(context: JarvisActiveContext | null): JarvisWorkspace {
  const now = new Date().toISOString();
  if (!context) return { focusId: null, contexts: [], updatedAt: now };
  const id = context.tradeId || context.forecastId || context.backtestId || `${context.pair || "general"}:${context.dataSource || "conversation"}`;
  return { focusId: id, contexts: [{ ...context, id, label: `${context.pair || "General"}${context.setup ? ` · ${context.setup}` : ""}` }], updatedAt: now };
}

function upsertWorkspaceContext(workspace: JarvisWorkspace, context: JarvisActiveContext | null): JarvisWorkspace {
  if (!context) return { ...workspace, focusId: null, updatedAt: new Date().toISOString() };
  const id = context.tradeId || context.forecastId || context.backtestId || `${context.pair || "general"}:${context.dataSource || "conversation"}`;
  const item = { ...context, id, label: `${context.pair || "General"}${context.setup ? ` · ${context.setup}` : ""}` };
  return { focusId: id, contexts: [item, ...workspace.contexts.filter((candidate) => candidate.id !== id)].slice(0, 8), updatedAt: new Date().toISOString() };
}

function readVoiceReplies(userId: string) {
  return localStorage.getItem(`${JARVIS_VOICE_REPLIES_KEY_PREFIX}:${userId}`) === "true";
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not prepare that recording."));
    reader.readAsDataURL(blob);
  });
}

function preferredVoiceMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]
    .find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || "";
}

function selectRequestedChart<T extends { id: string; date: string; pair: string; setup: string; screenshot: string }>(records: T[], prompt: string, requestedPair?: string) {
  const requestedDate = prompt.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  const requestedSetup = [...JARVIS_TRADE_SETUPS].find((setup) => prompt.toLowerCase().includes(setup.toLowerCase()));
  const exactId = records.find((record) => prompt.includes(record.id) && record.screenshot);
  if (exactId) return exactId;
  const matching = records.filter((record) => record.screenshot && (!requestedPair || record.pair === requestedPair) && (!requestedDate || record.date === requestedDate) && (!requestedSetup || record.setup === requestedSetup));
  return matching[0];
}

function normalizeTradeAction(value: unknown, previous: JarvisTradeAction | null): JarvisTradeAction | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<JarvisTradeAction>;
  const pair = typeof candidate.pair === "string" && JARVIS_TRADE_PAIRS.has(candidate.pair) ? candidate.pair : previous?.pair || null;
  const setup = typeof candidate.setup === "string" && JARVIS_TRADE_SETUPS.has(candidate.setup) ? candidate.setup : previous?.setup || null;
  const direction = candidate.direction === "Long" || candidate.direction === "Short" ? candidate.direction : previous?.direction || null;
  const missingFields = ([!pair ? "pair" : null, !setup ? "setup" : null, !direction ? "direction" : null].filter(Boolean)) as JarvisTradeAction["missingFields"];
  const numberOrPrevious = (next: unknown, prior: number | null | undefined) => Number.isFinite(next) ? Number(next) : prior ?? null;
  return {
    intent: missingFields.length ? "draft" : "ready",
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(candidate.date || "")) ? String(candidate.date) : previous?.date || null,
    time: /^\d{2}:\d{2}$/.test(String(candidate.time || "")) ? String(candidate.time) : previous?.time || null,
    pair,
    setup,
    direction,
    stopLossPips: numberOrPrevious(candidate.stopLossPips, previous?.stopLossPips),
    mae: numberOrPrevious(candidate.mae, previous?.mae),
    pnl: numberOrPrevious(candidate.pnl, previous?.pnl),
    result: candidate.result === "Win" || candidate.result === "Loss" || candidate.result === "Breakeven" ? candidate.result : previous?.result || null,
    notes: typeof candidate.notes === "string" ? candidate.notes.slice(0, 3000) : previous?.notes || null,
    missingFields,
  };
}

function normalizeForecastAction(value: unknown, previous: JarvisForecastAction | null): JarvisForecastAction | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<JarvisForecastAction>;
  const intent = candidate.intent === "update_status" ? "update_status" : "create";
  const pair = typeof candidate.pair === "string" && JARVIS_TRADE_PAIRS.has(candidate.pair) ? candidate.pair : previous?.pair || null;
  const setup = typeof candidate.setup === "string" && JARVIS_TRADE_SETUPS.has(candidate.setup) ? candidate.setup : previous?.setup || null;
  const direction = candidate.direction === "Long" || candidate.direction === "Short" ? candidate.direction : previous?.direction || null;
  const status = ["Waiting", "Taken", "Invalidated", "Skipped"].includes(String(candidate.status)) ? candidate.status as JarvisForecastAction["status"] : previous?.status || (intent === "create" ? "Waiting" : null);
  const forecastId = typeof candidate.forecastId === "string" && candidate.forecastId.trim() ? candidate.forecastId.trim() : previous?.forecastId || null;
  const missingFields = (intent === "update_status"
    ? [!forecastId ? "forecastId" : null]
    : [!pair ? "pair" : null, !setup ? "setup" : null, !direction ? "direction" : null]
  ).filter(Boolean) as JarvisForecastAction["missingFields"];
  return {
    intent,
    ready: missingFields.length === 0 && Boolean(status),
    forecastId,
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(candidate.date || "")) ? String(candidate.date) : previous?.date || null,
    time: /^\d{2}:\d{2}$/.test(String(candidate.time || "")) ? String(candidate.time) : previous?.time || null,
    pair,
    setup,
    direction,
    status,
    notes: typeof candidate.notes === "string" ? candidate.notes.slice(0, 3000) : previous?.notes || null,
    missingFields,
  };
}

function normalizePositionSizingAction(value: unknown): JarvisPositionSizingAction | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<JarvisPositionSizingAction>;
  const numberOrNull = (input: unknown) => Number.isFinite(input) && Number(input) > 0 ? Number(input) : null;
  const resultCandidate = candidate.result && typeof candidate.result === "object" ? candidate.result : null;
  const result = resultCandidate && (resultCandidate.direction === "Long" || resultCandidate.direction === "Short")
    ? {
        direction: resultCandidate.direction,
        stopPips: Number(resultCandidate.stopPips || 0),
        riskAmount: Number(resultCandidate.riskAmount || 0),
        lots: Number(resultCandidate.lots || 0),
        miniLots: Number(resultCandidate.miniLots || 0),
        microLots: Number(resultCandidate.microLots || 0),
        units: Number(resultCandidate.units || 0),
        rewardPips: numberOrNull(resultCandidate.rewardPips),
        rewardRisk: numberOrNull(resultCandidate.rewardRisk),
        projectedProfit: numberOrNull(resultCandidate.projectedProfit),
        takeProfitValid: typeof resultCandidate.takeProfitValid === "boolean" ? resultCandidate.takeProfitValid : null,
      }
    : null;
  return {
    applyToCalculator: candidate.applyToCalculator === true,
    ready: candidate.ready === true && Boolean(result),
    pair: typeof candidate.pair === "string" && JARVIS_TRADE_PAIRS.has(candidate.pair) ? candidate.pair : null,
    accountBalance: numberOrNull(candidate.accountBalance),
    riskPercent: numberOrNull(candidate.riskPercent),
    entryPrice: numberOrNull(candidate.entryPrice),
    stopLossPrice: numberOrNull(candidate.stopLossPrice),
    takeProfitPrice: numberOrNull(candidate.takeProfitPrice),
    quoteToUsdRate: numberOrNull(candidate.quoteToUsdRate),
    missingFields: Array.isArray(candidate.missingFields) ? candidate.missingFields.filter((field): field is JarvisPositionSizingAction["missingFields"][number] => ["pair", "accountBalance", "riskPercent", "entryPrice", "stopLossPrice", "quoteToUsdRate"].includes(String(field))) : [],
    result,
  };
}

function normalizePositionProfileAction(value: unknown): JarvisPositionProfileAction | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<JarvisPositionProfileAction>;
  if (!candidate.operation || !["add", "update", "delete", "set_mode"].includes(candidate.operation)) return null;
  const positiveOrNull = (input: unknown) => Number.isFinite(input) && Number(input) > 0 ? Number(input) : null;
  return {
    operation: candidate.operation,
    ready: candidate.ready === true,
    rowId: typeof candidate.rowId === "string" && candidate.rowId.trim() ? candidate.rowId.trim() : null,
    profileMode: candidate.profileMode === "main" || candidate.profileMode === "half" ? candidate.profileMode : null,
    balance: positiveOrNull(candidate.balance),
    type: typeof candidate.type === "string" && candidate.type.trim() ? candidate.type.trim().slice(0, 100) : null,
    platform: typeof candidate.platform === "string" && candidate.platform.trim() ? candidate.platform.trim().slice(0, 100) : null,
    riskPercent: positiveOrNull(candidate.riskPercent),
    missingFields: Array.isArray(candidate.missingFields) ? candidate.missingFields.filter((field): field is JarvisPositionProfileAction["missingFields"][number] => ["profile", "balance", "riskPercent", "change", "profileMode"].includes(String(field))) : [],
    candidateIds: Array.isArray(candidate.candidateIds) ? candidate.candidateIds.filter((id): id is string => typeof id === "string").slice(0, 20) : [],
  };
}

function persistedForecastStatus(status: NonNullable<JarvisForecastAction["status"]>) {
  if (status === "Invalidated") return "Cancelled";
  if (status === "Skipped") return "Missed";
  return status;
}

function buildJarvisResponse(prompt: string, trades: JarvisTrade[], forecasts: JarvisForecast[]): Omit<JarvisMessage, "id" | "role"> | null {
  const lower = prompt.toLowerCase();
  const orderedTrades = latestFirst(trades);
  const activeForecasts = latestFirst(forecasts.filter((item) => item.status === "Waiting"));
  const knownPairs = Array.from(new Set([...trades.map((trade) => trade.pair), ...forecasts.map((item) => item.pair)]));
  const requestedPair = getPairFromPrompt(prompt, knownPairs);

  if (requestedPair) {
    const pairTrades = orderedTrades.filter((trade) => trade.pair === requestedPair);
    const pairForecasts = activeForecasts.filter((item) => item.pair === requestedPair);
    const stats = summarizeTrades(pairTrades);
    const latestForecast = pairForecasts[0];
    return {
      title: `${requestedPair} context scan`,
      text: latestForecast
        ? `${latestForecast.direction} ${latestForecast.setup} is on watch. ${latestForecast.notes || latestForecast.entryPlan || latestForecast.reasonToTake || "The forecast entry is not documented yet."} This is a journal-state read, not a live-market signal.`
        : `There is no active ${requestedPair} forecast in Journaly. Historical context covers ${pairTrades.length} trade${pairTrades.length === 1 ? "" : "s"}; add a forecast before the setup develops so the read is protected from hindsight.`,
      metrics: [
        { label: "Sample", value: String(pairTrades.length) },
        { label: "Win rate", value: `${stats.winRate}%`, tone: stats.winRate >= 50 ? "good" : "warn" },
        { label: "Expectancy", value: formatR(stats.expectancy), tone: stats.expectancy >= 0 ? "good" : "bad" },
      ],
    };
  }

  if (lower.includes("latest") || lower.includes("analyze this trade") || lower.includes("analyze my trade")) {
    const trade = orderedTrades[0];
    if (!trade) return { title: "No trade to review", text: "Log a trade first and I’ll separate execution quality from the outcome." };
    const classification = trade.quality
      ? trade.quality === "Good" && trade.pnl < 0
        ? "GOOD LOSS"
        : trade.quality === "Bad" && trade.pnl > 0
          ? "BAD WIN"
          : `${trade.quality.toUpperCase()} TRADE`
      : "UNRATED";
    return {
      title: `${trade.pair} · ${classification}`,
      text: `${trade.setup}, ${trade.direction.toLowerCase()}, finished ${formatR(trade.pnl)}. ${trade.notes || "There are no review notes yet."} ${trade.quality ? "The quality label is based on your post-trade review—not the P/L." : "Rate the trade Good, Mid, or Bad to complete the execution review."}`,
      metrics: [
        { label: "Outcome", value: trade.result, tone: trade.pnl > 0 ? "good" : trade.pnl < 0 ? "bad" : "warn" },
        { label: "Execution", value: trade.quality || "Unrated", tone: trade.quality === "Good" ? "good" : trade.quality === "Bad" ? "bad" : "warn" },
        { label: "Result", value: formatR(trade.pnl), tone: trade.pnl >= 0 ? "good" : "bad" },
      ],
    };
  }

  if (lower.includes("mistake") || lower.includes("why was this bad") || lower.includes("bad trade")) {
    const reviewSet = orderedTrades.slice(0, 20);
    const weak = reviewSet.filter((trade) => trade.quality === "Bad" || trade.quality === "Mid");
    if (!weak.length) return { title: "No quality leaks detected", text: "Your last 20 trades contain no Mid or Bad reviews. Keep rating execution consistently so this read stays reliable." };
    const setupCounts = weak.reduce<Record<string, number>>((counts, trade) => ({ ...counts, [trade.setup]: (counts[trade.setup] || 0) + 1 }), {});
    const topSetup = Object.entries(setupCounts).sort((a, b) => b[1] - a[1])[0];
    const latestWeak = weak[0];
    return {
      title: "Execution leak detected",
      text: `${topSetup[0]} appears most often among your recent Mid/Bad reviews (${topSetup[1]}). The latest was ${latestWeak.pair}: ${latestWeak.notes || "no mistake note was recorded"}. Review PPA, momentum shift, line-break quality, and whether the trigger candle was meaningfully unique before changing any strategy rule.`,
      metrics: [
        { label: "Reviewed", value: String(reviewSet.length) },
        { label: "Mid / Bad", value: String(weak.length), tone: "warn" },
        { label: "Main cluster", value: topSetup[0] },
      ],
    };
  }

  if (lower.includes("internal") || lower.includes("setup") && lower.includes("doing")) {
    const internalTrades = orderedTrades.filter((trade) => trade.setup.toLowerCase().includes("internal"));
    const stats = summarizeTrades(internalTrades);
    const rated = internalTrades.filter((trade) => trade.quality);
    const good = rated.filter((trade) => trade.quality === "Good").length;
    return {
      title: "Internal reversal edge",
      text: internalTrades.length
        ? `Your Internal sample is ${internalTrades.length} trades with ${formatR(stats.expectancy)} expectancy. ${rated.length ? `${good} of ${rated.length} reviewed executions are Good.` : "None have an execution-quality review yet."} Keep outcome and decision quality separate when evaluating the setup.`
        : "No Internal reversal trades are available yet. Once logged, I’ll compare win rate, expectancy, and execution quality without mixing in other setups.",
      metrics: [
        { label: "Sample", value: String(internalTrades.length) },
        { label: "Win rate", value: `${stats.winRate}%`, tone: stats.winRate >= 50 ? "good" : "warn" },
        { label: "Expectancy", value: formatR(stats.expectancy), tone: stats.expectancy >= 0 ? "good" : "bad" },
      ],
    };
  }

  if (lower.includes("watch") || lower.includes("forecast")) {
    return {
      title: activeForecasts.length ? `${activeForecasts.length} active forecast${activeForecasts.length === 1 ? "" : "s"}` : "Watchlist clear",
      text: activeForecasts.length
        ? activeForecasts.slice(0, 4).map((item) => `${item.pair}: ${item.setup} ${item.direction.toLowerCase()} — ${item.notes || item.entryPlan || item.reasonToTake || "waiting for confirmation"}`).join("\n")
        : "There are no forecasts marked Waiting. Log the market read before the move so Journaly can measure forecast quality without hindsight.",
      metrics: activeForecasts.slice(0, 3).map((item) => ({ label: item.pair, value: item.setup })),
    };
  }

  if (lower.includes("risk") || lower.includes("exposure")) {
    const currencies = activeForecasts.flatMap((item) => [item.pair.slice(0, 3), item.pair.slice(3)]);
    const concentration = Object.entries(currencies.reduce<Record<string, number>>((counts, currency) => ({ ...counts, [currency]: (counts[currency] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0];
    return {
      title: "Forecast concentration check",
      text: activeForecasts.length
        ? `${concentration?.[1] > 1 ? `${concentration[0]} appears across ${concentration[1]} ideas, so check correlation before arming them together.` : "No obvious currency concentration is present in the current watchlist."} Forecasts no longer track planned risk; open-position risk is not connected.`
        : "There are no waiting forecasts to compare. Forecasts no longer track planned risk, and broker exposure is not connected.",
      metrics: [
        { label: "Forecasts", value: String(activeForecasts.length) },
        { label: "Concentration", value: concentration?.[1] > 1 ? `${concentration[0]} × ${concentration[1]}` : "Clear", tone: concentration?.[1] > 1 ? "warn" : "good" },
        { label: "Live execution", value: "Locked", tone: "good" },
      ],
    };
  }

  return null;
}

export default function Jarvis({ userId, username, displayName, trades, backtests, forecasts, session, journalEntries, positionSizing, onTradeCreated, onForecastChanged, onPositionSizingApply, onPositionProfileApply }: JarvisProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAmbient, setIsAmbient] = useState(true);
  const [orbPosition, setOrbPosition] = useState<OrbPosition | null>(readOrbPosition);
  const [isDraggingOrb, setIsDraggingOrb] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<JarvisMessage[]>(() => readJarvisMessages(userId));
  const [memory, setMemory] = useState<JarvisMemoryState>(() => readJarvisMemory(userId, username));
  const [activeContext, setActiveContext] = useState<JarvisActiveContext | null>(() => readJarvisActiveContext(userId));
  const [workspace, setWorkspace] = useState<JarvisWorkspace>(() => emptyWorkspace(readJarvisActiveContext(userId)));
  const [showMemoryCenter, setShowMemoryCenter] = useState(false);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, JarvisFeedbackReason>>({});
  const [feedbackTarget, setFeedbackTarget] = useState<string | null>(null);
  const [lastChartImage, setLastChartImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [voiceReplies, setVoiceReplies] = useState(() => readVoiceReplies(userId));
  const [isListening, setIsListening] = useState(false);
  const [voicePhase, setVoicePhase] = useState<"idle" | "listening" | "transcribing">("idle");
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [aiHealth, setAiHealth] = useState<JarvisHealth | null>(null);
  const [spend, setSpend] = useState<JarvisSpend>(() => readJarvisSpend(userId));
  const [attachedImage, setAttachedImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [sessionLearningRecords, setSessionLearningRecords] = useState<JarvisLearningRecord[]>([]);
  const [learningSyncState, setLearningSyncState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [tradeDraft, setTradeDraft] = useState<JarvisTradeAction | null>(null);
  const [forecastDraft, setForecastDraft] = useState<JarvisForecastAction | null>(null);
  const [positionSizingDraft, setPositionSizingDraft] = useState<JarvisPositionSizingAction | null>(null);
  const [positionProfileDraft, setPositionProfileDraft] = useState<JarvisPositionProfileAction | null>(null);
  const [isSavingTrade, setIsSavingTrade] = useState(false);
  const [isSavingForecast, setIsSavingForecast] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [unreadProactiveCount, setUnreadProactiveCount] = useState(0);
  const [inAppNotification, setInAppNotification] = useState<JarvisMessage | null>(null);
  const [monitorClock, setMonitorClock] = useState(() => Date.now());
  const [recentChanges, setRecentChanges] = useState<JarvisMonitorItem[]>([]);
  const [observationReady, setObservationReady] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const compactInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const compactFeedRef = useRef<HTMLDivElement>(null);
  const wasChatOpen = useRef(false);
  const tradeSaveLock = useRef(false);
  const forecastSaveLock = useRef(false);
  const sessionSyncEntryIdRef = useRef<string | null>(journalEntries.find((entry) => entry.content.startsWith(JARVIS_SESSION_SYNC_PREFIX))?.id || null);
  const chatSyncEntryIdRef = useRef<string | null>(journalEntries.find((entry) => entry.content.startsWith(JARVIS_CHAT_SYNC_PREFIX))?.id || null);
  const workspaceSyncEntryIdRef = useRef<string | null>(journalEntries.find((entry) => entry.content.startsWith(JARVIS_WORKSPACE_PREFIX))?.id || null);
  const chatSyncTimerRef = useRef<number | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<JarvisSpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStopTimerRef = useRef<number | null>(null);
  const observationTimerRef = useRef<number | null>(null);
  const proactiveCheckinRef = useRef(new Set<string>());
  const isOpenRef = useRef(isOpen);
  const orbDrag = useRef({ pointerId: -1, offsetX: 0, offsetY: 0, startX: 0, startY: 0, moved: false });

  const reviewedTrades = trades.filter((trade) => trade.quality);
  const goodTrades = reviewedTrades.filter((trade) => trade.quality === "Good").length;
  const activeForecasts = forecasts.filter((item) => item.status === "Waiting");
  const latestTrade = latestFirst(trades)[0];
  const qualityRate = reviewedTrades.length ? Math.round((goodTrades / reviewedTrades.length) * 100) : 0;
  const preferredName = memory.preferredName || displayName || "trader";
  const missionMemories = useMemo(() => {
    const missionCategories = new Set(["goal", "project", "routine", "important_date", "life_event", "wellbeing"]);
    return memory.memories
      .filter((item) => item.operation !== "delete" && missionCategories.has(item.category) && (item.sensitivity !== "sensitive" || memory.companionSettings.sensitiveMemoryEnabled))
      .sort((a, b) => {
        const aDue = a.followUpAt ? new Date(a.followUpAt).getTime() : Number.POSITIVE_INFINITY;
        const bDue = b.followUpAt ? new Date(b.followUpAt).getTime() : Number.POSITIVE_INFINITY;
        return aDue - bDue || b.updatedAt.localeCompare(a.updatedAt);
      })
      .slice(0, 8);
  }, [memory.companionSettings.sensitiveMemoryEnabled, memory.memories]);
  const observationSnapshot = useMemo<JarvisObservationSnapshot>(() => ({
    savedAt: new Date().toISOString(),
    trades: Object.fromEntries(trades.map((trade) => [trade.id, [trade.updatedAt, trade.result, trade.quality || "", trade.notes, trade.finalizedAt || "", trade.maeRecorded, trade.mae, trade.maePips ?? "", Boolean(trade.screenshot)].join("|")])),
    forecasts: Object.fromEntries(forecasts.map((forecast) => [forecast.id, [forecast.updatedAt, forecast.status, forecast.outcome, forecast.resultR, forecast.notes].join("|")])),
  }), [forecasts, trades]);
  const monitorItems = useMemo<JarvisMonitorItem[]>(() => {
    const items: JarvisMonitorItem[] = [...recentChanges];
    const dayMs = 86400000;
    const recordTime = (date: string, time = "00:00") => new Date(`${date}T${time || "00:00"}`).getTime();

    missionMemories.forEach((item) => {
      if (!item.followUpAt || new Date(item.followUpAt).getTime() > monitorClock) return;
      items.push({
        id: `follow-up:${item.category}:${item.key}:${item.followUpAt}`,
        priority: "high",
        category: "follow_up",
        title: item.key.replaceAll("_", " "),
        detail: `Follow-up due · ${item.value}`,
        prompt: `Check in with me naturally about ${item.key.replaceAll("_", " ")}. You remember: ${item.value}.`,
      });
    });

    forecasts.forEach((forecast) => {
      const timestamp = recordTime(forecast.date, forecast.time);
      if (forecast.status === "Waiting") {
        const stale = Number.isFinite(timestamp) && monitorClock - timestamp > dayMs;
        items.push({
          id: `forecast:${forecast.id}:${stale ? "stale" : "waiting"}`,
          priority: stale ? "medium" : "low",
          category: "forecast",
          title: `${forecast.pair} · ${forecast.setup}`,
          detail: stale ? "Waiting over 24 hours — worth a fresh check" : "Waiting for confirmation",
          prompt: `Review what you are monitoring for my ${forecast.pair} ${forecast.setup} forecast. Use its saved thesis and status, and do not assume live market conditions.`,
        });
      }
      if (forecast.status === "Taken" && !trades.some((trade) => trade.pair === forecast.pair && trade.setup === forecast.setup && trade.direction === forecast.direction && trade.date >= forecast.date)) {
        items.push({
          id: `forecast:${forecast.id}:unlinked`,
          priority: "high",
          category: "forecast",
          title: `${forecast.pair} taken forecast`,
          detail: "No matching saved trade yet",
          prompt: `Help me reconcile my Taken ${forecast.pair} ${forecast.setup} forecast with my trade log. Tell me exactly what appears to be missing.`,
        });
      }
    });

    trades.forEach((trade) => {
      const timestamp = recordTime(trade.date, trade.time);
      const age = Number.isFinite(timestamp) ? monitorClock - timestamp : 0;
      const missing = [
        !trade.finalizedAt ? "final review" : "",
        !trade.quality ? "execution rating" : "",
        !trade.notes.trim() ? "notes" : "",
        !trade.screenshot ? "chart" : "",
        !trade.maeRecorded && trade.maePips === null ? "MAE" : "",
        !trade.result ? "result" : "",
      ].filter(Boolean);
      if (!missing.length) return;
      const forgotten = age > dayMs;
      items.push({
        id: `trade:${trade.id}:incomplete:${missing.join("-")}`,
        priority: forgotten || trade.finalizedAt ? "medium" : "low",
        category: "trade_review",
        title: `${trade.pair} incomplete trade`,
        detail: `${forgotten ? "Forgotten trade" : "Trade still in progress"} · missing ${missing.join(", ")}`,
        prompt: `Help me complete my ${trade.date} ${trade.pair} ${trade.setup} trade. It is missing ${missing.join(", ")}. Use the exact saved record and guide me to the next useful action.`,
      });
    });

    if (activeContext?.pair && !items.some((item) => item.title.startsWith(activeContext.pair || ""))) {
      items.push({
        id: `context:${activeContext.pair}:${activeContext.setup || "general"}`,
        priority: "low",
        category: "context",
        title: `${activeContext.pair}${activeContext.setup ? ` · ${activeContext.setup}` : ""}`,
        detail: "Current conversation context",
        prompt: `Tell me briefly what you are currently tracking for ${activeContext.pair}${activeContext.setup ? ` ${activeContext.setup}` : ""}, without assuming live market conditions.`,
      });
    }

    const priority = { high: 0, medium: 1, low: 2 } as const;
    return items.sort((a, b) => priority[a.priority] - priority[b.priority] || a.title.localeCompare(b.title)).slice(0, 12);
  }, [activeContext?.pair, activeContext?.setup, forecasts, missionMemories, monitorClock, recentChanges, trades]);
  const recentFeedback = useMemo(() => journalEntries.filter((entry) => entry.content.startsWith(JARVIS_FEEDBACK_PREFIX) && Date.now() - new Date(entry.createdAt || entry.updatedAt || entry.date).getTime() <= 7 * 86400000), [journalEntries]);
  const learningRecords = useMemo(() => {
    const records = [...journalEntries.map(decodeLearningRecord).filter((record): record is JarvisLearningRecord => Boolean(record)), ...sessionLearningRecords];
    return Array.from(new Map(records.map((record) => [record.id, record])).values())
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 80);
  }, [journalEntries, sessionLearningRecords]);
  const brainUsage = useMemo(() => estimateJarvisBrain(journalEntries), [journalEntries]);
  const brainSize = formatDataSize(brainUsage.totalBytes);
  const brainFreeReference = brainUsage.freeDatabaseReferencePercent < 0.01
    ? "<0.01%"
    : `${brainUsage.freeDatabaseReferencePercent.toFixed(brainUsage.freeDatabaseReferencePercent < 1 ? 2 : 1)}%`;
  const brainBreakdown = `Memory ${formatDataSize(brainUsage.memory).text} · Conversations ${formatDataSize(brainUsage.conversation).text} · Charts ${formatDataSize(brainUsage.charts).text} · Learning ${formatDataSize(brainUsage.learning).text}`;
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isAmbient) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => inputRef.current?.focus(), 350);
    const close = (event: KeyboardEvent) => event.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [isAmbient, isOpen]);

  useEffect(() => {
    if (!isOpen || !isAmbient) return;
    const focusTimer = window.setTimeout(() => compactInputRef.current?.focus(), 180);
    const close = (event: KeyboardEvent) => event.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", close);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", close);
    };
  }, [isAmbient, isOpen]);
  const journey = useMemo<JarvisJourneyEvent[]>(() => {
    const pair = activeContext?.pair || null;
    const forecastEvents = forecasts.filter((item) => !pair || item.pair === pair).slice(0, 8).map((item) => ({ id: `forecast:${item.id}`, at: `${item.date}T${item.time || "00:00"}`, kind: "forecast" as const, title: `${item.pair} forecast · ${item.status}`, detail: `${item.setup} ${item.direction}`, pair: item.pair }));
    const tradeEvents = trades.filter((item) => !pair || item.pair === pair).slice(0, 8).map((item) => ({ id: `trade:${item.id}`, at: `${item.date}T${item.time || "00:00"}`, kind: (item.result ? "result" : "trade") as "result" | "trade", title: `${item.pair} trade · ${item.result}`, detail: `${item.setup} · ${formatR(item.pnl)}`, pair: item.pair }));
    const chartEvents = journalEntries.flatMap((entry) => {
      if (!entry.content.startsWith(JARVIS_CHART_PREFIX)) return [];
      try {
        const value = JSON.parse(entry.content.slice(JARVIS_CHART_PREFIX.length).trim());
        if (pair && value.pair && value.pair !== pair) return [];
        return [{ id: `chart:${entry.id}`, at: String(value.capturedAt || entry.createdAt || entry.date), kind: "chart" as const, title: `${value.pair || "Chart"} checkpoint`, detail: String(value.summary || value.prompt || "Chart reviewed with Jarvis").slice(0, 120), pair: value.pair || null }];
      } catch { return []; }
    });
    const lessonEvents = learningRecords.filter((record) => !pair || record.prompt.toUpperCase().includes(pair)).slice(0, 5).map((record) => ({ id: `lesson:${record.id}`, at: `${record.date}T23:59`, kind: "lesson" as const, title: "Jarvis lesson retained", detail: record.summary.slice(0, 120), pair }));
    return [...forecastEvents, ...tradeEvents, ...chartEvents, ...lessonEvents].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
  }, [activeContext?.pair, forecasts, journalEntries, learningRecords, trades]);
  const persistedLastChart = useMemo(() => journalEntries.flatMap((entry) => {
    if (!entry.image || !entry.content.startsWith(JARVIS_CHART_PREFIX)) return [];
    try {
      const value = JSON.parse(entry.content.slice(JARVIS_CHART_PREFIX.length).trim());
      if (activeContext?.pair && value.pair && value.pair !== activeContext.pair) return [];
      return [{ dataUrl: entry.image, name: String(value.name || "Previous Jarvis chart"), capturedAt: String(value.capturedAt || entry.updatedAt || entry.createdAt || entry.date) }];
    } catch { return []; }
  }).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0] || null, [activeContext?.pair, journalEntries]);

  useEffect(() => {
    function openWithPrompt(event: Event) {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      setIsOpen(true);
      setIsAmbient(true);
      if (detail?.prompt) setPrompt(detail.prompt.slice(0, 6000));
    }
    window.addEventListener("journaly:ask-jarvis", openWithPrompt);
    return () => window.removeEventListener("journaly:ask-jarvis", openWithPrompt);
  }, []);

  useEffect(() => {
    if (!isOpen || !supabase) return;
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/jarvis/health?probe=1", { headers: { authorization: `Bearer ${token}` } }).catch(() => null);
      if (!response?.ok) return;
      const health = await response.json().catch(() => null);
      if (!cancelled && health) setAiHealth(health);
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !supabase) return;
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token || cancelled) return;
      let seen: string[] = [];
      try {
        const stored = JSON.parse(localStorage.getItem(`${JARVIS_REPORT_SEEN_KEY_PREFIX}:${userId}`) || "[]");
        if (Array.isArray(stored)) seen = stored.filter((item): item is string => typeof item === "string");
      } catch {
        seen = [];
      }
      const responses = await Promise.all(["week", "month"].map(async (period) => {
        const response = await fetch(`/api/jarvis/reports?period=${period}`, { headers: { authorization: `Bearer ${token}` } }).catch(() => null);
        if (!response?.ok) return null;
        const payload = await response.json().catch(() => null);
        return payload?.report && typeof payload.report.key === "string" && typeof payload.report.text === "string" ? payload.report : null;
      }));
      if (cancelled) return;
      const fresh = responses.filter((report): report is { key: string; period: "week" | "month"; text: string } => Boolean(report) && !seen.includes(report.key));
      if (!fresh.length) return;
      setMessages((current) => [...current, ...fresh.map((report) => ({ id: crypto.randomUUID(), role: "jarvis" as const, title: report.period === "month" ? "Monthly coaching report" : "Weekly coaching report", text: report.text }))]);
      localStorage.setItem(`${JARVIS_REPORT_SEEN_KEY_PREFIX}:${userId}`, JSON.stringify([...new Set([...seen, ...fresh.map((report) => report.key)])].slice(-30)));
    });
    return () => { cancelled = true; };
  }, [isOpen, userId]);

  useEffect(() => {
    function keepOrbOnScreen() {
      const launcher = launcherRef.current;
      if (!launcher) return;
      setOrbPosition((current) => {
        if (!current) return current;
        const nextPosition = clampOrbPosition(current, launcher.offsetWidth, launcher.offsetHeight);
        localStorage.setItem(JARVIS_ORB_POSITION_KEY, JSON.stringify(nextPosition));
        return nextPosition;
      });
    }

    window.addEventListener("resize", keepOrbOnScreen);
    return () => window.removeEventListener("resize", keepOrbOnScreen);
  }, []);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const storedMessages = messages.slice(-30).map(({ imagePreview: _imagePreview, ...message }) => message);
    localStorage.setItem(`${JARVIS_CHAT_KEY_PREFIX}:${userId}`, JSON.stringify(storedMessages));
    if (!supabase) return;
    if (chatSyncTimerRef.current) window.clearTimeout(chatSyncTimerRef.current);
    chatSyncTimerRef.current = window.setTimeout(() => void persistSyncedConversation(storedMessages), 900);
    return () => { if (chatSyncTimerRef.current) window.clearTimeout(chatSyncTimerRef.current); };
  }, [messages, userId]);

  useLayoutEffect(() => {
    if (!isOpen) {
      wasChatOpen.current = false;
      return;
    }
    const feed = isAmbient ? compactFeedRef.current : feedRef.current;
    if (!feed) return;
    if (!wasChatOpen.current) {
      feed.scrollTop = feed.scrollHeight;
      wasChatOpen.current = true;
      return;
    }
    feed.scrollTo({ top: feed.scrollHeight, behavior: "smooth" });
  }, [isAmbient, isOpen, messages, isThinking]);

  useEffect(() => {
    localStorage.setItem(`${JARVIS_MEMORY_KEY_PREFIX}:${userId}`, JSON.stringify(memory));
  }, [memory, userId]);

  useEffect(() => {
    const timer = window.setInterval(() => setMonitorClock(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (observationTimerRef.current) window.clearTimeout(observationTimerRef.current);
    observationTimerRef.current = window.setTimeout(() => {
      const key = `${JARVIS_OBSERVATION_SNAPSHOT_KEY_PREFIX}:${userId}`;
      let previous: JarvisObservationSnapshot | null = null;
      try {
        const stored = JSON.parse(localStorage.getItem(key) || "null");
        if (stored?.trades && stored?.forecasts) previous = stored;
      } catch { previous = null; }
      const currentCount = Object.keys(observationSnapshot.trades).length + Object.keys(observationSnapshot.forecasts).length;
      const previousCount = previous ? Object.keys(previous.trades).length + Object.keys(previous.forecasts).length : 0;
      if (!currentCount && previousCount) return;
      if (!currentCount && !missionMemories.length) return;
      const changes: JarvisMonitorItem[] = [];
      if (previous) {
        trades.forEach((trade) => {
          const prior = previous?.trades[trade.id];
          if (!prior) changes.push({ id: `change:trade:${trade.id}:new`, priority: "medium", category: "change", title: `New ${trade.pair} trade`, detail: `${trade.setup} ${trade.direction} was added since my last check`, prompt: `Brief me on the new ${trade.date} ${trade.pair} trade and tell me the next useful Journaly action.` });
          else if (prior !== observationSnapshot.trades[trade.id]) changes.push({ id: `change:trade:${trade.id}:updated:${trade.updatedAt}`, priority: "low", category: "change", title: `${trade.pair} trade updated`, detail: "The saved trade changed since my last check", prompt: `Tell me what is currently saved for my ${trade.date} ${trade.pair} trade and whether anything still needs attention.` });
        });
        forecasts.forEach((forecast) => {
          const prior = previous?.forecasts[forecast.id];
          if (!prior) changes.push({ id: `change:forecast:${forecast.id}:new`, priority: "medium", category: "change", title: `New ${forecast.pair} forecast`, detail: `${forecast.setup} ${forecast.direction} was added since my last check`, prompt: `Brief me on my new ${forecast.pair} forecast using its saved thesis and status.` });
          else if (prior !== observationSnapshot.forecasts[forecast.id]) changes.push({ id: `change:forecast:${forecast.id}:updated:${forecast.updatedAt}`, priority: forecast.status === "Taken" ? "medium" : "low", category: "change", title: `${forecast.pair} forecast changed`, detail: `Status is now ${forecast.status}`, prompt: `Explain the latest saved change to my ${forecast.pair} forecast and what I should do next in Journaly.` });
        });
      }
      localStorage.setItem(key, JSON.stringify(observationSnapshot));
      setRecentChanges(changes.slice(0, 8));
      setObservationReady(true);
    }, 1400);
    return () => { if (observationTimerRef.current) window.clearTimeout(observationTimerRef.current); };
  }, [forecasts, missionMemories.length, observationSnapshot, trades, userId]);

  useEffect(() => {
    if (!memory.companionSettings.proactiveFollowups) return;
    const actionable = monitorItems.find((item) => item.priority !== "low");
    if (!actionable) return;
    const key = `${JARVIS_MONITOR_NOTIFIED_KEY_PREFIX}:${userId}`;
    let seen: string[] = [];
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(stored)) seen = stored.filter((item): item is string => typeof item === "string");
    } catch { seen = []; }
    if (seen.includes(actionable.id)) return;
    const message: JarvisMessage = {
      id: `proactive:client:${actionable.id}`,
      role: "jarvis",
      title: "Jarvis noticed",
      text: `${preferredName}, ${actionable.detail.charAt(0).toLowerCase()}${actionable.detail.slice(1)}. I’m keeping an eye on it; open this when you want to handle it together.`,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify([...seen, actionable.id].slice(-100)));
    setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
    void persistAutopilotAlert(message, actionable);
    if (!isOpen) {
      setInAppNotification(message);
      setUnreadProactiveCount((current) => current + 1);
    }
  }, [isOpen, memory.companionSettings.proactiveFollowups, monitorItems, preferredName, userId]);

  useEffect(() => {
    if (!isOpen || !memory.companionSettings.personalMemoryEnabled || !memory.companionSettings.proactiveFollowups) return;
    const now = Date.now();
    const due = memory.memories.find((item) => {
      if (!item.followUpAt) return false;
      if (item.sensitivity === "sensitive" && !memory.companionSettings.sensitiveMemoryEnabled) return false;
      const timestamp = new Date(item.followUpAt).getTime();
      return Number.isFinite(timestamp) && timestamp <= now && !proactiveCheckinRef.current.has(`${item.category}:${item.key}:${item.followUpAt}`);
    });
    if (!due) return;
    proactiveCheckinRef.current.add(`${due.category}:${due.key}:${due.followUpAt}`);
    const checkin: JarvisMessage = {
      id: crypto.randomUUID(),
      role: "jarvis",
      text: `Hey ${preferredName}—I remembered ${due.value.replace(/[.!?]+$/, "")}. How did it go?`,
      createdAt: new Date().toISOString(),
    };
    const clearedFollowUp: JarvisMemoryUpdate = { ...due, operation: "upsert", source: "explicit", followUpAt: null, confidence: Math.max(0.9, due.confidence) };
    setMessages((current) => [...current, checkin]);
    setMemory((current) => applyMemoryUpdates(current, [clearedFollowUp]));
    void persistMemoryUpdates([clearedFollowUp]);
  }, [isOpen, memory, preferredName]);

  useEffect(() => {
    const updates = syncedMemoryUpdates(journalEntries);
    if (updates.length) setMemory((current) => applyMemoryUpdates(current, updates));
    const synced = syncedActiveContext(journalEntries);
    sessionSyncEntryIdRef.current = journalEntries.find((entry) => entry.content.startsWith(JARVIS_SESSION_SYNC_PREFIX))?.id || sessionSyncEntryIdRef.current;
    const remoteChat = syncedMessages(journalEntries);
    const proactiveMessages = syncedProactiveMessages(journalEntries);
    chatSyncEntryIdRef.current = remoteChat?.entryId || chatSyncEntryIdRef.current;
    if (remoteChat?.messages.length || proactiveMessages.length) setMessages((current) => {
      const localNewest = current.at(-1)?.createdAt || "";
      const base = remoteChat?.messages.length && remoteChat.syncedAt > localNewest ? remoteChat.messages : current;
      const known = new Set(base.map((message) => message.id));
      return [...base, ...proactiveMessages.filter((message) => !known.has(message.id))].slice(-60);
    });
    try {
      const seen = new Set<string>(JSON.parse(localStorage.getItem(`${JARVIS_PROACTIVE_SEEN_KEY_PREFIX}:${userId}`) || "[]"));
      const fresh = proactiveMessages.filter((message) => !seen.has(message.id));
      setUnreadProactiveCount(fresh.length);
      if (!isOpen && fresh.length) setInAppNotification(fresh.at(-1) || null);
    } catch {
      setUnreadProactiveCount(proactiveMessages.length);
      if (!isOpen && proactiveMessages.length) setInAppNotification(proactiveMessages.at(-1) || null);
    }
    const remoteWorkspace = decodeLatestInternal<JarvisWorkspace>(journalEntries, JARVIS_WORKSPACE_PREFIX);
    workspaceSyncEntryIdRef.current = remoteWorkspace?.entryId || workspaceSyncEntryIdRef.current;
    if (remoteWorkspace?.value && Array.isArray(remoteWorkspace.value.contexts)) setWorkspace(remoteWorkspace.value);
    if (!synced) return;
    setActiveContext((current) => {
      const currentTimestamp = current?.updatedAt ? new Date(current.updatedAt).getTime() : 0;
      const syncedTimestamp = new Date(synced.syncedAt).getTime();
      return Number.isFinite(syncedTimestamp) && syncedTimestamp >= currentTimestamp ? synced.state : current;
    });
  }, [isOpen, journalEntries, userId]);

  useEffect(() => {
    if (!isOpen) return;
    const ids = syncedProactiveMessages(journalEntries).map((message) => message.id);
    localStorage.setItem(`${JARVIS_PROACTIVE_SEEN_KEY_PREFIX}:${userId}`, JSON.stringify(ids.slice(-90)));
    setUnreadProactiveCount(0);
    setInAppNotification(null);
  }, [isOpen, journalEntries, userId]);

  useEffect(() => {
    const key = `${JARVIS_ACTIVE_CONTEXT_KEY_PREFIX}:${userId}`;
    if (activeContext) localStorage.setItem(key, JSON.stringify(activeContext));
    else localStorage.removeItem(key);
  }, [activeContext, userId]);

  useEffect(() => {
    localStorage.setItem(`${JARVIS_VOICE_REPLIES_KEY_PREFIX}:${userId}`, String(voiceReplies));
    if (!voiceReplies && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [userId, voiceReplies]);

  useEffect(() => () => {
    speechRecognitionRef.current?.stop();
    if (voiceStopTimerRef.current) window.clearTimeout(voiceStopTimerRef.current);
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    requestAbortRef.current?.abort();
    audioRef.current?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (!isOpen || !observationReady || !memory.companionSettings.proactiveFollowups) return;
    const today = new Date().toISOString().slice(0, 10);
    const hour = new Date().getHours();
    const period = hour < 12 ? "morning" : hour >= 17 ? "evening" : "daytime";
    const key = `${JARVIS_AUTOPILOT_BRIEFING_KEY_PREFIX}:${userId}`;
    const briefingId = `${today}:${period}`;
    if (localStorage.getItem(key) === briefingId) return;
    localStorage.setItem(key, briefingId);
    const actionable = monitorItems.filter((item) => item.priority !== "low");
    const changed = monitorItems.filter((item) => item.category === "change");
    const greeting = period === "morning" ? `Morning, ${preferredName}.` : period === "evening" ? `Evening, ${preferredName}.` : `Welcome back, ${preferredName}.`;
    const changeLine = changed.length ? `${changed.length} thing${changed.length === 1 ? " changed" : "s changed"} since my last check.` : "Nothing unexpected changed since my last check.";
    const attentionLine = actionable.length
      ? `${actionable.length} item${actionable.length === 1 ? " needs" : "s need"} attention; first is ${actionable[0].title.toLowerCase()}: ${actionable[0].detail.toLowerCase()}.`
      : "Nothing needs your attention right now.";
    setMessages((current) => [...current, {
      id: crypto.randomUUID(),
      role: "jarvis",
      title: period === "morning" ? "Morning briefing" : period === "evening" ? "Evening debrief" : "Autopilot update",
      text: `${greeting} ${changeLine} ${attentionLine} I’ll keep the rest quiet unless it becomes actionable.`,
    }]);
  }, [isOpen, memory.companionSettings.proactiveFollowups, monitorItems, observationReady, preferredName, userId]);

  useEffect(() => {
    localStorage.setItem(`${JARVIS_SPEND_KEY_PREFIX}:${userId}`, JSON.stringify(spend));
  }, [spend, userId]);

  function startOrbDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    orbDrag.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingOrb(true);
  }

  function moveOrb(event: ReactPointerEvent<HTMLButtonElement>) {
    if (orbDrag.current.pointerId !== event.pointerId) return;
    const launcher = event.currentTarget;
    const nextPosition = clampOrbPosition(
      { x: event.clientX - orbDrag.current.offsetX, y: event.clientY - orbDrag.current.offsetY },
      launcher.offsetWidth,
      launcher.offsetHeight,
    );
    if (Math.hypot(event.clientX - orbDrag.current.startX, event.clientY - orbDrag.current.startY) > 4) {
      orbDrag.current.moved = true;
    }
    setOrbPosition(nextPosition);
  }

  function finishOrbDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (orbDrag.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    orbDrag.current.pointerId = -1;
    setIsDraggingOrb(false);
    if (orbDrag.current.moved) {
      const bounds = event.currentTarget.getBoundingClientRect();
      const finalPosition = clampOrbPosition(
        { x: bounds.left, y: bounds.top },
        event.currentTarget.offsetWidth,
        event.currentTarget.offsetHeight,
      );
      setOrbPosition(finalPosition);
      localStorage.setItem(JARVIS_ORB_POSITION_KEY, JSON.stringify(finalPosition));
    }
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!JARVIS_IMAGE_TYPES.has(file.type)) {
      setAttachmentError("Use a PNG, JPG, or WebP screenshot.");
      return;
    }
    if (file.size > JARVIS_IMAGE_MAX_BYTES) {
      setAttachmentError("That image is over 3 MB. Compress or crop it, then try again.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setAttachedImage({ dataUrl: reader.result, name: file.name.slice(0, 120) });
      setAttachmentError("");
      inputRef.current?.focus();
    };
    reader.onerror = () => setAttachmentError("Jarvis could not read that image. Try another file.");
    reader.readAsDataURL(file);
  }

  function removeAttachedImage() {
    setAttachedImage(null);
    setAttachmentError("");
    inputRef.current?.focus();
  }

  async function persistLearningRecord(promptText: string, summary: string, source: JarvisLearningRecord["source"]) {
    if (!supabase || !summary.trim()) return;
    setLearningSyncState("saving");
    const date = new Date().toISOString().slice(0, 10);
    const metadata = `${JARVIS_LEARNING_PREFIX}\n${JSON.stringify({ source, prompt: promptText.slice(0, 1200) })}`;
    const { data, error } = await supabase
      .from("journal_entries")
      .insert({
        user_id: userId,
        entry_date: date,
        content: metadata,
        advice: summary.trim().slice(0, 1600),
        image_url: "",
        pair: null,
        related_trade_id: null,
        related_discipline_id: null,
        updated_at: new Date().toISOString(),
      })
      .select("id,entry_date,content,advice")
      .single();
    if (error || !data) {
      setLearningSyncState("error");
      return;
    }
    const record = decodeLearningRecord({ id: data.id, date: data.entry_date, content: data.content, advice: data.advice || "" });
    if (record) setSessionLearningRecords((current) => [...current, record]);
    setLearningSyncState("saved");
  }

  async function persistAutopilotAlert(message: JarvisMessage, item: JarvisMonitorItem) {
    if (!supabase) return;
    const createdAt = message.createdAt || new Date().toISOString();
    await supabase.from("journal_entries").insert({
      user_id: userId,
      entry_date: createdAt.slice(0, 10),
      content: `${JARVIS_PROACTIVE_PREFIX}\n${JSON.stringify({ id: `client:${item.id}`, title: message.title || "Jarvis noticed", text: message.text, createdAt, kind: "autopilot_monitoring", trigger: { summary: item.detail, itemId: item.id, priority: item.priority, category: item.category } })}`,
      advice: "Persistent Jarvis Autopilot alert.",
      image_url: "",
      pair: null,
      related_trade_id: item.category === "trade_review" ? item.id.split(":")[1] || null : null,
      related_discipline_id: item.category === "forecast" ? item.id.split(":")[1] || null : null,
      updated_at: createdAt,
    });
  }

  async function saveMessageFeedback(message: JarvisMessage, reason: JarvisFeedbackReason) {
    if (!supabase || message.role !== "jarvis" || messageFeedback[message.id]) return;
    const messageIndex = messages.findIndex((item) => item.id === message.id);
    const priorUserMessage = messages.slice(0, messageIndex).reverse().find((item) => item.role === "user");
    const sentiment = reason === "helpful" ? "helpful" : "missed";
    const reasonLabels: Record<JarvisFeedbackReason, string> = {
      helpful: "Keep this response style and level of judgment.",
      too_strict: "The response was too strict or sounded like an auditor.",
      too_long: "The response was longer than the moment required.",
      misread_context: "Jarvis misunderstood the current trade or conversation state.",
      unnatural: "The response did not sound like a natural trading partner.",
    };
    setMessageFeedback((current) => ({ ...current, [message.id]: reason }));
    setFeedbackTarget(null);
    const content = `${JARVIS_FEEDBACK_PREFIX}\n${JSON.stringify({
      messageId: message.id,
      sentiment,
      reason,
      userMessage: priorUserMessage?.text.slice(0, 500) || "",
      assistantResponse: message.text.slice(0, 900),
    })}`;
    const { error } = await supabase.from("journal_entries").insert({
      user_id: userId,
      entry_date: new Date().toISOString().slice(0, 10),
      content,
      advice: reasonLabels[reason],
      image_url: "",
      pair: null,
      related_trade_id: null,
      related_discipline_id: null,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setMessageFeedback((current) => {
        const next = { ...current };
        delete next[message.id];
        return next;
      });
    }
  }

  async function persistMemoryUpdates(updates: JarvisMemoryUpdate[]) {
    const durable = allowedMemoryUpdates(updates, memory.companionSettings);
    if (!supabase || !durable.length) return;
    const syncedAt = new Date().toISOString();
    await supabase.from("journal_entries").insert({
      user_id: userId,
      entry_date: syncedAt.slice(0, 10),
      content: `${JARVIS_MEMORY_SYNC_PREFIX}\n${JSON.stringify({ updates: durable, syncedAt })}`,
      advice: "Jarvis cross-device memory sync.",
      image_url: "",
      pair: null,
      related_trade_id: null,
      related_discipline_id: null,
      updated_at: syncedAt,
    });
  }

  async function persistSyncedConversation(nextMessages: JarvisMessage[], allowEmpty = false) {
    if (!supabase || (!nextMessages.length && !allowEmpty)) return;
    const syncedAt = new Date().toISOString();
    const payload = {
      entry_date: syncedAt.slice(0, 10),
      content: `${JARVIS_CHAT_SYNC_PREFIX}\n${JSON.stringify({ messages: nextMessages.slice(-40), syncedAt })}`,
      advice: "Jarvis cross-device conversation history.", image_url: "", pair: activeContext?.pair || null,
      related_trade_id: activeContext?.tradeId || null, related_discipline_id: activeContext?.forecastId || null, updated_at: syncedAt,
    };
    if (chatSyncEntryIdRef.current) await supabase.from("journal_entries").update(payload).eq("id", chatSyncEntryIdRef.current).eq("user_id", userId);
    else {
      const { data } = await supabase.from("journal_entries").insert({ user_id: userId, ...payload }).select("id").single();
      if (data?.id) chatSyncEntryIdRef.current = data.id;
    }
  }

  async function persistWorkspace(next: JarvisWorkspace) {
    if (!supabase) return;
    const syncedAt = new Date().toISOString();
    const value = { ...next, updatedAt: syncedAt, syncedAt };
    const payload = { entry_date: syncedAt.slice(0, 10), content: `${JARVIS_WORKSPACE_PREFIX}\n${JSON.stringify(value)}`, advice: "Jarvis multi-context workspace.", image_url: "", pair: activeContext?.pair || null, related_trade_id: null, related_discipline_id: null, updated_at: syncedAt };
    if (workspaceSyncEntryIdRef.current) await supabase.from("journal_entries").update(payload).eq("id", workspaceSyncEntryIdRef.current).eq("user_id", userId);
    else {
      const { data } = await supabase.from("journal_entries").insert({ user_id: userId, ...payload }).select("id").single();
      if (data?.id) workspaceSyncEntryIdRef.current = data.id;
    }
  }

  async function persistChartCheckpoint(image: { dataUrl: string; name: string }, promptText: string, summary: string, context: JarvisActiveContext | null) {
    if (!supabase) return;
    const capturedAt = new Date().toISOString();
    await supabase.from("journal_entries").insert({
      user_id: userId, entry_date: capturedAt.slice(0, 10),
      content: `${JARVIS_CHART_PREFIX}\n${JSON.stringify({ capturedAt, name: image.name, prompt: promptText.slice(0, 600), summary: summary.slice(0, 900), pair: context?.pair || null, setup: context?.setup || null, tradeId: context?.tradeId || null, forecastId: context?.forecastId || null })}`,
      advice: summary.slice(0, 1200), image_url: image.dataUrl, pair: context?.pair || null,
      related_trade_id: context?.tradeId || null, related_discipline_id: context?.forecastId || null, updated_at: capturedAt,
    });
  }

  function forgetMemory(item: JarvisMemoryState["memories"][number]) {
    const update: JarvisMemoryUpdate = { operation: "delete", category: item.category, key: item.key, value: "", confidence: 1, source: "explicit", sensitivity: item.sensitivity || "normal", followUpAt: null };
    setMemory((current) => applyMemoryUpdates(current, [update]));
    void persistMemoryUpdates([update]);
  }

  function editMemory(item: JarvisMemoryState["memories"][number]) {
    const value = window.prompt(`What should Jarvis remember for “${item.key.replaceAll("_", " ")}”?`, item.value);
    if (value === null || !value.trim() || value.trim() === item.value) return;
    const update: JarvisMemoryUpdate = { operation: "upsert", category: item.category, key: item.key, value: value.trim().slice(0, 800), confidence: 1, source: "explicit", sensitivity: item.sensitivity || "normal", followUpAt: item.followUpAt || null };
    setMemory((current) => applyMemoryUpdates(current, [update]));
    void persistMemoryUpdates([update]);
  }

  function forgetAllPersonalMemories() {
    const tradingCategories = new Set(["trading_rule", "risk_rule", "mistake", "terminology", "ui_preference"]);
    const personal = memory.memories.filter((item) => !tradingCategories.has(item.category));
    if (!personal.length || !window.confirm(`Forget ${personal.length} personal ${personal.length === 1 ? "memory" : "memories"}? Trading rules and records will stay.`)) return;
    const updates = personal.map<JarvisMemoryUpdate>((item) => ({ operation: "delete", category: item.category, key: item.key, value: "", confidence: 1, source: "explicit", sensitivity: item.sensitivity || "normal", followUpAt: null }));
    setMemory((current) => applyMemoryUpdates(current, updates));
    void persistMemoryUpdates(updates);
  }

  function updateCompanionSetting<Key extends keyof JarvisCompanionSettings>(key: Key, value: JarvisCompanionSettings[Key]) {
    const memoryKey = {
      personalMemoryEnabled: "companion_personal_memory",
      inferenceMode: "companion_inference_mode",
      sensitiveMemoryEnabled: "companion_sensitive_memory",
      proactiveFollowups: "companion_proactive_followups",
      autonomyMode: "companion_autonomy_mode",
      handsFreeVoice: "companion_hands_free_voice",
    }[key];
    const update: JarvisMemoryUpdate = { operation: "upsert", category: "preference", key: memoryKey, value: String(value), confidence: 1, source: "explicit", sensitivity: "normal", followUpAt: null };
    setMemory((current) => applyMemoryUpdates(current, [update]));
    void persistMemoryUpdates([update]);
  }

  async function persistActiveContext(next: JarvisActiveContext | null) {
    if (!supabase) return;
    const syncedAt = new Date().toISOString();
    const payload = {
      entry_date: syncedAt.slice(0, 10),
      content: `${JARVIS_SESSION_SYNC_PREFIX}\n${JSON.stringify({ state: next, syncedAt })}`,
      advice: "Jarvis cross-device conversation context.",
      image_url: "",
      pair: next?.pair || null,
      related_trade_id: next?.tradeId || null,
      related_discipline_id: next?.forecastId || null,
      updated_at: syncedAt,
    };
    if (sessionSyncEntryIdRef.current) {
      await supabase.from("journal_entries").update(payload).eq("id", sessionSyncEntryIdRef.current).eq("user_id", userId);
    } else {
      const { data } = await supabase.from("journal_entries").insert({ user_id: userId, ...payload }).select("id").single();
      if (data?.id) sessionSyncEntryIdRef.current = data.id;
    }
  }

  function setAndSyncActiveContext(next: JarvisActiveContext | null) {
    setActiveContext(next);
    setWorkspace((current) => {
      const updated = upsertWorkspaceContext(current, next);
      void persistWorkspace(updated);
      return updated;
    });
    void persistActiveContext(next);
  }

  async function speakJarvisMessage(message: JarvisMessage) {
    audioRef.current?.pause();
    window.speechSynthesis.cancel();
    if (speakingMessageId === message.id) {
      setSpeakingMessageId(null);
      return;
    }
    setSpeakingMessageId(message.id);
    try {
      if (!supabase) throw new Error("No authenticated voice session");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No authenticated voice session");
      const response = await fetch("/api/jarvis/voice", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ userId, text: message.text.slice(0, 4096) }) });
      if (!response.ok) throw new Error("Dedicated voice unavailable");
      const blob = await response.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(audio.src); setSpeakingMessageId(null); };
      audio.onerror = () => setSpeakingMessageId(null);
      await audio.play();
      return;
    } catch {
      // Browser speech keeps Jarvis available if the dedicated voice endpoint is temporarily unavailable.
    }
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") { setSpeakingMessageId(null); return; }
    const utterance = new SpeechSynthesisUtterance(message.text);
    utterance.rate = 0.96;
    utterance.pitch = 0.92;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    window.speechSynthesis.speak(utterance);
  }

  function toggleLegacyVoiceInput() {
    if (isListening) {
      speechRecognitionRef.current?.stop();
      return;
    }
    const speechWindow = window as Window & { SpeechRecognition?: JarvisSpeechRecognitionConstructor; webkitSpeechRecognition?: JarvisSpeechRecognitionConstructor };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setAttachmentError("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript || "").join(" ").trim();
      if (!transcript) return;
      if (memory.companionSettings.handsFreeVoice) setVoiceReplies(true);
      const spokenPrompt = `${prompt.trim()}${prompt.trim() ? " " : ""}${transcript}`;
      setPrompt("");
      void askJarvis(spokenPrompt);
    };
    recognition.onerror = () => { setIsListening(false); setAttachmentError("I couldnâ€™t hear that clearly. Try again."); };
    recognition.onend = () => setIsListening(false);
    speechRecognitionRef.current = recognition;
    setAttachmentError("");
    setIsListening(true);
    recognition.start();
  }

  function stopVoiceInput() {
    if (voiceStopTimerRef.current) {
      window.clearTimeout(voiceStopTimerRef.current);
      voiceStopTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    else speechRecognitionRef.current?.stop();
  }

  async function transcribeVoice(blob: Blob) {
    setIsListening(false);
    setVoicePhase("transcribing");
    setAttachmentError("Transcribing your voice…");
    try {
      if (blob.size < 600) throw new Error("That recording was too short. Hold the mic and speak for a moment.");
      if (!supabase) throw new Error("Jarvis needs an authenticated session for voice chat.");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Jarvis needs an authenticated session for voice chat.");
      const audioData = await blobToDataUrl(blob);
      const response = await fetch("/api/jarvis/transcribe", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, audioData }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Jarvis could not transcribe that recording.");
      const transcript = typeof payload?.transcript === "string" ? payload.transcript.trim() : "";
      if (!transcript) throw new Error("I couldn’t hear any words in that recording. Try again a little closer to the microphone.");
      setAttachmentError("");
      if (memory.companionSettings.handsFreeVoice) setVoiceReplies(true);
      const spokenPrompt = `${prompt.trim()}${prompt.trim() ? " " : ""}${transcript}`;
      setPrompt("");
      void askJarvis(spokenPrompt);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Jarvis could not transcribe that recording.");
    } finally {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      voiceChunksRef.current = [];
      setVoicePhase("idle");
    }
  }

  async function toggleVoiceInput() {
    if (voicePhase === "transcribing") return;
    if (isListening) {
      stopVoiceInput();
      return;
    }
    setAttachmentError("Requesting microphone access…");
    if (typeof MediaRecorder !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        const mimeType = preferredVoiceMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaStreamRef.current = stream;
        mediaRecorderRef.current = recorder;
        voiceChunksRef.current = [];
        recorder.ondataavailable = (event) => { if (event.data.size) voiceChunksRef.current.push(event.data); };
        recorder.onerror = () => {
          setAttachmentError("The microphone stopped unexpectedly. Please try again.");
          setIsListening(false);
          setVoicePhase("idle");
          stream.getTracks().forEach((track) => track.stop());
        };
        recorder.onstop = () => {
          if (voiceStopTimerRef.current) window.clearTimeout(voiceStopTimerRef.current);
          voiceStopTimerRef.current = null;
          const recording = new Blob(voiceChunksRef.current, { type: recorder.mimeType || "audio/webm" });
          void transcribeVoice(recording);
        };
        recorder.start(250);
        setAttachmentError("Listening… tap the microphone again when you’re done.");
        setIsListening(true);
        setVoicePhase("listening");
        voiceStopTimerRef.current = window.setTimeout(stopVoiceInput, 45_000);
        return;
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        setAttachmentError(name === "NotAllowedError"
          ? "Microphone access is blocked. Allow the microphone for Journaly in your browser settings, then try again."
          : name === "NotFoundError"
            ? "No microphone was found on this device."
            : "Jarvis couldn’t open your microphone. Check the browser permission and try again.");
        setVoicePhase("idle");
        setIsListening(false);
        return;
      }
    }

    toggleLegacyVoiceInput();
  }

  async function saveTradeDraft(draft: JarvisTradeAction) {
    if (!supabase || tradeSaveLock.current || draft.intent !== "ready" || draft.missingFields.length || !draft.pair || !draft.setup || !draft.direction) return;
    tradeSaveLock.current = true;
    setIsSavingTrade(true);
    const now = new Date();
    const pair = draft.pair;
    const direction = draft.direction;
    const pnl = draft.pnl ?? 0;
    const result = draft.result || (pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "Breakeven");
    try {
      const { data, error } = await supabase.from("trades").insert({
        user_id: userId,
        trade_date: draft.date || now.toISOString().slice(0, 10),
        trade_time: draft.time || now.toTimeString().slice(0, 5),
        pair,
        setup: draft.setup,
        direction,
        mae: draft.mae ?? 0,
        mae_pips: null,
        stop_loss_pips: draft.stopLossPips,
        pnl_r: pnl,
        result,
        notes: draft.notes?.trim() || "",
        screenshot_url: "",
        source_app: "Jarvis",
        legacy_id: null,
        duration_minutes: null,
        finalized_at: null,
        updated_at: now.toISOString(),
      }).select("id").single();
      if (error) {
        setMessages((current) => [...current, { id: crypto.randomUUID(), role: "jarvis", title: "Trade not added", text: `Journaly could not save that trade: ${error.message}` }]);
        return;
      }
      setTradeDraft(null);
      const linkedForecast = forecasts.find((forecast) => forecast.id === activeContext?.forecastId)
        || forecasts.find((forecast) => forecast.pair === pair && forecast.setup === draft.setup && forecast.direction === direction && ["Waiting", "Taken"].includes(forecast.status));
      if (data?.id) {
        setAndSyncActiveContext({ pair, setup: draft.setup, tradeId: data.id, backtestId: null, forecastId: linkedForecast?.id || null, dataSource: "live", updatedAt: now.toISOString() });
        if (linkedForecast) void supabase.from("journal_entries").insert({
          user_id: userId, entry_date: now.toISOString().slice(0, 10),
          content: `${JARVIS_JOURNEY_PREFIX}\n${JSON.stringify({ type: "forecast_trade_link", forecastId: linkedForecast.id, tradeId: data.id, pair, setup: draft.setup, linkedAt: now.toISOString() })}`,
          advice: "Jarvis linked this forecast to its executed trade.", image_url: "", pair, related_trade_id: data.id, related_discipline_id: linkedForecast.id, updated_at: now.toISOString(),
        });
      }
      await onTradeCreated();
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "jarvis", title: "Trade added", text: `${pair} ${direction.toLowerCase()} is now in your Journaly trade log. I used only the fields available in Add Trade.` }]);
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "jarvis", title: "Trade not added", text: error instanceof Error ? error.message : "Journaly could not save that trade." }]);
    } finally {
      tradeSaveLock.current = false;
      setIsSavingTrade(false);
    }
  }

  async function saveForecastDraft(draft: JarvisForecastAction) {
    if (!supabase || forecastSaveLock.current || !draft.ready || draft.missingFields.length || !draft.status) return;
    forecastSaveLock.current = true;
    setIsSavingForecast(true);
    const now = new Date();
    try {
      const query = draft.intent === "update_status" && draft.forecastId
        ? supabase.from("trade_decisions").update({ status: persistedForecastStatus(draft.status), updated_at: now.toISOString() }).eq("id", draft.forecastId)
        : supabase.from("trade_decisions").insert({
            user_id: userId,
            decision_date: draft.date || now.toISOString().slice(0, 10),
            decision_time: draft.time || now.toTimeString().slice(0, 5),
            pair: draft.pair,
            setup: draft.setup,
            direction: draft.direction,
            status: persistedForecastStatus(draft.status),
            notes: draft.notes?.trim() || "",
            updated_at: now.toISOString(),
          });
      const { data, error } = await query.select("id,status").single();
      if (error) {
        setMessages((current) => [...current, { id: crypto.randomUUID(), role: "jarvis", title: "Forecast not updated", text: `Journaly could not save that forecast action: ${error.message}` }]);
        return;
      }
      const actionLabel = draft.intent === "create" ? "Forecast added" : "Forecast updated";
      setForecastDraft(null);
      const savedForecast = forecasts.find((forecast) => forecast.id === data?.id || forecast.id === draft.forecastId);
      if (data?.id && ["Waiting", "Taken"].includes(draft.status) && (draft.pair || savedForecast?.pair)) {
        setAndSyncActiveContext({
          pair: draft.pair || savedForecast?.pair || null,
          setup: draft.setup || savedForecast?.setup || null,
          tradeId: null,
          backtestId: null,
          forecastId: data.id,
          dataSource: "forecast",
          updatedAt: now.toISOString(),
        });
      } else if (draft.forecastId && activeContext?.forecastId === draft.forecastId && !["Waiting", "Taken"].includes(draft.status)) {
        setAndSyncActiveContext(null);
      }
      await onForecastChanged(data?.id ? { id: data.id, status: draft.status } : undefined);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "jarvis", title: actionLabel, text: draft.intent === "create" ? `${draft.pair} ${draft.direction?.toLowerCase()} is now waiting in Forecasts.` : `The ${draft.pair || "selected"} forecast is now marked ${draft.status}.` }]);
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "jarvis", title: "Forecast not updated", text: error instanceof Error ? error.message : "Journaly could not save that forecast action." }]);
    } finally {
      forecastSaveLock.current = false;
      setIsSavingForecast(false);
    }
  }

  async function askJarvis(nextPrompt: string) {
    const imageForRequest = attachedImage;
    const previousChartCandidate = lastChartImage || persistedLastChart;
    const previousChartForRequest = imageForRequest && previousChartCandidate && imageForRequest.dataUrl !== previousChartCandidate.dataUrl && imageForRequest.dataUrl.length + previousChartCandidate.dataUrl.length <= 3_800_000
      ? previousChartCandidate
      : null;
    const cleanPrompt = nextPrompt.trim() || (imageForRequest ? "Analyze this trading chart. Tell me what you can verify, what is unclear, and whether this is TAKE, WATCH, or SKIP based on my rules." : "");
    if (!cleanPrompt || isThinking) return;
    if (forecastDraft && /^(cancel|cancel it|never mind|nevermind|discard)$/i.test(cleanPrompt)) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: cleanPrompt }, { id: crypto.randomUUID(), role: "jarvis", text: "Forecast action discarded. Nothing changed in Journaly." }]);
      setPrompt("");
      setForecastDraft(null);
      return;
    }
    if (forecastDraft?.ready && /^(confirm|confirmed|save|save it|add it|do it)$/i.test(cleanPrompt)) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: cleanPrompt }]);
      setPrompt("");
      await saveForecastDraft(forecastDraft);
      return;
    }
    if (tradeDraft && /^(cancel|cancel it|never mind|nevermind|discard)$/i.test(cleanPrompt)) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: cleanPrompt }, { id: crypto.randomUUID(), role: "jarvis", text: "Trade draft discarded. Nothing was added to Journaly." }]);
      setPrompt("");
      setTradeDraft(null);
      return;
    }
    if (tradeDraft?.intent === "ready" && /^(confirm|confirmed|save|save it|add it|do it)$/i.test(cleanPrompt)) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: cleanPrompt }]);
      setPrompt("");
      await saveTradeDraft(tradeDraft);
      return;
    }
    const learningSource: JarvisLearningRecord["source"] = imageForRequest ? "chart" : /\bforecast(?:s|ed|ing)?\b/i.test(cleanPrompt) ? "forecast" : /\bskip(?:ped|ping)?\b/i.test(cleanPrompt) ? "skipped_trade" : "insight";
    const shouldArchiveLearning = Boolean(imageForRequest) || /\b(remember|learn from|lesson|insight|note that|my rule|from now on|key takeaway|teach|i (?:notice|noticed|find|found)|forecast pattern|skip(?:ped|ping)? trade)\b/i.test(cleanPrompt);
    const closesActiveTrade = /\b(?:closed|finished|stopped\s+out|hit\s+(?:tp|target|sl)|booked)\b/i.test(cleanPrompt) && /\b(?:trade|position|tp|target|sl|\d+(?:\.\d+)?\s*r)\b/i.test(cleanPrompt);
    const recentHistory = messages.slice(-14).map((message) => ({
      role: message.role === "jarvis" ? "assistant" : "user",
      content: [message.title, message.text].filter(Boolean).join("\n"),
    }));
    const userMessage: JarvisMessage = { id: crypto.randomUUID(), role: "user", text: cleanPrompt, imagePreview: imageForRequest?.dataUrl, attachmentName: imageForRequest?.name, createdAt: new Date().toISOString() };
    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setAttachedImage(null);
    setAttachmentError("");
    setIsThinking(true);
    const requestController = new AbortController();
    requestAbortRef.current = requestController;

    try {
      const orderedTrades = latestFirst(trades);
      const orderedBacktests = latestFirst(backtests);
      const orderedForecasts = latestFirst(forecasts);
      if (!supabase) throw new Error("Journaly authentication is unavailable.");
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Your Journaly session has expired.");
      const requestedPair = getPairFromPrompt(cleanPrompt, [...orderedTrades, ...orderedBacktests].map((trade) => trade.pair));
      const wantsBacktest = /\b(backtest|back test|historical test)\b/i.test(cleanPrompt);
      const wantsChartReview = /analy[sz]e|chart|screenshot|latest trade|this trade|take this|setup/i.test(cleanPrompt);
      const hasExplicitChartContext = Boolean(imageForRequest) || wantsChartReview;
      const chartTrade = hasExplicitChartContext
        ? selectRequestedChart(orderedTrades, cleanPrompt, requestedPair)
        : undefined;
      const chartBacktest = hasExplicitChartContext
        ? selectRequestedChart(orderedBacktests, cleanPrompt, requestedPair)
        : undefined;
      const activeChartRecord = wantsBacktest ? chartBacktest : chartTrade;
      const matchingActiveForecasts = orderedForecasts.filter((forecast) => forecast.status === "Waiting" && (!requestedPair || forecast.pair === requestedPair));
      const activeForecast = requestedPair ? matchingActiveForecasts[0] : matchingActiveForecasts.length === 1 ? matchingActiveForecasts[0] : undefined;
      const nextActiveContext: JarvisActiveContext | null = activeChartRecord ? {
        pair: activeChartRecord.pair,
        setup: activeChartRecord.setup,
        tradeId: wantsBacktest ? null : activeChartRecord.id,
        backtestId: wantsBacktest ? activeChartRecord.id : null,
        forecastId: null,
        dataSource: wantsBacktest ? "backtest" : "live",
        updatedAt: new Date().toISOString(),
      } : activeForecast && requestedPair ? {
        pair: activeForecast.pair,
        setup: activeForecast.setup,
        tradeId: null,
        backtestId: null,
        forecastId: activeForecast.id,
        dataSource: "forecast",
        updatedAt: new Date().toISOString(),
      } : activeContext && (!requestedPair || activeContext.pair === requestedPair) ? activeContext : null;
      if (nextActiveContext && nextActiveContext !== activeContext) setAndSyncActiveContext(nextActiveContext);
      const lastAssistantText = [...messages].reverse().find((message) => message.role === "jarvis")?.text || "";
      const lastDecision = lastAssistantText.match(/\b(TAKE|SKIP|WATCH|ARMED|INVALIDATED|GOOD LOSS|EXECUTION MISTAKE|RULE VIOLATION)\b/i)?.[1]?.toUpperCase() || null;
      const response = await fetch("/api/jarvis/chat", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          userId,
          question: cleanPrompt,
          history: recentHistory,
          chartImage: imageForRequest?.dataUrl || (wantsChartReview ? activeChartRecord?.screenshot || null : null),
          previousChartImage: previousChartForRequest?.dataUrl || null,
          context: {
            generatedAt: new Date().toISOString(),
            profile: {
              displayName,
              username: normalizedUsername(username),
              preferredName: memory.preferredName,
              preferences: memory.preferences,
              memories: memory.memories,
              companionSettings: memory.companionSettings,
            },
            marketSession: session,
            summary: {
              totalTrades: trades.length,
              totalBacktests: backtests.length,
              reviewedTrades: reviewedTrades.length,
              goodExecutions: goodTrades,
              activeForecasts: activeForecasts.length,
              learnedCases: learningRecords.length,
            },
            positionSizing,
            sessionState: {
              activeContextExplicit: true,
              activePair: requestedPair || nextActiveContext?.pair || activeForecast?.pair || null,
              activeSetup: nextActiveContext?.setup || activeForecast?.setup || null,
              activeTradeId: nextActiveContext?.tradeId || null,
              activeBacktestId: nextActiveContext?.backtestId || null,
              activeDataSource: nextActiveContext?.dataSource || null,
              activeForecastId: nextActiveContext?.forecastId || activeForecast?.id || null,
              lastChartAvailable: Boolean(imageForRequest || activeChartRecord?.screenshot),
              lastJarvisDecision: lastDecision,
              rollingConversation: recentHistory.slice(-8),
              pendingTradeDraft: tradeDraft,
              pendingForecastDraft: forecastDraft,
              pendingPositionSizing: positionSizingDraft,
              workspaceContexts: workspace.contexts.map(({ id, label, pair, setup, tradeId, backtestId, forecastId, dataSource, updatedAt }) => ({ id, label, pair, setup, tradeId, backtestId, forecastId, dataSource, updatedAt })),
            },
            trades: orderedTrades.slice(0, 300).map((trade) => ({
              id: trade.id,
              date: trade.date,
              pair: trade.pair,
              setup: trade.setup,
              direction: trade.direction,
              outcome: trade.result,
              pnlR: trade.pnl,
              executionQuality: trade.quality,
              notes: trade.notes,
              hasScreenshot: Boolean(trade.screenshot),
            })),
            monthlyTrades: orderedTrades.map((trade) => ({ id: trade.id, date: trade.date, pair: trade.pair, setup: trade.setup, pnlR: trade.pnl })),
            backtests: orderedBacktests.slice(0, 600).map((trade) => ({
              id: trade.id,
              date: trade.date,
              pair: trade.pair,
              setup: trade.setup,
              direction: trade.direction,
              outcome: trade.result,
              pnlR: trade.pnl,
              durationMinutes: trade.durationMinutes,
              stopLossPips: trade.stopLossPips,
              maePips: trade.maePips,
              scaleIn: trade.scaleIn,
              notes: trade.notes,
              hasScreenshot: Boolean(trade.screenshot),
            })),
            imageInventory: [
              ...orderedTrades.filter((trade) => trade.screenshot).map((trade) => ({ id: trade.id, source: "live", date: trade.date, time: trade.time, pair: trade.pair, setup: trade.setup, direction: trade.direction, outcome: trade.result, hasScreenshot: true })),
              ...orderedBacktests.filter((trade) => trade.screenshot).map((trade) => ({ id: trade.id, source: "backtest", date: trade.date, time: trade.time, pair: trade.pair, setup: trade.setup, direction: trade.direction, outcome: trade.result, hasScreenshot: true })),
            ],
            forecasts: orderedForecasts.map((forecast) => ({
              id: forecast.id,
              date: forecast.date,
              time: forecast.time,
              pair: forecast.pair,
              setup: forecast.setup,
              direction: forecast.direction,
              status: forecast.status,
              entryPlan: forecast.entryPlan,
              plannedRiskPercent: forecast.riskPercent,
              reasonToTake: forecast.reasonToTake,
              reasonCancelled: forecast.reasonCancelled,
              outcome: forecast.outcome,
              resultR: forecast.resultR,
              notes: forecast.notes,
            })),
            learningRecords: learningRecords.map((record) => ({
              date: record.date,
              source: record.source,
              prompt: record.prompt,
              summary: record.summary,
            })),
          },
        }), signal: requestController.signal,
      });
      const payload = await response.json();
      if (!response.ok || typeof payload?.answer !== "string") {
        const error = new Error(payload?.error || "Jarvis is unavailable.") as Error & { category?: string; status?: number; fallbackAllowed?: boolean };
        error.category = payload?.category;
        error.status = response.status;
        error.fallbackAllowed = payload?.fallbackAllowed === true;
        throw error;
      }
      setAiHealth((current) => ({
        provider: payload.provider || current?.provider || "OpenAI",
        configuredModel: payload.model || current?.configuredModel || null,
        apiConfigured: true,
        apiReachable: true,
        lastSuccessfulRequestAt: new Date().toISOString(),
        lastErrorCategory: null,
        lastHttpStatus: 200,
        fallbackActive: false,
      }));
      const acceptedMemoryUpdates = allowedMemoryUpdates(payload.memoryUpdates, memory.companionSettings);
      if (acceptedMemoryUpdates.length) {
        setMemory((current) => applyMemoryUpdates(current, acceptedMemoryUpdates));
        void persistMemoryUpdates(acceptedMemoryUpdates);
      }
      setTradeDraft((current) => payload.tradeAction ? normalizeTradeAction(payload.tradeAction, current) : null);
      setForecastDraft((current) => payload.forecastAction ? normalizeForecastAction(payload.forecastAction, current) : null);
      const nextPositionSizing = normalizePositionSizingAction(payload.positionSizingAction);
      setPositionSizingDraft(nextPositionSizing);
      if (nextPositionSizing?.ready && memory.companionSettings.autonomyMode === "assist") onPositionSizingApply(nextPositionSizing);
      const nextPositionProfile = normalizePositionProfileAction(payload.positionProfileAction);
      setPositionProfileDraft(nextPositionProfile);
      if (nextPositionProfile?.ready && memory.companionSettings.autonomyMode === "assist") onPositionProfileApply(nextPositionProfile);
      if (shouldArchiveLearning && typeof payload.learningSummary === "string" && payload.learningSummary.trim()) {
        void persistLearningRecord(cleanPrompt, payload.learningSummary, learningSource);
      }
      if (Number.isFinite(payload?.usage?.costUsd)) {
        const requestCost = Math.max(0, Number(payload.usage.costUsd));
        setSpend((current) => {
          const active = current.month === currentMonthKey() ? current : emptyJarvisSpend();
          return {
            ...active,
            totalUsd: active.totalUsd + requestCost,
            lastRequestUsd: requestCost,
            requests: active.requests + 1,
            inputTokens: active.inputTokens + Number(payload.usage.inputTokens || 0),
            outputTokens: active.outputTokens + Number(payload.usage.outputTokens || 0),
            updatedAt: new Date().toISOString(),
          };
        });
      }
      if (closesActiveTrade) setAndSyncActiveContext(null);
      if (imageForRequest) {
        setLastChartImage(imageForRequest);
        void persistChartCheckpoint(imageForRequest, cleanPrompt, payload.learningSummary || payload.answer, nextActiveContext);
      }
      const jarvisMessage: JarvisMessage = { id: crypto.randomUUID(), role: "jarvis", text: payload.answer, createdAt: new Date().toISOString() };
      setMessages((current) => [...current, jarvisMessage]);
      if (voiceReplies || memory.companionSettings.handsFreeVoice) speakJarvisMessage(jarvisMessage);
      if (payload?.proactiveSchedule && Number.isFinite(Number(payload.proactiveSchedule.delaySeconds)) && typeof payload.proactiveSchedule.message === "string") {
        void fetch("/api/jarvis/proactive", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ userId, delaySeconds: payload.proactiveSchedule.delaySeconds, message: payload.proactiveSchedule.message }),
        }).then(async (scheduledResponse) => {
          const scheduledPayload = await scheduledResponse.json().catch(() => null);
          if (!scheduledResponse.ok || !scheduledPayload?.message) throw new Error(scheduledPayload?.error || "Scheduled Jarvis message failed.");
          const scheduledMessage = scheduledPayload.message as JarvisMessage;
          setMessages((current) => current.some((message) => message.id === scheduledMessage.id) ? current : [...current, scheduledMessage]);
          if (!isOpenRef.current) {
            setInAppNotification(scheduledMessage);
            setUnreadProactiveCount((current) => current + 1);
          }
          if (voiceReplies || memory.companionSettings.handsFreeVoice) void speakJarvisMessage(scheduledMessage);
        }).catch((scheduledError) => {
          setMessages((current) => [...current, { id: crypto.randomUUID(), role: "jarvis", title: "Delivery failed", text: scheduledError instanceof Error ? scheduledError.message : "I could not deliver that scheduled message.", createdAt: new Date().toISOString() }]);
        });
      }
    } catch (error) {
      const failure = error as Error & { category?: string; status?: number; fallbackAllowed?: boolean };
      if (failure.name === "AbortError") {
        setMessages((current) => [...current, { id: crypto.randomUUID(), role: "jarvis", text: "Stopped. I kept the conversation and context—continue whenever you’re ready.", createdAt: new Date().toISOString() }]);
        return;
      }
      setAiHealth((current) => ({
        provider: current?.provider || "OpenAI",
        configuredModel: current?.configuredModel || null,
        apiConfigured: current?.apiConfigured ?? true,
        apiReachable: failure.status ? failure.status < 500 : false,
        lastSuccessfulRequestAt: current?.lastSuccessfulRequestAt || null,
        lastErrorCategory: failure.category || (failure.status === 401 || failure.status === 403 ? "authentication" : "network"),
        lastHttpStatus: failure.status || null,
        fallbackActive: failure.fallbackAllowed === true,
      }));
      const fallback = failure.fallbackAllowed === true ? buildJarvisResponse(cleanPrompt, trades, forecasts) : null;
      setMessages((current) => [
        ...current,
        fallback ? {
          id: crypto.randomUUID(),
          role: "jarvis",
          ...fallback,
          text: `${fallback.text}\n\nLimited Journaly fallback is active while the conversational AI reconnects.`,
        } : {
          id: crypto.randomUUID(),
          role: "jarvis",
          title: "Conversational AI unavailable",
          text: failure.status === 401
            ? "Your Journaly session needs to be refreshed. Sign in again, then retry this message."
            : "I can’t answer that naturally without the conversational model. Your message is still here—retry in a moment and I’ll resume automatically.",
        },
      ]);
    } finally {
      if (requestAbortRef.current === requestController) requestAbortRef.current = null;
      setIsThinking(false);
    }
  }

  function submitPrompt(event: FormEvent) {
    event.preventDefault();
    askJarvis(prompt);
  }

  return (
    <>
      {!isOpen && inAppNotification ? (
        <aside className="jarvis-in-app-notification" role="status" aria-live="polite" aria-label="New message from Jarvis">
          <button className="jarvis-in-app-notification-main" type="button" onClick={() => { setInAppNotification(null); setIsOpen(true); setIsAmbient(true); }}>
            <span><Bell size={17} /></span>
            <div><small>JARVIS · NEW MESSAGE</small><strong>{inAppNotification.title || "Jarvis is checking in"}</strong><p>{inAppNotification.text}</p></div>
          </button>
          <button className="jarvis-in-app-notification-close" type="button" aria-label="Dismiss Jarvis notification" onClick={() => setInAppNotification(null)}><X size={15} /></button>
        </aside>
      ) : null}
      <button
        ref={launcherRef}
        className={`jarvis-launcher${isDraggingOrb ? " is-dragging" : ""}${isOpen ? " is-open" : ""}`}
        style={orbPosition ? { left: orbPosition.x, top: orbPosition.y, right: "auto", bottom: "auto" } : undefined}
        type="button"
        aria-label="Open Jarvis. Drag to reposition."
        title="Drag Jarvis anywhere or click to open"
        onPointerDown={startOrbDrag}
        onPointerMove={moveOrb}
        onPointerUp={finishOrbDrag}
        onPointerCancel={finishOrbDrag}
        onClick={() => {
          if (orbDrag.current.moved) return;
          setIsOpen(true);
          setIsAmbient(true);
        }}
      >
        <span className="jarvis-launcher-radar" />
        <span className="jarvis-launcher-orbit" />
        <span className="jarvis-launcher-core"><span>J</span></span>
        {unreadProactiveCount ? <span className="jarvis-launcher-unread" aria-label={`${unreadProactiveCount} unread Jarvis message${unreadProactiveCount === 1 ? "" : "s"}`}>{Math.min(unreadProactiveCount, 9)}</span> : null}
        <span className="jarvis-launcher-label"><strong>Jarvis</strong><small>{aiHealth?.fallbackActive ? "Limited" : "Online"}</small></span>
      </button>

      {isOpen && isAmbient ? (
        <section className="jarvis-ambient" role="dialog" aria-modal="false" aria-label="Ambient Jarvis chat">
          <header className="jarvis-ambient-header">
            <div><span className="jarvis-ambient-core"><BrainCircuit size={17} /></span><span><strong>JARVIS</strong><small><i /> Ambient link online</small></span></div>
            <nav aria-label="Ambient Jarvis controls">
              <button type="button" title={voiceReplies ? "Mute spoken replies" : "Speak replies aloud"} aria-label={voiceReplies ? "Mute spoken replies" : "Speak replies aloud"} className={voiceReplies ? "is-active" : ""} onClick={() => setVoiceReplies((current) => !current)}>{voiceReplies ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
              <button type="button" title="Open Jarvis Command Center" aria-label="Open Jarvis Command Center" onClick={() => setIsAmbient(false)}><Maximize2 size={16} /></button>
              <button type="button" title="Close Jarvis" aria-label="Close Jarvis" onClick={() => setIsOpen(false)}><X size={17} /></button>
            </nav>
          </header>
          <div className="jarvis-ambient-context"><span>{activeContext?.pair ? `${activeContext.pair}${activeContext.setup ? ` · ${activeContext.setup}` : ""}` : "Journaly-wide context"}</span><small>You can keep scrolling. I’m still here.</small></div>
          <div className="jarvis-ambient-feed" ref={compactFeedRef} aria-live="polite">
            {messages.length ? messages.slice(-10).map((message) => (
              <article className={`jarvis-ambient-message is-${message.role}`} key={message.id}>
                <span>{message.role === "jarvis" ? "JARVIS" : "YOU"}</span>
                {message.title ? <strong>{message.title}</strong> : null}
                <p>{message.text}</p>
                {message.role === "jarvis" ? <button type="button" onClick={() => speakJarvisMessage(message)}>{speakingMessageId === message.id ? <VolumeX size={12} /> : <Volume2 size={12} />}{speakingMessageId === message.id ? " Stop" : " Listen"}</button> : null}
              </article>
            )) : <div className="jarvis-ambient-welcome"><BrainCircuit size={23} /><strong>I’m with you, {preferredName}.</strong><p>Scroll through Journaly and talk to me from here. I keep the same memory and context as Command Center.</p></div>}
            {isThinking ? <div className="jarvis-ambient-thinking"><span /><span /><span /><small>Thinking…</small></div> : null}
          </div>
          {(tradeDraft || forecastDraft || positionSizingDraft || positionProfileDraft) ? <button className="jarvis-ambient-action" type="button" onClick={() => setIsAmbient(false)}><Check size={14} /> Action ready · review in Command Center <ChevronRight size={14} /></button> : null}
          <form className="jarvis-ambient-composer" onSubmit={submitPrompt}>
            <button className={`jarvis-ambient-mic${isListening ? " is-listening" : ""}${voicePhase === "transcribing" ? " is-transcribing" : ""}`} type="button" disabled={voicePhase === "transcribing"} title={isListening ? "Stop recording" : "Speak to Jarvis"} aria-label={isListening ? "Stop recording" : "Speak to Jarvis"} onClick={toggleVoiceInput}>{isListening ? <MicOff size={17} /> : voicePhase === "transcribing" ? <RefreshCcw size={17} /> : <Mic size={17} />}</button>
            <textarea ref={compactInputRef} rows={1} value={prompt} placeholder={isListening ? "Listening…" : "Talk to Jarvis while you work…"} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); askJarvis(prompt); } }} />
            {isThinking ? <button className="jarvis-ambient-send is-stop" type="button" aria-label="Stop Jarvis" onClick={() => requestAbortRef.current?.abort()}><Square size={14} /></button> : <button className="jarvis-ambient-send" type="submit" disabled={!prompt.trim()} aria-label="Send to Jarvis"><ArrowUp size={17} /></button>}
          </form>
          {attachmentError ? <small className="jarvis-ambient-error">{attachmentError}</small> : null}
        </section>
      ) : null}

      {isOpen && !isAmbient ? (
        <section className="jarvis-screen" role="dialog" aria-modal="true" aria-label="Jarvis personal and trading intelligence">
          <div className="jarvis-grid-glow" aria-hidden="true" />
          <header className="jarvis-header">
            <div className="jarvis-wordmark">
              <span className="jarvis-wordmark-mark"><BrainCircuit size={20} /></span>
              <div><strong>JARVIS</strong><small>Journaly intelligence system</small></div>
            </div>
            <div className="jarvis-header-status">
              <span><i /> {!aiHealth ? "Checking conversational AI" : aiHealth.apiReachable ? "Conversational AI online" : "AI connection needs attention"}</span>
              <span>{session.label} · {session.timeLabel}</span>
            </div>
            <div className="jarvis-header-actions">
              <button className={`jarvis-voice-toggle${voiceReplies ? " is-active" : ""}`} type="button" title={voiceReplies ? "Turn off spoken Jarvis replies" : "Turn on spoken Jarvis replies"} aria-label={voiceReplies ? "Turn off spoken Jarvis replies" : "Turn on spoken Jarvis replies"} onClick={() => setVoiceReplies((current) => !current)}>{voiceReplies ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
              <button className="jarvis-close" type="button" title="Return to ambient Jarvis" aria-label="Return to ambient Jarvis" onClick={() => setIsAmbient(true)}><Minimize2 size={19} /></button>
              <button className="jarvis-close" type="button" aria-label="Close Jarvis" onClick={() => setIsOpen(false)}><X size={20} /></button>
            </div>
          </header>

          <div className="jarvis-layout">
            <aside className="jarvis-rail">
              <div className="jarvis-rail-title"><Command size={15} /><span>Command center</span></div>
              <nav aria-label="Jarvis sections">
                <button className="is-active" type="button"><Sparkles size={17} /> Intelligence <ChevronRight size={15} /></button>
                <button type="button" onClick={() => askJarvis("Let's talk about life. Check in with me naturally using what you genuinely remember, without forcing trading into the conversation.")}><HeartHandshake size={17} /> Life companion</button>
                <button type="button" onClick={() => askJarvis("What am I currently watching?")}><Target size={17} /> Forecasts <span>{activeForecasts.length}</span></button>
                <button type="button" onClick={() => askJarvis("Show me my recent mistakes")}><Eye size={17} /> Review</button>
                <button type="button" onClick={() => askJarvis("How are my Internals doing?")}><BarChart3 size={17} /> Setup edge</button>
                <button type="button" onClick={() => askJarvis("Analyze my full Edge Lab. Show my strongest and weakest hours, sessions, weekdays, pairs, setups, and pair/setup combinations using deterministic data.")}><Clock size={17} /> Edge Lab</button>
                <button type="button" onClick={() => askJarvis("Compare my live trades against my backtests.")}><Activity size={17} /> Live vs backtest</button>
                <button className={showMemoryCenter ? "is-active" : ""} type="button" onClick={() => setShowMemoryCenter((current) => !current)}><BrainCircuit size={17} /> Memory <span>{memory.memories.length}</span></button>
                <button type="button" onClick={() => { setMessages([]); void persistSyncedConversation([], true); setTradeDraft(null); setForecastDraft(null); setAndSyncActiveContext(null); setFeedbackTarget(null); setLastChartImage(null); setAttachedImage(null); setAttachmentError(""); setPrompt(""); }}><RefreshCcw size={17} /> New conversation</button>
              </nav>

              {showMemoryCenter ? <section className="jarvis-memory-center">
                <header><strong>Memory center</strong><small>You control what stays.</small></header>
                <div className="jarvis-companion-settings" aria-label="Companion memory settings">
                  <button type="button" aria-pressed={memory.companionSettings.personalMemoryEnabled} className={memory.companionSettings.personalMemoryEnabled ? "is-enabled" : ""} onClick={() => updateCompanionSetting("personalMemoryEnabled", !memory.companionSettings.personalMemoryEnabled)}><span><strong>Personal memory</strong><small>Remember your life across chats</small></span><i /></button>
                  <button type="button" aria-pressed={memory.companionSettings.inferenceMode === "balanced"} className={memory.companionSettings.inferenceMode === "balanced" ? "is-enabled" : ""} onClick={() => updateCompanionSetting("inferenceMode", memory.companionSettings.inferenceMode === "balanced" ? "explicit_only" : "balanced")}><span><strong>Pattern learning</strong><small>{memory.companionSettings.inferenceMode === "balanced" ? "Balanced · repeated patterns only" : "Explicit facts only"}</small></span><i /></button>
                  <button type="button" aria-pressed={memory.companionSettings.sensitiveMemoryEnabled} className={memory.companionSettings.sensitiveMemoryEnabled ? "is-enabled" : ""} onClick={() => updateCompanionSetting("sensitiveMemoryEnabled", !memory.companionSettings.sensitiveMemoryEnabled)}><span><strong>Sensitive memory</strong><small>{memory.companionSettings.sensitiveMemoryEnabled ? "Allowed when relevant" : "Not added to durable memory"}</small></span><i /></button>
                  <button type="button" aria-pressed={memory.companionSettings.proactiveFollowups} className={memory.companionSettings.proactiveFollowups ? "is-enabled" : ""} onClick={() => updateCompanionSetting("proactiveFollowups", !memory.companionSettings.proactiveFollowups)}><span><strong>Natural follow-ups</strong><small>Remember to ask how things went</small></span><i /></button>
                  <button type="button" aria-pressed={memory.companionSettings.autonomyMode === "assist"} className={memory.companionSettings.autonomyMode === "assist" ? "is-enabled" : ""} onClick={() => updateCompanionSetting("autonomyMode", memory.companionSettings.autonomyMode === "assist" ? "observe" : "assist")}><span><strong>Assisted autonomy</strong><small>{memory.companionSettings.autonomyMode === "assist" ? "Fill calculators and profiles for you" : "Suggest changes, then wait for approval"}</small></span><i /></button>
                  <button type="button" aria-pressed={memory.companionSettings.handsFreeVoice} className={memory.companionSettings.handsFreeVoice ? "is-enabled" : ""} onClick={() => { const enabled = !memory.companionSettings.handsFreeVoice; updateCompanionSetting("handsFreeVoice", enabled); if (enabled) setVoiceReplies(true); }}><span><strong>Spoken answers</strong><small>{memory.companionSettings.handsFreeVoice ? "Speech sends instantly and Jarvis answers aloud" : "Speech sends instantly; Jarvis answers in text"}</small></span><i /></button>
                </div>
                {memory.memories.length ? memory.memories.slice().reverse().map((item) => <div className="jarvis-memory-item" key={`${item.category}:${item.key}`}><span><strong>{item.key.replaceAll("_", " ")}</strong><small>{item.value}</small><em>{item.category.replaceAll("_", " ")} · {item.source === "inferred" ? "learned pattern" : "you told Jarvis"}{item.followUpAt ? ` · follow up ${new Date(item.followUpAt).toLocaleDateString()}` : ""}{Date.now() - new Date(item.updatedAt).getTime() > 90 * 86400000 ? " · review" : ""}</em></span><div><button type="button" title="Edit this memory" aria-label={`Edit ${item.key.replaceAll("_", " ")}`} onClick={() => editMemory(item)}><RefreshCcw size={12} /></button><button type="button" title="Forget this memory" aria-label={`Forget ${item.key.replaceAll("_", " ")}`} onClick={() => forgetMemory(item)}><Trash2 size={13} /></button></div></div>) : <p>No durable personal memories yet. Say “remember this” whenever something matters.</p>}
                {memory.memories.some((item) => !["trading_rule", "risk_rule", "mistake", "terminology", "ui_preference"].includes(item.category)) ? <button className="jarvis-forget-personal" type="button" onClick={forgetAllPersonalMemories}><Trash2 size={12} /> Forget all personal memories</button> : null}
              </section> : null}

              <div className="jarvis-source-stack">
                <span>Knowledge sources</span>
                <div className={aiHealth?.apiReachable === false ? "is-pending" : ""}>
                  {aiHealth?.apiReachable === false ? <CircleDot size={13} /> : <Check size={13} />}
                  <p title={aiHealth ? `API configured: ${aiHealth.apiConfigured ? "yes" : "no"}\nAPI reachable: ${aiHealth.apiReachable ? "yes" : "no"}\nLast success: ${aiHealth.lastSuccessfulRequestAt || "none in this runtime"}\nLast error: ${aiHealth.lastErrorCategory || "none"}\nLast HTTP status: ${aiHealth.lastHttpStatus ?? "none"}\nFallback active: ${aiHealth.fallbackActive ? "yes" : "no"}` : "Checking secure connection"}>
                    <strong>Conversational AI</strong>
                    <small>{aiHealth ? `${aiHealth.provider} · ${aiHealth.configuredModel || "model pending"} · configured ${aiHealth.apiConfigured ? "yes" : "no"} · reachable ${aiHealth.apiReachable ? "yes" : "no"}` : "Checking secure connection"}</small>
                    {aiHealth ? <small>{`HTTP ${aiHealth.lastHttpStatus ?? "—"} · error ${aiHealth.lastErrorCategory || "none"} · fallback ${aiHealth.fallbackActive ? "on" : "off"}`}</small> : null}
                  </p>
                </div>
                <div><Check size={13} /><p><strong>Trade journal</strong><small>{trades.length} records indexed</small></p></div>
                <div><Check size={13} /><p><strong>Backtest journal</strong><small>{backtests.length} records indexed · 137 charts audited</small></p></div>
                <div><Check size={13} /><p><strong>Post-trade reviews</strong><small>{reviewedTrades.length} quality labels</small></p></div>
                <div><Check size={13} /><p><strong>Forecasts</strong><small>{forecasts.length} decisions indexed</small></p></div>
                <div><Check size={13} /><p><strong>Trade Archive + Edge Lab</strong><small>All views connected · deterministic calculations</small></p></div>
                <div><Check size={13} /><p><strong>Strategy transfer pack</strong><small>PPA-first rules loaded</small></p></div>
                <div><Check size={13} /><p><strong>Visual setup library</strong><small>53 unique charts audited</small></p></div>
                <div><Check size={13} /><p><strong>Personal memory</strong><small>{memory.memories.length} memor{memory.memories.length === 1 ? "y" : "ies"} · private controls · cross-device sync</small></p></div>
                <div><BookOpenCheck size={13} /><p><strong>Learning archive</strong><small>{learningSyncState === "saving" ? "Saving latest insight…" : learningSyncState === "error" ? "Latest insight stayed in chat" : "Summaries synced · images stay lightweight"}</small></p></div>
                <div className="is-pending"><CircleDot size={13} /><p><strong>Live market data</strong><small>Future connection</small></p></div>
              </div>

              <section className="jarvis-brain-card" title={`${brainBreakdown}. This is a Journaly-side estimate of Jarvis records, not Supabase's total database measurement.`} aria-label={`Jarvis brain size approximately ${brainSize.text}`}>
                <div className="jarvis-brain-orb" aria-hidden="true"><BrainCircuit size={21} /></div>
                <div className="jarvis-brain-copy">
                  <span>Jarvis brain size</span>
                  <strong>{brainSize.value} <small>{brainSize.unit}</small></strong>
                  <div className="jarvis-brain-meter" role="progressbar" aria-label="Jarvis estimate compared with the Supabase Free database limit" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, brainUsage.freeDatabaseReferencePercent)}><i style={{ width: `${Math.min(100, Math.max(0.4, brainUsage.freeDatabaseReferencePercent))}%` }} /></div>
                  <small>{brainFreeReference} of the 500 MB Free database reference · {brainUsage.records} brain records</small>
                  <em>Jarvis-only estimate—not total project usage.</em>
                </div>
                <a href="https://supabase.com/dashboard/org/_/usage" target="_blank" rel="noreferrer" title="Open authoritative Supabase usage">Check actual</a>
              </section>

              <div className="jarvis-spend-card" title="Estimated from Jarvis token usage at current published model rates. Your provider invoice, taxes, and credits may differ.">
                <CircleDollarSign size={18} />
                <div><span>Estimated GPT spend</span><strong>{formatUsd(spend.totalUsd)}</strong><small>{spend.month} · {spend.requests} request{spend.requests === 1 ? "" : "s"}</small></div>
                <p><span>Last</span><strong>{formatUsd(spend.lastRequestUsd)}</strong></p>
              </div>
              <div className="jarvis-safety-card"><ShieldCheck size={18} /><div><strong>Confirmed actions</strong><p>Jarvis can add Journaly trades only after your approval. Broker execution stays locked.</p></div></div>
            </aside>

            <main className="jarvis-conversation">
              <div className="jarvis-feed" ref={feedRef}>
                {messages.length === 0 ? (
                  <div className="jarvis-welcome">
                    <div className="jarvis-hero-core" aria-hidden="true">
                      <span className="jarvis-hero-ring ring-one" />
                      <span className="jarvis-hero-ring ring-two" />
                      <span className="jarvis-hero-ring ring-three" />
                      <span className="jarvis-hero-center"><BrainCircuit size={32} /></span>
                    </div>
                    <span className="jarvis-kicker"><i /> Journaly connected</span>
                    <h1>{greeting}, {preferredName}.</h1>
                    <p>Talk to me naturally about trading or life. I can remember the people, plans, habits, goals, and stories that matter to you—while keeping you in control of what stays.</p>
                    <div className="jarvis-command-grid">
                      {quickCommands.map(({ label, prompt: commandPrompt, icon: Icon }) => (
                        <button type="button" key={label} onClick={() => askJarvis(commandPrompt)}><Icon size={18} /><span>{label}</span><ChevronRight size={15} /></button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="jarvis-messages" aria-live="polite">
                    {messages.map((message) => (
                      <article className={`jarvis-message is-${message.role}`} key={message.id}>
                        <div className="jarvis-message-avatar">{message.role === "jarvis" ? <BrainCircuit size={17} /> : preferredName.slice(0, 1).toUpperCase()}</div>
                        <div className="jarvis-message-body">
                          <span>{message.role === "jarvis" ? "JARVIS" : "YOU"}</span>
                          {message.title ? <h3>{message.title}</h3> : null}
                          {message.imagePreview ? <img className="jarvis-message-image" src={message.imagePreview} alt={message.attachmentName || "Attached trading chart"} /> : null}
                          {message.attachmentName ? <small className="jarvis-attachment-name"><Paperclip size={11} /> {message.attachmentName}</small> : null}
                          <p>{message.text}</p>
                          {message.metrics?.length ? <div className="jarvis-response-metrics">{message.metrics.map((metric) => <div className={metric.tone ? `is-${metric.tone}` : ""} key={`${metric.label}-${metric.value}`}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div> : null}
                          {message.role === "jarvis" ? (
                            <div className="jarvis-feedback">
                              <button type="button" aria-label={speakingMessageId === message.id ? "Stop speaking" : "Read this reply aloud"} title={speakingMessageId === message.id ? "Stop speaking" : "Read aloud"} onClick={() => speakJarvisMessage(message)}>{speakingMessageId === message.id ? <VolumeX size={13} /> : <Volume2 size={13} />} {speakingMessageId === message.id ? "Stop" : "Listen"}</button>
                              {messageFeedback[message.id] ? <small><Check size={12} /> Feedback saved</small> : (
                                <>
                                  <button type="button" onClick={() => void saveMessageFeedback(message, "helpful")}><ThumbsUp size={13} /> Helpful</button>
                                  <button type="button" onClick={() => setFeedbackTarget((current) => current === message.id ? null : message.id)}><ThumbsDown size={13} /> Missed it</button>
                                </>
                              )}
                              {feedbackTarget === message.id && !messageFeedback[message.id] ? (
                                <div className="jarvis-feedback-reasons" aria-label="Why did Jarvis miss it?">
                                  <span>What felt off?</span>
                                  <button type="button" onClick={() => void saveMessageFeedback(message, "too_strict")}>Too strict</button>
                                  <button type="button" onClick={() => void saveMessageFeedback(message, "too_long")}>Too long</button>
                                  <button type="button" onClick={() => void saveMessageFeedback(message, "misread_context")}>Misread context</button>
                                  <button type="button" onClick={() => void saveMessageFeedback(message, "unnatural")}>Didnâ€™t sound natural</button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ))}
                    {forecastDraft ? (
                      <article className={`jarvis-trade-draft is-${forecastDraft.ready ? "ready" : "draft"}`} aria-label="Pending Forecast action">
                        <header><span>{forecastDraft.intent === "create" ? "Forecast draft" : "Forecast status update"}</span><strong>{forecastDraft.pair || "Forecast"}</strong></header>
                        <div className="jarvis-trade-draft-grid">
                          <p><span>Action</span><strong>{forecastDraft.intent === "create" ? "Create forecast" : "Update status"}</strong></p>
                          <p><span>Status</span><strong>{forecastDraft.status || "Needed"}</strong></p>
                          <p><span>Setup</span><strong>{forecastDraft.setup || (forecastDraft.intent === "update_status" ? "Existing forecast" : "Needed")}</strong></p>
                          <p><span>Direction</span><strong>{forecastDraft.direction || (forecastDraft.intent === "update_status" ? "Existing forecast" : "Needed")}</strong></p>
                          <p><span>Date / time</span><strong>{forecastDraft.date || "Now"} / {forecastDraft.time || "Now"}</strong></p>
                        </div>
                        {forecastDraft.notes ? <p className="jarvis-trade-draft-notes">{forecastDraft.notes}</p> : null}
                        {forecastDraft.missingFields.length ? <small>Jarvis still needs: {forecastDraft.missingFields.join(", ")}.</small> : <small>Say “Confirm” or use the button below. Nothing changes before approval.</small>}
                        <footer><button type="button" className="is-cancel" onClick={() => setForecastDraft(null)}>Discard</button><button type="button" className="is-confirm" disabled={!forecastDraft.ready || isSavingForecast} onClick={() => void saveForecastDraft(forecastDraft)}><Check size={15} /> {isSavingForecast ? "Saving..." : "Confirm"}</button></footer>
                      </article>
                    ) : null}
                    {tradeDraft ? (
                      <article className={`jarvis-trade-draft is-${tradeDraft.intent}`} aria-label="Pending Journaly trade">
                        <header><span>{tradeDraft.intent === "ready" ? "Ready to add" : "Trade draft"}</span><strong>{tradeDraft.pair || "Pair needed"}</strong></header>
                        <div className="jarvis-trade-draft-grid">
                          <p><span>Setup</span><strong>{tradeDraft.setup || "Needed"}</strong></p>
                          <p><span>Direction</span><strong>{tradeDraft.direction || "Needed"}</strong></p>
                          <p><span>Date / time</span><strong>{tradeDraft.date || "Now"} / {tradeDraft.time || "Now"}</strong></p>
                          <p><span>Stop loss</span><strong>{tradeDraft.stopLossPips === null ? "Not supplied" : `${tradeDraft.stopLossPips} pips`}</strong></p>
                          <p><span>PnL</span><strong>{formatR(tradeDraft.pnl ?? 0)}</strong></p>
                          <p><span>Result</span><strong>{tradeDraft.result || "Breakeven"}</strong></p>
                        </div>
                        {tradeDraft.notes ? <p className="jarvis-trade-draft-notes">{tradeDraft.notes}</p> : null}
                        {tradeDraft.missingFields.length ? <small>Jarvis still needs: {tradeDraft.missingFields.join(", ")}.</small> : <small>Say “Confirm” or use the button below. Nothing is saved before approval.</small>}
                        <footer>
                          <button type="button" className="is-cancel" onClick={() => setTradeDraft(null)}>Discard</button>
                          <button type="button" className="is-confirm" disabled={tradeDraft.intent !== "ready" || isSavingTrade} onClick={() => void saveTradeDraft(tradeDraft)}><Check size={15} /> {isSavingTrade ? "Adding..." : "Confirm & add"}</button>
                        </footer>
                      </article>
                    ) : null}
                    {positionSizingDraft ? (
                      <article className={`jarvis-trade-draft is-${positionSizingDraft.ready ? "ready" : "draft"}`} aria-label="Jarvis position sizing">
                        <header><span>Position sizing</span><strong>{positionSizingDraft.pair || "Pair needed"}</strong></header>
                        {positionSizingDraft.result ? (
                          <div className="jarvis-trade-draft-grid">
                            <p><span>Direction</span><strong>{positionSizingDraft.result.direction}</strong></p>
                            <p><span>Standard lots</span><strong>{positionSizingDraft.result.lots.toFixed(3)}</strong></p>
                            <p><span>Units</span><strong>{Math.round(positionSizingDraft.result.units).toLocaleString()}</strong></p>
                            <p><span>Risk</span><strong>${positionSizingDraft.result.riskAmount.toFixed(2)}</strong></p>
                            <p><span>Stop</span><strong>{positionSizingDraft.result.stopPips.toFixed(2)} pips</strong></p>
                            <p><span>Target</span><strong>{positionSizingDraft.result.rewardRisk === null ? "Not supplied" : `${positionSizingDraft.result.rewardRisk.toFixed(2)}R`}</strong></p>
                          </div>
                        ) : null}
                        {positionSizingDraft.missingFields.length ? <small>Jarvis still needs: {positionSizingDraft.missingFields.join(", ")}.</small> : <small>Calculated with Journaly's exact Position Sizing formula. This does not place an order.</small>}
                        <footer>
                          <button type="button" className="is-cancel" onClick={() => setPositionSizingDraft(null)}>Dismiss</button>
                          <button type="button" className="is-confirm" disabled={!positionSizingDraft.ready} onClick={() => onPositionSizingApply(positionSizingDraft)}><Check size={15} /> Fill & open tab</button>
                        </footer>
                      </article>
                    ) : null}
                    {positionProfileDraft ? (
                      <article className={`jarvis-trade-draft is-${positionProfileDraft.ready ? "ready" : "draft"}`} aria-label="Jarvis position profile change">
                        <header><span>Position profile</span><strong>{positionProfileDraft.operation.replace("_", " ")}</strong></header>
                        {positionProfileDraft.operation === "set_mode" ? (
                          <div className="jarvis-trade-draft-grid"><p><span>Mode</span><strong>{positionProfileDraft.profileMode === "half" ? "Half Profile" : "Main Profile"}</strong></p></div>
                        ) : positionProfileDraft.balance ? (
                          <div className="jarvis-trade-draft-grid">
                            <p><span>Balance</span><strong>{positionProfileDraft.balance.toLocaleString()}</strong></p>
                            <p><span>Type</span><strong>{positionProfileDraft.type || "Account"}</strong></p>
                            <p><span>Platform</span><strong>{positionProfileDraft.platform || "Unspecified"}</strong></p>
                            <p><span>Risk</span><strong>{positionProfileDraft.riskPercent ?? "--"}%</strong></p>
                          </div>
                        ) : null}
                        <small>{positionProfileDraft.ready ? (memory.companionSettings.autonomyMode === "assist" ? "Applied and saved automatically in Position Sizing." : "Ready to apply. Jarvis is waiting for your approval.") : `Jarvis still needs: ${positionProfileDraft.missingFields.join(", ")}.`}</small>
                        <footer>
                          <button type="button" className="is-cancel" onClick={() => setPositionProfileDraft(null)}>Dismiss</button>
                          {memory.companionSettings.autonomyMode === "observe" ? <button type="button" className="is-confirm" disabled={!positionProfileDraft.ready} onClick={() => onPositionProfileApply(positionProfileDraft)}><Check size={15} /> Apply change</button> : null}
                        </footer>
                      </article>
                    ) : null}
                    {isThinking ? <div className="jarvis-thinking"><span /><span /><span /><small>Thinking with your strategy</small></div> : null}
                  </div>
                )}
              </div>

              <form className={`jarvis-composer${attachedImage ? " has-attachment" : ""}`} onSubmit={submitPrompt}>
                <input ref={fileInputRef} className="jarvis-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} />
                <button className="jarvis-attach" type="button" title="Attach a chart screenshot" aria-label="Attach a chart screenshot" onClick={() => fileInputRef.current?.click()}><ImagePlus size={19} /></button>
                <button className={`jarvis-voice-input${isListening ? " is-listening" : ""}${voicePhase === "transcribing" ? " is-transcribing" : ""}`} type="button" disabled={voicePhase === "transcribing"} title={isListening ? "Stop recording" : voicePhase === "transcribing" ? "Transcribing voice" : "Speak to Jarvis"} aria-label={isListening ? "Stop recording" : voicePhase === "transcribing" ? "Transcribing voice" : "Speak to Jarvis"} aria-pressed={isListening} onClick={toggleVoiceInput}>{isListening ? <MicOff size={18} /> : voicePhase === "transcribing" ? <RefreshCcw size={18} /> : <Mic size={18} />}</button>
                {attachedImage ? <div className="jarvis-attachment-preview"><img src={attachedImage.dataUrl} alt="Chart ready to send" /><span><strong>{attachedImage.name}</strong><small>Ready for Jarvis vision</small></span><button type="button" onClick={removeAttachedImage} aria-label="Remove attached image"><X size={14} /></button></div> : null}
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={prompt}
                  placeholder={voicePhase === "listening" ? "Listening…" : attachedImage ? "Ask Jarvis about this chart..." : "Ask Jarvis about trading or life..."}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      askJarvis(prompt);
                    }
                  }}
                />
                {isThinking ? <button className="jarvis-send is-stop" type="button" aria-label="Stop Jarvis" title="Interrupt Jarvis" onClick={() => requestAbortRef.current?.abort()}><Square size={15} /></button> : <button className="jarvis-send" type="submit" disabled={!prompt.trim() && !attachedImage} aria-label="Send to Jarvis"><ArrowUp size={19} /></button>}
                <small className={attachmentError ? "is-error" : ""}>{attachmentError || <><Command size={12} /> PNG, JPG or WebP · max 3 MB</>}</small>
              </form>
            </main>

            <aside className="jarvis-context-panel">
              <div className="jarvis-context-heading"><span>Live Journaly context</span><i /></div>
              <section className="jarvis-context-card jarvis-monitor-card">
                <header><Eye size={16} /><span>Autopilot monitoring</span><b>{monitorItems.length}</b></header>
                {monitorItems.length ? monitorItems.slice(0, 4).map((item) => (
                  <button type="button" key={item.id} onClick={() => askJarvis(item.prompt)}>
                    <i className={`is-${item.priority}`} aria-label={`${item.priority} priority`} />
                    <span><strong>{item.title}</strong><small>{item.detail}</small></span><ChevronRight size={15} />
                  </button>
                )) : <p>Everything I’m monitoring is clear. I’ll surface something here when it becomes actionable.</p>}
              </section>
              <section className="jarvis-context-card jarvis-mission-card">
                <header><Command size={16} /><span>Mission Control</span><b>{missionMemories.length}</b></header>
                {missionMemories.length ? missionMemories.slice(0, 4).map((item) => (
                  <button type="button" key={`${item.category}:${item.key}`} onClick={() => askJarvis(`Give me a natural, concise Mission Control check-in about ${item.key.replaceAll("_", " ")}. Use what you remember, ask about progress if useful, and do not invent details.`)}>
                    <span><strong>{item.key.replaceAll("_", " ")}</strong><small>{item.value}{item.followUpAt ? ` · ${new Date(item.followUpAt).getTime() <= Date.now() ? "follow-up due" : `follow up ${new Date(item.followUpAt).toLocaleDateString()}`}` : ""}</small></span><ChevronRight size={15} />
                  </button>
                )) : <p>Tell Jarvis about a goal, project, routine, date, or life update and it will stay visible here.</p>}
                {recentFeedback.length ? <button type="button" onClick={() => askJarvis("Run a short Jarvis calibration. Use my recent Helpful and Missed it feedback to tell me one thing you have adapted, then continue naturally.")}><span><strong>Self-calibration</strong><small>{recentFeedback.length} feedback note{recentFeedback.length === 1 ? "" : "s"} this week</small></span><ChevronRight size={15} /></button> : null}
              </section>
              <section className="jarvis-context-card is-session">
                <header><Activity size={16} /><span>Market session</span></header>
                <strong>{session.label}</strong>
                <p>{session.detail}</p>
                <div><i className={session.isOpen ? "is-open" : ""} />{session.status}</div>
              </section>
              <section className="jarvis-context-card">
                <header><Target size={16} /><span>Active forecasts</span><b>{activeForecasts.length}</b></header>
                {activeForecasts.length ? activeForecasts.slice(0, 3).map((item) => (
                  <button type="button" key={item.id} onClick={() => askJarvis(`Review my active ${item.pair} forecast using its documented thesis and current status. Do not assume live market conditions.`)}><span><strong>{item.pair}</strong><small>{item.setup}</small></span><ChevronRight size={15} /></button>
                )) : <p>No pairs are waiting for confirmation.</p>}
              </section>
              <section className="jarvis-context-card jarvis-workspace-card">
                <header><BrainCircuit size={16} /><span>Open contexts</span><b>{workspace.contexts.length}</b></header>
                {workspace.contexts.length ? workspace.contexts.slice(0, 5).map((item) => <button className={workspace.focusId === item.id ? "is-focused" : ""} type="button" key={item.id} onClick={() => setAndSyncActiveContext(item)}><span><strong>{item.label}</strong><small>{item.dataSource || "conversation"} · {item.tradeId ? "trade" : item.forecastId ? "forecast" : "analysis"}</small></span><ChevronRight size={15} /></button>) : <p>No active context. Mention a pair or open a forecast.</p>}
              </section>
              <section className="jarvis-context-card jarvis-journey-card">
                <header><Clock size={16} /><span>Trading journey</span><b>{journey.length}</b></header>
                {journey.length ? journey.slice(0, 6).map((event) => <div key={event.id}><i className={`is-${event.kind}`} /><span><strong>{event.title}</strong><small>{event.detail}</small></span></div>) : <p>Your forecast-to-result timeline will build here.</p>}
              </section>
              <section className="jarvis-context-card">
                <header><Gauge size={16} /><span>Execution pulse</span></header>
                <div className="jarvis-quality-gauge" style={{ "--jarvis-gauge": `${qualityRate * 3.6}deg` } as CSSProperties}><strong>{qualityRate}%</strong><small>Good</small></div>
                <p>{reviewedTrades.length ? `${goodTrades} Good executions from ${reviewedTrades.length} reviewed trades.` : "Rate trades to activate your quality pulse."}</p>
              </section>
              <section className="jarvis-context-card is-latest">
                <header><TrendingUp size={16} /><span>Latest trade</span></header>
                {latestTrade ? <button type="button" onClick={() => askJarvis("Analyze my latest trade")}><span><strong>{latestTrade.pair}</strong><small>{latestTrade.setup}</small></span><b className={latestTrade.pnl >= 0 ? "is-positive" : "is-negative"}>{formatR(latestTrade.pnl)}</b></button> : <p>No trades logged yet.</p>}
              </section>
              <div className="jarvis-version"><BookOpenCheck size={15} /><div><strong>Jarvis v0.9</strong><small>Ambient companion / Mission Control / live voice / assisted autonomy</small></div></div>
            </aside>
          </div>
        </section>
      ) : null}
    </>
  );
}

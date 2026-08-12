import {
  Activity,
  ArrowUp,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleDot,
  Command,
  Crosshair,
  Eye,
  Gauge,
  Mic,
  Radio,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

const JARVIS_ORB_POSITION_KEY = "journaly-os-jarvis-orb-position";
const JARVIS_CHAT_KEY_PREFIX = "journaly-os-jarvis-chat";
const JARVIS_MEMORY_KEY_PREFIX = "journaly-os-jarvis-memory-v0.3";
const JARVIS_ORB_MARGIN = 8;
const OWNER_USERNAME = "christian.angelo.desamparado";

type JarvisTrade = {
  id: string;
  date: string;
  time: string;
  pair: string;
  setup: string;
  direction: string;
  pnl: number;
  result: string;
  quality: "Good" | "Mid" | "Bad" | null;
  notes: string;
  screenshot: string;
};

type JarvisForecast = {
  id: string;
  date: string;
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

type JarvisProps = {
  userId: string;
  username: string;
  displayName: string;
  trades: JarvisTrade[];
  forecasts: JarvisForecast[];
  session: JarvisSession;
};

type OrbPosition = { x: number; y: number };

type JarvisMemoryUpdate = {
  operation: "upsert" | "delete";
  category: "identity" | "preference" | "trading_rule" | "risk_rule" | "mistake" | "goal" | "terminology" | "ui_preference";
  key: string;
  value: string;
  confidence: number;
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
      memories: Array.isArray(stored.memories) ? stored.memories.slice(-40) : [],
    };
  } catch {
    return defaults;
  }
}

function applyMemoryUpdates(state: JarvisMemoryState, updates: JarvisMemoryUpdate[]): JarvisMemoryState {
  let preferredName = state.preferredName;
  let memories = [...state.memories];
  updates.filter((update) => update && update.confidence >= 0.7).forEach((update) => {
    const key = update.key.trim().slice(0, 80);
    if (!key) return;
    if (update.category === "identity" && key.toLowerCase().replaceAll("-", "_") === "preferred_name") {
      preferredName = update.operation === "delete" ? null : update.value.trim().slice(0, 80) || null;
    }
    memories = memories.filter((memory) => !(memory.category === update.category && memory.key === key));
    if (update.operation === "upsert") memories.push({ ...update, key, value: update.value.trim().slice(0, 800), updatedAt: new Date().toISOString() });
  });
  return { ...state, preferredName, memories: memories.slice(-40) };
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
      .slice(-30);
  } catch {
    return [];
  }
}

const quickCommands = [
  { label: "Analyze latest trade", prompt: "Analyze my latest trade", icon: Crosshair },
  { label: "Recent mistakes", prompt: "Show me my recent mistakes", icon: Eye },
  { label: "Internal performance", prompt: "How are my Internals doing?", icon: BarChart3 },
  { label: "Active forecasts", prompt: "What am I currently watching?", icon: Radio },
  { label: "Risk check", prompt: "What is my risk right now?", icon: ShieldCheck },
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
        ? `${latestForecast.direction} ${latestForecast.setup} is on watch. ${latestForecast.entryPlan || latestForecast.reasonToTake || latestForecast.notes || "The trigger conditions are not documented yet."} This is a journal-state read, not a live-market signal.`
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
        ? activeForecasts.slice(0, 4).map((item) => `${item.pair}: ${item.setup} ${item.direction.toLowerCase()} — ${item.entryPlan || item.reasonToTake || "waiting for confirmation"}`).join("\n")
        : "There are no forecasts marked Waiting. Log the market read before the move so Journaly can measure forecast quality without hindsight.",
      metrics: activeForecasts.slice(0, 3).map((item) => ({ label: item.pair, value: item.setup })),
    };
  }

  if (lower.includes("risk") || lower.includes("exposure")) {
    const plannedRisk = activeForecasts.reduce((sum, item) => sum + Number(item.riskPercent || 0), 0);
    const currencies = activeForecasts.flatMap((item) => [item.pair.slice(0, 3), item.pair.slice(3)]);
    const concentration = Object.entries(currencies.reduce<Record<string, number>>((counts, currency) => ({ ...counts, [currency]: (counts[currency] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0];
    return {
      title: "Read-only risk check",
      text: activeForecasts.length
        ? `Your waiting forecasts carry ${plannedRisk.toFixed(2)}% documented planned risk. ${concentration?.[1] > 1 ? `${concentration[0]} appears across ${concentration[1]} ideas, so check correlation before arming them together.` : "No obvious currency concentration is present in the current watchlist."} Open-position risk is not connected yet.`
        : "No waiting forecasts are carrying planned risk. Open-position and broker exposure are not connected in Jarvis v0.1, so this is not a live account-risk reading.",
      metrics: [
        { label: "Forecasts", value: String(activeForecasts.length) },
        { label: "Planned risk", value: `${plannedRisk.toFixed(2)}%`, tone: plannedRisk > 2 ? "warn" : "good" },
        { label: "Live execution", value: "Locked", tone: "good" },
      ],
    };
  }

  return null;
}

export default function Jarvis({ userId, username, displayName, trades, forecasts, session }: JarvisProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [orbPosition, setOrbPosition] = useState<OrbPosition | null>(readOrbPosition);
  const [isDraggingOrb, setIsDraggingOrb] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<JarvisMessage[]>(() => readJarvisMessages(userId));
  const [memory, setMemory] = useState<JarvisMemoryState>(() => readJarvisMemory(userId, username));
  const [aiHealth, setAiHealth] = useState<JarvisHealth | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const orbDrag = useRef({ pointerId: -1, offsetX: 0, offsetY: 0, startX: 0, startY: 0, moved: false });

  const reviewedTrades = trades.filter((trade) => trade.quality);
  const goodTrades = reviewedTrades.filter((trade) => trade.quality === "Good").length;
  const activeForecasts = forecasts.filter((item) => item.status === "Waiting");
  const latestTrade = latestFirst(trades)[0];
  const qualityRate = reviewedTrades.length ? Math.round((goodTrades / reviewedTrades.length) * 100) : 0;
  const preferredName = memory.preferredName || displayName || "trader";
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => inputRef.current?.focus(), 350);
    const close = (event: KeyboardEvent) => event.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [isOpen]);

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
    localStorage.setItem(`${JARVIS_CHAT_KEY_PREFIX}:${userId}`, JSON.stringify(messages.slice(-30)));
  }, [messages, userId]);

  useEffect(() => {
    localStorage.setItem(`${JARVIS_MEMORY_KEY_PREFIX}:${userId}`, JSON.stringify(memory));
  }, [memory, userId]);

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

  async function askJarvis(nextPrompt: string) {
    const cleanPrompt = nextPrompt.trim();
    if (!cleanPrompt || isThinking) return;
    const recentHistory = messages.slice(-14).map((message) => ({
      role: message.role === "jarvis" ? "assistant" : "user",
      content: [message.title, message.text].filter(Boolean).join("\n"),
    }));
    const userMessage: JarvisMessage = { id: crypto.randomUUID(), role: "user", text: cleanPrompt };
    setMessages((current) => [...current, userMessage]);
    setPrompt("");
    setIsThinking(true);

    try {
      const orderedTrades = latestFirst(trades);
      const orderedForecasts = latestFirst(forecasts);
      if (!supabase) throw new Error("Journaly authentication is unavailable.");
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Your Journaly session has expired.");
      const requestedPair = getPairFromPrompt(cleanPrompt, orderedTrades.map((trade) => trade.pair));
      const chartTrade = requestedPair
        ? orderedTrades.find((trade) => trade.pair === requestedPair && trade.screenshot)
        : orderedTrades.find((trade) => trade.screenshot);
      const wantsChartReview = /analy[sz]e|chart|screenshot|latest trade|this trade|take this|setup/i.test(cleanPrompt);
      const lastAssistantText = [...messages].reverse().find((message) => message.role === "jarvis")?.text || "";
      const lastDecision = lastAssistantText.match(/\b(TAKE|SKIP|WATCH|ARMED|INVALIDATED|GOOD LOSS|EXECUTION MISTAKE|RULE VIOLATION)\b/i)?.[1]?.toUpperCase() || null;
      const response = await fetch("/api/jarvis/chat", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          userId,
          question: cleanPrompt,
          history: recentHistory,
          chartImage: wantsChartReview ? chartTrade?.screenshot || null : null,
          context: {
            generatedAt: new Date().toISOString(),
            profile: {
              displayName,
              username: normalizedUsername(username),
              preferredName: memory.preferredName,
              preferences: memory.preferences,
              memories: memory.memories,
            },
            marketSession: session,
            summary: {
              totalTrades: trades.length,
              reviewedTrades: reviewedTrades.length,
              goodExecutions: goodTrades,
              activeForecasts: activeForecasts.length,
            },
            sessionState: {
              activePair: chartTrade?.pair || requestedPair || null,
              activeSetup: chartTrade?.setup || null,
              activeTradeId: chartTrade?.id || null,
              activeForecastId: orderedForecasts.find((forecast) => forecast.status === "Waiting" && (!requestedPair || forecast.pair === requestedPair))?.id || null,
              lastChartAvailable: Boolean(chartTrade?.screenshot),
              lastJarvisDecision: lastDecision,
              rollingConversation: recentHistory.slice(-8),
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
            forecasts: orderedForecasts.slice(0, 20).map((forecast) => ({
              date: forecast.date,
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
          },
        }),
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
      if (Array.isArray(payload.memoryUpdates) && payload.memoryUpdates.length) {
        setMemory((current) => applyMemoryUpdates(current, payload.memoryUpdates));
      }
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "jarvis", text: payload.answer },
      ]);
    } catch (error) {
      const failure = error as Error & { category?: string; status?: number; fallbackAllowed?: boolean };
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
      const fallback = buildJarvisResponse(cleanPrompt, trades, forecasts);
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
      setIsThinking(false);
    }
  }

  function submitPrompt(event: FormEvent) {
    event.preventDefault();
    askJarvis(prompt);
  }

  return (
    <>
      <button
        ref={launcherRef}
        className={`jarvis-launcher${isDraggingOrb ? " is-dragging" : ""}`}
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
        }}
      >
        <span className="jarvis-launcher-radar" />
        <span className="jarvis-launcher-orbit" />
        <span className="jarvis-launcher-core"><span>J</span></span>
        <span className="jarvis-launcher-label"><strong>Jarvis</strong><small>{aiHealth?.fallbackActive ? "Limited" : "Online"}</small></span>
      </button>

      {isOpen ? (
        <section className="jarvis-screen" role="dialog" aria-modal="true" aria-label="Jarvis trading intelligence">
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
            <button className="jarvis-close" type="button" aria-label="Close Jarvis" onClick={() => setIsOpen(false)}><X size={20} /></button>
          </header>

          <div className="jarvis-layout">
            <aside className="jarvis-rail">
              <div className="jarvis-rail-title"><Command size={15} /><span>Command center</span></div>
              <nav aria-label="Jarvis sections">
                <button className="is-active" type="button"><Sparkles size={17} /> Intelligence <ChevronRight size={15} /></button>
                <button type="button" onClick={() => askJarvis("What am I currently watching?")}><Target size={17} /> Forecasts <span>{activeForecasts.length}</span></button>
                <button type="button" onClick={() => askJarvis("Show me my recent mistakes")}><Eye size={17} /> Review</button>
                <button type="button" onClick={() => askJarvis("How are my Internals doing?")}><BarChart3 size={17} /> Setup edge</button>
                <button type="button" onClick={() => setMessages([])}><RefreshCcw size={17} /> New conversation</button>
              </nav>

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
                <div><Check size={13} /><p><strong>Post-trade reviews</strong><small>{reviewedTrades.length} quality labels</small></p></div>
                <div><Check size={13} /><p><strong>Forecasts</strong><small>{forecasts.length} decisions indexed</small></p></div>
                <div><Check size={13} /><p><strong>Strategy transfer pack</strong><small>PPA-first rules loaded</small></p></div>
                <div><Check size={13} /><p><strong>Visual setup library</strong><small>53 unique charts audited</small></p></div>
                <div><Check size={13} /><p><strong>Personal memory</strong><small>{memory.memories.length} durable note{memory.memories.length === 1 ? "" : "s"} · user-isolated</small></p></div>
                <div className="is-pending"><CircleDot size={13} /><p><strong>Live market data</strong><small>Future connection</small></p></div>
              </div>

              <div className="jarvis-safety-card"><ShieldCheck size={18} /><div><strong>Read-only mode</strong><p>Jarvis cannot place or modify trades.</p></div></div>
            </aside>

            <main className="jarvis-conversation">
              <div className="jarvis-feed">
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
                    <p>Talk to me naturally about trading. I know your strategy rules and Journaly history, whether you want a setup read, an honest review, or simply a second mind beside you.</p>
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
                          <p>{message.text}</p>
                          {message.metrics?.length ? <div className="jarvis-response-metrics">{message.metrics.map((metric) => <div className={metric.tone ? `is-${metric.tone}` : ""} key={`${metric.label}-${metric.value}`}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div> : null}
                        </div>
                      </article>
                    ))}
                    {isThinking ? <div className="jarvis-thinking"><span /><span /><span /><small>Thinking with your strategy</small></div> : null}
                  </div>
                )}
              </div>

              <form className="jarvis-composer" onSubmit={submitPrompt}>
                <button className="jarvis-mic" type="button" title="Voice arrives in a future Jarvis phase" aria-label="Voice mode is coming in a future phase"><Mic size={19} /></button>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={prompt}
                  placeholder="Ask Jarvis about your trading..."
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      askJarvis(prompt);
                    }
                  }}
                />
                <button className="jarvis-send" type="submit" disabled={!prompt.trim() || isThinking} aria-label="Send to Jarvis"><ArrowUp size={19} /></button>
                <small><Command size={12} /> Enter to send · Shift + Enter for a new line</small>
              </form>
            </main>

            <aside className="jarvis-context-panel">
              <div className="jarvis-context-heading"><span>Live Journaly context</span><i /></div>
              <section className="jarvis-context-card is-session">
                <header><Activity size={16} /><span>Market session</span></header>
                <strong>{session.label}</strong>
                <p>{session.detail}</p>
                <div><i className={session.isOpen ? "is-open" : ""} />{session.status}</div>
              </section>
              <section className="jarvis-context-card">
                <header><Target size={16} /><span>Active forecasts</span><b>{activeForecasts.length}</b></header>
                {activeForecasts.length ? activeForecasts.slice(0, 3).map((item) => (
                  <button type="button" key={item.id} onClick={() => askJarvis(`Check ${item.pair}`)}><span><strong>{item.pair}</strong><small>{item.setup}</small></span><ChevronRight size={15} /></button>
                )) : <p>No pairs are waiting for confirmation.</p>}
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
              <div className="jarvis-version"><BookOpenCheck size={15} /><div><strong>Jarvis v0.3</strong><small>Conversational · visual · personal memory · read-only</small></div></div>
            </aside>
          </div>
        </section>
      ) : null}
    </>
  );
}

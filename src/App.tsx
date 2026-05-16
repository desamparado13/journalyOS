import {
  Activity,
  Award,
  BarChart3,
  Brain,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleSlash2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Gauge,
  ImagePlus,
  Info,
  ListChecks,
  Maximize2,
  MessageSquareText,
  Minimize2,
  LogOut,
  Moon,
  Pencil,
  Percent,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  FlaskConical,
  TriangleAlert,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { supabase, supabaseConfig } from "./supabaseClient";

const THEME_KEY = "journaly-os-theme";
const PROFILE_SIZING_KEY = "journaly-os-profile-sizing";
const AI_COACH_USAGE_KEY = "journaly-os-ai-coach-usage";
const DARA_GREETING_KEY = "journaly-os-dara-greeting-date";
const DARA_WINDOW_KEY = "journaly-os-dara-window";
const IMPORT_BATCH_SIZE = 8;
const AI_COACH_BUDGET = 5;

const pairs = ["AUDUSD", "EURUSD", "EURJPY", "AUDJPY", "GBPUSD", "NZDJPY", "EURAUD"] as const;
const setups = [
  "REVERSAL",
  "Internal reversal",
  "Liquidity sweep",
  "Break and retest",
  "Flag",
  "Flag+",
  "EU timed entry",
] as const;
const results = ["Win", "Loss", "Breakeven"] as const;

type AuthMode = "login" | "signup";
type Direction = "Long" | "Short";
type Result = (typeof results)[number];
type Theme = "light" | "dark";
type AppView =
  | "dashboard"
  | "add-trade"
  | "position-sizing"
  | "trade-analytics"
  | "view-trades"
  | "trade-calendar"
  | "monthly-heatmap"
  | "trade-performance"
  | "yearly-comparison"
  | "ai-coach"
  | "backtesting-analytics"
  | "add-backtest"
  | "view-backtests";

type SessionUser = {
  id: string;
  email: string;
};

type Trade = {
  id: string;
  userId: string;
  date: string;
  time: string;
  pair: string;
  setup: string;
  direction: Direction;
  mae: number;
  pnl: number;
  result: Result;
  notes: string;
  screenshot: string;
  sourceApp: string | null;
  legacyId: number | null;
  durationMinutes: number | null;
  stopLossPips: number | null;
  maePips: number | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TradeRow = {
  id: string;
  user_id: string;
  trade_date: string;
  trade_time: string;
  pair: string;
  setup: string;
  direction: Direction;
  mae: number | string;
  pnl_r: number | string;
  result: Result;
  notes: string | null;
  screenshot_url: string | null;
  source_app: string | null;
  legacy_id: number | null;
  duration_minutes: number | null;
  stop_loss_pips: number | string | null;
  mae_pips: number | string | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
};

type Backtest = {
  id: string;
  userId: string;
  date: string;
  time: string;
  pair: string;
  setup: string;
  direction: Direction;
  durationMinutes: number | null;
  stopLossPips: number | null;
  maePips: number | null;
  pnl: number;
  result: Result;
  notes: string;
  scaleIn: string;
  screenshot: string;
  sourceApp: string | null;
  legacyId: number | null;
  createdAt: string;
  updatedAt: string;
};

type JournalItem = {
  id: string;
  date: string;
  time: string;
  pair: string;
  setup: string;
  direction: Direction;
  pnl: number;
  result: Result;
  source: "Live trade" | "Backtest";
};

type YearlyComparisonRow = {
  year: string;
  samples: number;
  liveTrades: number;
  backtests: number;
  totalR: number;
  liveR: number;
  backtestR: number;
  winRate: number;
  expectancy: number;
  profitFactor: number;
  maxDrawdown: number;
  averageWin: number;
  averageLoss: number;
  bestMonth?: { month: string; totalR: number };
  worstMonth?: { month: string; totalR: number };
};

type YearlyDimensionRow = {
  label: string;
  totalR: number;
  samples: number;
  bestYear?: string;
  worstYear?: string;
  years: Record<string, { totalR: number; samples: number; winRate: number; expectancy: number }>;
};

type BacktestRow = {
  id: string;
  user_id: string;
  trade_date: string;
  trade_time: string;
  pair: string;
  setup: string;
  direction: Direction;
  duration_minutes: number | null;
  stop_loss_pips: number | string | null;
  mae_pips: number | string | null;
  pnl_r: number | string;
  result: Result;
  notes: string | null;
  scale_in: string | null;
  screenshot_url: string | null;
  source_app: string | null;
  legacy_id: number | null;
  created_at: string;
  updated_at: string;
};

type JournalyV2Trade = {
  legacy_id: number;
  trade_date: string;
  trade_time: string;
  pair: string;
  setup_type: string;
  direction: Direction;
  duration_minutes: number | null;
  stop_loss_pips: number | null;
  mae_pips: number | null;
  pnl_r: number;
  result: Result;
  notes: string | null;
  post_image: null | {
    original_path?: string | null;
    archive_path?: string | null;
    filename?: string | null;
    missing?: boolean;
  };
  finalized_at: string | null;
  created_at: string | null;
};

type JournalyV2Export = {
  schema: string;
  schema_version: number;
  counts?: {
    trades?: number;
    post_images_included?: number;
    post_images_missing?: number;
  };
  trades: JournalyV2Trade[];
};

type JournalyV2Backtest = {
  legacy_id: number;
  trade_date: string;
  trade_time?: string | null;
  pair: string;
  setup_type: string;
  direction: Direction;
  duration_minutes: number | null;
  stop_loss_pips: number | null;
  mae_pips: number | null;
  pnl_r: number;
  result: Result;
  notes: string | null;
  scale_in: string | null;
  screenshot: null | {
    original_path?: string | null;
    archive_path?: string | null;
    filename?: string | null;
    missing?: boolean;
  };
  created_at: string | null;
};

type JournalyV2BacktestExport = {
  schema: string;
  schema_version: number;
  counts?: {
    backtests?: number;
    screenshots_included?: number;
    screenshots_missing?: number;
  };
  backtests: JournalyV2Backtest[];
};

type ImportSummary = {
  exportTrades: number;
  imported: number;
  skipped: number;
  imagesImported: number;
  imagesMissing: number;
  failed: number;
};

type ToastState = {
  tone: "success" | "error" | "info";
  title: string;
  message: string;
};

type MarketSessionState = {
  isOpen: boolean;
  label: string;
  status: string;
  detail: string;
  timeLabel: string;
};

type AICoachUsage = {
  spent: number;
  inputTokens: number;
  outputTokens: number;
  requests: number;
};

type CoachMonthlyInsight = {
  month: string;
  totalSamples: number;
  liveSamples: number;
  backtestSamples: number;
  totalR: number;
  expectancy: number;
  weeklyExpectation: number;
  expectedMonthlyTrades: number;
  projectedMonthlyR: number;
  maxExpectedDrawdown: number;
  maxProfitThisMonth: number;
  finishLow: number;
  finishHigh: number;
};

type DaraWindowState = {
  x: number;
  y: number;
  width: number;
  height: number;
  isOpen: boolean;
  isMaximized: boolean;
  previous?: { x: number; y: number; width: number; height: number };
};

type TradeFormState = {
  id: string;
  date: string;
  time: string;
  pair: string;
  setup: string;
  direction: Direction;
  mae: string;
  pnl: string;
  result: Result;
  notes: string;
  screenshotFile: File | null;
};

type PositionCalculatorState = {
  pair: string;
  accountBalance: string;
  riskPercent: string;
  entryPrice: string;
  stopLossPrice: string;
  takeProfitPrice: string;
  quoteToUsdRate: string;
};

type ProfileSizingRow = {
  id: string;
  balance: string;
  type: string;
  platform: string;
  riskPercent: string;
};

type BacktestFormState = {
  id: string;
  date: string;
  time: string;
  pair: string;
  setup: string;
  direction: Direction;
  durationMinutes: string;
  stopLossPips: string;
  maePips: string;
  pnl: string;
  result: Result;
  notes: string;
  scaleIn: string;
  screenshotFile: File | null;
};

type AuthFormState = {
  email: string;
  password: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function todayDefaults(): TradeFormState {
  const now = new Date();

  return {
    id: "",
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    pair: pairs[0],
    setup: setups[0],
    direction: "Long",
    mae: "0",
    pnl: "0",
    result: "Win",
    notes: "",
    screenshotFile: null,
  };
}

function positionDefaults(): PositionCalculatorState {
  return {
    pair: "AUDJPY",
    accountBalance: "10000",
    riskPercent: "1",
    entryPrice: "",
    stopLossPrice: "",
    takeProfitPrice: "",
    quoteToUsdRate: "",
  };
}

function defaultProfileRows(): ProfileSizingRow[] {
  return [
    { id: crypto.randomUUID(), balance: "1000", type: "Main", platform: "Exness", riskPercent: "1.5" },
    { id: crypto.randomUUID(), balance: "2000", type: "Keth", platform: "Holaprime", riskPercent: "1" },
    { id: crypto.randomUUID(), balance: "5000", type: "Funded", platform: "MT5, DXtrade...", riskPercent: "1" },
    { id: crypto.randomUUID(), balance: "10000", type: "Challenge", platform: "MT5, DXtrade...", riskPercent: "1" },
  ];
}

function backtestDefaults(): BacktestFormState {
  const now = new Date();

  return {
    id: "",
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    pair: pairs[0],
    setup: setups[0],
    direction: "Long",
    durationMinutes: "",
    stopLossPips: "",
    maePips: "",
    pnl: "0",
    result: "Win",
    notes: "",
    scaleIn: "No",
    screenshotFile: null,
  };
}

function fileToDataUrl(file: File | null) {
  return new Promise<string>((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatNumber(value: number) {
  return Number(value || 0).toFixed(2);
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function isCurrentMonth(month: string) {
  return month === new Date().toISOString().slice(0, 7);
}

function formatMonthWithCurrent(month: string) {
  return `${formatMonthLabel(month)}${isCurrentMonth(month) ? " (Current month)" : ""}`;
}

function formatMonthDayYear(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getQuarterLabel(month: string) {
  const monthNumber = Number(month.slice(5, 7));
  return `Q${Math.ceil(monthNumber / 3)}`;
}

function parseTradeDate(trade: Trade) {
  const [year, month, day] = trade.date.split("-").map(Number);
  const [hour = 0, minute = 0] = trade.time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

function parseDatedItemDate(item: { date: string; time: string; legacyId?: number | null }) {
  const [year, month, day] = item.date.split("-").map(Number);
  const [hour = 0, minute = 0] = item.time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, item.legacyId || 0);
}

function daysSinceTrade(trade: Trade | undefined) {
  if (!trade) return "No trades yet";

  const tradedAt = parseTradeDate(trade);
  const today = new Date();
  const tradedDay = new Date(tradedAt.getFullYear(), tradedAt.getMonth(), tradedAt.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.max(
    0,
    Math.floor((todayDay.getTime() - tradedDay.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return days === 1 ? "1 day" : `${days} days`;
}

function toJournalItems(trades: Trade[], backtests: Backtest[]): JournalItem[] {
  return [
    ...trades.map((trade) => ({
      id: trade.id,
      date: trade.date,
      time: trade.time,
      pair: trade.pair,
      setup: trade.setup,
      direction: trade.direction,
      pnl: trade.pnl,
      result: trade.result,
      source: "Live trade" as const,
    })),
    ...backtests.map((backtest) => ({
      id: backtest.id,
      date: backtest.date,
      time: backtest.time,
      pair: backtest.pair,
      setup: backtest.setup,
      direction: backtest.direction,
      pnl: backtest.pnl,
      result: backtest.result,
      source: "Backtest" as const,
    })),
  ];
}

function summarizeJournalItems(year: string, items: JournalItem[]): YearlyComparisonRow {
  const ordered = [...items].sort(
    (a, b) => parseDatedItemDate(a).getTime() - parseDatedItemDate(b).getTime(),
  );
  const wins = ordered.filter((item) => item.pnl > 0);
  const losses = ordered.filter((item) => item.pnl < 0);
  const totalR = ordered.reduce((sum, item) => sum + item.pnl, 0);
  const liveR = ordered
    .filter((item) => item.source === "Live trade")
    .reduce((sum, item) => sum + item.pnl, 0);
  const backtestR = ordered
    .filter((item) => item.source === "Backtest")
    .reduce((sum, item) => sum + item.pnl, 0);
  const grossWin = wins.reduce((sum, item) => sum + item.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, item) => sum + item.pnl, 0));
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const byMonth = ordered.reduce<Record<string, number>>((months, item) => {
    const month = item.date.slice(0, 7);
    months[month] = (months[month] || 0) + item.pnl;
    return months;
  }, {});

  ordered.forEach((item) => {
    equity += item.pnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  });

  const monthRows = Object.entries(byMonth).map(([month, monthTotal]) => ({ month, totalR: monthTotal }));

  return {
    year,
    samples: ordered.length,
    liveTrades: ordered.filter((item) => item.source === "Live trade").length,
    backtests: ordered.filter((item) => item.source === "Backtest").length,
    totalR,
    liveR,
    backtestR,
    winRate: ordered.length === 0 ? 0 : Math.round((wins.length / ordered.length) * 100),
    expectancy: ordered.length === 0 ? 0 : totalR / ordered.length,
    profitFactor: grossLoss === 0 ? grossWin : grossWin / grossLoss,
    maxDrawdown,
    averageWin: wins.length === 0 ? 0 : grossWin / wins.length,
    averageLoss: losses.length === 0 ? 0 : grossLoss / losses.length,
    bestMonth: [...monthRows].sort((a, b) => b.totalR - a.totalR)[0],
    worstMonth: [...monthRows].sort((a, b) => a.totalR - b.totalR)[0],
  };
}

function buildYearlyDimensionRows(items: JournalItem[], years: string[], key: "pair" | "setup"): YearlyDimensionRow[] {
  const labels = Array.from(new Set(items.map((item) => item[key]))).sort();

  return labels
    .map((label) => {
      const labelItems = items.filter((item) => item[key] === label);
      const yearStats = years.reduce<YearlyDimensionRow["years"]>((stats, year) => {
        const yearItems = labelItems.filter((item) => item.date.startsWith(year));
        const wins = yearItems.filter((item) => item.pnl > 0);
        const totalR = yearItems.reduce((sum, item) => sum + item.pnl, 0);

        stats[year] = {
          totalR,
          samples: yearItems.length,
          winRate: yearItems.length === 0 ? 0 : Math.round((wins.length / yearItems.length) * 100),
          expectancy: yearItems.length === 0 ? 0 : totalR / yearItems.length,
        };
        return stats;
      }, {});
      const activeYears = Object.entries(yearStats)
        .filter(([, stat]) => stat.samples > 0)
        .sort((a, b) => b[1].totalR - a[1].totalR);

      return {
        label,
        totalR: labelItems.reduce((sum, item) => sum + item.pnl, 0),
        samples: labelItems.length,
        bestYear: activeYears[0]?.[0],
        worstYear: [...activeYears].sort((a, b) => a[1].totalR - b[1].totalR)[0]?.[0],
        years: yearStats,
      };
    })
    .filter((row) => row.samples > 0)
    .sort((a, b) => b.totalR - a.totalR);
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) return 0;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function buildCoachMonthlyInsight(items: JournalItem[], now: Date): CoachMonthlyInsight {
  const currentMonth = now.toISOString().slice(0, 7);
  const monthItems = items
    .filter((item) => item.date.startsWith(currentMonth))
    .sort((a, b) => parseDatedItemDate(a).getTime() - parseDatedItemDate(b).getTime());
  const totalR = monthItems.reduce((sum, item) => sum + item.pnl, 0);
  const pnlValues = monthItems.map((item) => item.pnl);
  const expectancy = monthItems.length === 0 ? 0 : totalR / monthItems.length;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsedDays = Math.max(1, now.getDate());
  const expectedMonthlyTrades = Math.round(monthItems.length * (daysInMonth / elapsedDays));
  const expectedWeeklyTrades = monthItems.length === 0 ? 0 : (monthItems.length / elapsedDays) * 7;
  const weeklyExpectation = expectancy * expectedWeeklyTrades;
  const remainingTrades = Math.max(0, expectedMonthlyTrades - monthItems.length);
  const projectedMonthlyR = totalR + expectancy * remainingTrades;
  const deviation = standardDeviation(pnlValues);
  const projectionBand = deviation * Math.sqrt(Math.max(1, remainingTrades));
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let maxProfit = 0;

  monthItems.forEach((item) => {
    equity += item.pnl;
    peak = Math.max(peak, equity);
    maxProfit = Math.max(maxProfit, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  });

  return {
    month: currentMonth,
    totalSamples: monthItems.length,
    liveSamples: monthItems.filter((item) => item.source === "Live trade").length,
    backtestSamples: monthItems.filter((item) => item.source === "Backtest").length,
    totalR,
    expectancy,
    weeklyExpectation,
    expectedMonthlyTrades,
    projectedMonthlyR,
    maxExpectedDrawdown: Math.max(maxDrawdown, deviation * Math.sqrt(Math.max(1, expectedMonthlyTrades)) * 0.75),
    maxProfitThisMonth: maxProfit,
    finishLow: projectedMonthlyR - projectionBand,
    finishHigh: projectedMonthlyR + projectionBand,
  };
}

function buildCoachContext({
  trades,
  backtests,
  stats,
  tradeAnalytics,
  performance,
  monthlyHeatmap,
  marketSession,
}: {
  trades: Trade[];
  backtests: Backtest[];
  stats: any;
  tradeAnalytics: any;
  performance: any;
  monthlyHeatmap: any;
  marketSession: MarketSessionState;
}) {
  const journalItems = toJournalItems(trades, backtests);
  const monthlyInsight = buildCoachMonthlyInsight(journalItems, new Date());
  const journalRows = journalItems
    .sort((a, b) => parseDatedItemDate(b).getTime() - parseDatedItemDate(a).getTime())
    .map((item) => ({
      d: item.date,
      t: item.time,
      p: item.pair,
      s: item.setup,
      dir: item.direction,
      r: item.pnl,
      result: item.result,
      source: item.source,
    }));

  return {
    note: "journalRows are compact trade/backtest records: d=date, t=time, p=pair, s=setup, dir=direction, r=PnL in R.",
    coachName: "Dara",
    stats,
    tradeAnalytics,
    performance,
    monthlyHeatmap,
    monthlyInsight,
    marketSession: {
      label: marketSession.label,
      status: marketSession.status,
    },
    journalRows,
  };
}

function getPreferredTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readProfileRows() {
  try {
    const rows = JSON.parse(localStorage.getItem(PROFILE_SIZING_KEY) || "");
    return Array.isArray(rows) && rows.length > 0 ? (rows as ProfileSizingRow[]) : defaultProfileRows();
  } catch {
    return defaultProfileRows();
  }
}

function readAICoachUsage(): AICoachUsage {
  try {
    const usage = JSON.parse(localStorage.getItem(AI_COACH_USAGE_KEY) || "");
    return {
      spent: Number(usage.spent || 0),
      inputTokens: Number(usage.inputTokens || 0),
      outputTokens: Number(usage.outputTokens || 0),
      requests: Number(usage.requests || 0),
    };
  } catch {
    return { spent: 0, inputTokens: 0, outputTokens: 0, requests: 0 };
  }
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function defaultDaraWindow(): DaraWindowState {
  const width = 360;
  const height = 430;
  const viewportWidth = typeof window === "undefined" ? 1180 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 760 : window.innerHeight;

  return {
    x: Math.max(12, viewportWidth - width - 24),
    y: Math.max(12, viewportHeight - height - 24),
    width,
    height,
    isOpen: false,
    isMaximized: false,
  };
}

function normalizeDaraWindow(state: DaraWindowState): DaraWindowState {
  const viewportWidth = typeof window === "undefined" ? 1180 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 760 : window.innerHeight;
  const minWidth = state.isOpen ? 320 : 112;
  const minHeight = state.isOpen ? 260 : 48;
  const width = state.isOpen ? clampNumber(Number(state.width || 360), minWidth, viewportWidth - 24) : 112;
  const height = state.isOpen ? clampNumber(Number(state.height || 430), minHeight, viewportHeight - 24) : 48;

  return {
    ...state,
    width,
    height,
    x: clampNumber(Number(state.x || 12), 12, Math.max(12, viewportWidth - width - 12)),
    y: clampNumber(Number(state.y || 12), 12, Math.max(12, viewportHeight - height - 12)),
  };
}

function readDaraWindow(): DaraWindowState {
  try {
    const saved = JSON.parse(localStorage.getItem(DARA_WINDOW_KEY) || "");
    return normalizeDaraWindow({ ...defaultDaraWindow(), ...saved });
  } catch {
    return defaultDaraWindow();
  }
}

function toTrade(row: TradeRow): Trade {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.trade_date,
    time: String(row.trade_time).slice(0, 5),
    pair: row.pair,
    setup: row.setup,
    direction: row.direction,
    mae: Number(row.mae || 0),
    pnl: Number(row.pnl_r || 0),
    result: row.result,
    notes: row.notes || "",
    screenshot: row.screenshot_url || "",
    sourceApp: row.source_app,
    legacyId: row.legacy_id,
    durationMinutes: row.duration_minutes,
    stopLossPips: row.stop_loss_pips === null ? null : Number(row.stop_loss_pips),
    maePips: row.mae_pips === null ? null : Number(row.mae_pips),
    finalizedAt: row.finalized_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toBacktest(row: BacktestRow): Backtest {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.trade_date,
    time: String(row.trade_time).slice(0, 5),
    pair: row.pair,
    setup: row.setup,
    direction: row.direction,
    durationMinutes: row.duration_minutes,
    stopLossPips: row.stop_loss_pips === null ? null : Number(row.stop_loss_pips),
    maePips: row.mae_pips === null ? null : Number(row.mae_pips),
    pnl: Number(row.pnl_r || 0),
    result: row.result,
    notes: row.notes || "",
    scaleIn: row.scale_in || "No",
    screenshot: row.screenshot_url || "",
    sourceApp: row.source_app,
    legacyId: row.legacy_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeLegacySetup(setup: string) {
  const setupMap: Record<string, string> = {
    "break and retest": "Break and retest",
    flag: "Flag",
    "flag+": "Flag+",
    "internal reversal": "Internal reversal",
    "liquidity sweep": "Liquidity sweep",
    reversal: "REVERSAL",
    "eu timed entry": "EU timed entry",
  };

  return setupMap[setup.trim().toLowerCase()] || "REVERSAL";
}

function normalizeTime(time: string) {
  return time.slice(0, 5);
}

function toSupabaseTimestamp(value: string | null) {
  if (!value) return null;
  return value.includes("T") ? value : value.replace(" ", "T");
}

function mimeFromName(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/png";
}

function getPipSize(pair: string) {
  return pair.endsWith("JPY") ? 0.01 : 0.0001;
}

function getQuoteCurrency(pair: string) {
  return pair.slice(3, 6);
}

function getPipValuePerStandardLot(pair: string, quoteToUsdRate: number) {
  const quote = getQuoteCurrency(pair);
  const pipValueInQuote = 100000 * getPipSize(pair);
  return quote === "USD" ? pipValueInQuote : pipValueInQuote * quoteToUsdRate;
}

function calculatePositionSize({
  pair,
  balance,
  riskPercent,
  entryPrice,
  stopLossPrice,
  quoteToUsdRate,
}: {
  pair: string;
  balance: number;
  riskPercent: number;
  entryPrice: number;
  stopLossPrice: number;
  quoteToUsdRate: number;
}) {
  const pipSize = getPipSize(pair);
  const stopPips = Math.abs(entryPrice - stopLossPrice) / pipSize;
  const riskAmount = balance * (riskPercent / 100);
  const pipValue = getPipValuePerStandardLot(pair, quoteToUsdRate);
  const lots = stopPips > 0 && pipValue > 0 ? riskAmount / (stopPips * pipValue) : 0;

  return {
    lots,
    riskAmount,
    stopPips,
    units: lots * 100000,
    miniLots: lots * 10,
    microLots: lots * 100,
  };
}

function getQuoteRateHelp(pair: string) {
  const quote = getQuoteCurrency(pair);

  if (quote === "USD") return "Quote currency is USD, so this rate is fixed at 1.";
  if (quote === "JPY") {
    return `For ${pair}, use the current USDJPY price and enter 1 / USDJPY. Example: if USDJPY = 150.00, enter 0.00667.`;
  }
  if (quote === "AUD") {
    return `For ${pair}, enter the current AUDUSD price as the quote currency to USD rate.`;
  }

  return `Enter the current ${quote}USD conversion rate.`;
}

function getMarketSession(now: Date): MarketSessionState {
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;
  const marketOpen = !(
    day === 0 ||
    (day === 1 && totalMinutes < 5 * 60) ||
    (day === 6 && totalMinutes >= 5 * 60)
  );
  const timeLabel = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!marketOpen) {
    return {
      isOpen: false,
      label: "Market closed",
      status: "Weekend",
      detail: "Forex reopens Monday 5:00 AM local time.",
      timeLabel,
    };
  }

  const sessions = [
    { name: "Sydney", start: 5 * 60, end: 14 * 60 },
    { name: "Asian", start: 7 * 60, end: 16 * 60 },
    { name: "London", start: 15 * 60, end: 24 * 60 },
    { name: "New York", start: 20 * 60, end: 29 * 60 },
  ];
  const activeSessions = sessions
    .filter((session) => {
      const adjustedNow = totalMinutes < 5 * 60 ? totalMinutes + 24 * 60 : totalMinutes;
      return adjustedNow >= session.start && adjustedNow < session.end;
    })
    .map((session) => session.name);

  return {
    isOpen: true,
    label: activeSessions.length > 0 ? activeSessions.join(" + ") : "Transition",
    status: "Market open",
    detail: activeSessions.length > 1 ? "Session overlap active" : "Active trading session",
    timeLabel,
  };
}

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

export default function App() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authForm, setAuthForm] = useState<AuthFormState>({ email: "", password: "" });
  const [authMessage, setAuthMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [theme, setTheme] = useState<Theme>(getPreferredTheme);
  const [tradeForm, setTradeForm] = useState<TradeFormState>(todayDefaults);
  const [positionCalculator, setPositionCalculator] = useState<PositionCalculatorState>(positionDefaults);
  const [profileRows, setProfileRows] = useState<ProfileSizingRow[]>(readProfileRows);
  const [profileMode, setProfileMode] = useState<"main" | "half">("main");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [backtestForm, setBacktestForm] = useState<BacktestFormState>(backtestDefaults);
  const [backtests, setBacktests] = useState<Backtest[]>([]);
  const [resultFilter, setResultFilter] = useState<"All" | Result>("All");
  const [pairFilter, setPairFilter] = useState("All");
  const [tradeCalendarMonth, setTradeCalendarMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [yearlyCompareYear, setYearlyCompareYear] = useState(() => new Date().getFullYear().toString());
  const [backtestResultFilter, setBacktestResultFilter] = useState<"All" | Result>("All");
  const [backtestPairFilter, setBacktestPairFilter] = useState("All");
  const [backtestSetupFilter, setBacktestSetupFilter] = useState("All");
  const [backtestYearFilter, setBacktestYearFilter] = useState("All");
  const [backtestMonthFilter, setBacktestMonthFilter] = useState("All");
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [imageViewer, setImageViewer] = useState<{ src: string; alt: string } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pendingDeleteTrade, setPendingDeleteTrade] = useState<Trade | null>(null);
  const [sessionNow, setSessionNow] = useState(() => new Date());
  const marketSession = useMemo(() => getMarketSession(sessionNow), [sessionNow]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!supabase) {
      setIsBooting(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const user = data.session?.user;
      setCurrentUser(user ? { id: user.id, email: user.email || "" } : null);
      setIsBooting(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setCurrentUser(user ? { id: user.id, email: user.email || "" } : null);
      setAuthForm({ email: "", password: "" });
      setAuthMessage("");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setTrades([]);
      setBacktests([]);
      setSyncMessage("");
      return;
    }

    loadTrades();
    setTradeForm(todayDefaults());
    setBacktestForm(backtestDefaults());
  }, [currentUser]);

  useEffect(() => {
    if (
      currentUser &&
      (activeView === "backtesting-analytics" ||
        activeView === "add-backtest" ||
        activeView === "view-backtests" ||
        activeView === "yearly-comparison") &&
      backtests.length === 0
    ) {
      loadBacktests();
    }
  }, [activeView, currentUser]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setImageViewer(null);
        setPendingDeleteTrade(null);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timeoutId = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setSessionNow(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const now = new Date();
    if (now.getHours() >= 12) return;

    const today = now.toISOString().slice(0, 10);
    if (localStorage.getItem(DARA_GREETING_KEY) === today) return;

    localStorage.setItem(DARA_GREETING_KEY, today);
    showToast({
      tone: "info",
      title: "Good morning, I'm Dara",
      message: `I'm here with your journal today. ${marketSession.status}: ${marketSession.label}.`,
    });
  }, [currentUser, marketSession.label, marketSession.status]);

  const filteredTrades = useMemo(() => {
    return trades
      .filter((trade) => resultFilter === "All" || trade.result === resultFilter)
      .filter((trade) => pairFilter === "All" || trade.pair === pairFilter)
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }, [pairFilter, resultFilter, trades]);

  const recentTrades = useMemo(() => {
    return [...trades]
      .sort((a, b) => parseTradeDate(b).getTime() - parseTradeDate(a).getTime())
      .slice(0, 5);
  }, [trades]);

  const stats = useMemo(() => {
    const ordered = [...trades].sort(
      (a, b) => parseDatedItemDate(a).getTime() - parseDatedItemDate(b).getTime(),
    );
    const wins = ordered.filter((trade) => trade.pnl > 0);
    const losses = ordered.filter((trade) => trade.pnl < 0);
    const totalR = ordered.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
    const grossWin = wins.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;

    ordered.forEach((trade) => {
      equity += trade.pnl;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
    });

    return {
      totalTrades: ordered.length,
      winRate: ordered.length === 0 ? 0 : Math.round((wins.length / ordered.length) * 100),
      totalR,
      profitFactor: grossLoss === 0 ? grossWin : grossWin / grossLoss,
      maxDrawdown,
      daysSinceLastTrade: daysSinceTrade(recentTrades[0]),
      healthLabel: trades.length === 0 ? "Ready" : totalR >= 0 ? "Profitable" : "Review needed",
    };
  }, [recentTrades, trades]);

  const positionSize = useMemo(() => {
    const quote = getQuoteCurrency(positionCalculator.pair);
    const quoteToUsdRate = quote === "USD" ? 1 : Number(positionCalculator.quoteToUsdRate || 0);

    return calculatePositionSize({
      pair: positionCalculator.pair,
      balance: Number(positionCalculator.accountBalance || 0),
      riskPercent: Number(positionCalculator.riskPercent || 0),
      entryPrice: Number(positionCalculator.entryPrice || 0),
      stopLossPrice: Number(positionCalculator.stopLossPrice || 0),
      quoteToUsdRate,
    });
  }, [positionCalculator]);

  const tradeAnalytics = useMemo(() => {
    const ordered = [...trades].sort(
      (a, b) => parseDatedItemDate(a).getTime() - parseDatedItemDate(b).getTime(),
    );
    const wins = ordered.filter((trade) => trade.pnl > 0);
    const losses = ordered.filter((trade) => trade.pnl < 0);
    const totalR = ordered.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossWin = wins.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
    const expectancy = ordered.length === 0 ? 0 : totalR / ordered.length;
    const averageWin = wins.length === 0 ? 0 : grossWin / wins.length;
    const averageLoss = losses.length === 0 ? 0 : grossLoss / losses.length;
    let equity = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let bestWinStreak = 0;
    let worstLossStreak = 0;

    const equityPoints = ordered.map((trade) => {
      equity += trade.pnl;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);

      if (trade.pnl > 0) {
        currentWinStreak += 1;
        currentLossStreak = 0;
      } else if (trade.pnl < 0) {
        currentLossStreak += 1;
        currentWinStreak = 0;
      }

      bestWinStreak = Math.max(bestWinStreak, currentWinStreak);
      worstLossStreak = Math.max(worstLossStreak, currentLossStreak);

      return {
        label: `${trade.date} ${trade.pair}`,
        value: equity,
      };
    });

    return {
      total: ordered.length,
      totalR,
      winRate: ordered.length === 0 ? 0 : Math.round((wins.length / ordered.length) * 100),
      profitFactor: grossLoss === 0 ? grossWin : grossWin / grossLoss,
      expectancy,
      maxDrawdown,
      averageWin,
      averageLoss,
      bestWinStreak,
      worstLossStreak,
      equityPoints,
    };
  }, [trades]);

  const tradeCalendarMonthOptions = useMemo(() => {
    const months = Array.from(new Set(trades.map((trade) => trade.date.slice(0, 7)))).sort().reverse();
    return months.length > 0 ? months : [tradeCalendarMonth];
  }, [tradeCalendarMonth, trades]);

  const tradeCalendarDays = useMemo(() => {
    const [year, month] = tradeCalendarMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const leadingBlanks = firstDay.getDay();
    const tradesByDate = trades.reduce<Record<string, Trade[]>>((grouped, trade) => {
      if (trade.date.startsWith(tradeCalendarMonth)) {
        grouped[trade.date] = [...(grouped[trade.date] || []), trade];
      }
      return grouped;
    }, {});

    return [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const date = `${tradeCalendarMonth}-${String(day).padStart(2, "0")}`;
        const dayTrades = tradesByDate[date] || [];
        const totalR = dayTrades.reduce((sum, trade) => sum + trade.pnl, 0);

        return {
          date,
          day,
          trades: dayTrades,
          totalR,
        };
      }),
    ];
  }, [tradeCalendarMonth, trades]);

  const monthlyHeatmap = useMemo(() => {
    const byMonth = trades.reduce<Record<string, Trade[]>>((grouped, trade) => {
      const month = trade.date.slice(0, 7);
      grouped[month] = [...(grouped[month] || []), trade];
      return grouped;
    }, {});
    const months = Object.entries(byMonth)
      .map(([month, monthTrades]) => {
        const totalR = monthTrades.reduce((sum, trade) => sum + trade.pnl, 0);
        const wins = monthTrades.filter((trade) => trade.pnl > 0).length;
        const losses = monthTrades.filter((trade) => trade.pnl < 0).length;

        return {
          month,
          totalR,
          trades: monthTrades.length,
          winRate: monthTrades.length === 0 ? 0 : Math.round((wins / monthTrades.length) * 100),
          wins,
          losses,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    const quarters = Object.values(
      months.reduce<Record<string, { quarter: string; totalR: number; trades: number; wins: number; losses: number }>>(
        (grouped, month) => {
          const [year, monthNumber] = month.month.split("-").map(Number);
          const quarter = `${year} Q${Math.ceil(monthNumber / 3)}`;
          grouped[quarter] ||= { quarter, totalR: 0, trades: 0, wins: 0, losses: 0 };
          grouped[quarter].totalR += month.totalR;
          grouped[quarter].trades += month.trades;
          grouped[quarter].wins += month.wins;
          grouped[quarter].losses += month.losses;
          return grouped;
        },
        {},
      ),
    );
    const bestMonth = [...months].sort((a, b) => b.totalR - a.totalR)[0];
    const worstMonth = [...months].sort((a, b) => a.totalR - b.totalR)[0];
    const positiveMonths = months.filter((month) => month.totalR > 0).length;
    const averageMonthlyR =
      months.length === 0 ? 0 : months.reduce((sum, month) => sum + month.totalR, 0) / months.length;

    return {
      months,
      quarters,
      bestMonth,
      worstMonth,
      positiveMonths,
      averageMonthlyR,
      positiveMonthRate: months.length === 0 ? 0 : Math.round((positiveMonths / months.length) * 100),
    };
  }, [trades]);

  const performanceBreakdown = useMemo(() => {
    function summarize(label: string, groupTrades: Trade[]) {
      const wins = groupTrades.filter((trade) => trade.pnl > 0);
      const losses = groupTrades.filter((trade) => trade.pnl < 0);
      const totalR = groupTrades.reduce((sum, trade) => sum + trade.pnl, 0);
      const grossWin = wins.reduce((sum, trade) => sum + trade.pnl, 0);
      const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
      const averageR = groupTrades.length === 0 ? 0 : totalR / groupTrades.length;
      const averageMae =
        groupTrades.length === 0 ? 0 : groupTrades.reduce((sum, trade) => sum + trade.mae, 0) / groupTrades.length;

      return {
        label,
        trades: groupTrades.length,
        totalR,
        averageR,
        winRate: groupTrades.length === 0 ? 0 : Math.round((wins.length / groupTrades.length) * 100),
        profitFactor: grossLoss === 0 ? grossWin : grossWin / grossLoss,
        averageMae,
      };
    }

    function groupBy(key: "setup" | "pair" | "direction" | "result") {
      const grouped = trades.reduce<Record<string, Trade[]>>((items, trade) => {
        const label = String(trade[key]);
        items[label] = [...(items[label] || []), trade];
        return items;
      }, {});

      return Object.entries(grouped)
        .map(([label, groupTrades]) => summarize(label, groupTrades))
        .sort((a, b) => b.totalR - a.totalR);
    }

    const bySetup = groupBy("setup");
    const byPair = groupBy("pair");
    const byDirection = groupBy("direction");
    const byResult = groupBy("result");
    const bestSetup = bySetup[0];
    const worstSetup = [...bySetup].sort((a, b) => a.totalR - b.totalR)[0];
    const bestPair = byPair[0];
    const worstPair = [...byPair].sort((a, b) => a.totalR - b.totalR)[0];
    const lowMaeWinners = [...bySetup]
      .filter((item) => item.totalR > 0)
      .sort((a, b) => a.averageMae - b.averageMae)[0];

    return {
      bySetup,
      byPair,
      byDirection,
      byResult,
      bestSetup,
      worstSetup,
      bestPair,
      worstPair,
      lowMaeWinners,
    };
  }, [trades]);

  const yearlyComparison = useMemo(() => {
    const items = toJournalItems(trades, backtests);
    const years = Array.from(new Set(items.map((item) => item.date.slice(0, 4)))).sort().reverse();
    const rows = years
      .map((year) => summarizeJournalItems(year, items.filter((item) => item.date.startsWith(year))))
      .sort((a, b) => b.year.localeCompare(a.year));
    const yearlySeries = years.map((year) => {
      const yearItems = items
        .filter((item) => item.date.startsWith(year))
        .sort((a, b) => parseDatedItemDate(a).getTime() - parseDatedItemDate(b).getTime());
      let yearEquity = 0;

      return {
        year,
        points: yearItems.map((item) => {
          yearEquity += item.pnl;
          return {
            label: `${item.date} ${item.source}`,
            value: yearEquity,
          };
        }),
      };
    });
    const activeYear = years.includes(yearlyCompareYear) ? yearlyCompareYear : years[0] || yearlyCompareYear;
    const selectedItems = items
      .filter((item) => item.date.startsWith(activeYear))
      .sort((a, b) => parseDatedItemDate(a).getTime() - parseDatedItemDate(b).getTime());
    let equity = 0;
    const equityPoints = selectedItems.map((item) => {
      equity += item.pnl;
      return {
        label: `${item.date} ${item.source}`,
        value: equity,
      };
    });
    const bestYear = [...rows].sort((a, b) => b.totalR - a.totalR)[0];
    const worstYear = [...rows].sort((a, b) => a.totalR - b.totalR)[0];
    const averageYearlyR = rows.length === 0 ? 0 : rows.reduce((sum, row) => sum + row.totalR, 0) / rows.length;

    return {
      years,
      activeYear,
      rows,
      yearlySeries,
      equityPoints,
      selectedSummary: rows.find((row) => row.year === activeYear),
      bestYear,
      worstYear,
      averageYearlyR,
      totalSamples: items.length,
      pairYearRows: buildYearlyDimensionRows(items, years, "pair"),
      setupYearRows: buildYearlyDimensionRows(items, years, "setup"),
    };
  }, [backtests, trades, yearlyCompareYear]);

  const backtestYears = useMemo(() => {
    return ["All", ...Array.from(new Set(backtests.map((item) => item.date.slice(0, 4)))).sort()];
  }, [backtests]);

  const filteredBacktests = useMemo(() => {
    return backtests
      .filter((item) => backtestResultFilter === "All" || item.result === backtestResultFilter)
      .filter((item) => backtestPairFilter === "All" || item.pair === backtestPairFilter)
      .filter((item) => backtestSetupFilter === "All" || item.setup === backtestSetupFilter)
      .filter((item) => backtestYearFilter === "All" || item.date.startsWith(backtestYearFilter))
      .filter((item) => backtestMonthFilter === "All" || item.date.slice(5, 7) === backtestMonthFilter)
      .sort((a, b) => parseDatedItemDate(b).getTime() - parseDatedItemDate(a).getTime());
  }, [
    backtestMonthFilter,
    backtestPairFilter,
    backtestResultFilter,
    backtests,
    backtestSetupFilter,
    backtestYearFilter,
  ]);

  const backtestStats = useMemo(() => {
    const ordered = [...backtests].sort(
      (a, b) => parseDatedItemDate(a).getTime() - parseDatedItemDate(b).getTime(),
    );
    const wins = ordered.filter((item) => item.pnl > 0);
    const losses = ordered.filter((item) => item.pnl < 0);
    const totalR = ordered.reduce((sum, item) => sum + item.pnl, 0);
    const grossWin = wins.reduce((sum, item) => sum + item.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, item) => sum + item.pnl, 0));
    let peak = 0;
    let equity = 0;
    let maxDrawdown = 0;

    ordered.forEach((item) => {
      equity += item.pnl;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
    });

    return {
      total: ordered.length,
      totalR,
      winRate: ordered.length === 0 ? 0 : Math.round((wins.length / ordered.length) * 100),
      profitFactor: grossLoss === 0 ? grossWin : grossWin / grossLoss,
      expectancy: ordered.length === 0 ? 0 : totalR / ordered.length,
      maxDrawdown,
      averageWin: wins.length === 0 ? 0 : grossWin / wins.length,
      averageLoss: losses.length === 0 ? 0 : grossLoss / losses.length,
    };
  }, [backtests]);
  const daraContext = useMemo(
    () =>
      buildCoachContext({
        trades,
        backtests,
        stats,
        tradeAnalytics,
        performance: performanceBreakdown,
        monthlyHeatmap,
        marketSession,
      }),
    [backtests, marketSession, monthlyHeatmap, performanceBreakdown, stats, tradeAnalytics, trades],
  );

  function showToast(nextToast: ToastState) {
    setToast(nextToast);
  }

  async function loadTrades() {
    if (!currentUser || !supabase) return;

    setIsSyncing(true);
    setSyncMessage("");

    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("trade_date", { ascending: false })
      .order("trade_time", { ascending: false });

    setIsSyncing(false);

    if (error) {
      setSyncMessage(`Supabase sync error: ${error.message}`);
      return;
    }

    setTrades(((data || []) as TradeRow[]).map(toTrade));
  }

  async function loadBacktests() {
    if (!currentUser || !supabase) return;

    setIsSyncing(true);
    setSyncMessage("");

    const { data, error } = await supabase
      .from("backtests")
      .select("*")
      .order("trade_date", { ascending: false })
      .order("trade_time", { ascending: false });

    setIsSyncing(false);

    if (error) {
      setSyncMessage(`Backtesting sync error: ${error.message}`);
      return;
    }

    setBacktests(((data || []) as BacktestRow[]).map(toBacktest));
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage("");

    if (!supabase) {
      setAuthMessage("Supabase is not configured yet. Add the Vercel environment variables and redeploy.");
      return;
    }

    const email = normalizeEmail(authForm.email);
    const password = authForm.password;
    const response =
      authMode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (response.error) {
      setAuthMessage(response.error.message);
      return;
    }

    if (authMode === "signup" && !response.data.session) {
      setAuthMessage("Account created. Check your email to confirm your Supabase login.");
    }
  }

  async function handleTradeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || !supabase) return;

    setIsSyncing(true);
    setSyncMessage("");

    const existing = trades.find((trade) => trade.id === tradeForm.id);
    const uploadedShot = await fileToDataUrl(tradeForm.screenshotFile);
    const payload = {
      user_id: currentUser.id,
      trade_date: tradeForm.date,
      trade_time: tradeForm.time,
      pair: tradeForm.pair,
      setup: tradeForm.setup,
      direction: tradeForm.direction,
      mae: Number(tradeForm.mae || 0),
      mae_pips: null,
      stop_loss_pips: null,
      pnl_r: Number(tradeForm.pnl || 0),
      result: tradeForm.result,
      notes: tradeForm.notes.trim(),
      screenshot_url: uploadedShot || existing?.screenshot || "",
      source_app: existing?.sourceApp || null,
      legacy_id: existing?.legacyId || null,
      duration_minutes: existing?.durationMinutes || null,
      finalized_at: existing?.finalizedAt || null,
      updated_at: new Date().toISOString(),
    };

    const query = existing
      ? supabase.from("trades").update(payload).eq("id", existing.id).select("*").single()
      : supabase.from("trades").insert(payload).select("*").single();

    const { data, error } = await query;
    setIsSyncing(false);

    if (error) {
      setSyncMessage(`Could not save trade: ${error.message}`);
      showToast({
        tone: "error",
        title: existing ? "Trade update failed" : "Trade save failed",
        message: error.message,
      });
      return;
    }

    const savedTrade = toTrade(data as TradeRow);
    setTrades(
      existing
        ? trades.map((trade) => (trade.id === savedTrade.id ? savedTrade : trade))
        : [savedTrade, ...trades],
    );
    setTradeForm(todayDefaults());
    setActiveView("view-trades");
    showToast({
      tone: "success",
      title: existing ? "Trade updated" : "Trade saved",
      message: `${savedTrade.pair} ${savedTrade.direction.toLowerCase()} is now in your journal.`,
    });
  }

  async function handleImportZip(file: File | null) {
    if (!file || !currentUser || !supabase) return;

    setIsSyncing(true);
    setSyncMessage("");
    setImportSummary(null);

    const summary: ImportSummary = {
      exportTrades: 0,
      imported: 0,
      skipped: 0,
      imagesImported: 0,
      imagesMissing: 0,
      failed: 0,
    };

    try {
      const zip = await JSZip.loadAsync(file);
      const tradesEntry = zip.file("trades.json");
      if (!tradesEntry) throw new Error("trades.json was not found in the ZIP.");

      const payload = JSON.parse(await tradesEntry.async("string")) as JournalyV2Export;
      if (payload.schema !== "journaly_v2.trade_export") {
        throw new Error("This ZIP is not a Journaly V2 trade export.");
      }
      if (payload.schema_version !== 1 || !Array.isArray(payload.trades)) {
        throw new Error("Unsupported Journaly V2 export version.");
      }

      summary.exportTrades = payload.trades.length;

      const { data: existingRows, error: existingError } = await supabase
        .from("trades")
        .select("legacy_id")
        .eq("source_app", "Journaly V2")
        .not("legacy_id", "is", null);

      if (existingError) throw existingError;

      const existingLegacyIds = new Set(
        ((existingRows || []) as Array<{ legacy_id: number | null }>)
          .map((row) => row.legacy_id)
          .filter((legacyId): legacyId is number => legacyId !== null),
      );

      const rows = [];

      for (const legacyTrade of payload.trades) {
        if (existingLegacyIds.has(legacyTrade.legacy_id)) {
          summary.skipped += 1;
          continue;
        }

        try {
          let screenshotUrl = "";
          const archivePath = legacyTrade.post_image?.archive_path;

          if (archivePath) {
            const imageEntry = zip.file(archivePath);
            if (imageEntry) {
              const imageBlob = await imageEntry.async("blob");
              screenshotUrl = await blobToDataUrl(new Blob([imageBlob], { type: mimeFromName(archivePath) }));
              summary.imagesImported += 1;
            } else {
              summary.imagesMissing += 1;
            }
          } else if (legacyTrade.post_image?.missing) {
            summary.imagesMissing += 1;
          }

          rows.push({
            user_id: currentUser.id,
            trade_date: legacyTrade.trade_date,
            trade_time: normalizeTime(legacyTrade.trade_time),
            pair: legacyTrade.pair,
            setup: normalizeLegacySetup(legacyTrade.setup_type),
            direction: legacyTrade.direction,
            mae: Number(legacyTrade.pnl_r || 0) < 0 ? Math.abs(Number(legacyTrade.pnl_r || 0)) : 0,
            mae_pips: legacyTrade.mae_pips,
            stop_loss_pips: legacyTrade.stop_loss_pips,
            pnl_r: Number(legacyTrade.pnl_r || 0),
            result: legacyTrade.result,
            notes: legacyTrade.notes || "",
            screenshot_url: screenshotUrl,
            source_app: "Journaly V2",
            legacy_id: legacyTrade.legacy_id,
            duration_minutes: legacyTrade.duration_minutes,
            finalized_at: toSupabaseTimestamp(legacyTrade.finalized_at),
            created_at: toSupabaseTimestamp(legacyTrade.created_at) || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } catch {
          summary.failed += 1;
        }
      }

      for (const batch of chunkRows(rows, IMPORT_BATCH_SIZE)) {
        const { error: insertError } = await supabase.from("trades").insert(batch);
        if (insertError) {
          for (const row of batch) {
            const { error: rowError } = await supabase.from("trades").insert(row);
            if (rowError) {
              summary.failed += 1;
            } else {
              summary.imported += 1;
            }
          }
        } else {
          summary.imported += batch.length;
        }
      }

      setImportSummary(summary);
      setSyncMessage("Journaly V2 import finished.");
      await loadTrades();
      setActiveView("view-trades");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleBacktestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || !supabase) return;

    setIsSyncing(true);
    setSyncMessage("");

    const existing = backtests.find((item) => item.id === backtestForm.id);
    const uploadedShot = await fileToDataUrl(backtestForm.screenshotFile);
    const payload = {
      user_id: currentUser.id,
      trade_date: backtestForm.date,
      trade_time: backtestForm.time,
      pair: backtestForm.pair,
      setup: backtestForm.setup,
      direction: backtestForm.direction,
      duration_minutes: backtestForm.durationMinutes ? Number(backtestForm.durationMinutes) : null,
      stop_loss_pips: backtestForm.stopLossPips ? Number(backtestForm.stopLossPips) : null,
      mae_pips: backtestForm.maePips ? Number(backtestForm.maePips) : null,
      pnl_r: Number(backtestForm.pnl || 0),
      result: backtestForm.result,
      notes: backtestForm.notes.trim(),
      scale_in: backtestForm.scaleIn.trim() || "No",
      screenshot_url: uploadedShot || existing?.screenshot || "",
      source_app: existing?.sourceApp || null,
      legacy_id: existing?.legacyId || null,
      updated_at: new Date().toISOString(),
    };

    const query = existing
      ? supabase.from("backtests").update(payload).eq("id", existing.id).select("*").single()
      : supabase.from("backtests").insert(payload).select("*").single();

    const { data, error } = await query;
    setIsSyncing(false);

    if (error) {
      setSyncMessage(`Could not save backtest: ${error.message}`);
      return;
    }

    const saved = toBacktest(data as BacktestRow);
    setBacktests(
      existing ? backtests.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...backtests],
    );
    setBacktestForm(backtestDefaults());
    setActiveView("view-backtests");
  }

  async function handleBacktestImportZip(file: File | null) {
    if (!file || !currentUser || !supabase) return;

    setIsSyncing(true);
    setSyncMessage("");
    setImportSummary(null);

    const summary: ImportSummary = {
      exportTrades: 0,
      imported: 0,
      skipped: 0,
      imagesImported: 0,
      imagesMissing: 0,
      failed: 0,
    };

    try {
      const zip = await JSZip.loadAsync(file);
      const backtestsEntry = zip.file("backtests.json");
      if (!backtestsEntry) throw new Error("backtests.json was not found in the ZIP.");

      const payload = JSON.parse(await backtestsEntry.async("string")) as JournalyV2BacktestExport;
      if (payload.schema !== "journaly_v2.backtest_export") {
        throw new Error("This ZIP is not a Journaly V2 backtesting export.");
      }
      if (payload.schema_version !== 1 || !Array.isArray(payload.backtests)) {
        throw new Error("Unsupported Journaly V2 backtesting export version.");
      }

      summary.exportTrades = payload.backtests.length;

      const { data: existingRows, error: existingError } = await supabase
        .from("backtests")
        .select("legacy_id")
        .eq("source_app", "Journaly V2")
        .not("legacy_id", "is", null);

      if (existingError) throw existingError;

      const existingLegacyIds = new Set(
        ((existingRows || []) as Array<{ legacy_id: number | null }>)
          .map((row) => row.legacy_id)
          .filter((legacyId): legacyId is number => legacyId !== null),
      );

      const rows = [];

      for (const legacyBacktest of payload.backtests) {
        if (existingLegacyIds.has(legacyBacktest.legacy_id)) {
          summary.skipped += 1;
          continue;
        }

        try {
          let screenshotUrl = "";
          const archivePath = legacyBacktest.screenshot?.archive_path;

          if (archivePath) {
            const imageEntry = zip.file(archivePath);
            if (imageEntry) {
              const imageBlob = await imageEntry.async("blob");
              screenshotUrl = await blobToDataUrl(new Blob([imageBlob], { type: mimeFromName(archivePath) }));
              summary.imagesImported += 1;
            } else {
              summary.imagesMissing += 1;
            }
          } else if (legacyBacktest.screenshot?.missing) {
            summary.imagesMissing += 1;
          }

          rows.push({
            user_id: currentUser.id,
            trade_date: legacyBacktest.trade_date,
            trade_time: normalizeTime(legacyBacktest.trade_time || "00:00"),
            pair: legacyBacktest.pair,
            setup: normalizeLegacySetup(legacyBacktest.setup_type),
            direction: legacyBacktest.direction,
            duration_minutes: legacyBacktest.duration_minutes,
            stop_loss_pips: legacyBacktest.stop_loss_pips,
            mae_pips: legacyBacktest.mae_pips,
            pnl_r: Number(legacyBacktest.pnl_r || 0),
            result: legacyBacktest.result,
            notes: legacyBacktest.notes || "",
            scale_in: legacyBacktest.scale_in || "No",
            screenshot_url: screenshotUrl,
            source_app: "Journaly V2",
            legacy_id: legacyBacktest.legacy_id,
            created_at: toSupabaseTimestamp(legacyBacktest.created_at) || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        } catch {
          summary.failed += 1;
        }
      }

      for (const batch of chunkRows(rows, IMPORT_BATCH_SIZE)) {
        const { error: insertError } = await supabase.from("backtests").insert(batch);
        if (insertError) {
          for (const row of batch) {
            const { error: rowError } = await supabase.from("backtests").insert(row);
            if (rowError) {
              summary.failed += 1;
            } else {
              summary.imported += 1;
            }
          }
        } else {
          summary.imported += batch.length;
        }
      }

      setImportSummary(summary);
      setSyncMessage("Journaly V2 backtesting import finished.");
      await loadBacktests();
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Backtesting import failed.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function logout() {
    if (!supabase) return;

    await supabase.auth.signOut();
    setCurrentUser(null);
    setTrades([]);
    setAuthMode("login");
    setAuthMessage("");
  }

  function editTrade(trade: Trade) {
    setTradeForm({
      id: trade.id,
      date: trade.date,
      time: trade.time,
      pair: trade.pair,
      setup: trade.setup,
      direction: trade.direction,
      mae: String(trade.mae),
      pnl: String(trade.pnl),
      result: trade.result,
      notes: trade.notes,
      screenshotFile: null,
    });
    setActiveView("add-trade");
    showToast({
      tone: "info",
      title: "Editing trade",
      message: `${trade.pair} from ${formatMonthDayYear(trade.date)} is ready to update.`,
    });
  }

  async function deleteTrade(trade: Trade) {
    if (!supabase) return;

    setIsSyncing(true);
    setSyncMessage("");
    setPendingDeleteTrade(null);

    const { error } = await supabase.from("trades").delete().eq("id", trade.id);
    setIsSyncing(false);

    if (error) {
      setSyncMessage(`Could not delete trade: ${error.message}`);
      showToast({
        tone: "error",
        title: "Trade delete failed",
        message: error.message,
      });
      return;
    }

    setTrades((currentTrades) => currentTrades.filter((item) => item.id !== trade.id));
    showToast({
      tone: "success",
      title: "Trade deleted",
      message: `${trade.pair} from ${formatMonthDayYear(trade.date)} was removed.`,
    });
  }

  function editBacktest(backtest: Backtest) {
    setBacktestForm({
      id: backtest.id,
      date: backtest.date,
      time: backtest.time,
      pair: backtest.pair,
      setup: backtest.setup,
      direction: backtest.direction,
      durationMinutes: backtest.durationMinutes === null ? "" : String(backtest.durationMinutes),
      stopLossPips: backtest.stopLossPips === null ? "" : String(backtest.stopLossPips),
      maePips: backtest.maePips === null ? "" : String(backtest.maePips),
      pnl: String(backtest.pnl),
      result: backtest.result,
      notes: backtest.notes,
      scaleIn: backtest.scaleIn,
      screenshotFile: null,
    });
    setActiveView("add-backtest");
  }

  async function deleteBacktest(id: string) {
    if (!supabase) return;

    setIsSyncing(true);
    setSyncMessage("");

    const { error } = await supabase.from("backtests").delete().eq("id", id);
    setIsSyncing(false);

    if (error) {
      setSyncMessage(`Could not delete backtest: ${error.message}`);
      return;
    }

    setBacktests(backtests.filter((item) => item.id !== id));
  }

  if (!supabaseConfig.isConfigured) {
    return <MissingConfigScreen missing={supabaseConfig.missing} />;
  }

  if (isBooting) {
    return (
      <section className="auth-screen">
        <Brand className="auth-brand" />
        <div className="auth-layout">
          <div className="auth-copy">
            <p className="eyebrow">Connecting Supabase</p>
            <h1>Loading your trading workspace.</h1>
          </div>
        </div>
      </section>
    );
  }

  if (!currentUser) {
    const isSignup = authMode === "signup";

    return (
      <section className="auth-screen">
        <Brand className="auth-brand" />

        <div className="auth-layout">
          <div className="auth-copy">
            <p className="eyebrow">Supabase secured workspace</p>
            <h1>Sign in before the market teaches the lesson twice.</h1>
            <p>
              Journaly OS now uses Supabase Auth, so your account is ready for Vercel,
              Postgres, and scalable cloud storage.
            </p>
          </div>

          <form className="auth-card" onSubmit={handleAuth}>
            <div className="auth-card-header">
              <p className="eyebrow">{isSignup ? "Start your journal" : "Welcome back"}</p>
              <h2>{isSignup ? "Create account" : "Log in"}</h2>
            </div>

            <p className="auth-message" role="status">
              {authMessage}
            </p>

            <label>
              <span>Email</span>
              <input
                value={authForm.email}
                name="email"
                type="text"
                inputMode="email"
                autoComplete="email"
                required
                onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
              />
            </label>

            <label>
              <span>Password</span>
              <input
                value={authForm.password}
                name="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={6}
                required
                onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
              />
            </label>

            <button className="primary-action" type="submit">
              {isSignup ? "Create account" : "Log in"}
            </button>

            <button
              className="text-action"
              type="button"
              onClick={() => {
                setAuthMode(isSignup ? "login" : "signup");
                setAuthMessage("");
              }}
            >
              {isSignup ? "Already have an account? Log in" : "Create a new Journaly OS account"}
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand className="brand" onHome={() => setActiveView("dashboard")} />

        <nav className="topnav" aria-label="Primary">
          <button
            className={activeView === "dashboard" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={activeView === "add-trade" || activeView === "position-sizing" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("add-trade")}
          >
            Add trade
          </button>
          <button
            className={
              activeView === "trade-analytics" ||
              activeView === "view-trades" ||
              activeView === "trade-calendar" ||
              activeView === "monthly-heatmap" ||
              activeView === "trade-performance" ||
              activeView === "yearly-comparison"
                ? "is-active"
                : ""
            }
            type="button"
            onClick={() => setActiveView("trade-analytics")}
          >
            Trades
          </button>
          <button
            className={
              activeView === "backtesting-analytics" ||
              activeView === "add-backtest" ||
              activeView === "view-backtests"
                ? "is-active"
                : ""
            }
            type="button"
            onClick={() => setActiveView("backtesting-analytics")}
          >
            Backtesting
          </button>
          <button
            className={activeView === "ai-coach" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("ai-coach")}
          >
            AI Coach
          </button>
        </nav>

        <div className="top-actions">
          <MarketSessionBadge session={marketSession} />
          <span className="user-pill">{currentUser.email}</span>
          <button
            className="icon-button square"
            type="button"
            aria-label="Toggle theme"
            title="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="icon-button" type="button" onClick={logout}>
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </header>

      {toast ? <Toast toast={toast} onClose={() => setToast(null)} /> : null}

      <main>
        {syncMessage ? <p className="sync-message">{syncMessage}</p> : null}
        {isSyncing ? <p className="sync-message">Syncing with Supabase...</p> : null}

        {activeView === "dashboard" ? (
          <section className="dashboard-view">
            <div className="dashboard-actions">
              <button className="primary-action" type="button" onClick={() => setActiveView("add-trade")}>
                <Plus size={18} />
                Add trade
              </button>
              <button className="secondary-action" type="button" onClick={() => setActiveView("trade-analytics")}>
                <BarChart3 size={18} />
                Trade analytics
              </button>
              <button
                className="secondary-action"
                type="button"
                onClick={() => setActiveView("backtesting-analytics")}
              >
                <FlaskConical size={18} />
                Backtesting
              </button>
            </div>

            <section className="market-panel" aria-label="Performance summary">
              <div className="panel-header">
                <span>Journal health</span>
                <strong>
                  <span className="status-dot" aria-hidden="true" />
                  {stats.healthLabel}
                </strong>
              </div>
              <div className="stat-grid">
                <Stat label="Total R" value={`${formatNumber(stats.totalR)}R`} />
                <WinRateStat rate={stats.winRate} />
                <Stat label="Profit factor" value={formatNumber(stats.profitFactor)} />
                <Stat label="Max drawdown" value={`${formatNumber(stats.maxDrawdown)}R`} />
                <Stat label="Total trades" value={String(stats.totalTrades)} />
                <Stat label="Days since last trade" value={stats.daysSinceLastTrade} />
              </div>

              <div className="recent-trades">
                <div className="recent-trades-header">
                  <span>Last 5 trades</span>
                  <button className="text-link" type="button" onClick={() => setActiveView("view-trades")}>
                    View all
                  </button>
                </div>

                {recentTrades.length === 0 ? (
                  <p className="recent-empty">No trades logged yet.</p>
                ) : (
                  <div className="recent-trade-list">
                    {recentTrades.map((trade) => (
                      <article className="recent-trade" key={trade.id}>
                        <div>
                          <strong>{trade.pair}</strong>
                          <span>
                            {trade.setup} / {trade.direction}
                          </span>
                        </div>
                        <div>
                          <strong className={trade.pnl >= 0 ? "positive-r" : "negative-r"}>
                            {formatNumber(trade.pnl)}R
                          </strong>
                          <span>{trade.date}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </section>
        ) : null}

        {activeView === "ai-coach" ? (
          <AICoachView
            trades={trades}
            backtests={backtests}
            stats={stats}
            tradeAnalytics={tradeAnalytics}
            performance={performanceBreakdown}
            monthlyHeatmap={monthlyHeatmap}
            marketSession={marketSession}
          />
        ) : null}

        {activeView === "add-trade" || activeView === "position-sizing" ? (
          <section className="workspace-band">
            <div className="section-heading">
              <p className="eyebrow">Trade capture</p>
              <h2>
                {activeView === "position-sizing" ? "Position sizing" : tradeForm.id ? "Edit trade" : "Add a trade"}
              </h2>
            </div>

            <div className="module-tabs" aria-label="Trade capture sections">
              <button
                className={activeView === "add-trade" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("add-trade")}
              >
                Trade entry
              </button>
              <button
                className={activeView === "position-sizing" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("position-sizing")}
              >
                Position sizing
              </button>
            </div>

            {activeView === "position-sizing" ? (
              <>
                <section className="calculator-panel">
                  <p className="calculator-note">
                    This is built for live execution. Use the actual entry price and stop loss price so the lot size updates from the real distance, not from a static pip guess.
                  </p>

                  <div className="calculator-grid">
                    <SelectField
                      label="Pair"
                      value={positionCalculator.pair}
                      options={pairs}
                      onChange={(value) => setPositionCalculator({ ...positionCalculator, pair: value })}
                    />
                    <label>
                      <span>Account Balance</span>
                      <input
                        value={positionCalculator.accountBalance}
                        type="text"
                        inputMode="decimal"
                        onChange={(event) =>
                          setPositionCalculator({ ...positionCalculator, accountBalance: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>Risk %</span>
                      <input
                        value={positionCalculator.riskPercent}
                        type="text"
                        inputMode="decimal"
                        onChange={(event) =>
                          setPositionCalculator({ ...positionCalculator, riskPercent: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>Entry Price</span>
                      <input
                        value={positionCalculator.entryPrice}
                        type="text"
                        inputMode="decimal"
                        onChange={(event) =>
                          setPositionCalculator({ ...positionCalculator, entryPrice: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>Stop Loss Price</span>
                      <input
                        value={positionCalculator.stopLossPrice}
                        type="text"
                        inputMode="decimal"
                        onChange={(event) =>
                          setPositionCalculator({ ...positionCalculator, stopLossPrice: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>Take Profit Price</span>
                      <input
                        value={positionCalculator.takeProfitPrice}
                        type="text"
                        inputMode="decimal"
                        onChange={(event) =>
                          setPositionCalculator({ ...positionCalculator, takeProfitPrice: event.target.value })
                        }
                      />
                    </label>
                    <label className="wide-field">
                      <span>Quote Currency to USD Rate</span>
                      <input
                        value={
                          getQuoteCurrency(positionCalculator.pair) === "USD"
                            ? "1"
                            : positionCalculator.quoteToUsdRate
                        }
                        type="text"
                        inputMode="decimal"
                        disabled={getQuoteCurrency(positionCalculator.pair) === "USD"}
                        onChange={(event) =>
                          setPositionCalculator({ ...positionCalculator, quoteToUsdRate: event.target.value })
                        }
                      />
                    </label>
                  </div>

                  <p className="rate-help">{getQuoteRateHelp(positionCalculator.pair)}</p>

                  <div className="lot-result">
                    <div>
                      <span>Suggested Lot Size</span>
                      <strong>{formatNumber(positionSize.lots)}</strong>
                    </div>
                    <div>
                      <span>Risk Amount</span>
                      <strong>${formatNumber(positionSize.riskAmount)}</strong>
                    </div>
                  </div>

                  <div className="lot-breakdown">
                    <span>Micro: {formatNumber(positionSize.microLots)}</span>
                    <span>Mini: {formatNumber(positionSize.miniLots)}</span>
                    <span>Units: {Math.round(positionSize.units).toLocaleString()}</span>
                    <span>Stop: {formatNumber(positionSize.stopPips)} pips</span>
                  </div>
                </section>

                <section className="profile-sizing">
                  <div className="profile-sizing-header">
                    <div>
                      <p className="eyebrow">Profile sizing</p>
                      <h3>Auto lots for your account types</h3>
                    </div>
                    <div className="profile-actions">
                      <button
                        className="secondary-action"
                        type="button"
                        onClick={() =>
                          setProfileRows([
                            ...profileRows,
                            {
                              id: crypto.randomUUID(),
                              balance: "10000",
                              type: "New",
                              platform: "MT5",
                              riskPercent: "1",
                            },
                          ])
                        }
                      >
                        Add Row
                      </button>
                      <button
                        className="primary-action"
                        type="button"
                        onClick={() => localStorage.setItem(PROFILE_SIZING_KEY, JSON.stringify(profileRows))}
                      >
                        Save Profiles
                      </button>
                    </div>
                  </div>

                  <div className="profile-price-strip">
                    <div>
                      <span>Entry</span>
                      <strong>{positionCalculator.entryPrice || "--"}</strong>
                    </div>
                    <div>
                      <span>SL</span>
                      <strong>{positionCalculator.stopLossPrice || "--"}</strong>
                    </div>
                    <div>
                      <span>TP</span>
                      <strong>{positionCalculator.takeProfitPrice || "--"}</strong>
                    </div>
                  </div>

                  <div className="profile-mode-toggle">
                    <button
                      className={profileMode === "main" ? "is-active" : ""}
                      type="button"
                      onClick={() => setProfileMode("main")}
                    >
                      Main Profile
                    </button>
                    <button
                      className={profileMode === "half" ? "is-active" : ""}
                      type="button"
                      onClick={() => setProfileMode("half")}
                    >
                      Half Profile
                    </button>
                  </div>

                  <div className="profile-table">
                    <div className="profile-row profile-head">
                      <span>Balance</span>
                      <span>Type</span>
                      <span>Platform</span>
                      <span>Risk%</span>
                      <span>Lot Size</span>
                      <span></span>
                    </div>
                    {profileRows.map((row) => {
                      const quote = getQuoteCurrency(positionCalculator.pair);
                      const quoteToUsdRate = quote === "USD" ? 1 : Number(positionCalculator.quoteToUsdRate || 0);
                      const rowSize = calculatePositionSize({
                        pair: positionCalculator.pair,
                        balance: Number(row.balance || 0),
                        riskPercent: Number(row.riskPercent || 0) * (profileMode === "half" ? 0.5 : 1),
                        entryPrice: Number(positionCalculator.entryPrice || 0),
                        stopLossPrice: Number(positionCalculator.stopLossPrice || 0),
                        quoteToUsdRate,
                      });

                      return (
                        <div className="profile-row" key={row.id}>
                          <input
                            value={row.balance}
                            type="text"
                            inputMode="decimal"
                            onChange={(event) =>
                              setProfileRows(
                                profileRows.map((item) =>
                                  item.id === row.id ? { ...item, balance: event.target.value } : item,
                                ),
                              )
                            }
                          />
                          <input
                            value={row.type}
                            type="text"
                            onChange={(event) =>
                              setProfileRows(
                                profileRows.map((item) =>
                                  item.id === row.id ? { ...item, type: event.target.value } : item,
                                ),
                              )
                            }
                          />
                          <input
                            value={row.platform}
                            type="text"
                            onChange={(event) =>
                              setProfileRows(
                                profileRows.map((item) =>
                                  item.id === row.id ? { ...item, platform: event.target.value } : item,
                                ),
                              )
                            }
                          />
                          <label className="risk-inline">
                            <input
                              value={row.riskPercent}
                              type="text"
                              inputMode="decimal"
                              onChange={(event) =>
                                setProfileRows(
                                  profileRows.map((item) =>
                                    item.id === row.id ? { ...item, riskPercent: event.target.value } : item,
                                  ),
                                )
                              }
                            />
                            <span>%</span>
                          </label>
                          <strong>{formatNumber(rowSize.lots)}</strong>
                          <button
                            className="icon-button square"
                            type="button"
                            aria-label="Remove profile row"
                            onClick={() => setProfileRows(profileRows.filter((item) => item.id !== row.id))}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            ) : null}

            {activeView === "add-trade" ? (
            <form className="trade-form" onSubmit={handleTradeSubmit}>
              <label>
                <span>Date</span>
                <input
                  value={tradeForm.date}
                  type="date"
                  required
                  onChange={(event) => setTradeForm({ ...tradeForm, date: event.target.value })}
                />
              </label>

              <label>
                <span>Time</span>
                <input
                  value={tradeForm.time}
                  type="time"
                  required
                  onChange={(event) => setTradeForm({ ...tradeForm, time: event.target.value })}
                />
              </label>

              <SelectField
                label="Pair"
                value={tradeForm.pair}
                options={pairs}
                onChange={(value) => setTradeForm({ ...tradeForm, pair: value })}
              />
              <SelectField
                label="Setup"
                value={tradeForm.setup}
                options={setups}
                onChange={(value) => setTradeForm({ ...tradeForm, setup: value })}
              />
              <SelectField
                label="Direction"
                value={tradeForm.direction}
                options={["Long", "Short"]}
                onChange={(value) => setTradeForm({ ...tradeForm, direction: value as Direction })}
              />

              <label>
                <span>MAE</span>
                <input
                  value={tradeForm.mae}
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  required
                  onChange={(event) => setTradeForm({ ...tradeForm, mae: event.target.value })}
                />
              </label>

              <label>
                <span>PnL in R</span>
                <input
                  value={tradeForm.pnl}
                  type="text"
                  inputMode="decimal"
                  pattern="-?[0-9]*[.]?[0-9]*"
                  required
                  onChange={(event) => setTradeForm({ ...tradeForm, pnl: event.target.value })}
                />
              </label>

              <SelectField
                label="Result"
                value={tradeForm.result}
                options={results}
                onChange={(value) => setTradeForm({ ...tradeForm, result: value as Result })}
              />

              <label className="wide-field file-field">
                <span>Screenshot</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setTradeForm({ ...tradeForm, screenshotFile: event.target.files?.[0] || null })
                  }
                />
                <ImagePlus size={18} />
              </label>

              <label className="wide-field">
                <span>Notes</span>
                <textarea
                  value={tradeForm.notes}
                  rows={5}
                  placeholder="What was the thesis, trigger, management, and lesson?"
                  onChange={(event) => setTradeForm({ ...tradeForm, notes: event.target.value })}
                />
              </label>

              <div className="form-actions wide-field">
                <button className="primary-action" type="submit" disabled={isSyncing}>
                  <CalendarClock size={18} />
                  {tradeForm.id ? "Update trade" : "Save trade"}
                </button>
                <button className="ghost-action" type="button" onClick={() => setTradeForm(todayDefaults())}>
                  <RefreshCcw size={18} />
                  Clear
                </button>
              </div>
            </form>
            ) : null}
          </section>
        ) : null}

        {activeView === "trade-analytics" ||
        activeView === "view-trades" ||
        activeView === "trade-calendar" ||
        activeView === "monthly-heatmap" ||
        activeView === "trade-performance" ||
        activeView === "yearly-comparison" ? (
          <section className="journal-band">
            <div className="section-heading">
              <p className="eyebrow">Trade archive</p>
              <h2>
                {activeView === "trade-analytics"
                  ? "Trade analytics"
                  : activeView === "trade-calendar"
                    ? "Calendar view"
                  : activeView === "monthly-heatmap"
                    ? "Monthly heatmap"
                    : activeView === "trade-performance"
                      ? "Performance"
                      : activeView === "yearly-comparison"
                        ? "Yearly comparison"
                      : "View trades"}
              </h2>
            </div>

            <div className="module-tabs" aria-label="Trade sections">
              <button
                className={activeView === "trade-analytics" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("trade-analytics")}
              >
                Analytics
              </button>
              <button
                className={activeView === "view-trades" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("view-trades")}
              >
                View trades
              </button>
              <button
                className={activeView === "trade-calendar" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("trade-calendar")}
              >
                Calendar
              </button>
              <button
                className={activeView === "monthly-heatmap" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("monthly-heatmap")}
              >
                Monthly heatmap
              </button>
              <button
                className={activeView === "trade-performance" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("trade-performance")}
              >
                Performance
              </button>
              <button
                className={activeView === "yearly-comparison" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("yearly-comparison")}
              >
                Yearly compare
              </button>
            </div>

            {activeView === "trade-analytics" ? (
              <>
                <EquityCurve points={tradeAnalytics.equityPoints} />
                <section className="market-panel backtest-panel" aria-label="Trade advanced analytics">
                  <div className="panel-header">
                    <span>Advanced analytics</span>
                    <strong>
                      <span className="status-dot" aria-hidden="true" />
                      {tradeAnalytics.total} trades
                    </strong>
                  </div>
                  <div className="stat-grid analytics-grid">
                    <Stat label="Total R" value={`${formatNumber(tradeAnalytics.totalR)}R`} />
                    <WinRateStat rate={tradeAnalytics.winRate} />
                    <Stat label="Profit factor" value={formatNumber(tradeAnalytics.profitFactor)} />
                    <Stat label="Expectancy" value={`${formatNumber(tradeAnalytics.expectancy)}R`} />
                    <Stat label="Max drawdown" value={`${formatNumber(tradeAnalytics.maxDrawdown)}R`} />
                    <Stat label="Average win" value={`${formatNumber(tradeAnalytics.averageWin)}R`} />
                    <Stat label="Average loss" value={`${formatNumber(tradeAnalytics.averageLoss)}R`} />
                    <Stat label="Best win streak" value={String(tradeAnalytics.bestWinStreak)} />
                    <Stat label="Worst loss streak" value={String(tradeAnalytics.worstLossStreak)} />
                  </div>
                </section>
              </>
            ) : null}

            {activeView === "view-trades" ? (
            <>
            <div className="journal-toolbar">
              <SelectField
                label="Filter result"
                value={resultFilter}
                options={["All", ...results]}
                onChange={(value) => setResultFilter(value as "All" | Result)}
              />
              <SelectField
                label="Filter pair"
                value={pairFilter}
                options={["All", ...pairs]}
                onChange={setPairFilter}
              />
              <label className="import-field">
                <span>Import Journaly V2</span>
                <input
                  type="file"
                  accept=".zip,application/zip"
                  disabled={isSyncing}
                  onChange={(event) => {
                    handleImportZip(event.target.files?.[0] || null);
                    event.target.value = "";
                  }}
                />
                <Upload size={18} />
              </label>
            </div>

            {importSummary ? (
              <div className="import-summary" aria-live="polite">
                <strong>Import summary</strong>
                <span>Trades in export: {importSummary.exportTrades}</span>
                <span>Imported: {importSummary.imported}</span>
                <span>Skipped duplicates: {importSummary.skipped}</span>
                <span>Images imported: {importSummary.imagesImported}</span>
                <span>Images missing: {importSummary.imagesMissing}</span>
                <span>Failed rows: {importSummary.failed}</span>
              </div>
            ) : null}

            <div className="trade-list" aria-live="polite">
              {filteredTrades.length === 0 ? (
                <div className="empty-state">
                  <strong>No trades logged yet</strong>
                  <p>Your best review data starts with the next clean entry.</p>
                </div>
              ) : (
                filteredTrades.map((trade) => (
                  <TradeCard
                    key={trade.id}
                    trade={trade}
                    onEdit={() => editTrade(trade)}
                    onDelete={() => setPendingDeleteTrade(trade)}
                    onViewImage={() =>
                      trade.screenshot &&
                      setImageViewer({ src: trade.screenshot, alt: `${trade.pair} trade screenshot` })
                    }
                  />
                ))
              )}
            </div>
            </>
            ) : null}

            {activeView === "trade-calendar" ? (
              <TradeCalendar
                days={tradeCalendarDays}
                month={tradeCalendarMonth}
                monthOptions={tradeCalendarMonthOptions}
                onMonthChange={setTradeCalendarMonth}
                onViewImage={(trade) =>
                  trade.screenshot &&
                  setImageViewer({ src: trade.screenshot, alt: `${trade.pair} trade screenshot` })
                }
              />
            ) : null}

            {activeView === "monthly-heatmap" ? (
              <MonthlyHeatmap data={monthlyHeatmap} />
            ) : null}

            {activeView === "trade-performance" ? (
              <PerformanceBreakdown data={performanceBreakdown} />
            ) : null}

            {activeView === "yearly-comparison" ? (
              <YearlyComparison
                data={yearlyComparison}
                selectedYear={yearlyComparison.activeYear}
                onYearChange={setYearlyCompareYear}
              />
            ) : null}
          </section>
        ) : null}

        {activeView === "backtesting-analytics" ||
        activeView === "add-backtest" ||
        activeView === "view-backtests" ? (
          <section className="journal-band">
            <div className="section-heading">
              <p className="eyebrow">Research engine</p>
              <h2>
                {activeView === "backtesting-analytics"
                  ? "Backtesting analytics"
                  : activeView === "add-backtest"
                    ? backtestForm.id
                      ? "Edit backtest"
                      : "Add backtest"
                    : "View backtest trades"}
              </h2>
            </div>

            <div className="module-tabs" aria-label="Backtesting sections">
              <button
                className={activeView === "backtesting-analytics" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("backtesting-analytics")}
              >
                Analytics
              </button>
              <button
                className={activeView === "add-backtest" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("add-backtest")}
              >
                Add backtest
              </button>
              <button
                className={activeView === "view-backtests" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("view-backtests")}
              >
                View trades
              </button>
            </div>

            {activeView === "backtesting-analytics" ? (
            <section className="market-panel backtest-panel" aria-label="Backtesting analytics">
              <div className="panel-header">
                <span>Backtest analytics</span>
                <strong>
                  <span className="status-dot" aria-hidden="true" />
                  {backtestStats.total} samples
                </strong>
              </div>
              <div className="stat-grid analytics-grid">
                <Stat label="Total backtests" value={String(backtestStats.total)} />
                <Stat label="Total R" value={`${formatNumber(backtestStats.totalR)}R`} />
                <WinRateStat rate={backtestStats.winRate} />
                <Stat label="Profit factor" value={formatNumber(backtestStats.profitFactor)} />
                <Stat label="Expectancy" value={`${formatNumber(backtestStats.expectancy)}R`} />
                <Stat label="Max drawdown" value={`${formatNumber(backtestStats.maxDrawdown)}R`} />
                <Stat label="Average win" value={`${formatNumber(backtestStats.averageWin)}R`} />
                <Stat label="Average loss" value={`${formatNumber(backtestStats.averageLoss)}R`} />
              </div>
            </section>
            ) : null}

            {activeView === "add-backtest" ? (
            <form className="trade-form backtest-form" onSubmit={handleBacktestSubmit}>
              <label>
                <span>Date</span>
                <input
                  value={backtestForm.date}
                  type="date"
                  required
                  onChange={(event) => setBacktestForm({ ...backtestForm, date: event.target.value })}
                />
              </label>
              <label>
                <span>Time</span>
                <input
                  value={backtestForm.time}
                  type="time"
                  required
                  onChange={(event) => setBacktestForm({ ...backtestForm, time: event.target.value })}
                />
              </label>
              <SelectField
                label="Pair"
                value={backtestForm.pair}
                options={pairs}
                onChange={(value) => setBacktestForm({ ...backtestForm, pair: value })}
              />
              <SelectField
                label="Setup"
                value={backtestForm.setup}
                options={setups}
                onChange={(value) => setBacktestForm({ ...backtestForm, setup: value })}
              />
              <SelectField
                label="Direction"
                value={backtestForm.direction}
                options={["Long", "Short"]}
                onChange={(value) => setBacktestForm({ ...backtestForm, direction: value as Direction })}
              />
              <label>
                <span>Duration</span>
                <input
                  value={backtestForm.durationMinutes}
                  type="text"
                  inputMode="numeric"
                  onChange={(event) =>
                    setBacktestForm({ ...backtestForm, durationMinutes: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Stop loss pips</span>
                <input
                  value={backtestForm.stopLossPips}
                  type="text"
                  inputMode="decimal"
                  onChange={(event) =>
                    setBacktestForm({ ...backtestForm, stopLossPips: event.target.value })
                  }
                />
              </label>
              <label>
                <span>MAE pips</span>
                <input
                  value={backtestForm.maePips}
                  type="text"
                  inputMode="decimal"
                  onChange={(event) => setBacktestForm({ ...backtestForm, maePips: event.target.value })}
                />
              </label>
              <label>
                <span>PnL R</span>
                <input
                  value={backtestForm.pnl}
                  type="text"
                  inputMode="decimal"
                  required
                  onChange={(event) => setBacktestForm({ ...backtestForm, pnl: event.target.value })}
                />
              </label>
              <SelectField
                label="Result"
                value={backtestForm.result}
                options={results}
                onChange={(value) => setBacktestForm({ ...backtestForm, result: value as Result })}
              />
              <label>
                <span>Scale in</span>
                <input
                  value={backtestForm.scaleIn}
                  type="text"
                  onChange={(event) => setBacktestForm({ ...backtestForm, scaleIn: event.target.value })}
                />
              </label>
              <label className="file-field">
                <span>Screenshot</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setBacktestForm({ ...backtestForm, screenshotFile: event.target.files?.[0] || null })
                  }
                />
                <ImagePlus size={18} />
              </label>
              <label className="wide-field">
                <span>Notes</span>
                <textarea
                  value={backtestForm.notes}
                  rows={4}
                  onChange={(event) => setBacktestForm({ ...backtestForm, notes: event.target.value })}
                />
              </label>
              <div className="form-actions wide-field">
                <button className="primary-action" type="submit" disabled={isSyncing}>
                  <CalendarClock size={18} />
                  {backtestForm.id ? "Update backtest" : "Save backtest"}
                </button>
                <button className="ghost-action" type="button" onClick={() => setBacktestForm(backtestDefaults())}>
                  <RefreshCcw size={18} />
                  Clear
                </button>
              </div>
            </form>
            ) : null}

            {activeView === "view-backtests" ? (
            <>
            <div className="journal-toolbar">
              <SelectField
                label="Year"
                value={backtestYearFilter}
                options={backtestYears}
                onChange={setBacktestYearFilter}
              />
              <SelectField
                label="Month"
                value={backtestMonthFilter}
                options={["All", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]}
                onChange={setBacktestMonthFilter}
              />
              <SelectField
                label="Pair"
                value={backtestPairFilter}
                options={["All", ...pairs]}
                onChange={setBacktestPairFilter}
              />
              <SelectField
                label="Setup"
                value={backtestSetupFilter}
                options={["All", ...setups]}
                onChange={setBacktestSetupFilter}
              />
              <SelectField
                label="Result"
                value={backtestResultFilter}
                options={["All", ...results]}
                onChange={(value) => setBacktestResultFilter(value as "All" | Result)}
              />
              <label className="import-field">
                <span>Import backtests</span>
                <input
                  type="file"
                  accept=".zip,application/zip"
                  disabled={isSyncing}
                  onChange={(event) => {
                    handleBacktestImportZip(event.target.files?.[0] || null);
                    event.target.value = "";
                  }}
                />
                <Upload size={18} />
              </label>
            </div>

            {importSummary ? (
              <div className="import-summary" aria-live="polite">
                <strong>Backtest import</strong>
                <span>Backtests in export: {importSummary.exportTrades}</span>
                <span>Imported: {importSummary.imported}</span>
                <span>Skipped duplicates: {importSummary.skipped}</span>
                <span>Screenshots imported: {importSummary.imagesImported}</span>
                <span>Screenshots missing: {importSummary.imagesMissing}</span>
                <span>Failed rows: {importSummary.failed}</span>
              </div>
            ) : null}

            <div className="trade-list" aria-live="polite">
              {filteredBacktests.length === 0 ? (
                <div className="empty-state">
                  <strong>No backtests yet</strong>
                  <p>Import Journaly V2 history or log a fresh backtest sample.</p>
                </div>
              ) : (
                filteredBacktests.map((backtest) => (
                  <BacktestCard
                    key={backtest.id}
                    backtest={backtest}
                    onEdit={() => editBacktest(backtest)}
                    onDelete={() => deleteBacktest(backtest.id)}
                    onViewImage={() =>
                      backtest.screenshot &&
                      setImageViewer({ src: backtest.screenshot, alt: `${backtest.pair} backtest screenshot` })
                    }
                  />
                ))
              )}
            </div>
            </>
            ) : null}
          </section>
        ) : null}

        {imageViewer ? (
          <div className="image-viewer" role="dialog" aria-modal="true" aria-label="Screenshot viewer">
            <button className="image-viewer-backdrop" type="button" onClick={() => setImageViewer(null)} />
            <div className="image-viewer-panel">
              <button
                className="icon-button square image-viewer-close"
                type="button"
                aria-label="Close screenshot viewer"
                onClick={() => setImageViewer(null)}
              >
                <X size={18} />
              </button>
              <img src={imageViewer.src} alt={imageViewer.alt} />
            </div>
          </div>
        ) : null}

        {pendingDeleteTrade ? (
          <ConfirmDialog
            title="Delete this trade?"
            message={`${pendingDeleteTrade.pair} from ${formatMonthDayYear(
              pendingDeleteTrade.date,
            )} will be removed from your journal.`}
            confirmLabel="Delete trade"
            onCancel={() => setPendingDeleteTrade(null)}
            onConfirm={() => deleteTrade(pendingDeleteTrade)}
          />
        ) : null}
      </main>
      <DaraMiniChatbar context={daraContext} onOpenCoach={() => setActiveView("ai-coach")} />
    </div>
  );
}

function MarketSessionBadge({ session }: { session: MarketSessionState }) {
  return (
    <div className={`session-badge ${session.isOpen ? "is-open" : "is-closed"}`} title={session.detail}>
      <span className="session-pulse" aria-hidden="true" />
      <div>
        <strong>{session.label}</strong>
        <small>
          {session.status} / {session.timeLabel}
        </small>
      </div>
    </div>
  );
}

function AICoachView({
  trades,
  backtests,
  stats,
  tradeAnalytics,
  performance,
  monthlyHeatmap,
  marketSession,
}: {
  trades: Trade[];
  backtests: Backtest[];
  stats: {
    totalTrades: number;
    winRate: number;
    totalR: number;
    profitFactor: number;
    maxDrawdown: number;
    daysSinceLastTrade: string;
    healthLabel: string;
  };
  tradeAnalytics: {
    expectancy: number;
    averageWin: number;
    averageLoss: number;
    bestWinStreak: number;
    worstLossStreak: number;
  };
  performance: {
    bestSetup?: PerformanceRow;
    worstSetup?: PerformanceRow;
    bestPair?: PerformanceRow;
    worstPair?: PerformanceRow;
    lowMaeWinners?: PerformanceRow;
  };
  monthlyHeatmap: {
    bestMonth?: { month: string; totalR: number };
    worstMonth?: { month: string; totalR: number };
    positiveMonthRate: number;
    averageMonthlyR: number;
  };
  marketSession: MarketSessionState;
}) {
  const [coachQuestion, setCoachQuestion] = useState("");
  const [coachAnswer, setCoachAnswer] = useState("");
  const [coachError, setCoachError] = useState("");
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [usage, setUsage] = useState<AICoachUsage>(readAICoachUsage);
  const coachCards = [
    {
      icon: <BarChart3 size={20} />,
      title: "Performance Insights",
      body: performance.bestSetup
        ? `${performance.bestSetup.label} is your strongest setup at ${formatNumber(performance.bestSetup.totalR)}R.`
        : "Log more trades to identify your strongest setups and most profitable sessions.",
    },
    {
      icon: <ShieldAlert size={20} />,
      title: "Behavior Analysis",
      body:
        tradeAnalytics.worstLossStreak >= 3
          ? `Your longest loss streak is ${tradeAnalytics.worstLossStreak}. Watch for revenge trading after clustered losses.`
          : "Loss streak pressure is controlled so far. Keep tracking emotions and rule adherence.",
    },
    {
      icon: <ClipboardCheck size={20} />,
      title: "Smart Trade Reviews",
      body: `Current expectancy is ${formatNumber(tradeAnalytics.expectancy)}R with ${stats.winRate}% win rate.`,
    },
    {
      icon: <Sparkles size={20} />,
      title: "Personalized Coaching",
      body:
        stats.profitFactor >= 1
          ? `Your profit factor is ${formatNumber(stats.profitFactor)}. Focus on protecting the edge, not forcing trades.`
          : "Profit factor is under pressure. Reduce low-quality setups and review loss clusters.",
    },
    {
      icon: <Search size={20} />,
      title: "Pattern Recognition",
      body: performance.bestPair
        ? `${performance.bestPair.label} is your best pair. ${performance.worstPair ? `${performance.worstPair.label} needs review.` : ""}`
        : "Pair edge will appear once more trades are logged.",
    },
    {
      icon: <ShieldCheck size={20} />,
      title: "Discipline Tracking",
      body: `${stats.daysSinceLastTrade} since last trade. Current market state: ${marketSession.status}.`,
    },
    {
      icon: <CalendarDays size={20} />,
      title: "Progress Reports",
      body: monthlyHeatmap.bestMonth
        ? `Best month: ${formatMonthLabel(monthlyHeatmap.bestMonth.month)} at ${formatNumber(monthlyHeatmap.bestMonth.totalR)}R.`
        : "Weekly and monthly summaries will become richer as your dataset grows.",
    },
  ];
  const questions = [
    "What setup has my highest win rate?",
    "When do I perform best during the day?",
    "What's causing most of my losses?",
    "Am I overtrading lately?",
    "Show my most consistent trading month.",
    "Which pairs should I focus on?",
  ];
  const budgetUsedPercent = Math.min(100, (usage.spent / AI_COACH_BUDGET) * 100);
  const budgetRemaining = Math.max(0, AI_COACH_BUDGET - usage.spent);
  const coachContext = buildCoachContext({
    trades,
    backtests,
    stats,
    tradeAnalytics,
    performance,
    monthlyHeatmap,
    marketSession,
  });
  const monthlyInsight = coachContext.monthlyInsight;

  async function askCoach(question = coachQuestion) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || isCoachLoading) return;

    setCoachQuestion(cleanQuestion);
    setIsCoachLoading(true);
    setCoachError("");

    try {
      const response = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuestion,
          context: coachContext,
        }),
      });
      const responseText = await response.text();
      let payload: any = {};
      try {
        payload = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error("AI Coach API did not return JSON. Restart the dev server so the local /api route is active.");
      }

      if (!response.ok) {
        throw new Error(payload.error || `AI Coach request failed with status ${response.status}.`);
      }

      setCoachAnswer(payload.answer || "");
      const nextUsage = {
        spent: usage.spent + Number(payload.usage?.estimatedCost || 0),
        inputTokens: usage.inputTokens + Number(payload.usage?.inputTokens || 0),
        outputTokens: usage.outputTokens + Number(payload.usage?.outputTokens || 0),
        requests: usage.requests + 1,
      };
      setUsage(nextUsage);
      localStorage.setItem(AI_COACH_USAGE_KEY, JSON.stringify(nextUsage));
    } catch (error) {
      setCoachError(error instanceof Error ? error.message : "AI Coach is unavailable right now.");
    } finally {
      setIsCoachLoading(false);
    }
  }

  function resetUsage() {
    const emptyUsage = { spent: 0, inputTokens: 0, outputTokens: 0, requests: 0 };
    setUsage(emptyUsage);
    localStorage.setItem(AI_COACH_USAGE_KEY, JSON.stringify(emptyUsage));
  }

  return (
    <section className="ai-coach-view">
      <div className="ai-coach-hero">
        <div>
          <p className="eyebrow">Journaly AI Coach</p>
          <h1>Turn your trading journal into a personal trading mentor.</h1>
          <p>
            Journaly AI Coach analyzes your data, habits, and performance to help you trade with more discipline,
            confidence, and consistency.
          </p>
        </div>
        <div className="coach-status-card">
          <Brain size={28} />
          <span>Coach brief</span>
          <strong>{stats.healthLabel}</strong>
          <small>
            {formatNumber(stats.totalR)}R / {stats.totalTrades} trades / {formatNumber(stats.profitFactor)} PF
          </small>
        </div>
      </div>

      <div className="coach-summary-grid">
        <Stat label="Coach confidence" value={stats.totalTrades >= 30 ? "High" : stats.totalTrades >= 10 ? "Medium" : "Building"} />
        <Stat label="Risk pressure" value={`${formatNumber(stats.maxDrawdown)}R DD`} />
        <Stat label="Consistency" value={`${monthlyHeatmap.positiveMonthRate}% months`} />
        <Stat label="Focus pair" value={performance.bestPair?.label || "-"} />
      </div>

      <section className="coach-panel monthly-coach-panel">
        <div className="panel-header">
          <span>This month insight</span>
          <strong>{formatMonthLabel(monthlyInsight.month)}</strong>
        </div>
        <div className="monthly-coach-grid">
          <Stat label="Trades this month" value={String(monthlyInsight.totalSamples)} />
          <Stat label="Monthly expectancy" value={`${formatNumber(monthlyInsight.expectancy)}R`} />
          <Stat label="Weekly expectation" value={`${formatNumber(monthlyInsight.weeklyExpectation)}R`} />
          <Stat label="Expected trades" value={String(monthlyInsight.expectedMonthlyTrades)} />
          <Stat label="Expected max DD" value={`${formatNumber(monthlyInsight.maxExpectedDrawdown)}R`} />
          <Stat label="Max profit" value={`${formatNumber(monthlyInsight.maxProfitThisMonth)}R`} />
          <Stat label="Projected finish" value={`${formatNumber(monthlyInsight.projectedMonthlyR)}R`} />
          <Stat
            label="Finish range"
            value={`${formatNumber(monthlyInsight.finishLow)}R to ${formatNumber(monthlyInsight.finishHigh)}R`}
          />
        </div>
        <div className="monthly-coach-note">
          <span>{monthlyInsight.liveSamples} live trades</span>
          <span>{monthlyInsight.backtestSamples} backtests</span>
          <span>Projection uses current monthly pace, expectancy, and R volatility.</span>
        </div>
      </section>

      <section className="coach-panel coach-chat-panel">
        <div className="panel-header">
          <span>Ask Journaly AI Coach</span>
          <strong>{isCoachLoading ? "Thinking..." : "Live API coaching"}</strong>
        </div>
        <div className="coach-spend-card">
          <div>
            <span>API spend</span>
            <strong>${usage.spent.toFixed(4)}</strong>
            <small>
              {usage.requests} req / ${budgetRemaining.toFixed(2)} left
            </small>
          </div>
          <div className="coach-budget-track" aria-label="AI Coach API budget used">
            <span style={{ width: `${budgetUsedPercent}%` }} />
          </div>
          <div className="coach-spend-actions">
            <small>{usage.inputTokens.toLocaleString()} in / {usage.outputTokens.toLocaleString()} out</small>
            <button type="button" onClick={resetUsage}>
              Reset
            </button>
          </div>
        </div>
        <div className="coach-chat-box">
          <textarea
            value={coachQuestion}
            rows={4}
            placeholder="Ask about your setups, pairs, discipline, loss patterns, or what to focus on next."
            onChange={(event) => setCoachQuestion(event.target.value)}
          />
          <button className="primary-action" type="button" disabled={isCoachLoading} onClick={() => askCoach()}>
            <Brain size={18} />
            Ask Coach
          </button>
        </div>
        {coachError ? <p className="coach-error">{coachError}</p> : null}
        {coachAnswer ? (
          <article className="coach-answer">
            <span>Coach response</span>
            <p>{coachAnswer}</p>
          </article>
        ) : null}
      </section>

      <section className="coach-panel">
        <div className="panel-header">
          <span>What the AI Coach can do</span>
          <strong>Data-driven feedback</strong>
        </div>
        <div className="coach-capability-grid">
          {coachCards.map((card) => (
            <article className="coach-capability-card" key={card.title}>
              <div>{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="coach-panel coach-ask-panel">
        <div className="panel-header">
          <span>Example questions you can ask</span>
          <strong>Coach prompts</strong>
        </div>
        <div className="coach-question-grid">
          {questions.map((question) => (
            <button type="button" key={question} onClick={() => askCoach(question)}>
              <MessageSquareText size={16} />
              {question}
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

function DaraMiniChatbar({ context, onOpenCoach }: { context: any; onOpenCoach: () => void }) {
  const [windowState, setWindowState] = useState<DaraWindowState>(readDaraWindow);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem(DARA_WINDOW_KEY, JSON.stringify(windowState));
  }, [windowState]);

  useEffect(() => {
    function keepInView() {
      setWindowState((current) => normalizeDaraWindow(current));
    }

    window.addEventListener("resize", keepInView);
    return () => window.removeEventListener("resize", keepInView);
  }, []);

  function updateWindow(nextState: DaraWindowState | ((current: DaraWindowState) => DaraWindowState)) {
    setWindowState((current) => normalizeDaraWindow(typeof nextState === "function" ? nextState(current) : nextState));
  }

  function shouldIgnoreDrag(target: EventTarget | null) {
    return target instanceof HTMLElement && Boolean(target.closest("button, input, textarea, select, a"));
  }

  function startDrag(event: React.PointerEvent<HTMLElement>) {
    if (windowState.isOpen && shouldIgnoreDrag(event.target)) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const startState = windowState;

    event.currentTarget.setPointerCapture(event.pointerId);

    function moveWindow(moveEvent: PointerEvent) {
      updateWindow({
        ...startState,
        isMaximized: false,
        x: startState.x + moveEvent.clientX - startX,
        y: startState.y + moveEvent.clientY - startY,
      });
    }

    function stopDrag() {
      window.removeEventListener("pointermove", moveWindow);
      window.removeEventListener("pointerup", stopDrag);
    }

    window.addEventListener("pointermove", moveWindow);
    window.addEventListener("pointerup", stopDrag);
  }

  function startMinimizedInteraction(event: React.PointerEvent<HTMLButtonElement>) {
    const startX = event.clientX;
    const startY = event.clientY;
    const startState = windowState;
    let didMove = false;

    event.currentTarget.setPointerCapture(event.pointerId);

    function moveTab(moveEvent: PointerEvent) {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) didMove = true;

      updateWindow({
        ...startState,
        x: startState.x + deltaX,
        y: startState.y + deltaY,
      });
    }

    function stopTab() {
      window.removeEventListener("pointermove", moveTab);
      window.removeEventListener("pointerup", stopTab);
      if (!didMove) openDara();
    }

    window.addEventListener("pointermove", moveTab);
    window.addEventListener("pointerup", stopTab);
  }

  function startResize(event: React.PointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startState = windowState;

    event.currentTarget.setPointerCapture(event.pointerId);

    function resizeWindow(moveEvent: PointerEvent) {
      updateWindow({
        ...startState,
        isMaximized: false,
        width: startState.width + moveEvent.clientX - startX,
        height: startState.height + moveEvent.clientY - startY,
      });
    }

    function stopResize() {
      window.removeEventListener("pointermove", resizeWindow);
      window.removeEventListener("pointerup", stopResize);
    }

    window.addEventListener("pointermove", resizeWindow);
    window.addEventListener("pointerup", stopResize);
  }

  function openDara() {
    updateWindow((current) => ({ ...current, isOpen: true, width: Math.max(current.width, 360), height: Math.max(current.height, 430) }));
  }

  function minimizeDara() {
    updateWindow((current) => ({ ...current, isOpen: false, isMaximized: false }));
  }

  function toggleMaximize() {
    updateWindow((current) => {
      if (current.isMaximized && current.previous) {
        return { ...current.previous, isOpen: true, isMaximized: false };
      }

      return {
        ...current,
        previous: {
          x: current.x,
          y: current.y,
          width: current.width,
          height: current.height,
        },
        x: 12,
        y: 12,
        width: window.innerWidth - 24,
        height: window.innerHeight - 24,
        isOpen: true,
        isMaximized: true,
      };
    });
  }

  async function askDara() {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuestion,
          context,
        }),
      });
      const responseText = await response.text();
      let payload: any = {};
      try {
        payload = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error("Dara did not receive a JSON response. Restart npm run dev and try again.");
      }

      if (!response.ok) {
        throw new Error(payload.error || `Dara request failed with status ${response.status}.`);
      }

      setAnswer(payload.answer || "");
      const currentUsage = readAICoachUsage();
      const nextUsage = {
        spent: currentUsage.spent + Number(payload.usage?.estimatedCost || 0),
        inputTokens: currentUsage.inputTokens + Number(payload.usage?.inputTokens || 0),
        outputTokens: currentUsage.outputTokens + Number(payload.usage?.outputTokens || 0),
        requests: currentUsage.requests + 1,
      };
      localStorage.setItem(AI_COACH_USAGE_KEY, JSON.stringify(nextUsage));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Dara is unavailable right now.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <aside
      className={`dara-mini ${windowState.isOpen ? "is-open" : ""} ${windowState.isMaximized ? "is-maximized" : ""}`}
      style={{
        left: windowState.x,
        top: windowState.y,
        width: windowState.width,
        height: windowState.height,
      }}
      aria-label="Dara mini coach"
    >
      {windowState.isOpen ? (
        <div className="dara-mini-panel" onPointerDown={startDrag}>
          <div className="dara-mini-header">
            <div>
              <span>Dara</span>
              <strong>Your trading companion</strong>
            </div>
            <div className="dara-window-actions">
              <button type="button" aria-label={windowState.isMaximized ? "Restore Dara" : "Maximize Dara"} onClick={toggleMaximize}>
                {windowState.isMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button type="button" aria-label="Minimize Dara" onClick={minimizeDara}>
                <X size={16} />
              </button>
            </div>
          </div>
          {answer || error ? (
            <div className={`dara-mini-answer ${error ? "is-error" : ""}`}>
              {error || answer}
            </div>
          ) : (
            <p className="dara-mini-greeting">Ask me about your trades, backtests, pairs, setups, or discipline.</p>
          )}
          <div className="dara-mini-input">
            <input
              value={question}
              placeholder="Ask Dara..."
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") askDara();
              }}
            />
            <button type="button" disabled={isLoading} onClick={askDara}>
              {isLoading ? "..." : "Ask"}
            </button>
          </div>
          <button className="dara-mini-link" type="button" onClick={onOpenCoach}>
            Open full AI Coach
          </button>
          <span className="dara-resize-handle" aria-hidden="true" onPointerDown={startResize} />
        </div>
      ) : (
        <button className="dara-mini-tab" type="button" onPointerDown={startMinimizedInteraction}>
          <Brain size={18} />
          <span>Dara</span>
        </button>
      )}
    </aside>
  );
}

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? TriangleAlert : Info;

  return (
    <div className={`toast toast-${toast.tone}`} role="status" aria-live="polite">
      <Icon size={20} />
      <div>
        <strong>{toast.title}</strong>
        <p>{toast.message}</p>
      </div>
      <button className="toast-close" type="button" aria-label="Dismiss notification" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <button className="confirm-backdrop" type="button" aria-label="Cancel delete" onClick={onCancel} />
      <section className="confirm-panel">
        <div className="confirm-icon">
          <TriangleAlert size={22} />
        </div>
        <div>
          <h2 id="confirm-title">{title}</h2>
          <p>{message}</p>
        </div>
        <div className="confirm-actions">
          <button className="secondary-action" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-action danger-action" type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function MissingConfigScreen({ missing }: { missing: string[] }) {
  return (
    <section className="auth-screen config-screen">
      <Brand className="auth-brand" />
      <div className="auth-layout">
        <div className="auth-copy">
          <p className="eyebrow">Vercel setup needed</p>
          <h1>Your app is deployed, but the database keys are missing.</h1>
          <p>
            Add the required environment variables in Vercel, then redeploy Journaly OS.
            The app will connect to Supabase as soon as those values are available.
          </p>
        </div>

        <article className="auth-card config-card">
          <div className="auth-card-header">
            <p className="eyebrow">Missing config</p>
            <h2>Environment variables</h2>
          </div>

          <div className="config-list">
            {missing.map((key) => (
              <code key={key}>{key}</code>
            ))}
          </div>

          <div className="config-steps">
            <p>In Vercel, open Project Settings, then Environment Variables.</p>
            <p>Add the Supabase URL and publishable key for Production, Preview, and Development.</p>
            <p>Add OPENAI_API_KEY too if you want Dara and AI Coach to work after deploy.</p>
            <p>Redeploy the project after saving the variables.</p>
          </div>
        </article>
      </div>
    </section>
  );
}

function Brand({ className, onHome }: { className: string; onHome?: () => void }) {
  return (
    <a className={className} href="#" aria-label="Journaly OS home" onClick={onHome}>
      <img src="/assets/logo.svg" alt="" />
      <span>
        <strong>Journaly OS</strong>
        <small>Trading journal</small>
      </span>
    </a>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const metricTone = getMetricTone(label, value);

  return (
    <article className={`metric-card ${metricTone}`}>
      <div className="metric-card-topline">
        <span>{label}</span>
        <MetricGlyph label={label} value={value} />
      </div>
      <strong>{value}</strong>
    </article>
  );
}

function getMetricTone(label: string, value: string) {
  const text = `${label} ${value}`.toLowerCase();

  if (text.includes("worst") || text.includes("loss") || /^-/.test(value.trim())) {
    return "is-danger";
  }

  if (text.includes("best") || text.includes("positive") || text.includes("win") || text.includes("profit")) {
    return "is-positive";
  }

  if (text.includes("average") || text.includes("expectancy") || text.includes("efficient")) {
    return "is-focus";
  }

  return "is-neutral";
}

function MetricGlyph({ label, value }: { label: string; value: string }) {
  const normalizedLabel = label.toLowerCase();
  const text = `${label} ${value}`.toLowerCase();

  if (normalizedLabel === "total r" || normalizedLabel.includes("year r")) {
    return <CircleDollarSign aria-hidden="true" />;
  }

  if (normalizedLabel === "profit factor" || normalizedLabel.includes("profit")) {
    return <Gauge aria-hidden="true" />;
  }

  if (normalizedLabel === "max drawdown" || normalizedLabel.includes("drawdown")) {
    return <ShieldAlert aria-hidden="true" />;
  }

  if (normalizedLabel === "total trades" || normalizedLabel.includes("samples")) {
    return <ListChecks aria-hidden="true" />;
  }

  if (normalizedLabel === "days since last trade") {
    return <Clock3 aria-hidden="true" />;
  }

  if (normalizedLabel.includes("month")) {
    return <CalendarDays aria-hidden="true" />;
  }

  if (normalizedLabel.includes("win rate")) {
    return <Percent aria-hidden="true" />;
  }

  if (text.includes("worst") || text.includes("loss") || /^-/.test(value.trim())) {
    return <TrendingDown aria-hidden="true" />;
  }

  if (text.includes("breakeven")) {
    return <CircleSlash2 aria-hidden="true" />;
  }

  if (text.includes("best") || text.includes("positive") || text.includes("win") || text.includes("profit")) {
    return text.includes("best") ? <Award aria-hidden="true" /> : <TrendingUp aria-hidden="true" />;
  }

  if (text.includes("average") || text.includes("expectancy") || text.includes("efficient")) {
    return <Activity aria-hidden="true" />;
  }

  if (text.includes("pair") || text.includes("setup")) {
    return <Target aria-hidden="true" />;
  }

  return <BarChart3 aria-hidden="true" />;
}

function WinRateStat({ rate }: { rate: number }) {
  return (
    <article className="metric-card winrate-card is-positive">
      <div className="metric-card-topline">
        <span>Win rate</span>
        <Percent aria-hidden="true" />
      </div>
      <div className="winrate-content">
        <div
          className="winrate-ring"
          style={{ "--win-rate": `${rate}%` } as React.CSSProperties}
          aria-label={`Win rate ${rate}%`}
        >
          <strong>{rate}%</strong>
        </div>
        <small>Wins vs losses</small>
      </div>
    </article>
  );
}

function EquityCurve({ points }: { points: Array<{ label: string; value: number }> }) {
  const width = 900;
  const height = 320;
  const padding = 38;
  const values = points.length > 0 ? points.map((point) => point.value) : [0];
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const xStep = points.length <= 1 ? 0 : (width - padding * 2) / (points.length - 1);
  const toY = (value: number) => height - padding - ((value - min) / range) * (height - padding * 2);
  const finalValue = values[values.length - 1] || 0;
  const high = max;
  const low = min;
  let runningPeak = 0;
  let largestDrawdown = 0;
  let drawdownStartIndex = 0;
  let drawdownEndIndex = 0;
  let peakIndex = 0;

  points.forEach((point, index) => {
    if (point.value >= runningPeak) {
      runningPeak = point.value;
      peakIndex = index;
    }

    const drawdown = runningPeak - point.value;
    if (drawdown > largestDrawdown) {
      largestDrawdown = drawdown;
      drawdownStartIndex = peakIndex;
      drawdownEndIndex = index;
    }
  });

  const path =
    points.length === 0
      ? ""
      : points
          .map((point, index) => {
            const x = padding + xStep * index;
            const y = toY(point.value);
            return `${index === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ");
  const areaPath = points.length
    ? `${path} L ${padding + xStep * (points.length - 1)} ${height - padding} L ${padding} ${height - padding} Z`
    : "";
  const zeroY = toY(0);
  const gridValues = Array.from({ length: 5 }, (_, index) => min + (range / 4) * index);
  const drawdownX = padding + xStep * drawdownStartIndex;
  const drawdownWidth = Math.max(0, xStep * (drawdownEndIndex - drawdownStartIndex));

  return (
    <section className="equity-card" aria-label="Equity curve">
      <div className="panel-header">
        <span>Equity curve</span>
        <strong className={finalValue >= 0 ? "positive-r" : "negative-r"}>
          {formatNumber(finalValue)}R
        </strong>
      </div>

      {points.length === 0 ? (
        <p className="recent-empty">No trades available for equity curve.</p>
      ) : (
        <>
          <div className="equity-metrics">
            <span>High {formatNumber(high)}R</span>
            <span>Low {formatNumber(low)}R</span>
            <span>Max DD {formatNumber(largestDrawdown)}R</span>
            <span>{points.length} trades</span>
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Cumulative R equity curve">
            <defs>
              <linearGradient id="equityLineGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="55%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#5eead4" />
              </linearGradient>
              <linearGradient id="equityAreaGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {gridValues.map((value) => (
              <g key={value}>
                <line
                  className="equity-grid"
                  x1={padding}
                  x2={width - padding}
                  y1={toY(value)}
                  y2={toY(value)}
                />
                <text className="equity-axis-label" x={8} y={toY(value) + 4}>
                  {formatNumber(value)}R
                </text>
              </g>
            ))}
            {largestDrawdown > 0 ? (
              <rect
                className="equity-drawdown"
                x={drawdownX}
                y={padding}
                width={drawdownWidth}
                height={height - padding * 2}
              />
            ) : null}
            <line className="equity-zero" x1={padding} x2={width - padding} y1={zeroY} y2={zeroY} />
            <path className="equity-area" d={areaPath} />
            <path className="equity-line" d={path} />
            {points.map((point, index) => {
              const isEndpoint = index === 0 || index === points.length - 1;
              const isHigh = point.value === high;
              const isLow = point.value === low;

              return (
                <circle
                  className={`equity-point ${isEndpoint || isHigh || isLow ? "is-key" : ""}`}
                  key={`${point.label}-${index}`}
                  cx={padding + xStep * index}
                  cy={toY(point.value)}
                  r={isEndpoint || isHigh || isLow ? "6" : "3"}
                />
              );
            })}
          </svg>
        </>
      )}
    </section>
  );
}

function TradeCalendar({
  days,
  month,
  monthOptions,
  onMonthChange,
  onViewImage,
}: {
  days: Array<null | { date: string; day: number; trades: Trade[]; totalR: number }>;
  month: string;
  monthOptions: string[];
  onMonthChange: (month: string) => void;
  onViewImage: (trade: Trade) => void;
}) {
  return (
    <section className="calendar-panel">
      <div className="calendar-header">
        <div>
          <p className="eyebrow">Daily performance</p>
        <h3>
          {formatMonthLabel(month)}
          {isCurrentMonth(month) ? <span className="current-month-badge">Current month</span> : null}
        </h3>
        </div>
        <label>
          <span>Month</span>
          <select value={month} onChange={(event) => onMonthChange(event.target.value)}>
            {monthOptions.map((option) => (
              <option key={option} value={option}>
                {formatMonthWithCurrent(option)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="calendar-weekdays">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {days.map((day, index) =>
          day ? (
            <article
              className={`calendar-day ${day.totalR > 0 ? "is-positive" : day.totalR < 0 ? "is-negative" : ""}`}
              key={day.date}
            >
              <div className="calendar-day-header">
                <strong>{day.day}</strong>
                <span>{day.trades.length ? `${formatNumber(day.totalR)}R` : ""}</span>
              </div>
              <div className="calendar-trades">
                {day.trades.map((trade) => (
                  <button className="calendar-trade" key={trade.id} type="button" onClick={() => onViewImage(trade)}>
                    <span>{trade.pair}</span>
                    <strong className={trade.pnl >= 0 ? "positive-r" : "negative-r"}>
                      {formatNumber(trade.pnl)}R
                    </strong>
                  </button>
                ))}
              </div>
            </article>
          ) : (
            <div className="calendar-day is-empty" key={`empty-${index}`} />
          ),
        )}
      </div>
    </section>
  );
}

function MonthlyHeatmap({
  data,
}: {
  data: {
    months: Array<{ month: string; totalR: number; trades: number; winRate: number }>;
    quarters: Array<{ quarter: string; totalR: number; trades: number; wins: number; losses: number }>;
    bestMonth?: { month: string; totalR: number };
    worstMonth?: { month: string; totalR: number };
    positiveMonths: number;
    averageMonthlyR: number;
    positiveMonthRate: number;
  };
}) {
  const maxAbsMonth = Math.max(1, ...data.months.map((month) => Math.abs(month.totalR)));

  return (
    <section className="heatmap-panel">
      <div className="stat-grid analytics-grid">
        <Stat label="Average monthly R" value={`${formatNumber(data.averageMonthlyR)}R`} />
        <Stat label="Positive month rate" value={`${data.positiveMonthRate}%`} />
        <Stat label="Positive months" value={String(data.positiveMonths)} />
        <Stat
          label="Best month"
          value={data.bestMonth ? `${formatMonthLabel(data.bestMonth.month)} / ${formatNumber(data.bestMonth.totalR)}R` : "-"}
        />
        <Stat
          label="Worst month"
          value={data.worstMonth ? `${formatMonthLabel(data.worstMonth.month)} / ${formatNumber(data.worstMonth.totalR)}R` : "-"}
        />
      </div>

      <div className="heatmap-section">
        <div className="panel-header">
          <span>Performance by month</span>
          <strong>{data.months.length} months</strong>
        </div>
        <div className="month-heatmap-grid">
          {data.months.length === 0 ? (
            <p className="recent-empty">No monthly data yet.</p>
          ) : (
            data.months.map((month) => {
              const intensity = Math.min(1, Math.abs(month.totalR) / maxAbsMonth);
              return (
                <article
                  className={`heat-cell ${month.totalR >= 0 ? "is-positive" : "is-negative"}`}
                  key={month.month}
                  style={{ "--heat": intensity } as React.CSSProperties}
                >
                  <span>
                    {formatMonthLabel(month.month)}
                    <em>{getQuarterLabel(month.month)}</em>
                    {isCurrentMonth(month.month) ? <em>Current month</em> : null}
                  </span>
                  <strong>{formatNumber(month.totalR)}R</strong>
                  <small>
                    {month.trades} trades / {month.winRate}% WR
                  </small>
                </article>
              );
            })
          )}
        </div>
      </div>

      <div className="heatmap-section">
        <div className="panel-header">
          <span>Performance by quarter</span>
          <strong>{data.quarters.length} quarters</strong>
        </div>
        <div className="quarter-grid">
          {data.quarters.map((quarter) => (
            <article className="quarter-card" key={quarter.quarter}>
              <span>{quarter.quarter}</span>
              <strong className={quarter.totalR >= 0 ? "positive-r" : "negative-r"}>
                {formatNumber(quarter.totalR)}R
              </strong>
              <small>
                {quarter.trades} trades / {quarter.wins}W {quarter.losses}L
              </small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function PerformanceBreakdown({
  data,
}: {
  data: {
    bySetup: Array<PerformanceRow>;
    byPair: Array<PerformanceRow>;
    byDirection: Array<PerformanceRow>;
    byResult: Array<PerformanceRow>;
    bestSetup?: PerformanceRow;
    worstSetup?: PerformanceRow;
    bestPair?: PerformanceRow;
    worstPair?: PerformanceRow;
    lowMaeWinners?: PerformanceRow;
  };
}) {
  return (
    <section className="performance-panel">
      <div className="stat-grid analytics-grid">
        <Stat label="Best setup" value={data.bestSetup ? `${data.bestSetup.label} / ${formatNumber(data.bestSetup.totalR)}R` : "-"} />
        <Stat label="Worst setup" value={data.worstSetup ? `${data.worstSetup.label} / ${formatNumber(data.worstSetup.totalR)}R` : "-"} />
        <Stat label="Best pair" value={data.bestPair ? `${data.bestPair.label} / ${formatNumber(data.bestPair.totalR)}R` : "-"} />
        <Stat label="Worst pair" value={data.worstPair ? `${data.worstPair.label} / ${formatNumber(data.worstPair.totalR)}R` : "-"} />
        <Stat
          label="Efficient setup"
          value={data.lowMaeWinners ? `${data.lowMaeWinners.label} / ${formatNumber(data.lowMaeWinners.averageMae)} MAE` : "-"}
        />
      </div>

      <div className="performance-grid">
        <PerformanceTable title="Setup performance" rows={data.bySetup} />
        <PerformanceTable title="Pair performance" rows={data.byPair} />
        <PerformanceTable title="Direction performance" rows={data.byDirection} />
        <PerformanceTable title="Result distribution" rows={data.byResult} />
      </div>
    </section>
  );
}

function YearlyComparison({
  data,
  selectedYear,
  onYearChange,
}: {
  data: {
    years: string[];
    activeYear: string;
    rows: YearlyComparisonRow[];
    yearlySeries: Array<{ year: string; points: Array<{ label: string; value: number }> }>;
    equityPoints: Array<{ label: string; value: number }>;
    selectedSummary?: YearlyComparisonRow;
    bestYear?: YearlyComparisonRow;
    worstYear?: YearlyComparisonRow;
    averageYearlyR: number;
    totalSamples: number;
    pairYearRows: YearlyDimensionRow[];
    setupYearRows: YearlyDimensionRow[];
  };
  selectedYear: string;
  onYearChange: (year: string) => void;
}) {
  const selected = data.selectedSummary;
  const maxAbs = Math.max(1, ...data.rows.map((row) => Math.abs(row.totalR)));
  const [curveYears, setCurveYears] = useState<string[]>(["All"]);
  const visibleCurveSeries =
    curveYears.includes("All") || curveYears.length === 0
      ? data.yearlySeries
      : data.yearlySeries.filter((item) => curveYears.includes(item.year));

  function toggleCurveYear(year: string) {
    if (year === "All") {
      setCurveYears(["All"]);
      return;
    }

    setCurveYears((currentYears) => {
      const withoutAll = currentYears.filter((item) => item !== "All");
      const nextYears = withoutAll.includes(year)
        ? withoutAll.filter((item) => item !== year)
        : [...withoutAll, year];

      return nextYears.length === 0 ? ["All"] : nextYears;
    });
  }

  return (
    <section className="yearly-panel">
      <div className="yearly-toolbar">
        <SelectField
          label="Compare year"
          value={selectedYear}
          options={data.years.length > 0 ? data.years : [selectedYear]}
          onChange={onYearChange}
        />
        <div className="yearly-note">
          <span>Includes live trades and backtesting data</span>
          <strong>{data.totalSamples} total samples</strong>
        </div>
      </div>

      <DynamicYearlyEquityCurve
        series={visibleCurveSeries}
        years={data.years}
        selectedYears={curveYears}
        onToggleYear={toggleCurveYear}
      />

      <div className="stat-grid analytics-grid">
        <Stat label="Selected year R" value={selected ? `${formatNumber(selected.totalR)}R` : "0.00R"} />
        <Stat label="Selected expectancy" value={selected ? `${formatNumber(selected.expectancy)}R` : "0.00R"} />
        <Stat label="Selected win rate" value={selected ? `${selected.winRate}%` : "0%"} />
        <Stat label="Selected drawdown" value={selected ? `${formatNumber(selected.maxDrawdown)}R` : "0.00R"} />
        <Stat label="Best year" value={data.bestYear ? `${data.bestYear.year} / ${formatNumber(data.bestYear.totalR)}R` : "-"} />
        <Stat label="Average yearly R" value={`${formatNumber(data.averageYearlyR)}R`} />
      </div>

      <div className="yearly-grid">
        <article className="yearly-card">
          <div className="panel-header">
            <span>Yearly comparison</span>
            <strong>{data.rows.length} years</strong>
          </div>

          {data.rows.length === 0 ? (
            <p className="recent-empty">No yearly data yet.</p>
          ) : (
            <div className="yearly-table">
              <div className="yearly-row yearly-head">
                <span>Year</span>
                <span>Samples</span>
                <span>Total R</span>
                <span>Expectancy</span>
                <span>Win rate</span>
                <span>PF</span>
                <span>Max DD</span>
              </div>
              {data.rows.map((row) => (
                <button
                  className={`yearly-row ${row.year === data.activeYear ? "is-active" : ""}`}
                  key={row.year}
                  type="button"
                  onClick={() => onYearChange(row.year)}
                >
                  <span>{row.year}</span>
                  <span>
                    {row.samples}
                    <small>{row.liveTrades} live / {row.backtests} BT</small>
                  </span>
                  <span className={row.totalR >= 0 ? "positive-r" : "negative-r"}>
                    {formatNumber(row.totalR)}R
                  </span>
                  <span>{formatNumber(row.expectancy)}R</span>
                  <span>{row.winRate}%</span>
                  <span>{formatNumber(row.profitFactor)}</span>
                  <span>{formatNumber(row.maxDrawdown)}R</span>
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="yearly-card">
          <div className="panel-header">
            <span>Live vs backtest split</span>
            <strong>{selected?.year || data.activeYear}</strong>
          </div>

          {!selected ? (
            <p className="recent-empty">Choose a year with data.</p>
          ) : (
            <div className="yearly-split-list">
              <YearSplitBar label="Live trades" value={selected.liveR} count={selected.liveTrades} maxAbs={maxAbs} />
              <YearSplitBar label="Backtests" value={selected.backtestR} count={selected.backtests} maxAbs={maxAbs} />
              <div className="yearly-detail-grid">
                <Meta label="Average win" value={`${formatNumber(selected.averageWin)}R`} />
                <Meta label="Average loss" value={`${formatNumber(selected.averageLoss)}R`} />
                <Meta
                  label="Best month"
                  value={selected.bestMonth ? `${formatMonthLabel(selected.bestMonth.month)} / ${formatNumber(selected.bestMonth.totalR)}R` : "-"}
                />
                <Meta
                  label="Worst month"
                  value={selected.worstMonth ? `${formatMonthLabel(selected.worstMonth.month)} / ${formatNumber(selected.worstMonth.totalR)}R` : "-"}
                />
              </div>
            </div>
          )}
        </article>
      </div>

      <div className="yearly-deep-grid">
        <YearlyDimensionTable title="Pairs year-to-year" rows={data.pairYearRows} years={data.years} />
        <YearlyDimensionTable title="Setups year-to-year" rows={data.setupYearRows} years={data.years} />
      </div>
    </section>
  );
}

function YearlyDimensionTable({ title, rows, years }: { title: string; rows: YearlyDimensionRow[]; years: string[] }) {
  const maxAbs = Math.max(
    1,
    ...rows.flatMap((row) => years.map((year) => Math.abs(row.years[year]?.totalR || 0))),
  );
  const template = `minmax(170px, 1.1fr) repeat(${Math.max(1, years.length)}, minmax(128px, 1fr))`;

  return (
    <article className="yearly-card yearly-dimension-card">
      <div className="panel-header">
        <span>{title}</span>
        <strong>{rows.length} groups</strong>
      </div>

      {rows.length === 0 ? (
        <p className="recent-empty">No comparison data yet.</p>
      ) : (
        <div className="yearly-dimension-table">
          <div className="yearly-dimension-row yearly-dimension-head" style={{ gridTemplateColumns: template }}>
            <span>Group</span>
            {years.map((year) => (
              <span key={year}>{year}</span>
            ))}
          </div>
          {rows.map((row) => (
            <div className="yearly-dimension-row" key={row.label} style={{ gridTemplateColumns: template }}>
              <div className="yearly-dimension-label">
                <strong>{row.label}</strong>
                <small>
                  {formatNumber(row.totalR)}R / {row.samples} samples
                </small>
                <em>
                  Best {row.bestYear || "-"} / Worst {row.worstYear || "-"}
                </em>
              </div>
              {years.map((year) => {
                const stat = row.years[year];
                const intensity = Math.min(1, Math.abs(stat?.totalR || 0) / maxAbs);

                return (
                  <div
                    className={`yearly-dimension-cell ${
                      stat?.totalR ? (stat.totalR > 0 ? "is-positive" : "is-negative") : "is-empty"
                    }`}
                    key={year}
                    style={{ "--heat": intensity } as React.CSSProperties}
                  >
                    <strong>{formatNumber(stat?.totalR || 0)}R</strong>
                    <span>{stat?.samples || 0} samples</span>
                    <small>
                      {stat?.winRate || 0}% WR / {formatNumber(stat?.expectancy || 0)} exp
                    </small>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function DynamicYearlyEquityCurve({
  series,
  years,
  selectedYears,
  onToggleYear,
}: {
  series: Array<{ year: string; points: Array<{ label: string; value: number }> }>;
  years: string[];
  selectedYears: string[];
  onToggleYear: (year: string) => void;
}) {
  const width = 900;
  const height = 330;
  const padding = 42;
  const colors = ["#0ea5e9", "#14b8a6", "#7c3aed", "#f97316", "#fb7185", "#22c55e", "#6366f1"];
  const allValues = series.flatMap((item) => item.points.map((point) => point.value));
  const min = Math.min(0, ...allValues);
  const max = Math.max(0, ...allValues);
  const range = max - min || 1;
  const longestSeries = Math.max(1, ...series.map((item) => item.points.length));
  const toX = (index: number) =>
    padding + (longestSeries <= 1 ? 0 : (index / (longestSeries - 1)) * (width - padding * 2));
  const toY = (value: number) => height - padding - ((value - min) / range) * (height - padding * 2);
  const gridValues = Array.from({ length: 5 }, (_, index) => min + (range / 4) * index);

  return (
    <section className="equity-card dynamic-yearly-equity" aria-label="Dynamic yearly equity comparison">
      <div className="panel-header">
        <span>Dynamic equity curve</span>
        <strong>{selectedYears.includes("All") ? "All years" : `${series.length} selected`}</strong>
      </div>

      <div className="curve-year-controls" aria-label="Choose years to show on equity curve">
        <button
          className={selectedYears.includes("All") ? "is-active" : ""}
          type="button"
          onClick={() => onToggleYear("All")}
        >
          All years
        </button>
        {years.map((year) => (
          <button
            className={!selectedYears.includes("All") && selectedYears.includes(year) ? "is-active" : ""}
            key={year}
            type="button"
            onClick={() => onToggleYear(year)}
          >
            {year}
          </button>
        ))}
      </div>

      {series.length === 0 ? (
        <p className="recent-empty">No yearly equity data yet.</p>
      ) : (
        <>
          <div className="yearly-legend">
            {series.map((item, index) => {
              const finalValue = item.points.at(-1)?.value || 0;

              return (
                <span key={item.year} style={{ "--series-color": colors[index % colors.length] } as React.CSSProperties}>
                  <i aria-hidden="true" />
                  {item.year}
                  <strong className={finalValue >= 0 ? "positive-r" : "negative-r"}>
                    {formatNumber(finalValue)}R
                  </strong>
                  <em>{item.points.length} samples</em>
                </span>
              );
            })}
          </div>

          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Yearly equity curves compared">
            {gridValues.map((value) => (
              <g key={value}>
                <line className="equity-grid" x1={padding} x2={width - padding} y1={toY(value)} y2={toY(value)} />
                <text className="equity-axis-label" x={8} y={toY(value) + 4}>
                  {formatNumber(value)}R
                </text>
              </g>
            ))}
            <line className="equity-zero" x1={padding} x2={width - padding} y1={toY(0)} y2={toY(0)} />
            {series.map((item, seriesIndex) => {
              const path = item.points
                .map((point, pointIndex) => {
                  const x = toX(pointIndex);
                  const y = toY(point.value);
                  return `${pointIndex === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ");
              const finalPoint = item.points.at(-1);

              return (
                <g key={item.year}>
                  <path
                    className="year-equity-line"
                    d={path}
                    style={{ "--series-color": colors[seriesIndex % colors.length] } as React.CSSProperties}
                  />
                  {finalPoint ? (
                    <circle
                      className="year-equity-endpoint"
                      cx={toX(item.points.length - 1)}
                      cy={toY(finalPoint.value)}
                      r="5"
                      style={{ "--series-color": colors[seriesIndex % colors.length] } as React.CSSProperties}
                    />
                  ) : null}
                </g>
              );
            })}
          </svg>
        </>
      )}
    </section>
  );
}

function YearSplitBar({ label, value, count, maxAbs }: { label: string; value: number; count: number; maxAbs: number }) {
  const width = `${Math.max(8, (Math.abs(value) / maxAbs) * 100)}%`;

  return (
    <div className="yearly-split-row">
      <div className="performance-row-top">
        <strong>{label}</strong>
        <span className={value >= 0 ? "positive-r" : "negative-r"}>
          {formatNumber(value)}R
        </span>
      </div>
      <div className="performance-bar-track">
        <span className={`performance-bar ${value >= 0 ? "is-positive" : "is-negative"}`} style={{ width }} />
      </div>
      <small>{count} samples</small>
    </div>
  );
}

type PerformanceRow = {
  label: string;
  trades: number;
  totalR: number;
  averageR: number;
  winRate: number;
  profitFactor: number;
  averageMae: number;
};

function PerformanceTable({ title, rows }: { title: string; rows: PerformanceRow[] }) {
  const maxAbs = Math.max(1, ...rows.map((row) => Math.abs(row.totalR)));

  return (
    <article className="performance-card">
      <div className="panel-header">
        <span>{title}</span>
        <strong>{rows.length} groups</strong>
      </div>

      {rows.length === 0 ? (
        <p className="recent-empty">No data yet.</p>
      ) : (
        <div className="performance-list">
          {rows.map((row) => {
            const width = `${Math.max(8, (Math.abs(row.totalR) / maxAbs) * 100)}%`;

            return (
              <div className="performance-row" key={row.label}>
                <div className="performance-row-top">
                  <strong>{row.label}</strong>
                  <span className={row.totalR >= 0 ? "positive-r" : "negative-r"}>
                    {formatNumber(row.totalR)}R
                  </span>
                </div>
                <div className="performance-bar-track">
                  <span
                    className={`performance-bar ${row.totalR >= 0 ? "is-positive" : "is-negative"}`}
                    style={{ width }}
                  />
                </div>
                <div className="performance-row-meta">
                  <span>{row.trades} trades</span>
                  <span>{row.winRate}% WR</span>
                  <span>{formatNumber(row.averageR)} avg R</span>
                  <span>{formatNumber(row.profitFactor)} PF</span>
                  <span>{formatNumber(row.averageMae)} avg MAE</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} required onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "All" && label === "Filter pair" ? "All pairs" : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TradeCard({
  trade,
  onEdit,
  onDelete,
  onViewImage,
}: {
  trade: Trade;
  onEdit: () => void;
  onDelete: () => void;
  onViewImage: () => void;
}) {
  return (
    <article className="trade-card">
      <div>
        <header>
          <span className="chip">{trade.pair}</span>
          <span className="chip">{trade.direction}</span>
          <span className={`chip ${trade.result.toLowerCase()}`}>{trade.result}</span>
          <span className="chip">{trade.setup}</span>
        </header>

        <div className="trade-meta">
          <Meta label="Date" value={trade.date} />
          <Meta label="Time" value={trade.time} />
          <Meta label="MAE" value={`${formatNumber(trade.mae)}R`} />
          <Meta label="PnL" value={`${formatNumber(trade.pnl)}R`} />
          <Meta label="Logged" value={new Date(trade.createdAt).toLocaleDateString()} />
        </div>

        {trade.notes ? <p className="trade-notes">{trade.notes}</p> : null}

        <div className="trade-actions">
          <button className="icon-button" type="button" onClick={onEdit}>
            <Pencil size={16} />
            Edit
          </button>
          <button className="icon-button danger" type="button" onClick={onDelete}>
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      {trade.screenshot ? (
        <button className="shot-button" type="button" onClick={onViewImage}>
          <img className="trade-shot" src={trade.screenshot} alt={`${trade.pair} trade screenshot`} />
        </button>
      ) : (
        <div className="trade-shot" aria-label="No screenshot" />
      )}
    </article>
  );
}

function BacktestCard({
  backtest,
  onEdit,
  onDelete,
  onViewImage,
}: {
  backtest: Backtest;
  onEdit: () => void;
  onDelete: () => void;
  onViewImage: () => void;
}) {
  return (
    <article className="trade-card">
      <div>
        <header>
          <span className="chip">{backtest.pair}</span>
          <span className="chip">{backtest.direction}</span>
          <span className={`chip ${backtest.result.toLowerCase()}`}>{backtest.result}</span>
          <span className="chip">{backtest.setup}</span>
          <span className="chip">Scale: {backtest.scaleIn}</span>
        </header>

        <div className="trade-meta backtest-meta">
          <Meta label="Date" value={backtest.date} />
          <Meta label="Time" value={backtest.time} />
          <Meta label="SL pips" value={backtest.stopLossPips === null ? "-" : formatNumber(backtest.stopLossPips)} />
          <Meta label="MAE pips" value={backtest.maePips === null ? "-" : formatNumber(backtest.maePips)} />
          <Meta label="PnL" value={`${formatNumber(backtest.pnl)}R`} />
          <Meta
            label="Duration"
            value={backtest.durationMinutes === null ? "-" : `${backtest.durationMinutes}m`}
          />
        </div>

        {backtest.notes ? <p className="trade-notes">{backtest.notes}</p> : null}

        <div className="trade-actions">
          <button className="icon-button" type="button" onClick={onEdit}>
            <Pencil size={16} />
            Edit
          </button>
          <button className="icon-button danger" type="button" onClick={onDelete}>
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      {backtest.screenshot ? (
        <button className="shot-button" type="button" onClick={onViewImage}>
          <img className="trade-shot" src={backtest.screenshot} alt={`${backtest.pair} backtest screenshot`} />
        </button>
      ) : (
        <div className="trade-shot" aria-label="No screenshot" />
      )}
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

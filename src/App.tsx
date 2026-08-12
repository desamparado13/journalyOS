import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Brain,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  NotebookPen,
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
  FlaskConical,
  TriangleAlert,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { CSSProperties, Fragment, FormEvent, PointerEvent as ReactPointerEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { supabase, supabaseConfig } from "./supabaseClient";
import DayTradeJournal, { DayTradeView, dayTradeNavigation } from "./DayTradeJournal";
import logoUrl from "../assets/logo.svg";

const THEME_KEY = "journaly-os-theme";
const ACTIVE_VIEW_KEY = "journaly-os-active-view";
const TRADING_MODE_KEY = "journaly-os-trading-mode";
const PROFILE_SIZING_KEY = "journaly-os-profile-sizing";
const SETUP_VARIABLES_KEY = "journaly-os-setup-variables";
const ANALYSIS_HISTORY_DB = "journaly-os-analysis-history";
const ANALYSIS_HISTORY_STORE = "drawings";
const ACCOUNT_PROFILE_KEY = "journaly-os-account-profile";
const AI_COACH_USAGE_KEY = "journaly-os-ai-coach-usage";
const AI_COACH_HISTORY_KEY = "journaly-os-ai-coach-history";
const DARA_GREETING_KEY = "journaly-os-dara-greeting-date";
const DARA_WINDOW_KEY = "journaly-os-dara-window";
const LEARN_NOTES_KEY = "journaly-os-learn-notes";
const LEARN_RESUME_KEY = "journaly-os-learn-resume";
const PROP_FIRMS_KEY = "journaly-os-prop-firms";
const PROP_FIRM_PAYOUTS_KEY = "journaly-os-prop-firm-payouts";
const RESEARCH_IDEAS_KEY = "journaly-os-research-ideas";
const TRADER_FRIENDS_KEY = "journaly-os-trader-friends";
const GOALS_KEY = "journaly-os-goals";
const MONTHLY_JOURNAL_MARKER = "[[JOURNALY_MONTHLY:";
const IMPORT_BATCH_SIZE = 8;
const AI_COACH_BUDGET = 5;
const TRADE_LIST_COLUMNS =
  "id,user_id,trade_date,trade_time,pair,setup,direction,mae,pnl_r,result,notes,trade_quality,source_app,legacy_id,duration_minutes,stop_loss_pips,mae_pips,finalized_at,created_at,updated_at";
const LEGACY_TRADE_LIST_COLUMNS =
  "id,user_id,trade_date,trade_time,pair,setup,direction,mae,pnl_r,result,notes,source_app,legacy_id,duration_minutes,stop_loss_pips,mae_pips,finalized_at,created_at,updated_at";
const TRADE_SCREENSHOT_COLUMNS = "id,screenshot_url";
const TRADE_DECISION_LIST_COLUMNS =
  "id,user_id,decision_date,decision_time,pair,setup,direction,status,entry_plan,stop_loss,take_profit,risk_percent,reason_to_take,reason_cancelled,outcome,notes,screenshot_url,post_image_url,result_r,created_at,updated_at";
const JOURNAL_ENTRY_LIST_COLUMNS =
  "id,user_id,entry_date,content,advice,pair,related_trade_id,related_discipline_id,created_at,updated_at";
const PAIR_ADVICE_COLUMNS = "id,entry_date,pair,advice";
const BACKTEST_LIST_COLUMNS =
  "id,user_id,trade_date,trade_time,pair,setup,direction,duration_minutes,stop_loss_pips,mae_pips,pnl_r,result,notes,scale_in,source_app,legacy_id,created_at,updated_at";
const BACKTEST_SCREENSHOT_COLUMNS = "id,screenshot_url";
const propFirmChoices = ["5ers", "DNA Funded", "Funding Pips", "Topone Trader", "HolaPrime", "FundedNext"] as const;

const learnVideos = [
  {
    id: "lesson-1",
    title: "Lesson 1",
    source: "Mega",
    embedUrl: "https://mega.nz/embed/QEownZyJ#hZy2ms4Y5I6iv77bEQnJbJKfufOIlL2HGQRk0Se-dTM",
  },
  {
    id: "lesson-2",
    title: "Lesson 2",
    source: "Mega",
    embedUrl: "https://mega.nz/embed/EBwSCIhB#BSi23t0ufOhL_9oIMOINvlJuPyRNaSd6BFB6Tv6uiaI",
  },
] as const;

const landingFeatures = [
  "Smart trade journal with R tracking, equity curve, calendars, and image review",
  "Edge analytics across sessions, pairs, setups, time windows, and backtests",
  "Dara AI coach, research lab, prop firm calculator, and protected lesson hub",
] as const;

const pricingPlans = [
  { name: "1 Month", price: "$199", note: "Full access for focused review sprints" },
  { name: "6 Months", price: "$999", note: "Best for challenge season and refinement" },
  { name: "1 Year", price: "$1999", note: "Long-term journaling and edge building" },
  { name: "Lifetime", price: "$4999", note: "Own your trading operating system" },
] as const;

const licenseTokens = [
  { tier: "Lifetime", months: null, hash: "0c7ebacd62456bbecaaa929c87f99bccae245a2587dfe19327d3dc6223622817" },
  { tier: "Lifetime", months: null, hash: "94cb9186e6385a1146e94c6257bdd073315d474034178de8d69a1947749539d1" },
  { tier: "Lifetime", months: null, hash: "6d8b0e966293ac134c82ff27c7a5093bf5ebc79f96f8bafce53866b5fc3bbac3" },
  { tier: "Lifetime", months: null, hash: "60e9403ffac8c83dc12fab270f3a7809698fd2cf42652fbedcce0d9c926465c1" },
  { tier: "Lifetime", months: null, hash: "3af4e4978976759ec0ed189005f1b74ec286c4347e4ab3bfd9d8ba244108edf3" },
  { tier: "1 Year", months: 12, hash: "6f00f16d7b7339e3d159f2b0279b44c3e9d70bf0c1ba535db82b9968d9d50d73" },
  { tier: "1 Year", months: 12, hash: "78eb89fcebbac8fcc88676e39fe9b5b89247927c8bcca4c67906e426de973e6e" },
  { tier: "1 Year", months: 12, hash: "c3411647e88d753300ae0a04406e1273abb99ce0132acc7980e2a4ed6ec864ea" },
  { tier: "1 Year", months: 12, hash: "fead0c5892175397e371ace73d9eee5d24f00c9cc9b1cb4a0624778e34a4d343" },
  { tier: "1 Year", months: 12, hash: "a3ae3833c9d514702c7d5e3b55d93e332c291278665ccd5f331baeb6f15d4582" },
  { tier: "1 Year", months: 12, hash: "d1904bdcbeb169c5c4cf14b3cf55741468b1dbc3757b23d4fcf9f161d31ca2bf" },
  { tier: "1 Year", months: 12, hash: "7bf37c393b383445e6944c973d930f2b1c45be1d76e81fc5c5510408896c89fd" },
  { tier: "1 Year", months: 12, hash: "6606d7408edfe6db82d23c62a40389fd3c9f7ef2dfc2b2fe5253cb49e2dfbb6f" },
  { tier: "1 Year", months: 12, hash: "ff5e17fa16c11cc0b244af5913c7b130574e1390b9c8380eda0d4b3d334c4ac8" },
  { tier: "1 Year", months: 12, hash: "44fda97a241444667b72bb0cc81285609f27e73cdd765ecebcfb4f95d8b362ac" },
] as const;

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
const decisionStatuses = ["Taken", "Cancelled", "Missed", "Waiting"] as const;
const decisionOutcomes = ["Unknown", "Won", "Lost", "Breakeven", "Avoided loss", "Cost opportunity"] as const;
const cancellationReasons = [
  "None",
  "Setup invalidated",
  "Late entry",
  "News risk",
  "Spread too high",
  "Risk too large",
  "Already in trade",
  "Hesitation",
  "Rule not met",
] as const;

function defaultStopLossForSetup(setup: string) {
  return ["REVERSAL", "Flag", "Break and retest", "Flag+", "EU timed entry"].includes(setup) ? "14" : "";
}

function resultFromPnl(pnl: string | number): Result {
  const value = Number(pnl || 0);
  if (value > 0) return "Win";
  if (value < 0) return "Loss";
  return "Breakeven";
}

type LicenseTokenMatch = (typeof licenseTokens)[number];

function normalizeToken(token: string) {
  return token.trim().toUpperCase();
}

async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(normalizeToken(token));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function findLicenseToken(token: string): Promise<LicenseTokenMatch | null> {
  if (!token.trim()) return null;
  const tokenHash = await hashToken(token);
  return licenseTokens.find((license) => license.hash === tokenHash) || null;
}

function buildLicenseMetadata(match: LicenseTokenMatch) {
  const activatedAt = new Date();
  const expiresAt = match.months === null ? null : new Date(activatedAt.setMonth(activatedAt.getMonth() + match.months)).toISOString();

  return {
    journaly_license_activated_at: new Date().toISOString(),
    journaly_license_expires_at: expiresAt,
    journaly_license_tier: match.tier,
    journaly_license_hash: match.hash,
  };
}

function normalizeSessionUser(user: any): SessionUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email || "",
    createdAt: user.created_at || new Date().toISOString(),
    metadata: user.user_metadata || {},
  };
}

function getLicenseState(user: SessionUser | null) {
  if (!user) {
    return { isActivated: false, isExpired: false, isInGrace: false, daysLeft: 0, tier: "", expiresAt: "" };
  }

  const now = Date.now();
  const metadata = user.metadata || {};
  const expiresAt = metadata.journaly_license_expires_at || "";
  const activatedAt = metadata.journaly_license_activated_at || "";
  const isLifetime = Boolean(activatedAt && !expiresAt);
  const isActiveTerm = Boolean(activatedAt && expiresAt && new Date(expiresAt).getTime() > now);
  const graceExpiresAt = new Date(user.createdAt);
  graceExpiresAt.setDate(graceExpiresAt.getDate() + 30);
  const graceMsLeft = graceExpiresAt.getTime() - now;
  const daysLeft = Math.max(0, Math.ceil(graceMsLeft / (24 * 60 * 60 * 1000)));

  return {
    isActivated: isLifetime || isActiveTerm,
    isExpired: Boolean(activatedAt && expiresAt && new Date(expiresAt).getTime() <= now) || (!activatedAt && graceMsLeft <= 0),
    isInGrace: !activatedAt && graceMsLeft > 0,
    daysLeft,
    tier: metadata.journaly_license_tier || (activatedAt ? "Active" : "Trial"),
    expiresAt,
  };
}

type AuthMode = "login" | "signup";
type Direction = "Long" | "Short";
type Result = (typeof results)[number];
type TradeDecisionStatus = (typeof decisionStatuses)[number];
type TradeDecisionOutcome = (typeof decisionOutcomes)[number];
type Theme = "light" | "dark";
type TradingMode = "swing" | "daytrade";
type ClockPeriod = "AM" | "PM";
type ClockSource = "live" | "backtest";
type EdgeMode = "clock" | "session" | "week";
type LearnNote = {
  id: string;
  timestamp: string;
  text: string;
  createdAt: string;
};
type PropFirmAccount = {
  id: string;
  name: string;
  capital: string;
  riskPercent: string;
  traderSplit: string;
};
type PropFirmPayoutStatus = "Requested" | "Processing" | "Paid";
type PropFirmPayout = {
  id: string;
  firmName: string;
  accountName: string;
  amount: string;
  status: PropFirmPayoutStatus;
  requestedDate: string;
  paidDate: string;
  method: string;
  notes: string;
  createdAt: string;
};
type GoalCategory = "Prop firm" | "Travel" | "Trading" | "Personal";
type GoalItem = {
  id: string;
  title: string;
  category: GoalCategory;
  targetDate: string;
  notes: string;
  isDone: boolean;
  createdAt: string;
  completedAt: string | null;
};
type AccountProfile = {
  displayName: string;
  bio: string;
  avatar: string;
  publicViewing: boolean;
};
type TraderFriend = {
  id: string;
  label: string;
  addedAt: string;
};
type ResearchSample = {
  id: string;
  date: string;
  pair: string;
  setup: string;
  result: Result;
  pnl: string;
  notes: string;
  image: string;
};
type ResearchIdea = {
  id: string;
  title: string;
  hypothesis: string;
  createdAt: string;
  samples: ResearchSample[];
};
type AppView =
  | "dashboard"
  | "journal"
  | "add-trade"
  | "edge"
  | "learn"
  | "prop-firms"
  | "goals"
  | "research"
  | "traders"
  | "position-sizing"
  | "trade-analysis"
  | "trade-analytics"
  | "view-trades"
  | "trade-images"
  | "trade-calendar"
  | "monthly-heatmap"
  | "week-edge"
  | "trade-performance"
  | "yearly-comparison"
  | "discipline"
  | "ai-coach"
  | "backtest-comparison"
  | "backtesting-analytics"
  | "add-backtest"
  | "view-backtests";

const appViews: readonly AppView[] = [
  "dashboard",
  "journal",
  "add-trade",
  "edge",
  "learn",
  "prop-firms",
  "goals",
  "research",
  "traders",
  "position-sizing",
  "trade-analysis",
  "trade-analytics",
  "view-trades",
  "trade-images",
  "trade-calendar",
  "monthly-heatmap",
  "trade-performance",
  "yearly-comparison",
  "discipline",
  "ai-coach",
  "backtest-comparison",
  "backtesting-analytics",
  "add-backtest",
  "view-backtests",
];

type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
  metadata: Record<string, any>;
};

type TradeQuality = "Good" | "Mid" | "Bad";

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
  quality: TradeQuality | null;
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

type TradeDecision = {
  id: string;
  userId: string;
  date: string;
  time: string;
  pair: string;
  setup: string;
  direction: Direction;
  status: TradeDecisionStatus;
  entryPlan: string;
  stopLoss: string;
  takeProfit: string;
  riskPercent: number | null;
  reasonToTake: string;
  reasonCancelled: string;
  outcome: TradeDecisionOutcome;
  notes: string;
  screenshot: string;
  postImage: string;
  resultR: number;
  createdAt: string;
  updatedAt: string;
};
type PersonalJournalEntry = {
  id: string;
  userId: string;
  date: string;
  kind: "daily" | "monthly";
  monthKey: string;
  content: string;
  advice: string;
  image: string;
  pair: string;
  relatedTradeId: string;
  relatedDisciplineId: string;
  createdAt: string;
  updatedAt: string;
};
type PersonalJournalEntryRow = {
  id: string;
  user_id: string;
  entry_date: string;
  content: string;
  advice: string | null;
  image_url?: string | null;
  pair: string | null;
  related_trade_id: string | null;
  related_discipline_id: string | null;
  created_at: string;
  updated_at: string;
};
type PairAdvice = {
  id: string;
  date: string;
  pair: string;
  advice: string;
};
type PairAdviceRow = {
  id: string;
  entry_date: string;
  pair: string | null;
  advice: string | null;
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
  trade_quality: TradeQuality | null;
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

type TradeDecisionRow = {
  id: string;
  user_id: string;
  decision_date: string;
  decision_time: string;
  pair: string;
  setup: string;
  direction: Direction;
  status: TradeDecisionStatus;
  entry_plan: string | null;
  stop_loss: string | null;
  take_profit: string | null;
  risk_percent: number | string | null;
  reason_to_take: string | null;
  reason_cancelled: string | null;
  outcome: TradeDecisionOutcome | null;
  notes: string | null;
  screenshot_url: string | null;
  post_image_url: string | null;
  result_r: number | string | null;
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

type WeekEdgeDay = {
  label: string;
  shortLabel: string;
  trades: number;
  tradeTimes: Array<{ time: string; count: number; totalR: number }>;
  wins: number;
  losses: number;
  breakevens: number;
  totalR: number;
  averageR: number;
  winRate: number;
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

type ImageViewerItem = {
  id: string;
  src: string;
  alt: string;
  title: string;
  meta: string;
};

type ImageViewerState = {
  items: ImageViewerItem[];
  index: number;
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

type AICoachHistoryItem = {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
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

type AnalysisPoint = { x: number; y: number };
type AnalysisZone = {
  id: string;
  pin: number;
  variable: string;
  color: string;
  kind: "square" | "draw";
  points: AnalysisPoint[];
  anchor: AnalysisPoint;
  label: AnalysisPoint;
};
type AnalysisDecision = "take" | "skip" | null;

type TradeFormState = {
  id: string;
  date: string;
  time: string;
  pair: string;
  setup: string;
  direction: Direction;
  stopLossPips: string;
  mae: string;
  pnl: string;
  result: Result;
  notes: string;
  screenshotFile: File | null;
  analysisWorkingFile: File | null;
  analysisStartedAt: number | null;
  analysisChecks: string[];
  analysisZonePins: Record<string, number[]>;
  analysisZones: AnalysisZone[];
  analysisDecision: AnalysisDecision;
};

type TradeDecisionFormState = {
  id: string;
  date: string;
  time: string;
  pair: string;
  setup: string;
  direction: Direction;
  status: TradeDecisionStatus;
  entryPlan: string;
  stopLoss: string;
  takeProfit: string;
  riskPercent: string;
  reasonToTake: string;
  reasonCancelled: string;
  outcome: TradeDecisionOutcome;
  notes: string;
  screenshotFile: File | null;
  postImageFile: File | null;
  resultR: string;
};
type PersonalJournalFormState = {
  id: string;
  date: string;
  content: string;
  advice: string;
  pair: string;
  relatedTradeId: string;
  relatedDisciplineId: string;
  imageFile: File | null;
  removeImage: boolean;
};
type MonthlyJournalFormState = {
  content: string;
  nextMonthFocus: string;
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
  token: string;
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
    stopLossPips: defaultStopLossForSetup(setups[0]),
    mae: "0",
    pnl: "0",
    result: "Breakeven",
    notes: "",
    screenshotFile: null,
    analysisWorkingFile: null,
    analysisStartedAt: null,
    analysisChecks: [],
    analysisZonePins: {},
    analysisZones: [],
    analysisDecision: null,
  };
}

type SetupVariables = Record<string, string[]>;
type SavedAnalysisDrawing = {
  id: string;
  ownerId: string;
  savedAt: string;
  pair: string;
  setup: string;
  image: string;
  tradeId: string;
};

const defaultSetupVariables: SetupVariables = {
  REVERSAL: ["Liquidity sweep confirmed", "Key level rejection", "Structure shift confirmed"],
  "Internal reversal": ["Internal liquidity taken", "Rejection is visible", "Entry trigger confirmed"],
  "Liquidity sweep": ["External liquidity swept", "Price reclaimed the level", "Risk is defined"],
  "Break and retest": ["Level broke with displacement", "Retest held", "Continuation trigger confirmed"],
  Flag: ["Impulse leg is clean", "Pullback respects structure", "Continuation trigger confirmed"],
  "Flag+": ["Strong displacement present", "Flag is compact", "Higher-timeframe bias aligned"],
  "EU timed entry": ["Entry is inside the EU window", "Session direction is clear", "Trigger candle confirmed"],
};

function readSetupVariables(): SetupVariables {
  try {
    const saved = JSON.parse(localStorage.getItem(SETUP_VARIABLES_KEY) || "{}") as SetupVariables;
    return Object.fromEntries(setups.map((setup) => [setup, saved[setup] || defaultSetupVariables[setup] || []]));
  } catch {
    return defaultSetupVariables;
  }
}

function openAnalysisHistoryDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(ANALYSIS_HISTORY_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(ANALYSIS_HISTORY_STORE)) {
        request.result.createObjectStore(ANALYSIS_HISTORY_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open analysis history."));
  });
}

async function readAnalysisHistory(ownerId: string) {
  const database = await openAnalysisHistoryDb();
  return new Promise<SavedAnalysisDrawing[]>((resolve, reject) => {
    const request = database.transaction(ANALYSIS_HISTORY_STORE, "readonly").objectStore(ANALYSIS_HISTORY_STORE).getAll();
    request.onsuccess = () => {
      database.close();
      resolve(
        (request.result as SavedAnalysisDrawing[])
          .filter((drawing) => drawing.ownerId === ownerId)
          .sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
      );
    };
    request.onerror = () => {
      database.close();
      reject(request.error || new Error("Could not read analysis history."));
    };
  });
}

async function writeAnalysisDrawing(drawing: SavedAnalysisDrawing) {
  const database = await openAnalysisHistoryDb();
  return new Promise<void>((resolve, reject) => {
    const request = database.transaction(ANALYSIS_HISTORY_STORE, "readwrite").objectStore(ANALYSIS_HISTORY_STORE).put(drawing);
    request.onsuccess = () => {
      database.close();
      resolve();
    };
    request.onerror = () => {
      database.close();
      reject(request.error || new Error("Could not save the analysis drawing."));
    };
  });
}

function tradeDecisionDefaults(): TradeDecisionFormState {
  const now = new Date();

  return {
    id: "",
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    pair: pairs[0],
    setup: setups[0],
    direction: "Long",
    status: "Waiting",
    entryPlan: "",
    stopLoss: "",
    takeProfit: "",
    riskPercent: "1",
    reasonToTake: "",
    reasonCancelled: "",
    outcome: "Unknown",
    notes: "",
    screenshotFile: null,
    postImageFile: null,
    resultR: "0",
  };
}
function personalJournalDefaults(): PersonalJournalFormState {
  return {
    id: "",
    date: new Date().toISOString().slice(0, 10),
    content: "",
    advice: "",
    pair: "",
    relatedTradeId: "",
    relatedDisciplineId: "",
    imageFile: null,
    removeImage: false,
  };
}

function monthlyJournalDefaults(): MonthlyJournalFormState {
  return {
    content: "",
    nextMonthFocus: "",
  };
}

function encodeMonthlyJournalContent(month: string, content: string) {
  return `${MONTHLY_JOURNAL_MARKER}${month}]]\n${content.trim()}`;
}

function decodeJournalContent(content: string, entryDate: string) {
  if (!content.startsWith(MONTHLY_JOURNAL_MARKER)) {
    return { kind: "daily" as const, monthKey: "", content };
  }

  const markerEnd = content.indexOf("]]");
  const monthKey = markerEnd >= 0
    ? content.slice(MONTHLY_JOURNAL_MARKER.length, markerEnd)
    : entryDate.slice(0, 7);
  const journalContent = markerEnd >= 0 ? content.slice(markerEnd + 2).replace(/^\r?\n/, "") : content;

  return {
    kind: "monthly" as const,
    monthKey: /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : entryDate.slice(0, 7),
    content: journalContent,
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
    result: "Breakeven",
    notes: "",
    scaleIn: "No",
    screenshotFile: null,
  };
}

async function fileToDataUrl(file: File | null) {
  if (!file) return "";

  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not read the selected image."));
      element.src = sourceUrl;
    });
    const maxDimension = 1920;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");

    if (!context) throw new Error("Could not prepare the selected image.");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.82);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
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

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + offset, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthDayYear(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatOrdinalDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  const day = parsed.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const month = parsed.toLocaleDateString(undefined, { month: "short" });

  return `${month} ${day}${suffix} ${parsed.getFullYear()}`;
}

function formatTime12(time: string) {
  const [rawHour = "00", rawMinute = "00"] = time.split(":");
  const hour = Number(rawHour);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${rawMinute.padStart(2, "0")} ${suffix}`;
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

function normalizeDirection(direction: string | null | undefined): Direction {
  return String(direction || "").trim().toLowerCase() === "short" ? "Short" : "Long";
}

function getDirectionDistribution(items: Array<{ direction: Direction | string | null | undefined }>) {
  const total = items.length;
  const longs = items.filter((item) => normalizeDirection(item.direction) === "Long").length;
  const shorts = items.filter((item) => normalizeDirection(item.direction) === "Short").length;

  return {
    longPercent: total === 0 ? 0 : Math.round((longs / total) * 100),
    shortPercent: total === 0 ? 0 : Math.round((shorts / total) * 100),
  };
}

function getLongestDirectionStreaks(items: Array<{ direction: Direction | string | null | undefined }>) {
  let currentDirection: Direction | null = null;
  let currentCount = 0;
  let longestLong = 0;
  let longestShort = 0;

  items.forEach((item) => {
    const direction = normalizeDirection(item.direction);

    if (direction === currentDirection) {
      currentCount += 1;
    } else {
      currentDirection = direction;
      currentCount = 1;
    }

    if (direction === "Long") {
      longestLong = Math.max(longestLong, currentCount);
    } else {
      longestShort = Math.max(longestShort, currentCount);
    }
  });

  return { longestLong, longestShort };
}
function daysSinceTrade(trade: Trade | undefined) {
  if (!trade) return "No trades yet";

  const days = getDaysSinceTrade(trade);

  return days === 1 ? "1 day" : `${days} days`;
}

function getDaysSinceTrade(trade: Trade | undefined) {
  if (!trade) return null;

  const tradedAt = parseTradeDate(trade);
  const today = new Date();
  const tradedDay = new Date(tradedAt.getFullYear(), tradedAt.getMonth(), tradedAt.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return Math.max(
    0,
    Math.floor((todayDay.getTime() - tradedDay.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function getDirectionStreak(trades: Trade[]) {
  const ordered = [...trades].sort(
    (a, b) => parseDatedItemDate(b).getTime() - parseDatedItemDate(a).getTime(),
  );
  const [latest] = ordered;

  if (!latest) {
    return { direction: null as Direction | null, count: 0 };
  }

  const latestDirection = normalizeDirection(latest.direction);
  let count = 0;
  for (const trade of ordered) {
    if (normalizeDirection(trade.direction) !== latestDirection) break;
    count += 1;
  }

  return { direction: latestDirection, count };
}

function getProjectedDirectionStreak(trades: Trade[], direction: Direction) {
  const current = getDirectionStreak(trades);
  return current.direction === normalizeDirection(direction) ? current.count + 1 : 1;
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

const edgeSessions = [
  { name: "Asian", start: 5 * 60, end: 16 * 60 },
  { name: "London", start: 15 * 60, end: 24 * 60 },
  { name: "New York", start: 20 * 60, end: 29 * 60 },
];

const edgeSessionWindows = [
  { time: "5:00 AM-3:00 PM", session: "Asian" },
  { time: "3:00 PM-4:00 PM", session: "Asian + London" },
  { time: "4:00 PM-8:00 PM", session: "London" },
  { time: "8:00 PM-12:00 AM", session: "London + New York" },
  { time: "12:00 AM-5:00 AM", session: "New York" },
];

function formatSessionRange(session: (typeof edgeSessions)[number]) {
  return `${formatMinuteLabel(session.start)}-${formatMinuteLabel(session.end)}`;
}

function formatMinuteLabel(minutes: number) {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function getSpreadNotice(pair: string, time: string) {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  const totalMinutes = hour * 60 + minute;
  const isRolloverWindow = totalMinutes >= 5 * 60 && totalMinutes < 6 * 60 + 30;
  const isEarlySydney = totalMinutes >= 5 * 60 && totalMinutes < 7 * 60;
  const isPreLondon = totalMinutes >= 14 * 60 && totalMinutes < 15 * 60;
  const isCrossPair = pair.includes("JPY") || pair.includes("AUD") || pair.includes("NZD");

  if (isRolloverWindow && isCrossPair) {
    return {
      tone: "danger",
      label: "Spread high",
      title: `${pair} can be very wide around ${formatTime12(time)}`,
      detail: "This is close to rollover/early Sydney liquidity. Stops can get tagged fast before the real move starts.",
      tip: "Check live spread first, reduce size, widen invalidation, or wait until liquidity normalizes.",
    };
  }

  if (isEarlySydney || isPreLondon) {
    return {
      tone: "warning",
      label: "Spread caution",
      title: "Liquidity may be thinner than usual",
      detail: "This time window can have jumpy fills and wider spreads, especially on JPY and AUD/NZD pairs.",
      tip: "Confirm the spread is normal before entry.",
    };
  }

  return {
    tone: "normal",
    label: "Spread normal",
    title: "No major spread warning for this time",
    detail: "Still check your broker spread before entry, especially around news or session transitions.",
    tip: "If spread is above your usual baseline, skip or wait.",
  };
}

function getEdgeSessionsForTime(time: string) {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  const totalMinutes = hour * 60 + minute;
  const adjustedMinutes = totalMinutes < 5 * 60 ? totalMinutes + 24 * 60 : totalMinutes;
  const sessions = edgeSessions
    .filter((session) => adjustedMinutes >= session.start && adjustedMinutes < session.end)
    .map((session) => session.name);

  return sessions.length > 0 ? sessions : ["Transition"];
}

function summarizeEdgeItems(label: string, items: JournalItem[]) {
  const ordered = [...items].sort((a, b) => parseDatedItemDate(a).getTime() - parseDatedItemDate(b).getTime());
  const wins = ordered.filter((item) => item.pnl > 0);
  const losses = ordered.filter((item) => item.pnl < 0);
  const totalR = ordered.reduce((sum, item) => sum + item.pnl, 0);
  const grossWin = wins.reduce((sum, item) => sum + item.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, item) => sum + item.pnl, 0));
  let equity = 0;

  return {
    label,
    trades: ordered.length,
    wins: wins.length,
    losses: losses.length,
    totalR,
    winRate: ordered.length === 0 ? 0 : Math.round((wins.length / ordered.length) * 100),
    expectancy: ordered.length === 0 ? 0 : totalR / ordered.length,
    profitFactor: grossLoss === 0 ? grossWin : grossWin / grossLoss,
    trend: ordered.map((item) => {
      equity += item.pnl;
      return equity;
    }),
  };
}

function buildSessionEdgeSummary(items: JournalItem[]) {
  const sessionEntries = items.flatMap((item) =>
    getEdgeSessionsForTime(item.time).map((session) => ({
      ...item,
      session,
      combo: `${item.pair} / ${item.setup}`,
      sessionPair: `${session} / ${item.pair}`,
    })),
  );

  function groupBy(key: "session" | "pair" | "setup" | "combo" | "sessionPair") {
    const grouped = sessionEntries.reduce<Record<string, JournalItem[]>>((groups, item) => {
      const label = String(item[key]);
      groups[label] = [...(groups[label] || []), item];
      return groups;
    }, {});

    return Object.entries(grouped)
      .map(([label, groupItems]) => summarizeEdgeItems(label, groupItems))
      .sort((a, b) => b.totalR - a.totalR);
  }

  const bySession = groupBy("session");
  const byPair = groupBy("pair");
  const bySetup = groupBy("setup");
  const byCombo = groupBy("combo");
  const bySessionPair = groupBy("sessionPair");

  return {
    bySession,
    byPair,
    bySetup,
    byCombo,
    bySessionPair,
    bestSession: bySession[0],
    weakestSession: [...bySession].sort((a, b) => a.totalR - b.totalR)[0],
    bestPair: byPair[0],
    weakestPair: [...byPair].sort((a, b) => a.totalR - b.totalR)[0],
    bestSetup: bySetup[0],
    weakestSetup: [...bySetup].sort((a, b) => a.totalR - b.totalR)[0],
    bestCombo: byCombo[0],
    weakestCombo: [...byCombo].sort((a, b) => a.totalR - b.totalR)[0],
    totalEntries: sessionEntries.length,
  };
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
  edgeSummary,
}: {
  trades: Trade[];
  backtests: Backtest[];
  stats: any;
  tradeAnalytics: any;
  performance: any;
  monthlyHeatmap: any;
  marketSession: MarketSessionState;
  edgeSummary?: any;
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
    edgeSummary,
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

function readActiveView(): AppView {
  const stored = localStorage.getItem(ACTIVE_VIEW_KEY);
  return appViews.includes(stored as AppView) ? (stored as AppView) : "dashboard";
}

function readProfileRows() {
  try {
    const rows = JSON.parse(localStorage.getItem(PROFILE_SIZING_KEY) || "");
    return Array.isArray(rows) && rows.length > 0 ? (rows as ProfileSizingRow[]) : defaultProfileRows();
  } catch {
    return defaultProfileRows();
  }
}

function defaultAccountProfile(email = ""): AccountProfile {
  return {
    displayName: email.split("@")[0] || "Trader",
    bio: "",
    avatar: "",
    publicViewing: false,
  };
}

function readAccountProfile(userId: string, email: string): AccountProfile {
  try {
    const profiles = JSON.parse(localStorage.getItem(ACCOUNT_PROFILE_KEY) || "{}");
    return { ...defaultAccountProfile(email), ...(profiles[userId] || {}) };
  } catch {
    return defaultAccountProfile(email);
  }
}

function saveAccountProfile(userId: string, profile: AccountProfile) {
  try {
    const profiles = JSON.parse(localStorage.getItem(ACCOUNT_PROFILE_KEY) || "{}");
    localStorage.setItem(ACCOUNT_PROFILE_KEY, JSON.stringify({ ...profiles, [userId]: profile }));
  } catch {
    localStorage.setItem(ACCOUNT_PROFILE_KEY, JSON.stringify({ [userId]: profile }));
  }
}

function readLearnNotes(): Record<string, LearnNote[]> {
  try {
    const saved = JSON.parse(localStorage.getItem(LEARN_NOTES_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function readLearnResume(): Record<string, string> {
  try {
    const saved = JSON.parse(localStorage.getItem(LEARN_RESUME_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function defaultPropFirmAccounts(): PropFirmAccount[] {
  return [
    { id: crypto.randomUUID(), name: "5K account", capital: "5000", riskPercent: "1", traderSplit: "80" },
    { id: crypto.randomUUID(), name: "10K account", capital: "10000", riskPercent: "1", traderSplit: "80" },
  ];
}

function readPropFirmAccounts() {
  try {
    const rows = JSON.parse(localStorage.getItem(PROP_FIRMS_KEY) || "");
    return Array.isArray(rows) && rows.length > 0 ? (rows as PropFirmAccount[]) : defaultPropFirmAccounts();
  } catch {
    return defaultPropFirmAccounts();
  }
}

function readPropFirmPayouts(): PropFirmPayout[] {
  try {
    const rows = JSON.parse(localStorage.getItem(PROP_FIRM_PAYOUTS_KEY) || "");
    return Array.isArray(rows) ? (rows as PropFirmPayout[]) : [];
  } catch {
    return [];
  }
}

function defaultResearchIdeas(): ResearchIdea[] {
  return [
    {
      id: crypto.randomUUID(),
      title: "New edge idea",
      hypothesis: "Describe the market behavior, trigger, and conditions you want to validate.",
      createdAt: new Date().toISOString(),
      samples: [],
    },
  ];
}

function readResearchIdeas() {
  try {
    const rows = JSON.parse(localStorage.getItem(RESEARCH_IDEAS_KEY) || "");
    return Array.isArray(rows) && rows.length > 0 ? (rows as ResearchIdea[]) : defaultResearchIdeas();
  } catch {
    return defaultResearchIdeas();
  }
}

function readGoals(): GoalItem[] {
  try {
    const rows = JSON.parse(localStorage.getItem(GOALS_KEY) || "");
    return Array.isArray(rows) ? (rows as GoalItem[]) : [];
  } catch {
    return [];
  }
}

function readTraderFriends(): TraderFriend[] {
  try {
    const friends = JSON.parse(localStorage.getItem(TRADER_FRIENDS_KEY) || "");
    return Array.isArray(friends) ? friends : [];
  } catch {
    return [];
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

function readAICoachHistory(): AICoachHistoryItem[] {
  try {
    const history = JSON.parse(localStorage.getItem(AI_COACH_HISTORY_KEY) || "");
    return Array.isArray(history)
      ? history.filter((item) => item?.question && item?.answer && item?.createdAt).slice(0, 30)
      : [];
  } catch {
    return [];
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
  const minWidth = state.isOpen ? 320 : Math.min(360, viewportWidth - 24);
  const minHeight = state.isOpen ? 260 : 56;
  const width = state.isOpen ? clampNumber(Number(state.width || 360), minWidth, viewportWidth - 24) : minWidth;
  const height = state.isOpen ? clampNumber(Number(state.height || 430), minHeight, viewportHeight - 24) : minHeight;

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
    direction: normalizeDirection(row.direction),
    mae: Number(row.mae || 0),
    pnl: Number(row.pnl_r || 0),
    result: row.result,
    notes: row.notes || "",
    quality: row.trade_quality || null,
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

function toTradeDecision(row: TradeDecisionRow): TradeDecision {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.decision_date,
    time: String(row.decision_time).slice(0, 5),
    pair: row.pair,
    setup: row.setup,
    direction: row.direction,
    status: row.status,
    entryPlan: row.entry_plan || "",
    stopLoss: row.stop_loss || "",
    takeProfit: row.take_profit || "",
    riskPercent: row.risk_percent === null ? null : Number(row.risk_percent),
    reasonToTake: row.reason_to_take || "",
    reasonCancelled: row.reason_cancelled || "",
    outcome: row.outcome || "Unknown",
    notes: row.notes || "",
    screenshot: row.screenshot_url || "",
    postImage: row.post_image_url || "",
    resultR: Number(row.result_r || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function toPersonalJournalEntry(row: PersonalJournalEntryRow): PersonalJournalEntry {
  const decoded = decodeJournalContent(row.content, row.entry_date);

  return {
    id: row.id,
    userId: row.user_id,
    date: row.entry_date,
    kind: decoded.kind,
    monthKey: decoded.monthKey,
    content: decoded.content,
    advice: row.advice || "",
    image: row.image_url || "",
    pair: row.pair || "",
    relatedTradeId: row.related_trade_id || "",
    relatedDisciplineId: row.related_discipline_id || "",
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

function exportPositionSizingPng({
  calculator,
  profileRows,
  profileMode,
}: {
  calculator: PositionCalculatorState;
  profileRows: ProfileSizingRow[];
  profileMode: "main" | "half";
}) {
  const quote = getQuoteCurrency(calculator.pair);
  const quoteToUsdRate = quote === "USD" ? 1 : Number(calculator.quoteToUsdRate || 0);
  const summary = calculatePositionSize({
    pair: calculator.pair,
    balance: Number(calculator.accountBalance || 0),
    riskPercent: Number(calculator.riskPercent || 0),
    entryPrice: Number(calculator.entryPrice || 0),
    stopLossPrice: Number(calculator.stopLossPrice || 0),
    quoteToUsdRate,
  });
  const exportRows = profileRows.map((row) => {
    const riskPercent = Number(row.riskPercent || 0) * (profileMode === "half" ? 0.5 : 1);
    return {
      ...row,
      effectiveRiskPercent: riskPercent,
      size: calculatePositionSize({
        pair: calculator.pair,
        balance: Number(row.balance || 0),
        riskPercent,
        entryPrice: Number(calculator.entryPrice || 0),
        stopLossPrice: Number(calculator.stopLossPrice || 0),
        quoteToUsdRate,
      }),
    };
  });
  const width = 1180;
  const rowHeight = 58;
  const height = 420 + exportRows.length * rowHeight;
  const scale = Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(scale, scale);
  ctx.fillStyle = "#06111a";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0d1f2d";
  roundRect(ctx, 32, 32, width - 64, height - 64, 22);
  ctx.fill();

  const gradient = ctx.createLinearGradient(56, 56, width - 56, 190);
  gradient.addColorStop(0, "#153246");
  gradient.addColorStop(0.55, "#0e2737");
  gradient.addColorStop(1, "#0a1a27");
  ctx.fillStyle = gradient;
  roundRect(ctx, 56, 56, width - 112, 138, 18);
  ctx.fill();

  ctx.fillStyle = "#7dd3fc";
  ctx.font = "800 22px Inter, Arial";
  ctx.fillText("Journaly OS", 84, 101);
  ctx.fillStyle = "#ecfeff";
  ctx.font = "900 40px Inter, Arial";
  ctx.fillText("Position Sizing Plan", 84, 150);
  ctx.fillStyle = "#9db3c0";
  ctx.font = "700 16px Inter, Arial";
  ctx.fillText(new Date().toLocaleString(), 84, 176);

  const tradeFields = [
    ["Pair", calculator.pair || "--"],
    ["Entry", calculator.entryPrice || "--"],
    ["Stop loss", calculator.stopLossPrice || "--"],
    ["Take profit", calculator.takeProfitPrice || "--"],
  ];
  tradeFields.forEach(([label, value], index) => {
    const fieldWidth = 250;
    const gap = 18;
    const x = 64 + index * (fieldWidth + gap);
    drawExportField(ctx, label, value, x, 226, fieldWidth);
  });

  let y = 344;
  ctx.fillStyle = "#7dd3fc";
  ctx.font = "900 18px Inter, Arial";
  ctx.fillText("Profile Sizing", 64, y);
  y += 28;
  drawTableHeader(ctx, y);
  y += 34;

  exportRows.forEach((row, index) => {
    drawProfileExportRow(ctx, row, y, index);
    y += rowHeight;
  });

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `journaly-position-sizing-${calculator.pair || "export"}-${new Date().toISOString().slice(0, 10)}.png`;
  link.click();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawExportField(ctx: CanvasRenderingContext2D, label: string, value: string, x: number, y: number, width: number) {
  ctx.fillStyle = "#10283a";
  roundRect(ctx, x, y, width, 78, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(125, 211, 252, 0.22)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#9db3c0";
  ctx.font = "900 13px Inter, Arial";
  ctx.fillText(label.toUpperCase(), x + 18, y + 28);
  ctx.fillStyle = "#ecfeff";
  ctx.font = "900 24px Inter, Arial";
  ctx.fillText(value, x + 18, y + 58);
}

function drawTableHeader(ctx: CanvasRenderingContext2D, y: number) {
  const headers = ["Balance", "Type", "Platform", "Risk", "Lot size"];
  const xs = [74, 260, 450, 690, 870];
  ctx.fillStyle = "#102638";
  roundRect(ctx, 64, y - 23, 1052, 34, 10);
  ctx.fill();
  ctx.fillStyle = "#9db3c0";
  ctx.font = "900 13px Inter, Arial";
  headers.forEach((header, index) => ctx.fillText(header.toUpperCase(), xs[index], y));
}

function drawProfileExportRow(
  ctx: CanvasRenderingContext2D,
  row: ProfileSizingRow & { effectiveRiskPercent: number; size: ReturnType<typeof calculatePositionSize> },
  y: number,
  index: number,
) {
  ctx.fillStyle = index % 2 === 0 ? "#0d2131" : "#102638";
  roundRect(ctx, 64, y - 22, 1052, 44, 10);
  ctx.fill();
  ctx.fillStyle = "#ecfeff";
  ctx.font = "800 17px Inter, Arial";
  ctx.fillText(`$${Number(row.balance || 0).toLocaleString()}`, 74, y + 6);
  ctx.fillText(row.type || "--", 260, y + 6);
  ctx.fillText(row.platform || "--", 450, y + 6);
  ctx.fillText(`${formatNumber(row.effectiveRiskPercent)}%`, 690, y + 6);
  ctx.fillStyle = "#7dd3fc";
  ctx.fillText(formatNumber(row.size.lots), 870, y + 6);
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

function withLoadTimeout<T>(query: PromiseLike<T>, label: string, timeoutMs = 30000): Promise<T> {
  return Promise.race([
    Promise.resolve(query),
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} took too long to load. Please try again.`)), timeoutMs);
    }),
  ]);
}

export default function App() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authForm, setAuthForm] = useState<AuthFormState>({ email: "", password: "", token: "" });
  const [authMessage, setAuthMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [accountProfile, setAccountProfile] = useState<AccountProfile>(defaultAccountProfile());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmPassword: "" });
  const [profileMessage, setProfileMessage] = useState("");
  const [isBooting, setIsBooting] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [theme, setTheme] = useState<Theme>(getPreferredTheme);
  const [tradingMode, setTradingMode] = useState<TradingMode>(() =>
    localStorage.getItem(TRADING_MODE_KEY) === "daytrade" ? "daytrade" : "swing",
  );
  const [dayTradeView, setDayTradeView] = useState<DayTradeView>("daytrade-dashboard");
  const [tradeForm, setTradeForm] = useState<TradeFormState>(todayDefaults);
  const [positionCalculator, setPositionCalculator] = useState<PositionCalculatorState>(positionDefaults);
  const [profileRows, setProfileRows] = useState<ProfileSizingRow[]>(readProfileRows);
  const [profileMode, setProfileMode] = useState<"main" | "half">("main");
  const [setupVariables, setSetupVariables] = useState<SetupVariables>(readSetupVariables);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [journalEntries, setJournalEntries] = useState<PersonalJournalEntry[]>([]);
  const [journalForm, setJournalForm] = useState<PersonalJournalFormState>(personalJournalDefaults);
  const [journalMode, setJournalMode] = useState<"daily" | "monthly">("monthly");
  const [monthlyJournalMonth, setMonthlyJournalMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [monthlyJournalForm, setMonthlyJournalForm] = useState<MonthlyJournalFormState>(monthlyJournalDefaults);
  const [pairAdviceEntries, setPairAdviceEntries] = useState<PairAdvice[]>([]);
  const [tradeAdviceIndex, setTradeAdviceIndex] = useState(0);
  const [isTradeAdviceLibraryOpen, setIsTradeAdviceLibraryOpen] = useState(false);
  const [tradeDecisions, setTradeDecisions] = useState<TradeDecision[]>([]);
  const [decisionForm, setDecisionForm] = useState<TradeDecisionFormState>(tradeDecisionDefaults);
  const [backtestForm, setBacktestForm] = useState<BacktestFormState>(backtestDefaults);
  const [isSavingBacktest, setIsSavingBacktest] = useState(false);
  const [backtestFormError, setBacktestFormError] = useState("");
  const [backtests, setBacktests] = useState<Backtest[]>([]);
  const [resultFilter, setResultFilter] = useState<"All" | Result>("All");
  const [pairFilter, setPairFilter] = useState("All");
  const [setupFilter, setSetupFilter] = useState("All");
  const [qualityFilter, setQualityFilter] = useState<"All" | TradeQuality | "Unrated">("All");
  const [savingQualityTradeId, setSavingQualityTradeId] = useState("");
  const [imagePairFilter, setImagePairFilter] = useState("All");
  const [imageSetupFilter, setImageSetupFilter] = useState("All");
  const [imageResultFilter, setImageResultFilter] = useState<"All" | Result>("All");
  const [imageDirectionFilter, setImageDirectionFilter] = useState<"All" | Direction>("All");
  const [tradeAnalyticsYearFilter, setTradeAnalyticsYearFilter] = useState("All");
  const [tradeCalendarMonth, setTradeCalendarMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [weekEdgeMonth, setWeekEdgeMonth] = useState("All");
  const [yearlyCompareYear, setYearlyCompareYear] = useState(() => new Date().getFullYear().toString());
  const [backtestResultFilter, setBacktestResultFilter] = useState<"All" | Result>("All");
  const [backtestPairFilter, setBacktestPairFilter] = useState("All");
  const [backtestSetupFilter, setBacktestSetupFilter] = useState("All");
  const [backtestAnalyticsYearFilter, setBacktestAnalyticsYearFilter] = useState("All");
  const [backtestYearFilter, setBacktestYearFilter] = useState("All");
  const [backtestMonthFilter, setBacktestMonthFilter] = useState("All");
  const [backtestComparisonMonth, setBacktestComparisonMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [activeView, setActiveView] = useState<AppView>(readActiveView);
  const [imageViewer, setImageViewer] = useState<ImageViewerState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [clockPeriod, setClockPeriod] = useState<ClockPeriod>("AM");
  const [clockSource, setClockSource] = useState<ClockSource>("live");
  const [edgeMode, setEdgeMode] = useState<EdgeMode>("clock");
  const [activeLearnVideoId, setActiveLearnVideoId] = useState<string>(learnVideos[0].id);
  const [learnNotes, setLearnNotes] = useState<Record<string, LearnNote[]>>(readLearnNotes);
  const [learnResume, setLearnResume] = useState<Record<string, string>>(readLearnResume);
  const [learnTimestamp, setLearnTimestamp] = useState("");
  const [learnNoteText, setLearnNoteText] = useState("");
  const [propFirmAccounts, setPropFirmAccounts] = useState<PropFirmAccount[]>(readPropFirmAccounts);
  const [propFirmPayouts, setPropFirmPayouts] = useState<PropFirmPayout[]>(readPropFirmPayouts);
  const [goals, setGoals] = useState<GoalItem[]>(readGoals);
  const [goalForm, setGoalForm] = useState({ title: "", category: "Prop firm" as GoalCategory, targetDate: "", notes: "" });
  const [researchIdeas, setResearchIdeas] = useState<ResearchIdea[]>(readResearchIdeas);
  const [activeResearchIdeaId, setActiveResearchIdeaId] = useState("");
  const [traderFriends, setTraderFriends] = useState<TraderFriend[]>(readTraderFriends);
  const [traderIdInput, setTraderIdInput] = useState("");
  const [traderTrades, setTraderTrades] = useState<Record<string, Trade[]>>({});
  const [traderMessages, setTraderMessages] = useState<Record<string, string>>({});
  const [pendingDeleteTrade, setPendingDeleteTrade] = useState<Trade | null>(null);
  const [pendingTradeLock, setPendingTradeLock] = useState<TradeFormState | null>(null);
  const [licenseTokenInput, setLicenseTokenInput] = useState("");
  const [licenseMessage, setLicenseMessage] = useState("");
  const [sessionNow, setSessionNow] = useState(() => new Date());
  const lastLoadedUserId = useRef<string | null>(null);
  const journalLoadedUserId = useRef<string | null>(null);
  const pairAdviceLoadedUserId = useRef<string | null>(null);
  const marketSession = useMemo(() => getMarketSession(sessionNow), [sessionNow]);
  const licenseState = useMemo(() => getLicenseState(currentUser), [currentUser]);
  const editingTrade = tradeForm.id ? trades.find((trade) => trade.id === tradeForm.id) || null : null;
  const journalTradeById = useMemo(() => new Map(trades.map((trade) => [trade.id, trade])), [trades]);
  const journalDisciplineById = useMemo(
    () => new Map(tradeDecisions.map((entry) => [entry.id, entry])),
    [tradeDecisions],
  );
  const editingJournalEntry = journalForm.id
    ? journalEntries.find((entry) => entry.id === journalForm.id) || null
    : null;
  const dailyJournalEntries = useMemo(
    () => journalEntries.filter((entry) => entry.kind === "daily"),
    [journalEntries],
  );
  const monthlyJournalEntries = useMemo(
    () => journalEntries.filter((entry) => entry.kind === "monthly"),
    [journalEntries],
  );
  const selectedMonthDailyEntries = useMemo(
    () => dailyJournalEntries.filter((entry) => entry.date.startsWith(monthlyJournalMonth)),
    [dailyJournalEntries, monthlyJournalMonth],
  );
  const journalMonthCards = useMemo(() => {
    const year = monthlyJournalMonth.slice(0, 4);
    return Array.from({ length: 12 }, (_, index) => {
      const monthKey = `${year}-${String(index + 1).padStart(2, "0")}`;
      const monthTrades = trades.filter((trade) => trade.date.startsWith(monthKey));
      const notes = dailyJournalEntries.filter((entry) => entry.date.startsWith(monthKey)).length;
      return {
        monthKey,
        shortLabel: new Date(Number(year), index, 1).toLocaleString("en-US", { month: "short" }),
        notes,
        trades: monthTrades.length,
        totalR: monthTrades.reduce((sum, trade) => sum + trade.pnl, 0),
        hasReview: monthlyJournalEntries.some((entry) => entry.monthKey === monthKey),
      };
    });
  }, [dailyJournalEntries, monthlyJournalEntries, monthlyJournalMonth, trades]);
  const selectedMonthlyJournalEntry =
    monthlyJournalEntries.find((entry) => entry.monthKey === monthlyJournalMonth) || null;
  const monthlyJournalAnalytics = useMemo(() => {
    const items = toJournalItems(trades, []).filter((item) => item.date.startsWith(monthlyJournalMonth));
    const summary = summarizeJournalItems(monthlyJournalMonth, items);
    const pairRows = Array.from(new Set(items.map((item) => item.pair)))
      .map((pair) => {
        const pairItems = items.filter((item) => item.pair === pair);
        return {
          pair,
          samples: pairItems.length,
          totalR: pairItems.reduce((sum, item) => sum + item.pnl, 0),
        };
      })
      .sort((a, b) => b.totalR - a.totalR);
    const disciplineEntries = tradeDecisions.filter((entry) => entry.date.startsWith(monthlyJournalMonth));

    return {
      ...summary,
      pairRows,
      bestPair: pairRows[0] || null,
      disciplineEntries: disciplineEntries.length,
      missedWinners: disciplineEntries.filter((entry) => entry.resultR > 0).length,
      lossesAvoided: disciplineEntries.filter((entry) => entry.resultR < 0).length,
    };
  }, [monthlyJournalMonth, tradeDecisions, trades]);
  const journalTradeOptions = useMemo(
    () => trades.filter((trade) => !journalForm.pair || trade.pair === journalForm.pair),
    [journalForm.pair, trades],
  );
  const journalDisciplineOptions = useMemo(
    () => tradeDecisions.filter((entry) => !journalForm.pair || entry.pair === journalForm.pair),
    [journalForm.pair, tradeDecisions],
  );
  const journalImageItems = useMemo(
    () =>
      dailyJournalEntries
        .filter((entry) => Boolean(entry.image))
        .map((entry) => ({
          id: entry.id,
          src: entry.image,
          alt: `Journal entry from ${formatMonthDayYear(entry.date)}`,
          title: formatMonthDayYear(entry.date),
          meta: entry.pair ? `Journal reflection / ${entry.pair}` : "Journal reflection",
        })),
    [dailyJournalEntries],
  );
  const matchingPairAdvice = useMemo(
    () => pairAdviceEntries.filter((entry) => entry.pair === tradeForm.pair),
    [pairAdviceEntries, tradeForm.pair],
  );
  const currentPairAdvice =
    matchingPairAdvice.length > 0 ? matchingPairAdvice[tradeAdviceIndex % matchingPairAdvice.length] : null;
  const isFinalizingTrade = Boolean(editingTrade && !editingTrade.finalizedAt);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_VIEW_KEY, activeView);
  }, [activeView]);

  useEffect(() => {
    localStorage.setItem(TRADING_MODE_KEY, tradingMode);
  }, [tradingMode]);

  useEffect(() => {
    const entry = monthlyJournalEntries.find((item) => item.monthKey === monthlyJournalMonth);
    setMonthlyJournalForm(
      entry
        ? { content: entry.content, nextMonthFocus: entry.advice }
        : monthlyJournalDefaults(),
    );
  }, [monthlyJournalEntries, monthlyJournalMonth]);

  useEffect(() => {
    if (!supabase) {
      setIsBooting(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const user = data.session?.user;
      setCurrentUser(normalizeSessionUser(user));
      setIsBooting(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setCurrentUser(normalizeSessionUser(user));
      setAuthForm({ email: "", password: "", token: "" });
      setAuthMessage("");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      lastLoadedUserId.current = null;
      journalLoadedUserId.current = null;
      pairAdviceLoadedUserId.current = null;
      setTrades([]);
      setJournalEntries([]);
      setJournalForm(personalJournalDefaults());
      setPairAdviceEntries([]);
      setIsTradeAdviceLibraryOpen(false);
      setTradeDecisions([]);
      setBacktests([]);
      setSyncMessage("");
      setAccountProfile(defaultAccountProfile());
      return;
    }

    setAccountProfile(readAccountProfile(currentUser.id, currentUser.email));
    if (lastLoadedUserId.current !== currentUser.id) {
      lastLoadedUserId.current = currentUser.id;
      journalLoadedUserId.current = null;
      pairAdviceLoadedUserId.current = null;
      loadTrades();
      setTradeForm(todayDefaults());
      setBacktestForm(backtestDefaults());
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && activeView === "add-trade" && pairAdviceLoadedUserId.current !== currentUser.id) {
      void loadPairAdvice();
    }
  }, [activeView, currentUser]);

  useEffect(() => {
    setIsTradeAdviceLibraryOpen(false);
    setTradeAdviceIndex(matchingPairAdvice.length > 0 ? Math.floor(Math.random() * matchingPairAdvice.length) : 0);
  }, [matchingPairAdvice.length, tradeForm.pair]);

  useEffect(() => {
    if (activeView !== "add-trade" || matchingPairAdvice.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setTradeAdviceIndex((current) => {
        let next = Math.floor(Math.random() * matchingPairAdvice.length);
        if (next === current % matchingPairAdvice.length) next = (next + 1) % matchingPairAdvice.length;
        return next;
      });
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [activeView, matchingPairAdvice.length, tradeForm.pair]);

  useEffect(() => {
    if (currentUser && activeView === "journal" && journalLoadedUserId.current !== currentUser.id) {
      void loadJournalEntries();
    }
  }, [activeView, currentUser]);

  useEffect(() => {
    if (currentUser && (activeView === "discipline" || activeView === "journal") && tradeDecisions.length === 0) {
      loadTradeDecisions();
    }
  }, [activeView, currentUser]);

  useEffect(() => {
    if (
      currentUser &&
      (activeView === "backtest-comparison" ||
        activeView === "backtesting-analytics" ||
        activeView === "add-backtest" ||
        activeView === "view-backtests" ||
        (activeView === "edge" && clockSource === "backtest") ||
        activeView === "yearly-comparison") &&
      backtests.length === 0
    ) {
      loadBacktests();
    }
  }, [activeView, clockSource, currentUser]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setImageViewer(null);
        setPendingDeleteTrade(null);
        setIsTradeAdviceLibraryOpen(false);
      }

      if (event.key === "ArrowLeft") {
        setImageViewer((viewer) =>
          viewer && viewer.items.length > 1
            ? { ...viewer, index: (viewer.index - 1 + viewer.items.length) % viewer.items.length }
            : viewer,
        );
      }

      if (event.key === "ArrowRight") {
        setImageViewer((viewer) =>
          viewer && viewer.items.length > 1 ? { ...viewer, index: (viewer.index + 1) % viewer.items.length } : viewer,
        );
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
      .filter((trade) => setupFilter === "All" || trade.setup === setupFilter)
      .filter((trade) => qualityFilter === "All" || (qualityFilter === "Unrated" ? !trade.quality : trade.quality === qualityFilter))
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }, [pairFilter, qualityFilter, resultFilter, setupFilter, trades]);

  const tradeQualityAnalytics = useMemo(() => calculateTradeQualityAnalytics(trades), [trades]);

  const tradeImageItems = useMemo(() => {
    return trades
      .filter((trade) => Boolean(trade.screenshot))
      .filter((trade) => imagePairFilter === "All" || trade.pair === imagePairFilter)
      .filter((trade) => imageSetupFilter === "All" || trade.setup === imageSetupFilter)
      .filter((trade) => imageResultFilter === "All" || trade.result === imageResultFilter)
      .filter((trade) => imageDirectionFilter === "All" || trade.direction === imageDirectionFilter)
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
      .map((trade) => ({
        id: trade.id,
        src: trade.screenshot,
        alt: `${trade.pair} ${trade.setup} screenshot`,
        title: `${trade.pair} ${trade.direction} - ${formatMonthDayYear(trade.date)}`,
        meta: `${trade.setup} / ${trade.result} / ${formatNumber(trade.pnl)}R`,
      }));
  }, [imageDirectionFilter, imagePairFilter, imageResultFilter, imageSetupFilter, trades]);

  const filteredTradeImageItems = useMemo(() => {
    return filteredTrades
      .filter((trade) => Boolean(trade.screenshot))
      .map((trade) => ({
        id: trade.id,
        src: trade.screenshot,
        alt: `${trade.pair} ${trade.setup} screenshot`,
        title: `${trade.pair} ${trade.direction} - ${formatMonthDayYear(trade.date)}`,
        meta: `${trade.setup} / ${trade.result} / ${formatNumber(trade.pnl)}R`,
      }));
  }, [filteredTrades]);

  const tradeImageStats = useMemo(() => {
    const imageTrades = trades.filter((trade) => Boolean(trade.screenshot));
    const setupsCovered = new Set(imageTrades.map((trade) => trade.setup)).size;
    const pairsCovered = new Set(imageTrades.map((trade) => trade.pair)).size;
    const filteredR = tradeImageItems.reduce((sum, item) => {
      const trade = trades.find((candidate) => candidate.id === item.id);
      return sum + Number(trade?.pnl || 0);
    }, 0);

    return {
      totalImages: imageTrades.length,
      visibleImages: tradeImageItems.length,
      setupsCovered,
      pairsCovered,
      filteredR,
    };
  }, [tradeImageItems, trades]);

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

  const tradeAnalyticsYears = useMemo(() => {
    return ["All", ...Array.from(new Set(trades.map((trade) => trade.date.slice(0, 4)))).sort().reverse()];
  }, [trades]);

  const tradeAnalytics = useMemo(() => {
    const scopedTrades =
      tradeAnalyticsYearFilter === "All"
        ? trades
        : trades.filter((trade) => trade.date.startsWith(tradeAnalyticsYearFilter));
    const ordered = [...scopedTrades].sort((a, b) => parseDatedItemDate(a).getTime() - parseDatedItemDate(b).getTime());
    const wins = ordered.filter((trade) => trade.pnl > 0);
    const losses = ordered.filter((trade) => trade.pnl < 0);
    const totalR = ordered.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossWin = wins.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
    const directionDistribution = getDirectionDistribution(ordered);
    const directionStreaks = getLongestDirectionStreaks(ordered);
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
      directionDistribution,
      directionStreaks,
      equityPoints,
    };
  }, [tradeAnalyticsYearFilter, trades]);

  const scopedTradeQualityAnalytics = useMemo(
    () =>
      calculateTradeQualityAnalytics(
        tradeAnalyticsYearFilter === "All"
          ? trades
          : trades.filter((trade) => trade.date.startsWith(tradeAnalyticsYearFilter)),
      ),
    [tradeAnalyticsYearFilter, trades],
  );

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

  const tradeCalendarQuality = useMemo(
    () => calculateTradeQualityAnalytics(trades.filter((trade) => trade.date.startsWith(tradeCalendarMonth))),
    [tradeCalendarMonth, trades],
  );

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

  const weekEdgeMonthOptions = useMemo(() => {
    const months = Array.from(new Set(trades.map((trade) => trade.date.slice(0, 7)))).sort().reverse();
    return ["All", ...months];
  }, [trades]);

  const weekEdge = useMemo(() => {
    const weekdayTemplate = [
      { label: "Monday", shortLabel: "Mon", dayIndex: 1 },
      { label: "Tuesday", shortLabel: "Tue", dayIndex: 2 },
      { label: "Wednesday", shortLabel: "Wed", dayIndex: 3 },
      { label: "Thursday", shortLabel: "Thu", dayIndex: 4 },
      { label: "Friday", shortLabel: "Fri", dayIndex: 5 },
    ];
    const scopedTrades =
      weekEdgeMonth === "All" ? trades : trades.filter((trade) => trade.date.startsWith(weekEdgeMonth));
    const days: WeekEdgeDay[] = weekdayTemplate.map((day) => {
      const dayTrades = scopedTrades.filter((trade) => parseTradeDate(trade).getDay() === day.dayIndex);
      const tradeTimes = Object.values(
        dayTrades.reduce<Record<string, { time: string; count: number; totalR: number }>>((grouped, trade) => {
          const time = trade.time || "--:--";
          grouped[time] ||= { time, count: 0, totalR: 0 };
          grouped[time].count += 1;
          grouped[time].totalR += trade.pnl;
          return grouped;
        }, {}),
      ).sort((a, b) => a.time.localeCompare(b.time));
      const wins = dayTrades.filter((trade) => trade.pnl > 0).length;
      const losses = dayTrades.filter((trade) => trade.pnl < 0).length;
      const breakevens = dayTrades.length - wins - losses;
      const totalR = dayTrades.reduce((sum, trade) => sum + trade.pnl, 0);

      return {
        label: day.label,
        shortLabel: day.shortLabel,
        trades: dayTrades.length,
        tradeTimes,
        wins,
        losses,
        breakevens,
        totalR,
        averageR: dayTrades.length === 0 ? 0 : totalR / dayTrades.length,
        winRate: dayTrades.length === 0 ? 0 : Math.round((wins / dayTrades.length) * 100),
      };
    });
    const activeDays = days.filter((day) => day.trades > 0);
    const successfulDays = activeDays.filter((day) => day.totalR > 0).length;

    return {
      days,
      label: weekEdgeMonth === "All" ? "All live trades" : formatMonthLabel(weekEdgeMonth),
      successfulDays,
      bestDay: [...activeDays].sort((a, b) => b.totalR - a.totalR)[0],
      mostActiveDay: [...activeDays].sort((a, b) => b.trades - a.trades || b.totalR - a.totalR)[0],
    };
  }, [trades, weekEdgeMonth]);

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
    return ["All", ...Array.from(new Set(backtests.map((item) => item.date.slice(0, 4)))).sort().reverse()];
  }, [backtests]);

  const backtestComparisonMonths = useMemo(
    () =>
      Array.from(
        new Set([
          ...trades.map((item) => item.date.slice(0, 7)),
          ...backtests.map((item) => item.date.slice(0, 7)),
        ]),
      ).sort().reverse(),
    [backtests, trades],
  );

  useEffect(() => {
    if (
      backtestComparisonMonths.length > 0 &&
      !backtestComparisonMonths.includes(backtestComparisonMonth)
    ) {
      setBacktestComparisonMonth(backtestComparisonMonths[0]);
    }
  }, [backtestComparisonMonth, backtestComparisonMonths]);

  const monthlyBacktestComparison = useMemo(() => {
    const liveItems = toJournalItems(trades, []).filter((item) => item.date.startsWith(backtestComparisonMonth));
    const testedItems = toJournalItems([], backtests).filter((item) => item.date.startsWith(backtestComparisonMonth));
    const actual = summarizeJournalItems(backtestComparisonMonth, liveItems);
    const tested = summarizeJournalItems(backtestComparisonMonth, testedItems);
    const dimensionLabels = Array.from(
      new Set([...liveItems.map((item) => item.pair), ...testedItems.map((item) => item.pair)]),
    );
    const pairRows = dimensionLabels
      .map((pair) => {
        const actualPairItems = liveItems.filter((item) => item.pair === pair);
        const testedPairItems = testedItems.filter((item) => item.pair === pair);
        const actualR = actualPairItems.reduce((sum, item) => sum + item.pnl, 0);
        const testedR = testedPairItems.reduce((sum, item) => sum + item.pnl, 0);

        return {
          pair,
          actualSamples: actualPairItems.length,
          testedSamples: testedPairItems.length,
          actualR,
          testedR,
          gap: actualR - testedR,
        };
      })
      .sort((a, b) => Math.max(Math.abs(b.actualR), Math.abs(b.testedR)) - Math.max(Math.abs(a.actualR), Math.abs(a.testedR)));
    const [year, month] = backtestComparisonMonth.split("-").map(Number);
    const monthEnded = new Date(year, month, 1).getTime() <= new Date().setHours(0, 0, 0, 0);

    return {
      actual,
      tested,
      pairRows,
      monthEnded,
      hasActual: liveItems.length > 0,
      hasBacktest: testedItems.length > 0,
      rGap: actual.totalR - tested.totalR,
      winRateGap: actual.winRate - tested.winRate,
      expectancyGap: actual.expectancy - tested.expectancy,
    };
  }, [backtestComparisonMonth, backtests, trades]);

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

  const filteredBacktestImages = useMemo<ImageViewerItem[]>(
    () =>
      filteredBacktests
        .filter((backtest) => Boolean(backtest.screenshot))
        .map((backtest) => ({
          id: backtest.id,
          src: backtest.screenshot,
          alt: `${backtest.pair} ${backtest.setup} backtest chart`,
          title: `${backtest.pair} ${backtest.direction} - ${formatMonthDayYear(backtest.date)}`,
          meta: `${backtest.setup} / ${backtest.result} / ${formatNumber(backtest.pnl)}R`,
        })),
    [filteredBacktests],
  );

  const backtestStats = useMemo(() => {
    const scopedBacktests =
      backtestAnalyticsYearFilter === "All"
        ? backtests
        : backtests.filter((item) => item.date.startsWith(backtestAnalyticsYearFilter));
    const ordered = [...scopedBacktests].sort(
      (a, b) => parseDatedItemDate(a).getTime() - parseDatedItemDate(b).getTime(),
    );
    const wins = ordered.filter((item) => item.pnl > 0);
    const losses = ordered.filter((item) => item.pnl < 0);
    const totalR = ordered.reduce((sum, item) => sum + item.pnl, 0);
    const grossWin = wins.reduce((sum, item) => sum + item.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, item) => sum + item.pnl, 0));
    const directionDistribution = getDirectionDistribution(ordered);
    const directionStreaks = getLongestDirectionStreaks(ordered);
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
      directionDistribution,
      directionStreaks,
    };
  }, [backtestAnalyticsYearFilter, backtests]);

  const daraEdgeSummary = useMemo(() => {
    const live = buildSessionEdgeSummary(toJournalItems(trades, []));
    const testing = buildSessionEdgeSummary(toJournalItems([], backtests));

    return {
      live: {
        bestSession: live.bestSession,
        weakestSession: live.weakestSession,
        bestPair: live.bestPair,
        weakestPair: live.weakestPair,
        bestSetup: live.bestSetup,
        weakestSetup: live.weakestSetup,
        bestCombo: live.bestCombo,
        weakestCombo: live.weakestCombo,
      },
      backtest: {
        bestSession: testing.bestSession,
        weakestSession: testing.weakestSession,
        bestPair: testing.bestPair,
        weakestPair: testing.weakestPair,
        bestSetup: testing.bestSetup,
        weakestSetup: testing.weakestSetup,
        bestCombo: testing.bestCombo,
        weakestCombo: testing.weakestCombo,
      },
    };
  }, [backtests, trades]);

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
        edgeSummary: daraEdgeSummary,
      }),
    [backtests, daraEdgeSummary, marketSession, monthlyHeatmap, performanceBreakdown, stats, tradeAnalytics, trades],
  );

  function showToast(nextToast: ToastState) {
    setToast(nextToast);
  }

  function openImageViewer(items: ImageViewerItem[], index: number) {
    if (items.length === 0) return;
    setImageViewer({ items, index });
  }

  function moveImageViewer(direction: -1 | 1) {
    setImageViewer((viewer) =>
      viewer && viewer.items.length > 1
        ? { ...viewer, index: (viewer.index + direction + viewer.items.length) % viewer.items.length }
        : viewer,
    );
  }

  function updateLearnNotes(nextNotes: Record<string, LearnNote[]>) {
    setLearnNotes(nextNotes);
    localStorage.setItem(LEARN_NOTES_KEY, JSON.stringify(nextNotes));
  }

  function updateLearnResume(nextResume: Record<string, string>) {
    setLearnResume(nextResume);
    localStorage.setItem(LEARN_RESUME_KEY, JSON.stringify(nextResume));
  }

  function addLearnNote() {
    const text = learnNoteText.trim();
    const timestamp = learnTimestamp.trim();
    if (!text || !timestamp) return;

    const nextNotes = {
      ...learnNotes,
      [activeLearnVideoId]: [
        ...(learnNotes[activeLearnVideoId] || []),
        {
          id: crypto.randomUUID(),
          timestamp,
          text,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    updateLearnNotes(nextNotes);
    setLearnNoteText("");
  }

  function deleteLearnNote(noteId: string) {
    updateLearnNotes({
      ...learnNotes,
      [activeLearnVideoId]: (learnNotes[activeLearnVideoId] || []).filter((note) => note.id !== noteId),
    });
  }

  function saveLearnResumePoint() {
    const timestamp = learnTimestamp.trim();
    if (!timestamp) return;
    updateLearnResume({ ...learnResume, [activeLearnVideoId]: timestamp });
  }

  function updatePropFirmAccounts(nextAccounts: PropFirmAccount[]) {
    setPropFirmAccounts(nextAccounts);
    localStorage.setItem(PROP_FIRMS_KEY, JSON.stringify(nextAccounts));
  }

  function updatePropFirmPayouts(nextPayouts: PropFirmPayout[]) {
    setPropFirmPayouts(nextPayouts);
    localStorage.setItem(PROP_FIRM_PAYOUTS_KEY, JSON.stringify(nextPayouts));
  }

  function updateGoals(nextGoals: GoalItem[]) {
    setGoals(nextGoals);
    localStorage.setItem(GOALS_KEY, JSON.stringify(nextGoals));
  }

  function addGoal() {
    const title = goalForm.title.trim();
    if (!title) return;

    updateGoals([
      {
        id: crypto.randomUUID(),
        title,
        category: goalForm.category,
        targetDate: goalForm.targetDate,
        notes: goalForm.notes.trim(),
        isDone: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
      },
      ...goals,
    ]);
    setGoalForm({ title: "", category: goalForm.category, targetDate: "", notes: "" });
  }

  function toggleGoal(goalId: string) {
    updateGoals(
      goals.map((goal) =>
        goal.id === goalId
          ? { ...goal, isDone: !goal.isDone, completedAt: goal.isDone ? null : new Date().toISOString() }
          : goal,
      ),
    );
  }

  function updateResearchIdeas(nextIdeas: ResearchIdea[]) {
    setResearchIdeas(nextIdeas);
    localStorage.setItem(RESEARCH_IDEAS_KEY, JSON.stringify(nextIdeas));
    if (!nextIdeas.some((idea) => idea.id === activeResearchIdeaId)) {
      setActiveResearchIdeaId(nextIdeas[0]?.id || "");
    }
  }

  function updateTraderFriends(nextFriends: TraderFriend[]) {
    setTraderFriends(nextFriends);
    localStorage.setItem(TRADER_FRIENDS_KEY, JSON.stringify(nextFriends));
  }

  async function loadTraderPreview(traderId: string) {
    if (!supabase || !currentUser) return;

    setTraderMessages((messages) => ({ ...messages, [traderId]: "Loading trader preview..." }));

    if (traderId === currentUser.id) {
      if (!accountProfile.publicViewing) {
        setTraderTrades((current) => ({ ...current, [traderId]: [] }));
        setTraderMessages((messages) => ({ ...messages, [traderId]: "This profile is private. Enable public viewing in Profile settings." }));
        return;
      }

      setTraderTrades((current) => ({ ...current, [traderId]: trades }));
      setTraderMessages((messages) => ({ ...messages, [traderId]: "" }));
      return;
    }

    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", traderId)
      .order("trade_date", { ascending: false })
      .order("trade_time", { ascending: false });

    if (error || !data || data.length === 0) {
      setTraderTrades((current) => ({ ...current, [traderId]: [] }));
      setTraderMessages((messages) => ({
        ...messages,
        [traderId]: "No public trades available. This trader may not allow public viewing yet.",
      }));
      return;
    }

    setTraderTrades((current) => ({ ...current, [traderId]: (data as TradeRow[]).map(toTrade) }));
    setTraderMessages((messages) => ({ ...messages, [traderId]: "" }));
  }

  async function addTraderFriend() {
    const traderId = traderIdInput.trim();
    if (!traderId) return;
    const nextFriends = traderFriends.some((friend) => friend.id === traderId)
      ? traderFriends
      : [{ id: traderId, label: `Trader ${traderId.slice(0, 8)}`, addedAt: new Date().toISOString() }, ...traderFriends];

    updateTraderFriends(nextFriends);
    setTraderIdInput("");
    await loadTraderPreview(traderId);
  }

  function updateAccountProfile(nextProfile: AccountProfile) {
    if (!currentUser) return;
    setAccountProfile(nextProfile);
    saveAccountProfile(currentUser.id, nextProfile);
  }

  async function updateProfileAvatar(file: File | null) {
    if (!file) return;
    updateAccountProfile({ ...accountProfile, avatar: await blobToDataUrl(file) });
  }

  async function activateLicense(token = licenseTokenInput) {
    if (!supabase || !currentUser) return;
    setLicenseMessage("");
    const licenseMatch = await findLicenseToken(token);

    if (!licenseMatch) {
      setLicenseMessage("Invalid token. Check the token and try again.");
      return;
    }

    const nextMetadata = {
      ...currentUser.metadata,
      ...buildLicenseMetadata(licenseMatch),
    };
    const { data, error } = await supabase.auth.updateUser({ data: nextMetadata });

    if (error) {
      setLicenseMessage(error.message);
      return;
    }

    setCurrentUser(normalizeSessionUser(data.user));
    setLicenseTokenInput("");
    setLicenseMessage(`${licenseMatch.tier} access activated.`);
  }

  async function handlePasswordUpdate() {
    if (!supabase) return;
    setProfileMessage("");

    if (passwordForm.password.length < 6) {
      setProfileMessage("Password must be at least 6 characters.");
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setProfileMessage("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
    if (error) {
      setProfileMessage(error.message);
      return;
    }

    setPasswordForm({ password: "", confirmPassword: "" });
    setProfileMessage("Password updated.");
  }

  async function hydrateTradeScreenshots(tradeIds: string[]) {
    if (!currentUser || !supabase || tradeIds.length === 0) return;

    const userId = currentUser.id;
    // Data URLs can be several megabytes each. Fetching one per request prevents
    // a single oversized response from delaying every image in the same batch.
    const batches = chunkRows(tradeIds, 1);
    let nextBatch = 0;
    let failed = false;

    async function hydrateNextBatch() {
      while (nextBatch < batches.length) {
        const batch = batches[nextBatch++];

        try {
          const { data, error } = await withLoadTimeout(
            supabase!
              .from("trades")
              .select(TRADE_SCREENSHOT_COLUMNS)
              .eq("user_id", userId)
              .in("id", batch),
            "Trade screenshots",
          );

          if (error) throw error;

          const screenshots = new Map(
            ((data || []) as Pick<TradeRow, "id" | "screenshot_url">[])
              .filter((row) => Boolean(row.screenshot_url))
              .map((row) => [row.id, row.screenshot_url || ""]),
          );

          if (screenshots.size > 0) {
            setTrades((current) =>
              current.map((trade) => {
                const screenshot = screenshots.get(trade.id);
                return screenshot ? { ...trade, screenshot } : trade;
              }),
            );
          }
        } catch {
          failed = true;
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(3, batches.length) }, () => hydrateNextBatch()));

    if (failed) {
      setSyncMessage("Journal loaded. Some screenshots are still loading; refresh to retry them.");
    }
  }

  async function loadTrades() {
    if (!currentUser || !supabase) return;

    setIsSyncing(true);
    setSyncMessage("");

    try {
      const primary = await withLoadTimeout(
        supabase
          .from("trades")
          .select(TRADE_LIST_COLUMNS)
          .eq("user_id", currentUser.id)
          .order("trade_date", { ascending: false })
          .order("trade_time", { ascending: false }),
        "Journal data",
        15000,
      );
      let data: unknown[] | null = primary.data as unknown[] | null;
      let error = primary.error;

      if (error && /trade_quality/i.test(error.message)) {
        const fallback = await withLoadTimeout(
          supabase
            .from("trades")
            .select(LEGACY_TRADE_LIST_COLUMNS)
            .eq("user_id", currentUser.id)
            .order("trade_date", { ascending: false })
            .order("trade_time", { ascending: false }),
          "Journal data",
          15000,
        );
        data = fallback.data as unknown[] | null;
        error = fallback.error;
        if (!error) setSyncMessage("Trades loaded. Enable the post-trade quality database field to save reviews.");
      }

      if (error) throw error;

      const loadedTrades = ((data || []) as unknown as TradeRow[]).map(toTrade);
      setTrades((current) => {
        const screenshots = new Map(current.map((trade) => [trade.id, trade.screenshot]));
        return loadedTrades.map((trade) => ({
          ...trade,
          screenshot: screenshots.get(trade.id) || "",
        }));
      });
      void hydrateTradeScreenshots(loadedTrades.map((trade) => trade.id));
    } catch (error) {
      setSyncMessage(error instanceof Error ? `Could not load trades: ${error.message}` : "Could not load trades.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function loadPairAdvice() {
    if (!currentUser || !supabase) return;

    const { data, error } = await supabase
      .from("journal_entries")
      .select(PAIR_ADVICE_COLUMNS)
      .eq("user_id", currentUser.id)
      .not("pair", "is", null)
      .neq("advice", "")
      .order("entry_date", { ascending: false });

    if (error) return;

    setPairAdviceEntries(
      ((data || []) as unknown as PairAdviceRow[])
        .filter((row) => Boolean(row.pair && row.advice?.trim()))
        .map((row) => ({
          id: row.id,
          date: row.entry_date,
          pair: row.pair || "",
          advice: row.advice?.trim() || "",
        })),
    );
    pairAdviceLoadedUserId.current = currentUser.id;
  }

  async function hydrateJournalEntryImages(entryIds: string[]) {
    if (!currentUser || !supabase || entryIds.length === 0) return;

    const batches = chunkRows(entryIds, 12);
    for (const ids of batches) {
      const { data, error } = await supabase
        .from("journal_entries")
        .select("id,image_url")
        .eq("user_id", currentUser.id)
        .in("id", ids);

      if (error) return;

      const images = new Map(
        ((data || []) as Array<{ id: string; image_url: string | null }>).map((row) => [row.id, row.image_url || ""]),
      );
      setJournalEntries((current) =>
        current.map((entry) => (images.has(entry.id) ? { ...entry, image: images.get(entry.id) || "" } : entry)),
      );
    }
  }

  async function loadJournalEntries() {
    if (!currentUser || !supabase) return;

    setIsSyncing(true);
    setSyncMessage("");

    try {
      const { data, error } = await withLoadTimeout(
        supabase
          .from("journal_entries")
          .select(JOURNAL_ENTRY_LIST_COLUMNS)
          .eq("user_id", currentUser.id)
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false }),
        "Journal entries",
        15000,
      );

      if (error) throw error;

      const loadedEntries = ((data || []) as unknown as PersonalJournalEntryRow[]).map(toPersonalJournalEntry);
      setJournalEntries((current) => {
        const images = new Map(current.map((entry) => [entry.id, entry.image]));
        return loadedEntries.map((entry) => ({ ...entry, image: images.get(entry.id) || "" }));
      });
      journalLoadedUserId.current = currentUser.id;
      void hydrateJournalEntryImages(loadedEntries.map((entry) => entry.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load journal entries.";
      setSyncMessage(`Could not load journal entries: ${message}`);
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleJournalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || !supabase || !journalForm.content.trim()) return;

    setIsSyncing(true);
    setSyncMessage("");

    try {
      const existing = journalEntries.find((entry) => entry.id === journalForm.id);
      const image = await fileToDataUrl(journalForm.imageFile);
      const payload = {
        user_id: currentUser.id,
        entry_date: journalForm.date,
        content: journalForm.content.trim(),
        advice: journalForm.advice.trim(),
        ...(!existing || image || journalForm.removeImage
          ? { image_url: journalForm.removeImage ? "" : image }
          : {}),
        pair: journalForm.pair || null,
        related_trade_id: journalForm.relatedTradeId || null,
        related_discipline_id: journalForm.relatedDisciplineId || null,
        updated_at: new Date().toISOString(),
      };

      const query = existing
        ? supabase
            .from("journal_entries")
            .update(payload)
            .eq("id", existing.id)
            .eq("user_id", currentUser.id)
            .select("*")
            .single()
        : supabase.from("journal_entries").insert(payload).select("*").single();
      const { data, error } = await query;

      if (error) throw error;

      const saved = toPersonalJournalEntry(data as PersonalJournalEntryRow);
      setJournalEntries((current) => {
        const next = existing
          ? current.map((entry) => (entry.id === saved.id ? saved : entry))
          : [saved, ...current];
        return [...next].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
      });
      pairAdviceLoadedUserId.current = null;
      setJournalForm({
        ...personalJournalDefaults(),
        date: monthlyJournalMonth === new Date().toISOString().slice(0, 7)
          ? new Date().toISOString().slice(0, 10)
          : `${monthlyJournalMonth}-01`,
      });
      showToast({
        tone: "success",
        title: existing ? "Journal entry updated" : "Journal entry saved",
        message: saved.pair ? `Reflection linked to ${saved.pair}.` : "Your reflection is safely in your journal.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save the journal entry.";
      setSyncMessage(`Could not save journal entry: ${message}`);
      showToast({ tone: "error", title: "Journal entry failed", message });
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleMonthlyJournalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || !supabase || !monthlyJournalForm.content.trim()) return;

    setIsSyncing(true);
    setSyncMessage("");

    try {
      const existing = monthlyJournalEntries.find((entry) => entry.monthKey === monthlyJournalMonth);
      const payload = {
        user_id: currentUser.id,
        entry_date: `${monthlyJournalMonth}-01`,
        content: encodeMonthlyJournalContent(monthlyJournalMonth, monthlyJournalForm.content),
        advice: monthlyJournalForm.nextMonthFocus.trim(),
        image_url: "",
        pair: null,
        related_trade_id: null,
        related_discipline_id: null,
        updated_at: new Date().toISOString(),
      };
      const query = existing
        ? supabase
            .from("journal_entries")
            .update(payload)
            .eq("id", existing.id)
            .eq("user_id", currentUser.id)
            .select("*")
            .single()
        : supabase.from("journal_entries").insert(payload).select("*").single();
      const { data, error } = await query;

      if (error) throw error;

      const saved = toPersonalJournalEntry(data as PersonalJournalEntryRow);
      setJournalEntries((current) => {
        const next = existing
          ? current.map((entry) => (entry.id === saved.id ? saved : entry))
          : [saved, ...current];
        return [...next].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
      });
      showToast({
        tone: "success",
        title: existing ? "Monthly journal updated" : "Monthly journal saved",
        message: `${formatMonthLabel(monthlyJournalMonth)} is ready for future review.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save the monthly journal.";
      setSyncMessage(`Could not save monthly journal: ${message}`);
      showToast({ tone: "error", title: "Monthly journal failed", message });
    } finally {
      setIsSyncing(false);
    }
  }

  function editJournalEntry(entry: PersonalJournalEntry) {
    setMonthlyJournalMonth(entry.date.slice(0, 7));
    setJournalMode("daily");
    setJournalForm({
      id: entry.id,
      date: entry.date,
      content: entry.content,
      advice: entry.advice,
      pair: entry.pair,
      relatedTradeId: entry.relatedTradeId,
      relatedDisciplineId: entry.relatedDisciplineId,
      imageFile: null,
      removeImage: false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectJournalMonth(monthKey: string, mode: "daily" | "monthly" = "monthly") {
    const today = new Date().toISOString().slice(0, 10);
    setMonthlyJournalMonth(monthKey);
    setJournalMode(mode);
    setJournalForm({
      ...personalJournalDefaults(),
      date: today.startsWith(monthKey) ? today : `${monthKey}-01`,
    });
  }

  async function deleteJournalEntry(entry: PersonalJournalEntry) {
    const label = entry.kind === "monthly" ? `${formatMonthLabel(entry.monthKey)} monthly journal` : "journal entry";
    if (!currentUser || !supabase || !window.confirm(`Delete this ${label}? This cannot be undone.`)) return;

    setIsSyncing(true);
    const { error } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", entry.id)
      .eq("user_id", currentUser.id);
    setIsSyncing(false);

    if (error) {
      setSyncMessage(`Could not delete journal entry: ${error.message}`);
      return;
    }

    setJournalEntries((current) => current.filter((item) => item.id !== entry.id));
    pairAdviceLoadedUserId.current = null;
    if (journalForm.id === entry.id) setJournalForm(personalJournalDefaults());
    showToast({
      tone: "success",
      title: entry.kind === "monthly" ? "Monthly journal deleted" : "Journal entry deleted",
      message: "The entry was removed.",
    });
  }

  async function loadBacktests() {
    if (!currentUser || !supabase) return;

    setIsSyncing(true);
    setSyncMessage("");

    try {
      const { data, error } = await withLoadTimeout(
        supabase
          .from("backtests")
          .select(BACKTEST_LIST_COLUMNS)
          .eq("user_id", currentUser.id)
          .order("trade_date", { ascending: false })
          .order("trade_time", { ascending: false }),
        "Backtests",
        15000,
      );

      if (error) throw error;

      const loadedBacktests = ((data || []) as unknown as BacktestRow[]).map(toBacktest);
      setBacktests((current) => {
        const screenshots = new Map(current.map((backtest) => [backtest.id, backtest.screenshot]));
        return loadedBacktests.map((backtest) => ({
          ...backtest,
          screenshot: screenshots.get(backtest.id) || "",
        }));
      });
      void hydrateBacktestScreenshots(loadedBacktests.map((backtest) => backtest.id));
    } catch (error) {
      setSyncMessage(error instanceof Error ? `Could not load backtests: ${error.message}` : "Could not load backtests.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function hydrateBacktestScreenshots(backtestIds: string[]) {
    if (!currentUser || !supabase || backtestIds.length === 0) return;

    const userId = currentUser.id;
    // Backtest charts are stored as large data URLs. Load them separately so the
    // records and analytics become usable without waiting for every image.
    const batches = chunkRows(backtestIds, 1);
    let nextBatch = 0;
    let failed = false;

    async function hydrateNextBatch() {
      while (nextBatch < batches.length) {
        const batch = batches[nextBatch++];

        try {
          const { data, error } = await withLoadTimeout(
            supabase!
              .from("backtests")
              .select(BACKTEST_SCREENSHOT_COLUMNS)
              .eq("user_id", userId)
              .in("id", batch),
            "Backtest charts",
          );

          if (error) throw error;

          const screenshots = new Map(
            ((data || []) as Pick<BacktestRow, "id" | "screenshot_url">[])
              .filter((row) => Boolean(row.screenshot_url))
              .map((row) => [row.id, row.screenshot_url || ""]),
          );

          if (screenshots.size > 0) {
            setBacktests((current) =>
              current.map((backtest) => {
                const screenshot = screenshots.get(backtest.id);
                return screenshot ? { ...backtest, screenshot } : backtest;
              }),
            );
          }
        } catch {
          failed = true;
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(3, batches.length) }, () => hydrateNextBatch()));

    if (failed) {
      setSyncMessage("Backtests loaded. Some charts are still loading; refresh to retry them.");
    }
  }

  async function loadTradeDecisions() {
    if (!currentUser || !supabase) return;

    setIsSyncing(true);
    setSyncMessage("");

    try {
      const { data, error } = await withLoadTimeout(
        supabase
          .from("trade_decisions")
          .select(TRADE_DECISION_LIST_COLUMNS)
          .eq("user_id", currentUser.id)
          .order("decision_date", { ascending: false })
          .order("decision_time", { ascending: false }),
        "Discipline entries",
      );

      if (error) {
        setSyncMessage(`Could not load discipline entries: ${error.message}`);
        return;
      }

      setTradeDecisions(((data || []) as TradeDecisionRow[]).map(toTradeDecision));
    } catch (error) {
      setSyncMessage(error instanceof Error ? `Could not load discipline entries: ${error.message}` : "Could not load discipline entries.");
    } finally {
      setIsSyncing(false);
    }
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
    const licenseMatch = authMode === "signup" ? await findLicenseToken(authForm.token) : null;

    if (authMode === "signup" && !licenseMatch) {
      setAuthMessage("Enter a valid Journaly OS access token before creating an account.");
      return;
    }

    const response =
      authMode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: buildLicenseMetadata(licenseMatch!),
              emailRedirectTo: window.location.origin,
            },
          })
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
    setPendingTradeLock({ ...tradeForm });
  }

  async function handleDisciplineSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser || !supabase) return;

    setIsSyncing(true);
    setSyncMessage("");

    const existing = tradeDecisions.find((item) => item.id === decisionForm.id);
    const [preImage, postImage] = await Promise.all([
      fileToDataUrl(decisionForm.screenshotFile),
      fileToDataUrl(decisionForm.postImageFile),
    ]);
    const resultR = Number(decisionForm.resultR || 0);
    const payload = {
      user_id: currentUser.id,
      decision_date: decisionForm.date,
      decision_time: decisionForm.time,
      pair: decisionForm.pair,
      setup: decisionForm.setup,
      direction: decisionForm.direction,
      status: "Cancelled" as TradeDecisionStatus,
      reason_cancelled: decisionForm.reasonCancelled.trim(),
      outcome: (resultR > 0 ? "Cost opportunity" : resultR < 0 ? "Avoided loss" : "Breakeven") as TradeDecisionOutcome,
      notes: decisionForm.notes.trim(),
      screenshot_url: preImage || existing?.screenshot || "",
      post_image_url: postImage || existing?.postImage || "",
      result_r: resultR,
      updated_at: new Date().toISOString(),
    };

    const query = existing
      ? supabase.from("trade_decisions").update(payload).eq("id", existing.id).select(TRADE_DECISION_LIST_COLUMNS).single()
      : supabase.from("trade_decisions").insert(payload).select(TRADE_DECISION_LIST_COLUMNS).single();
    const { data, error } = await query;
    setIsSyncing(false);

    if (error) {
      setSyncMessage(`Could not save discipline entry: ${error.message}`);
      showToast({ tone: "error", title: "Discipline entry failed", message: error.message });
      return;
    }

    const saved = toTradeDecision(data as TradeDecisionRow);
    setTradeDecisions((current) =>
      existing ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current],
    );
    setDecisionForm(tradeDecisionDefaults());
    showToast({
      tone: "success",
      title: existing ? "Discipline entry updated" : "Discipline entry saved",
      message: `${saved.pair} skipped trade recorded at ${formatNumber(saved.resultR)}R.`,
    });
  }

  async function handleDisciplinePostImageChange(entry: TradeDecision, file: File) {
    if (!supabase) return;

    setIsSyncing(true);
    setSyncMessage("");

    try {
      const postImage = await fileToDataUrl(file);
      const { data, error } = await supabase
        .from("trade_decisions")
        .update({ post_image_url: postImage, updated_at: new Date().toISOString() })
        .eq("id", entry.id)
        .select(TRADE_DECISION_LIST_COLUMNS)
        .single();

      if (error) throw error;

      const saved = toTradeDecision(data as TradeDecisionRow);
      setTradeDecisions((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      showToast({
        tone: "success",
        title: entry.postImage ? "Post image replaced" : "Post image added",
        message: `${saved.pair} now has its post-trade image.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save the post image.";
      setSyncMessage(`Could not save post image: ${message}`);
      showToast({ tone: "error", title: "Post image failed", message });
    } finally {
      setIsSyncing(false);
    }
  }

  function editDisciplineEntry(entry: TradeDecision) {
    setDecisionForm({
      ...tradeDecisionDefaults(),
      id: entry.id,
      date: entry.date,
      time: entry.time,
      pair: entry.pair,
      setup: entry.setup,
      direction: entry.direction,
      reasonCancelled: entry.reasonCancelled,
      notes: entry.notes,
      resultR: String(entry.resultR),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteDisciplineEntry(entry: TradeDecision) {
    if (!supabase) return;
    setIsSyncing(true);
    const { error } = await supabase.from("trade_decisions").delete().eq("id", entry.id);
    setIsSyncing(false);
    if (error) {
      setSyncMessage(`Could not delete discipline entry: ${error.message}`);
      return;
    }
    setTradeDecisions((current) => current.filter((item) => item.id !== entry.id));
    if (decisionForm.id === entry.id) setDecisionForm(tradeDecisionDefaults());
  }

  async function saveLockedTrade(form: TradeFormState) {
    if (!currentUser || !supabase) return;

    setIsSyncing(true);
    setSyncMessage("");
    setPendingTradeLock(null);

    const existing = trades.find((trade) => trade.id === form.id);
    const uploadedShot = await fileToDataUrl(form.screenshotFile);

    if (existing?.finalizedAt) {
      setIsSyncing(false);
      setSyncMessage("This trade is already finalized and can no longer be edited.");
      showToast({
        tone: "error",
        title: "Trade locked",
        message: "Finalized trades are read-only to protect journal integrity.",
      });
      return;
    }

    if (existing && !(uploadedShot || existing.screenshot)) {
      setIsSyncing(false);
      setSyncMessage("Add a screenshot before finalizing this trade.");
      showToast({
        tone: "error",
        title: "Screenshot required",
        message: "Finalizing a trade requires an image for review integrity.",
      });
      return;
    }

    const finalizingAt = existing ? new Date().toISOString() : null;
    const normalizedResult = existing ? resultFromPnl(form.pnl) : form.result;
    const payload = {
      user_id: currentUser.id,
      trade_date: form.date,
      trade_time: form.time,
      pair: form.pair,
      setup: form.setup,
      direction: form.direction,
      mae: Number(form.mae || 0),
      mae_pips: null,
      stop_loss_pips: form.stopLossPips ? Number(form.stopLossPips) : null,
      pnl_r: Number(form.pnl || 0),
      result: normalizedResult,
      notes: form.notes.trim(),
      screenshot_url: uploadedShot || existing?.screenshot || "",
      source_app: existing?.sourceApp || null,
      legacy_id: existing?.legacyId || null,
      duration_minutes: existing?.durationMinutes || null,
      finalized_at: finalizingAt,
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
    setTrades((current) =>
      existing
        ? current.map((trade) => (trade.id === savedTrade.id ? savedTrade : trade))
        : [savedTrade, ...current],
    );
    setTradeForm(todayDefaults());
    setActiveView("view-trades");
    showToast({
      tone: "success",
      title: existing ? "Trade updated" : "Trade saved",
      message: `${savedTrade.pair} ${savedTrade.direction.toLowerCase()} is now in your journal.`,
    });
  }

  async function updateTradeQuality(trade: Trade, quality: TradeQuality) {
    if (!currentUser || !supabase || trade.quality === quality) return;

    setSavingQualityTradeId(trade.id);
    const { error } = await supabase
      .from("trades")
      .update({ trade_quality: quality, updated_at: new Date().toISOString() })
      .eq("id", trade.id)
      .eq("user_id", currentUser.id);
    setSavingQualityTradeId("");

    if (error) {
      showToast({
        tone: "error",
        title: "Quality review not saved",
        message: error.message,
      });
      return;
    }

    setTrades((current) => current.map((item) => (item.id === trade.id ? { ...item, quality } : item)));
    showToast({
      tone: "success",
      title: `${quality} trade recorded`,
      message: `${trade.pair} is now included in your quality analytics.`,
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
    setBacktestFormError("");
    setSyncMessage("");

    if (!currentUser || !supabase) {
      const message = "Your session is not ready. Refresh the page and sign in again.";
      setBacktestFormError(message);
      showToast({ tone: "error", title: "Backtest not saved", message });
      return;
    }

    const parseOptionalNumber = (value: string, label: string) => {
      if (!value.trim()) return null;
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) throw new Error(`${label} must be a valid number.`);
      return parsed;
    };

    setIsSavingBacktest(true);

    try {
      const pnl = Number(backtestForm.pnl);
      if (!Number.isFinite(pnl)) throw new Error("PnL R must be a valid number, such as -1 or 2.5.");

      const durationMinutes = parseOptionalNumber(backtestForm.durationMinutes, "Duration");
      if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes < 0)) {
        throw new Error("Duration must be a positive whole number of minutes.");
      }

      const stopLossPips = parseOptionalNumber(backtestForm.stopLossPips, "Stop loss pips");
      const maePips = parseOptionalNumber(backtestForm.maePips, "MAE pips");
      if (stopLossPips !== null && stopLossPips < 0) throw new Error("Stop loss pips cannot be negative.");
      if (maePips !== null && maePips < 0) throw new Error("MAE pips cannot be negative.");

      const existing = backtests.find((item) => item.id === backtestForm.id);
      const uploadedShot = await fileToDataUrl(backtestForm.screenshotFile);
      const payload = {
        user_id: currentUser.id,
        trade_date: backtestForm.date,
        trade_time: backtestForm.time,
        pair: backtestForm.pair,
        setup: backtestForm.setup,
        direction: backtestForm.direction,
        duration_minutes: durationMinutes,
        stop_loss_pips: stopLossPips,
        mae_pips: maePips,
        pnl_r: pnl,
        result: resultFromPnl(pnl),
        notes: backtestForm.notes.trim(),
        scale_in: backtestForm.scaleIn.trim() || "No",
        screenshot_url: uploadedShot || existing?.screenshot || "",
        source_app: existing?.sourceApp || null,
        legacy_id: existing?.legacyId || null,
        updated_at: new Date().toISOString(),
      };

      const query = existing
        ? supabase
            .from("backtests")
            .update(payload)
            .eq("id", existing.id)
            .eq("user_id", currentUser.id)
            .select("*")
            .single()
        : supabase.from("backtests").insert(payload).select("*").single();
      const { data, error } = await query;

      if (error) throw new Error(error.message);

      const saved = toBacktest(data as BacktestRow);
      setBacktests((current) =>
        existing ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current],
      );
      setBacktestForm(backtestDefaults());
      setActiveView("view-backtests");
      showToast({
        tone: "success",
        title: existing ? "Backtest updated" : "Backtest saved",
        message: `${saved.pair} ${saved.direction.toLowerCase()} · ${formatNumber(saved.pnl)}R`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save the backtest.";
      setBacktestFormError(message);
      setSyncMessage(`Could not save backtest: ${message}`);
      showToast({ tone: "error", title: "Backtest not saved", message });
    } finally {
      setIsSavingBacktest(false);
    }
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
    if (trade.finalizedAt) {
      showToast({
        tone: "info",
        title: "Trade locked",
        message: "This trade has already been finalized and is now read-only.",
      });
      return;
    }

    setTradeForm({
      id: trade.id,
      date: trade.date,
      time: trade.time,
      pair: trade.pair,
      setup: trade.setup,
      direction: trade.direction,
      stopLossPips: trade.stopLossPips === null ? defaultStopLossForSetup(trade.setup) : String(trade.stopLossPips),
      mae: String(trade.mae),
      pnl: String(trade.pnl),
      result: trade.result,
      notes: trade.notes,
      screenshotFile: null,
      analysisWorkingFile: null,
      analysisStartedAt: null,
      analysisChecks: [],
      analysisZonePins: {},
      analysisZones: [],
      analysisDecision: null,
    });
    setActiveView("add-trade");
    showToast({
      tone: "info",
      title: "Finalize trade",
      message: `${trade.pair} from ${formatMonthDayYear(trade.date)} can be updated once with MAE, PnL, image, and notes.`,
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

        <div className="auth-layout landing-layout">
          <div className="auth-copy landing-copy">
            <p className="eyebrow">Journaly OS Trading Journal</p>
            <h1>Build, track, and protect your trading edge.</h1>
            <p>
              A premium trading operating system for serious journaling, session analysis, AI coaching,
              prop firm planning, research, and execution review.
            </p>

            <div className="landing-feature-grid">
              {landingFeatures.map((feature) => (
                <div className="landing-feature" key={feature}>
                  <CheckCircle2 size={17} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <section className="landing-pricing" aria-label="Journaly OS pricing">
              <div className="landing-pricing-header">
                <span>Pricing</span>
                <strong>Message journalyos@gmail.com to avail</strong>
              </div>
              <div className="pricing-grid">
                {pricingPlans.map((plan) => (
                  <article className={plan.name === "Lifetime" ? "pricing-plan is-featured" : "pricing-plan"} key={plan.name}>
                    <span>{plan.name}</span>
                    <strong>{plan.price}</strong>
                    <p>{plan.note}</p>
                  </article>
                ))}
              </div>
              <a className="landing-contact" href="mailto:journalyos@gmail.com?subject=Journaly%20OS%20Access">
                Message journalyos@gmail.com
              </a>
            </section>
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

            {isSignup ? (
              <label>
                <span>Access token</span>
                <input
                  value={authForm.token}
                  name="access-token"
                  type="text"
                  autoComplete="off"
                  placeholder="Enter your Journaly OS token"
                  required
                  onChange={(event) => setAuthForm({ ...authForm, token: event.target.value })}
                />
              </label>
            ) : null}

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

  if (licenseState.isExpired) {
    return (
      <LicenseActivationScreen
        email={currentUser.email}
        token={licenseTokenInput}
        message={licenseMessage}
        onTokenChange={setLicenseTokenInput}
        onActivate={() => activateLicense()}
        onLogout={logout}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="topbar">
        <Brand
          className="brand"
          onHome={() => {
            setTradingMode("swing");
            setActiveView("dashboard");
          }}
        />

        <div className="trading-mode-switch">
          <select
            aria-label="Trading journal"
            value={tradingMode}
            onChange={(event) => setTradingMode(event.target.value as TradingMode)}
          >
            <option value="swing">Swing · Main</option>
            <option value="daytrade">DayTrade · 15M</option>
          </select>
          <ChevronDown size={18} aria-hidden="true" />
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {tradingMode === "swing" ? (
            <>
          <button
            className={activeView === "dashboard" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("dashboard")}
          >
            <Activity size={18} />
            Dashboard
          </button>
          <button
            className={
              activeView === "add-trade" || activeView === "position-sizing" || activeView === "trade-analysis"
                ? "is-active"
                : ""
            }
            type="button"
            onClick={() => setActiveView("add-trade")}
          >
            <Plus size={18} />
            Add trade
          </button>
          <button
            className={
              activeView === "trade-analytics" ||
              activeView === "view-trades" ||
              activeView === "trade-images" ||
              activeView === "trade-calendar" ||
              activeView === "monthly-heatmap" ||
              activeView === "week-edge" ||
              activeView === "trade-performance" ||
              activeView === "yearly-comparison" ||
              activeView === "discipline"
                ? "is-active"
                : ""
            }
            type="button"
            onClick={() => setActiveView("trade-analytics")}
          >
            <BarChart3 size={18} />
            Trades
          </button>
          <button
            className={activeView === "journal" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("journal")}
          >
            <NotebookPen size={18} />
            Journal
          </button>
          <button
            className={activeView === "edge" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("edge")}
          >
            <Clock3 size={18} />
            Edge
          </button>
          <button
            className={activeView === "learn" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("learn")}
          >
            <BookOpen size={18} />
            Learn
          </button>
          <button
            className={activeView === "prop-firms" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("prop-firms")}
          >
            <CircleDollarSign size={18} />
            Prop firms
          </button>
          <button
            className={activeView === "goals" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("goals")}
          >
            <Target size={18} />
            Goals
          </button>
          <button
            className={activeView === "research" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("research")}
          >
            <ClipboardCheck size={18} />
            Research
          </button>
          <button
            className={activeView === "traders" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("traders")}
          >
            <MessageSquareText size={18} />
            Traders
          </button>
          <button
            className={
              activeView === "backtest-comparison" ||
              activeView === "backtesting-analytics" ||
              activeView === "add-backtest" ||
              activeView === "view-backtests"
                ? "is-active"
                : ""
            }
            type="button"
            onClick={() => setActiveView("backtest-comparison")}
          >
            <FlaskConical size={18} />
            Backtest
          </button>
          <button
            className={activeView === "ai-coach" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("ai-coach")}
          >
            <Brain size={18} />
            AI Coach
          </button>
            </>
          ) : (
            dayTradeNavigation.map(({ view, label, icon: Icon }) => (
              <button
                className={dayTradeView === view ? "is-active" : ""}
                type="button"
                key={view}
                onClick={() => setDayTradeView(view)}
              >
                <Icon size={18} />
                {label}
              </button>
            ))
          )}
        </nav>

        <div className="top-actions">
          <MarketSessionBadge session={marketSession} />
          <button className="user-pill" type="button" onClick={() => setIsProfileOpen(true)}>
            {accountProfile.avatar ? <img src={accountProfile.avatar} alt="" /> : <span>{accountProfile.displayName.slice(0, 1)}</span>}
            <strong>{accountProfile.displayName || currentUser.email}</strong>
          </button>
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
      </aside>

      <div className="app-main">
        {toast ? <Toast toast={toast} onClose={() => setToast(null)} /> : null}

        <main>
        {tradingMode === "swing" ? (
        <>
        {syncMessage ? <p className="sync-message">{syncMessage}</p> : null}
        {licenseState.isInGrace ? (
          <div className="license-banner">
            <ShieldCheck size={17} />
            <span>{licenseState.daysLeft} days left to activate Journaly OS.</span>
            <button type="button" onClick={() => setIsProfileOpen(true)}>
              Activate in profile
            </button>
          </div>
        ) : null}

        {activeView === "journal" ? (
          <section className="workspace-band journal-view">
            <div className="section-heading journal-heading">
              <div>
                <p className="eyebrow">Your trading story</p>
                <h2>Trading journey</h2>
                <p>Choose a month and capture the lessons, progress, and moments that shaped your trading journey.</p>
              </div>
              <div className="journal-summary" aria-label="Journal summary">
                <span><strong>{monthlyJournalEntries.length}</strong> months written</span>
                <span><strong>{dailyJournalEntries.length}</strong> journey notes</span>
              </div>
            </div>

            <section className="journal-month-browser" aria-label="Choose a journal month">
              <div className="journal-year-switcher">
                <div>
                  <span>Your year</span>
                  <strong>{monthlyJournalMonth.slice(0, 4)}</strong>
                </div>
                <div>
                  <button
                    type="button"
                    aria-label="Previous journal year"
                    onClick={() => selectJournalMonth(`${Number(monthlyJournalMonth.slice(0, 4)) - 1}-${monthlyJournalMonth.slice(5, 7)}`)}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next journal year"
                    onClick={() => selectJournalMonth(`${Number(monthlyJournalMonth.slice(0, 4)) + 1}-${monthlyJournalMonth.slice(5, 7)}`)}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div className="journal-month-grid">
                {journalMonthCards.map((month) => (
                  <button
                    className={`${month.monthKey === monthlyJournalMonth ? "is-active" : ""} ${month.hasReview ? "has-review" : ""}`}
                    type="button"
                    key={month.monthKey}
                    onClick={() => selectJournalMonth(month.monthKey)}
                    aria-pressed={month.monthKey === monthlyJournalMonth}
                  >
                    <span>{month.shortLabel}</span>
                    <strong>{month.hasReview ? "Journal ready" : "Open journal"}</strong>
                    <small>{month.trades} trades · {month.totalR > 0 ? "+" : ""}{formatNumber(month.totalR)}R</small>
                    {month.notes ? <em>{month.notes} note{month.notes === 1 ? "" : "s"}</em> : null}
                  </button>
                ))}
              </div>
            </section>

            <div className="module-tabs journal-mode-tabs" aria-label="Journal sections">
              <button
                className={journalMode === "monthly" ? "is-active" : ""}
                type="button"
                onClick={() => setJournalMode("monthly")}
              >
                {formatMonthLabel(monthlyJournalMonth)} story
              </button>
              <button
                className={journalMode === "daily" ? "is-active" : ""}
                type="button"
                onClick={() => selectJournalMonth(monthlyJournalMonth, "daily")}
              >
                Quick notes ({selectedMonthDailyEntries.length})
              </button>
            </div>

            {journalMode === "daily" ? (
            <div className="journal-layout">
              <form className="journal-entry-form" onSubmit={handleJournalSubmit}>
                <div className="journal-form-header">
                  <div>
                    <span>{journalForm.id ? "Editing journey note" : formatMonthLabel(monthlyJournalMonth)}</span>
                    <strong>{journalForm.id ? formatMonthDayYear(journalForm.date) : "Add a quick journey note"}</strong>
                  </div>
                  <NotebookPen size={22} />
                </div>

                <label>
                  <span>Date of entry</span>
                  <input
                    type="date"
                    value={journalForm.date}
                    required
                    onChange={(event) => setJournalForm((current) => ({ ...current, date: event.target.value }))}
                  />
                </label>

                <label>
                  <span>Journal entry</span>
                  <textarea
                    value={journalForm.content}
                    placeholder="What happened? What did you notice, feel, or learn?"
                    required
                    onChange={(event) => setJournalForm((current) => ({ ...current, content: event.target.value }))}
                  />
                </label>

                <label className="journal-advice-field">
                  <span>Advice <small>Optional</small></span>
                  <textarea
                    value={journalForm.advice}
                    placeholder="What advice would you give yourself for next time?"
                    onChange={(event) => setJournalForm((current) => ({ ...current, advice: event.target.value }))}
                  />
                </label>

                <div className="journal-relation-panel">
                  <div className="journal-relation-copy">
                    <strong>Relate this entry</strong>
                    <span>Optional · connect a pair, previous trade, Discipline entry, or any combination</span>
                  </div>
                  <div className="journal-relation-fields">
                    <label>
                      <span>Pair</span>
                      <select
                        value={journalForm.pair}
                        onChange={(event) => {
                          const pair = event.target.value;
                          setJournalForm((current) => {
                            const linkedTrade = journalTradeById.get(current.relatedTradeId);
                            const linkedDiscipline = journalDisciplineById.get(current.relatedDisciplineId);
                            return {
                              ...current,
                              pair,
                              relatedTradeId: linkedTrade && linkedTrade.pair !== pair ? "" : current.relatedTradeId,
                              relatedDisciplineId:
                                linkedDiscipline && linkedDiscipline.pair !== pair ? "" : current.relatedDisciplineId,
                            };
                          });
                        }}
                      >
                        <option value="">No pair</option>
                        {pairs.map((pair) => <option key={pair} value={pair}>{pair}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Previous trade</span>
                      <select
                        value={journalForm.relatedTradeId}
                        onChange={(event) => {
                          const relatedTradeId = event.target.value;
                          const trade = journalTradeById.get(relatedTradeId);
                          setJournalForm((current) => ({
                            ...current,
                            relatedTradeId,
                            pair: trade?.pair || current.pair,
                          }));
                        }}
                      >
                        <option value="">No linked trade</option>
                        {journalTradeOptions.map((trade) => (
                          <option key={trade.id} value={trade.id}>
                            {formatMonthDayYear(trade.date)} · {trade.pair} · {trade.direction} · {formatNumber(trade.pnl)}R
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Discipline entry</span>
                      <select
                        value={journalForm.relatedDisciplineId}
                        onChange={(event) => {
                          const relatedDisciplineId = event.target.value;
                          const disciplineEntry = journalDisciplineById.get(relatedDisciplineId);
                          setJournalForm((current) => ({
                            ...current,
                            relatedDisciplineId,
                            pair: disciplineEntry?.pair || current.pair,
                          }));
                        }}
                      >
                        <option value="">No linked Discipline entry</option>
                        {journalDisciplineOptions.map((entry) => (
                          <option key={entry.id} value={entry.id}>
                            {formatMonthDayYear(entry.date)} · {entry.pair} · {entry.status} · {entry.setup}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {journalTradeOptions.length === 0 && journalDisciplineOptions.length === 0 ? (
                    <p className="journal-relation-empty">No trade or Discipline entries match this pair yet. You can still save the pair by itself.</p>
                  ) : null}
                </div>

                <label className="journal-image-field">
                  <span>Image <small>Optional</small></span>
                  <input
                    key={journalForm.id || `new-${monthlyJournalMonth}-${selectedMonthDailyEntries.length}`}
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setJournalForm((current) => ({
                        ...current,
                        imageFile: event.target.files?.[0] || null,
                        removeImage: false,
                      }))
                    }
                  />
                  <em>{journalForm.imageFile?.name || "Add a chart screenshot, photo, or visual reminder"}</em>
                </label>

                {editingJournalEntry?.image && !journalForm.removeImage ? (
                  <div className="journal-existing-image">
                    <img src={editingJournalEntry.image} alt="Current journal attachment" />
                    <button type="button" className="text-action" onClick={() => setJournalForm((current) => ({ ...current, imageFile: null, removeImage: true }))}>
                      Remove current image
                    </button>
                  </div>
                ) : null}

                <div className="journal-form-actions">
                  <button className="primary-action" type="submit" disabled={isSyncing || !journalForm.content.trim()}>
                    <NotebookPen size={17} />
                    {journalForm.id ? "Update entry" : "Save entry"}
                  </button>
                  {journalForm.id ? (
                    <button className="secondary-action" type="button" onClick={() => selectJournalMonth(monthlyJournalMonth, "daily")}>
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>

              <div className="journal-entry-list" aria-live="polite">
                {isSyncing && selectedMonthDailyEntries.length === 0 ? <DataLoadingOverlay label="Loading journal entries" /> : null}
                {selectedMonthDailyEntries.length === 0 && !isSyncing ? (
                  <div className="empty-state journal-empty-state">
                    <NotebookPen size={28} />
                    <h3>No notes for {formatMonthLabel(monthlyJournalMonth)} yet</h3>
                    <p>Capture a lesson, emotion, market observation, or moment from this month.</p>
                  </div>
                ) : (
                  selectedMonthDailyEntries.map((entry) => {
                    const linkedTrade = journalTradeById.get(entry.relatedTradeId);
                    const linkedDiscipline = journalDisciplineById.get(entry.relatedDisciplineId);
                    const imageIndex = journalImageItems.findIndex((item) => item.id === entry.id);

                    return (
                      <article className="journal-entry-card" key={entry.id}>
                        <header>
                          <div>
                            <time dateTime={entry.date}>{formatMonthDayYear(entry.date)}</time>
                            <div className="journal-entry-tags">
                              {entry.pair ? <span>{entry.pair}</span> : null}
                              {linkedTrade ? <span>{linkedTrade.direction} · {formatNumber(linkedTrade.pnl)}R</span> : null}
                              {linkedDiscipline ? <span>Discipline · {linkedDiscipline.status}</span> : null}
                            </div>
                          </div>
                          <div className="journal-entry-actions">
                            <button className="icon-button square" type="button" aria-label="Edit journal entry" onClick={() => editJournalEntry(entry)}>
                              <Pencil size={15} />
                            </button>
                            <button className="icon-button square danger" type="button" aria-label="Delete journal entry" onClick={() => deleteJournalEntry(entry)}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </header>
                        <p className="journal-entry-content">{entry.content}</p>
                        {entry.advice ? (
                          <div className="journal-entry-advice">
                            <span><Sparkles size={15} /> Advice</span>
                            <p>{entry.advice}</p>
                          </div>
                        ) : null}
                        {linkedTrade ? (
                          <button className="journal-trade-link" type="button" onClick={() => {
                            editTrade(linkedTrade);
                            setActiveView("add-trade");
                          }}>
                            <TrendingUp size={15} />
                            View linked {linkedTrade.pair} trade from {formatMonthDayYear(linkedTrade.date)}
                          </button>
                        ) : entry.relatedTradeId ? (
                          <span className="journal-missing-trade">The linked trade is no longer available.</span>
                        ) : null}
                        {linkedDiscipline ? (
                          <button className="journal-trade-link" type="button" onClick={() => {
                            editDisciplineEntry(linkedDiscipline);
                            setActiveView("discipline");
                          }}>
                            <ClipboardCheck size={15} />
                            View linked {linkedDiscipline.pair} Discipline entry from {formatMonthDayYear(linkedDiscipline.date)}
                          </button>
                        ) : entry.relatedDisciplineId ? (
                          <span className="journal-missing-trade">The linked Discipline entry is no longer available.</span>
                        ) : null}
                        {entry.image ? (
                          <button
                            className="journal-entry-image"
                            type="button"
                            aria-label={`View image for journal entry from ${formatMonthDayYear(entry.date)}`}
                            onClick={() => imageIndex >= 0 && openImageViewer(journalImageItems, imageIndex)}
                          >
                            <img src={entry.image} alt={`Journal attachment from ${formatMonthDayYear(entry.date)}`} loading="lazy" />
                            <span><Maximize2 size={15} /> View image</span>
                          </button>
                        ) : null}
                      </article>
                    );
                  })
                )}
              </div>
            </div>
            ) : (
              <div className="monthly-journal-layout">
                <section className="monthly-journal-analytics" aria-label={`${formatMonthLabel(monthlyJournalMonth)} analytics`}>
                  <div className="monthly-journal-toolbar">
                    <div>
                      <p className="eyebrow">Your month in review</p>
                      <h3>{formatMonthLabel(monthlyJournalMonth)}</h3>
                      <p>Your Swing results and personal reflection, together as one chapter.</p>
                    </div>
                    <button className="secondary-action" type="button" onClick={() => selectJournalMonth(monthlyJournalMonth, "daily")}>
                      <Plus size={16} />
                      Add quick note
                    </button>
                  </div>

                  <div className="monthly-journal-metrics">
                    <Stat label="Total R" value={`${formatNumber(monthlyJournalAnalytics.totalR)}R`} />
                    <Stat label="Trades" value={String(monthlyJournalAnalytics.liveTrades)} />
                    <WinRateStat rate={monthlyJournalAnalytics.winRate} />
                    <Stat label="Expectancy" value={`${formatNumber(monthlyJournalAnalytics.expectancy)}R`} />
                    <Stat label="Profit factor" value={formatNumber(monthlyJournalAnalytics.profitFactor)} />
                    <Stat label="Max drawdown" value={`${formatNumber(monthlyJournalAnalytics.maxDrawdown)}R`} />
                  </div>

                  <div className="monthly-journal-insights">
                    <article>
                      <span>Best pair</span>
                      <strong>
                        {monthlyJournalAnalytics.bestPair
                          ? `${monthlyJournalAnalytics.bestPair.pair} · ${formatNumber(monthlyJournalAnalytics.bestPair.totalR)}R`
                          : "No trades yet"}
                      </strong>
                      <small>
                        {monthlyJournalAnalytics.bestPair
                          ? `${monthlyJournalAnalytics.bestPair.samples} trades`
                          : "Add trades to populate this insight"}
                      </small>
                    </article>
                    <article>
                      <span>Discipline review</span>
                      <strong>{monthlyJournalAnalytics.disciplineEntries} entries</strong>
                      <small>
                        {monthlyJournalAnalytics.lossesAvoided} losses avoided · {monthlyJournalAnalytics.missedWinners} missed winners
                      </small>
                    </article>
                    <article>
                      <span>Average result</span>
                      <strong>{formatNumber(monthlyJournalAnalytics.expectancy)}R</strong>
                      <small>Per actual trade this month</small>
                    </article>
                  </div>
                </section>

                <div className="monthly-journal-content-grid">
                  <form className="monthly-journal-form" onSubmit={handleMonthlyJournalSubmit}>
                    <div className="journal-form-header">
                      <div>
                        <span>{selectedMonthlyJournalEntry ? "Editing monthly review" : "New monthly review"}</span>
                        <strong>{formatMonthLabel(monthlyJournalMonth)}</strong>
                      </div>
                      <CalendarDays size={22} />
                    </div>
                    <label>
                      <span>Monthly reflection</span>
                      <textarea
                        required
                        rows={9}
                        value={monthlyJournalForm.content}
                        placeholder="What worked this month? What patterns, emotions, or execution mistakes kept repeating?"
                        onChange={(event) =>
                          setMonthlyJournalForm((current) => ({ ...current, content: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Focus for next month <small>Optional</small></span>
                      <textarea
                        rows={4}
                        value={monthlyJournalForm.nextMonthFocus}
                        placeholder="The one behavior, setup, or risk rule you will prioritize next month."
                        onChange={(event) =>
                          setMonthlyJournalForm((current) => ({ ...current, nextMonthFocus: event.target.value }))
                        }
                      />
                    </label>
                    <div className="journal-form-actions">
                      <button
                        className="primary-action"
                        type="submit"
                        disabled={isSyncing || !monthlyJournalForm.content.trim()}
                      >
                        <NotebookPen size={17} />
                        {selectedMonthlyJournalEntry ? "Update monthly journal" : "Save monthly journal"}
                      </button>
                      {selectedMonthlyJournalEntry ? (
                        <button
                          className="secondary-action danger"
                          type="button"
                          disabled={isSyncing}
                          onClick={() => void deleteJournalEntry(selectedMonthlyJournalEntry)}
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </form>

                  <aside className="monthly-journal-history">
                    <div className="monthly-journal-history-heading">
                      <span>This month’s journey</span>
                      <strong>{selectedMonthDailyEntries.length} notes</strong>
                    </div>
                    {selectedMonthDailyEntries.length === 0 ? (
                      <div className="empty-state">
                        <NotebookPen size={26} />
                        <strong>No quick notes yet</strong>
                        <p>Add small moments through the month, then shape them into your story.</p>
                      </div>
                    ) : (
                      selectedMonthDailyEntries.map((entry) => (
                        <button
                          type="button"
                          key={entry.id}
                          onClick={() => editJournalEntry(entry)}
                        >
                          <span>
                            <strong>{formatMonthDayYear(entry.date)}</strong>
                            <small>{entry.content.slice(0, 92)}{entry.content.length > 92 ? "…" : ""}</small>
                          </span>
                          <ChevronRight size={17} />
                        </button>
                      ))
                    )}
                  </aside>
                </div>
              </div>
            )}
          </section>
        ) : null}

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
                onClick={() => setActiveView("backtest-comparison")}
              >
                <FlaskConical size={18} />
                Backtest
              </button>
            </div>

            <section className="market-panel" aria-label="Performance summary">
              {isSyncing ? <DataLoadingOverlay label="Loading journal data" /> : null}
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

        {activeView === "edge" ? (
          <section className="workspace-band">
            <div className="section-heading">
              <p className="eyebrow">Edge lab</p>
              <h2>Edge</h2>
              <p>Visualize when, where, and how your trading edge shows up across live trades or backtests.</p>
            </div>

            <section className="market-panel edge-module" aria-label="Edge module">
              <div className="edge-mode-toggle" aria-label="Edge mode">
                <button
                  className={edgeMode === "clock" ? "is-active" : ""}
                  type="button"
                  onClick={() => setEdgeMode("clock")}
                >
                  <Clock3 size={16} />
                  Edge clock
                </button>
                <button
                  className={edgeMode === "session" ? "is-active" : ""}
                  type="button"
                  onClick={() => setEdgeMode("session")}
                >
                  <CalendarClock size={16} />
                  Session Edge
                </button>
                <button
                  className={edgeMode === "week" ? "is-active" : ""}
                  type="button"
                  onClick={() => setEdgeMode("week")}
                >
                  <CalendarDays size={16} />
                  Week Edge
                </button>
              </div>

              {edgeMode === "clock" ? (
                <TradeTimeClock
                  trades={trades}
                  backtests={backtests}
                  period={clockPeriod}
                  source={clockSource}
                  onPeriodChange={setClockPeriod}
                  onSourceChange={setClockSource}
                />
              ) : edgeMode === "session" ? (
                <SessionEdge trades={trades} backtests={backtests} source={clockSource} onSourceChange={setClockSource} />
              ) : (
                <WeekEdge
                  data={weekEdge}
                  month={weekEdgeMonth}
                  monthOptions={weekEdgeMonthOptions}
                  onMonthChange={setWeekEdgeMonth}
                />
              )}
            </section>
          </section>
        ) : null}

        {activeView === "learn" ? (
          <section className="workspace-band">
            <div className="section-heading">
              <p className="eyebrow">Study room</p>
              <h2>Learn</h2>
              <p>Review your lesson library and keep timestamped execution notes beside the video.</p>
            </div>

            <section className="learn-layout">
              <div className="learn-player-card">
                <div className="learn-video-tabs" aria-label="Learning videos">
                  {learnVideos.map((video, index) => (
                    <button
                      className={activeLearnVideoId === video.id ? "is-active" : ""}
                      key={video.id}
                      type="button"
                      onClick={() => setActiveLearnVideoId(video.id)}
                    >
                      <span>Video {index + 1}</span>
                      <strong>{video.title}</strong>
                    </button>
                  ))}
                </div>

                <div
                  className="learn-video-frame"
                  onContextMenu={(event) => event.preventDefault()}
                  onDragStart={(event) => event.preventDefault()}
                >
                  <iframe
                    key={activeLearnVideoId}
                    src={learnVideos.find((video) => video.id === activeLearnVideoId)?.embedUrl}
                    title={learnVideos.find((video) => video.id === activeLearnVideoId)?.title || "Learning video"}
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                  />
                  <div className="learn-control-shield" aria-hidden="true" />
                </div>
              </div>

              <aside className="learn-notes-card">
                <div className="panel-header">
                  <span>Timestamp notes</span>
                  <strong>{learnResume[activeLearnVideoId] ? `Resume ${learnResume[activeLearnVideoId]}` : "No marker"}</strong>
                </div>

                <div className="learn-note-form">
                  <label>
                    <span>Timestamp</span>
                    <input
                      value={learnTimestamp}
                      placeholder="12:34"
                      onChange={(event) => setLearnTimestamp(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Note</span>
                    <textarea
                      value={learnNoteText}
                      rows={4}
                      placeholder="Write the lesson, rule, or chart pattern here."
                      onChange={(event) => setLearnNoteText(event.target.value)}
                    />
                  </label>
                  <div className="learn-note-actions">
                    <button className="secondary-action" type="button" onClick={saveLearnResumePoint}>
                      Save marker
                    </button>
                    <button className="primary-action" type="button" onClick={addLearnNote}>
                      Add note
                    </button>
                  </div>
                </div>

                <div className="learn-note-list">
                  {(learnNotes[activeLearnVideoId] || []).length === 0 ? (
                    <p className="recent-empty">No notes for this video yet.</p>
                  ) : (
                    [...(learnNotes[activeLearnVideoId] || [])].reverse().map((note) => (
                      <article className="learn-note" key={note.id}>
                        <div>
                          <strong>{note.timestamp}</strong>
                          <span>{formatOrdinalDate(note.createdAt.slice(0, 10))}</span>
                        </div>
                        <p>{note.text}</p>
                        <button type="button" onClick={() => deleteLearnNote(note.id)}>
                          Delete
                        </button>
                      </article>
                    ))
                  )}
                </div>
              </aside>
            </section>
          </section>
        ) : null}

        {activeView === "prop-firms" ? (
          <section className="workspace-band">
            <div className="section-heading">
              <p className="eyebrow">Funded capital</p>
              <h2>Prop firms</h2>
              <p>Track passed prop firm accounts and estimate your potential profit per trade after split.</p>
            </div>

            <PropFirmsModule
              accounts={propFirmAccounts}
              payouts={propFirmPayouts}
              trades={trades}
              onAccountsChange={updatePropFirmAccounts}
              onPayoutsChange={updatePropFirmPayouts}
            />
          </section>
        ) : null}

        {activeView === "goals" ? (
          <section className="workspace-band">
            <div className="section-heading">
              <p className="eyebrow">Goal board</p>
              <h2>Goals</h2>
              <p>Track prop firm targets, places you want to visit, and personal milestones. Cross them out when done.</p>
            </div>

            <GoalsModule
              goals={goals}
              form={goalForm}
              onFormChange={setGoalForm}
              onAddGoal={addGoal}
              onToggleGoal={toggleGoal}
              onDeleteGoal={(goalId) => updateGoals(goals.filter((goal) => goal.id !== goalId))}
            />
          </section>
        ) : null}

        {activeView === "research" ? (
          <section className="workspace-band">
            <div className="section-heading">
              <p className="eyebrow">Idea validation</p>
              <h2>Research</h2>
              <p>Capture new trading ideas, run mini backtests, and inspect whether the idea has an actual edge.</p>
            </div>

            <ResearchModule
              ideas={researchIdeas}
              activeIdeaId={activeResearchIdeaId || researchIdeas[0]?.id || ""}
              onActiveIdeaChange={setActiveResearchIdeaId}
              onChange={updateResearchIdeas}
              onOpenImage={(items, index) => openImageViewer(items, index)}
            />
          </section>
        ) : null}

        {activeView === "traders" ? (
          <section className="workspace-band">
            <div className="section-heading">
              <p className="eyebrow">Social edge</p>
              <h2>Traders</h2>
              <p>Add friends by Journaly ID and review their public performance when sharing is enabled.</p>
            </div>

            <TradersModule
              currentUserId={currentUser.id}
              friends={traderFriends}
              friendTrades={traderTrades}
              messages={traderMessages}
              traderIdInput={traderIdInput}
              onTraderIdInputChange={setTraderIdInput}
              onAddTrader={addTraderFriend}
              onLoadTrader={loadTraderPreview}
              onRemoveTrader={(id) => updateTraderFriends(traderFriends.filter((friend) => friend.id !== id))}
            />
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

        {activeView === "add-trade" || activeView === "position-sizing" || activeView === "trade-analysis" ? (
          <section className="workspace-band">
            <div className="section-heading">
              <p className="eyebrow">Trade capture</p>
              <h2>
                {activeView === "position-sizing"
                  ? "Position sizing"
                  : activeView === "trade-analysis"
                    ? "Trade analysis"
                    : tradeForm.id
                      ? "Edit trade"
                      : "Add a trade"}
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
              <button
                className={activeView === "trade-analysis" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("trade-analysis")}
              >
                Trade analysis
              </button>
            </div>

            {activeView === "trade-analysis" ? (
              <TradeAnalysisPanel
                ownerId={currentUser.id}
                pair={tradeForm.pair}
                trades={trades}
                setup={tradeForm.setup}
                setupVariables={setupVariables}
                screenshotFile={tradeForm.screenshotFile}
                workingFile={tradeForm.analysisWorkingFile}
                existingScreenshot={editingTrade?.screenshot || ""}
                startedAt={tradeForm.analysisStartedAt}
                checkedVariables={tradeForm.analysisChecks}
                zonePins={tradeForm.analysisZonePins}
                zones={tradeForm.analysisZones}
                decision={tradeForm.analysisDecision}
                onSetupChange={(setup) =>
                  setTradeForm({
                    ...tradeForm,
                    setup,
                    stopLossPips: defaultStopLossForSetup(setup),
                    analysisChecks: [],
                  })
                }
                onVariablesChange={(variables) => {
                  const next = { ...setupVariables, [tradeForm.setup]: variables };
                  setSetupVariables(next);
                  localStorage.setItem(SETUP_VARIABLES_KEY, JSON.stringify(next));
                  setTradeForm((current) => ({
                    ...current,
                    analysisChecks: current.analysisChecks.filter((item) => variables.includes(item)),
                  }));
                }}
                onChecksChange={(analysisChecks) => setTradeForm((current) => ({ ...current, analysisChecks }))}
                onZonePinsChange={(analysisZonePins) =>
                  setTradeForm((current) => ({ ...current, analysisZonePins }))
                }
                onZonesChange={(analysisZones) =>
                  setTradeForm((current) => ({ ...current, analysisZones }))
                }
                onDecisionChange={(analysisDecision) =>
                  setTradeForm((current) => ({ ...current, analysisDecision }))
                }
                onImageUpload={(screenshotFile) =>
                  setTradeForm((current) => ({
                    ...current,
                    screenshotFile,
                    analysisWorkingFile: screenshotFile,
                    analysisStartedAt: Date.now(),
                    analysisZonePins: {},
                    analysisZones: [],
                    analysisDecision: null,
                  }))
                }
                onWorkingImageChange={(analysisWorkingFile) =>
                  setTradeForm((current) => ({ ...current, analysisWorkingFile }))
                }
                onAnnotatedImageChange={(screenshotFile) =>
                  setTradeForm((current) => ({ ...current, screenshotFile }))
                }
              />
            ) : null}

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

                  <div className="form-actions">
                    <button
                      className="secondary-action"
                      type="button"
                      onClick={() =>
                        exportPositionSizingPng({
                          calculator: positionCalculator,
                          profileRows,
                          profileMode,
                        })
                      }
                    >
                      <ImagePlus size={18} />
                      Export PNG
                    </button>
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
                      <button
                        className="secondary-action"
                        type="button"
                        onClick={() =>
                          exportPositionSizingPng({
                            calculator: positionCalculator,
                            profileRows,
                            profileMode,
                          })
                        }
                      >
                        <ImagePlus size={18} />
                        Export PNG
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
            <form className="trade-form trade-entry-form" onSubmit={handleTradeSubmit}>
              <section className="trade-form-section">
                <div className="trade-entry-grid">
                  <label>
                    <span>Date</span>
                    <input
                      value={tradeForm.date}
                      type="date"
                      required
                      disabled={isFinalizingTrade}
                      onChange={(event) => setTradeForm({ ...tradeForm, date: event.target.value })}
                    />
                  </label>

                  <label>
                    <span>Time</span>
                    <input
                      value={tradeForm.time}
                      type="time"
                      required
                      disabled={isFinalizingTrade}
                      onChange={(event) => setTradeForm({ ...tradeForm, time: event.target.value })}
                    />
                  </label>

                  <SelectField
                    label="Pair"
                    value={tradeForm.pair}
                    options={pairs}
                    disabled={isFinalizingTrade}
                    onChange={(value) => setTradeForm({ ...tradeForm, pair: value })}
                  />

                  <SelectField
                    label="Setup"
                    value={tradeForm.setup}
                    options={setups}
                    disabled={isFinalizingTrade}
                    onChange={(value) =>
                      setTradeForm({ ...tradeForm, setup: value, stopLossPips: defaultStopLossForSetup(value) })
                    }
                  />
                  <SelectField
                    label="Direction"
                    value={tradeForm.direction}
                    options={["Long", "Short"]}
                    disabled={isFinalizingTrade}
                    onChange={(value) => setTradeForm({ ...tradeForm, direction: value as Direction })}
                  />
                  <SelectField
                    label="Result"
                    value={isFinalizingTrade ? resultFromPnl(tradeForm.pnl) : tradeForm.result}
                    options={results}
                    disabled={isFinalizingTrade}
                    onChange={(value) => setTradeForm({ ...tradeForm, result: value as Result })}
                  />

                  <label>
                    <span>Stop loss pips</span>
                    <input
                      value={tradeForm.stopLossPips}
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]*"
                      placeholder="14"
                      disabled={isFinalizingTrade}
                      onChange={(event) => setTradeForm({ ...tradeForm, stopLossPips: event.target.value })}
                    />
                  </label>

                  <label>
                    <span>MAE</span>
                    <input
                      value={tradeForm.mae}
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]*"
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
                </div>
                <SpreadNotice pair={tradeForm.pair} time={tradeForm.time} />
                {!tradeForm.id ? <PropRuleTradeNotice trades={trades} direction={tradeForm.direction} /> : null}
              </section>

              <section className="trade-form-section trade-journal-section">
                <div className="trade-form-section-title">
                  <span>Review notes</span>
                  <strong>{isFinalizingTrade ? "Final update only" : "Screenshot & lesson"}</strong>
                </div>
                {isFinalizingTrade ? (
                  <p className="integrity-note">
                    Integrity mode: entry details are locked. You can finalize once with MAE, required PnL, required image, and optional notes.
                  </p>
                ) : null}
                {isFinalizingTrade ? (
                  <label className="file-field">
                    <span>
                      Post image {tradeForm.screenshotFile ? `(${tradeForm.screenshotFile.name})` : editingTrade?.screenshot ? "(saved — choose to replace)" : "(required)"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const screenshotFile = event.target.files?.[0] || null;
                        setTradeForm((current) => ({
                          ...current,
                          screenshotFile,
                          analysisWorkingFile: screenshotFile,
                          analysisStartedAt: screenshotFile ? Date.now() : current.analysisStartedAt,
                        }));
                      }}
                    />
                    <ImagePlus size={18} />
                  </label>
                ) : null}
                <button className="analysis-shortcut" type="button" onClick={() => setActiveView("trade-analysis")}>
                  <ImagePlus size={18} />
                  <span>
                    <strong>{tradeForm.screenshotFile || editingTrade?.screenshot ? "Chart ready" : "Analyze your chart"}</strong>
                    Upload, mark up, and check your setup variables
                  </span>
                  <ChevronRight size={18} />
                </button>

                <label>
                  <span>Notes</span>
                  <textarea
                    value={tradeForm.notes}
                    rows={5}
                    placeholder="What was the thesis, trigger, management, and lesson?"
                    onChange={(event) => setTradeForm({ ...tradeForm, notes: event.target.value })}
                  />
                </label>

                <div className="form-actions">
                  <button className="primary-action" type="submit" disabled={isSyncing}>
                    <CalendarClock size={18} />
                    {tradeForm.id ? "Finalize trade" : "Save trade"}
                  </button>
                  {tradeForm.id ? (
                    <button
                      className="secondary-action"
                      type="button"
                      onClick={() => {
                        setTradeForm(todayDefaults());
                        setActiveView("view-trades");
                      }}
                    >
                      <ChevronLeft size={18} />
                      Back to trades
                    </button>
                  ) : null}
                  <button className="ghost-action" type="button" onClick={() => setTradeForm(todayDefaults())}>
                    <RefreshCcw size={18} />
                    Clear
                  </button>
                </div>
              </section>

              {tradeForm.pair && currentPairAdvice ? (
                <aside
                  key={tradeForm.pair}
                  className={`pair-advice-ticker ${matchingPairAdvice.length > 1 ? "is-rotating" : ""}`}
                  aria-label={`${tradeForm.pair} journal advice`}
                >
                  <div className="pair-advice-icon" aria-hidden="true">
                    <Sparkles size={18} />
                  </div>
                  <div className="pair-advice-copy">
                    <span>
                      {tradeForm.pair} advice
                      <small>{matchingPairAdvice.length} saved</small>
                    </span>
                    <p key={`${currentPairAdvice.id}-${tradeAdviceIndex}`} aria-live="polite">
                      {currentPairAdvice.advice}
                    </p>
                  </div>
                  <button className="pair-advice-all" type="button" onClick={() => setIsTradeAdviceLibraryOpen(true)}>
                    View all
                  </button>
                </aside>
              ) : null}

              {isTradeAdviceLibraryOpen && tradeForm.pair && matchingPairAdvice.length > 0 ? (
                <div className="pair-advice-overlay" role="dialog" aria-modal="true" aria-labelledby="pair-advice-title">
                  <button
                    className="pair-advice-backdrop"
                    type="button"
                    aria-label="Close advice library"
                    onClick={() => setIsTradeAdviceLibraryOpen(false)}
                  />
                  <section className="pair-advice-dialog">
                    <header>
                      <div>
                        <span>Journal wisdom</span>
                        <h3 id="pair-advice-title">All {tradeForm.pair} advice</h3>
                      </div>
                      <button
                        className="icon-button square"
                        type="button"
                        aria-label="Close advice library"
                        onClick={() => setIsTradeAdviceLibraryOpen(false)}
                      >
                        <X size={17} />
                      </button>
                    </header>
                    <div className="pair-advice-list">
                      {matchingPairAdvice.map((entry) => (
                        <article key={entry.id}>
                          <Sparkles size={15} />
                          <div>
                            <time dateTime={entry.date}>{formatMonthDayYear(entry.date)}</time>
                            <p>{entry.advice}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}
            </form>
            ) : null}
          </section>
        ) : null}

        {activeView === "trade-analytics" ||
        activeView === "view-trades" ||
        activeView === "trade-images" ||
        activeView === "trade-calendar" ||
        activeView === "monthly-heatmap" ||
        activeView === "week-edge" ||
        activeView === "trade-performance" ||
        activeView === "yearly-comparison" ||
        activeView === "discipline" ? (
          <section className="journal-band">
            <div className="section-heading">
              <p className="eyebrow">Trade archive</p>
              <h2>
                {activeView === "trade-analytics"
                  ? "Trade analytics"
                  : activeView === "trade-images"
                    ? "Image view"
                  : activeView === "trade-calendar"
                    ? "Calendar view"
                  : activeView === "monthly-heatmap"
                    ? "Monthly heatmap"
                  : activeView === "week-edge"
                    ? "Week Edge"
                    : activeView === "trade-performance"
                      ? "Performance"
                      : activeView === "yearly-comparison"
                        ? "Yearly comparison"
                      : activeView === "discipline"
                        ? "Discipline"
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
                Trades
              </button>
              <button
                className={activeView === "trade-images" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("trade-images")}
              >
                Images
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
                Heatmap
              </button>
              <button
                className={activeView === "week-edge" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("week-edge")}
              >
                Week Edge
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
                Yearly
              </button>
              <button
                className={activeView === "discipline" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("discipline")}
              >
                Discipline
              </button>
            </div>

            {activeView === "trade-analytics" ? (
              <>
                <div className="data-loading-shell">
                  {isSyncing ? <DataLoadingOverlay label="Loading equity curve" /> : null}
                  <EquityCurve points={tradeAnalytics.equityPoints} />
                </div>
                <section className="market-panel backtest-panel" aria-label="Trade advanced analytics">
                  <div className="panel-header">
                    <span>Advanced analytics</span>
                    <strong>
                      <span className="status-dot" aria-hidden="true" />
                      {tradeAnalytics.total} trades
                    </strong>
                  </div>
                  <div className="analytics-filter-row">
                    <SelectField
                      label="Year"
                      value={tradeAnalyticsYearFilter}
                      options={tradeAnalyticsYears}
                      onChange={setTradeAnalyticsYearFilter}
                    />
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
                    <Stat
                      label="Direction distribution"
                      value={`Long: ${tradeAnalytics.directionDistribution.longPercent}% / Short: ${tradeAnalytics.directionDistribution.shortPercent}%`}
                    />
                    <Stat label="Longest long streak" value={String(tradeAnalytics.directionStreaks.longestLong)} />
                    <Stat label="Longest short streak" value={String(tradeAnalytics.directionStreaks.longestShort)} />
                  </div>
                </section>
                <TradeQualityAdvancedAnalytics
                  data={scopedTradeQualityAnalytics}
                  periodLabel={tradeAnalyticsYearFilter === "All" ? "All-time quality review" : `${tradeAnalyticsYearFilter} quality review`}
                />
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
              <SelectField
                label="Filter setup"
                value={setupFilter}
                options={["All", ...setups]}
                onChange={setSetupFilter}
              />
              <SelectField
                label="Filter quality"
                value={qualityFilter}
                options={["All", "Good", "Mid", "Bad", "Unrated"]}
                onChange={(value) => setQualityFilter(value as "All" | TradeQuality | "Unrated")}
              />
              <button className="secondary-action toolbar-action" type="button" onClick={() => setActiveView("trade-images")}>
                <ImagePlus size={18} />
                Open images
              </button>
            </div>

            <TradeQualitySummary data={tradeQualityAnalytics} />

            <div className="trade-list" aria-live="polite">
              {isSyncing ? <DataLoadingRow label="Loading trades" /> : null}
              {filteredTrades.length === 0 ? (
                <div className="empty-state">
                  <strong>No trades logged yet</strong>
                  <p>Your best review data starts with the next clean entry.</p>
                </div>
              ) : (
                filteredTrades.map((trade) => {
                  const imageIndex = filteredTradeImageItems.findIndex((item) => item.id === trade.id);

                  return (
                  <TradeCard
                    key={trade.id}
                    trade={trade}
                    onEdit={() => editTrade(trade)}
                    onDelete={() => setPendingDeleteTrade(trade)}
                    onViewImage={() => imageIndex >= 0 && openImageViewer(filteredTradeImageItems, imageIndex)}
                    onQualityChange={(quality) => void updateTradeQuality(trade, quality)}
                    isSavingQuality={savingQualityTradeId === trade.id}
                  />
                  );
                })
              )}
            </div>
            </>
            ) : null}

            {activeView === "trade-images" ? (
              <TradeImageGallery
                items={tradeImageItems}
                stats={tradeImageStats}
                pairFilter={imagePairFilter}
                setupFilter={imageSetupFilter}
                resultFilter={imageResultFilter}
                directionFilter={imageDirectionFilter}
                onPairFilterChange={setImagePairFilter}
                onSetupFilterChange={setImageSetupFilter}
                onResultFilterChange={(value) => setImageResultFilter(value as "All" | Result)}
                onDirectionFilterChange={(value) => setImageDirectionFilter(value as "All" | Direction)}
                onReset={() => {
                  setImagePairFilter("All");
                  setImageSetupFilter("All");
                  setImageResultFilter("All");
                  setImageDirectionFilter("All");
                }}
                onOpenImage={(index) => openImageViewer(tradeImageItems, index)}
              />
            ) : null}

            {activeView === "trade-calendar" ? (
              <TradeCalendar
                days={tradeCalendarDays}
                month={tradeCalendarMonth}
                monthOptions={tradeCalendarMonthOptions}
                quality={tradeCalendarQuality}
                onMonthChange={setTradeCalendarMonth}
                onViewImage={(trade) =>
                  trade.screenshot &&
                  openImageViewer(
                    [
                      {
                        id: trade.id,
                        src: trade.screenshot,
                        alt: `${trade.pair} ${trade.setup} screenshot`,
                        title: `${trade.pair} ${trade.direction} - ${formatMonthDayYear(trade.date)}`,
                        meta: `${trade.setup} / ${trade.result} / ${formatNumber(trade.pnl)}R`,
                      },
                    ],
                    0,
                  )
                }
              />
            ) : null}

            {activeView === "monthly-heatmap" ? (
              <MonthlyHeatmap data={monthlyHeatmap} />
            ) : null}

            {activeView === "week-edge" ? (
              <WeekEdge data={weekEdge} month={weekEdgeMonth} monthOptions={weekEdgeMonthOptions} onMonthChange={setWeekEdgeMonth} />
            ) : null}

            {activeView === "trade-performance" ? (
              <PerformanceBreakdown data={performanceBreakdown} qualityData={tradeQualityAnalytics} />
            ) : null}

            {activeView === "yearly-comparison" ? (
              <YearlyComparison
                data={yearlyComparison}
                selectedYear={yearlyComparison.activeYear}
                onYearChange={setYearlyCompareYear}
              />
            ) : null}

            {activeView === "discipline" ? (
              <DisciplineLog
                entries={tradeDecisions}
                form={decisionForm}
                isSyncing={isSyncing}
                onFormChange={setDecisionForm}
                onSubmit={handleDisciplineSubmit}
                onEdit={editDisciplineEntry}
                onDelete={deleteDisciplineEntry}
                onPostImageChange={handleDisciplinePostImageChange}
                onOpenImage={(items, index) => openImageViewer(items, index)}
                onClear={() => setDecisionForm(tradeDecisionDefaults())}
              />
            ) : null}
          </section>
        ) : null}

        {activeView === "backtest-comparison" ||
        activeView === "backtesting-analytics" ||
        activeView === "add-backtest" ||
        activeView === "view-backtests" ? (
          <section className="journal-band">
            <div className="section-heading">
              <p className="eyebrow">Research engine</p>
              <h2>
                {activeView === "backtest-comparison"
                  ? `${formatMonthLabel(backtestComparisonMonth)} backtest vs actual`
                  : activeView === "backtesting-analytics"
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
                className={activeView === "backtest-comparison" ? "is-active" : ""}
                type="button"
                onClick={() => setActiveView("backtest-comparison")}
              >
                Monthly comparison
              </button>
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

            {activeView === "backtest-comparison" ? (
              <section className="monthly-backtest-comparison" aria-label="Monthly backtest versus actual comparison">
                <div className="comparison-toolbar">
                  <div>
                    <p className="eyebrow">Month-end review</p>
                    <h3>Backtest {formatMonthLabel(backtestComparisonMonth)} vs actual {formatMonthLabel(backtestComparisonMonth)}</h3>
                    <p>
                      Compare the month you replayed with the trades you actually took during the same period.
                    </p>
                  </div>
                  <label className="comparison-month-field">
                    <span>Review month</span>
                    <select
                      value={backtestComparisonMonth}
                      onChange={(event) => setBacktestComparisonMonth(event.target.value)}
                    >
                      {backtestComparisonMonths.length === 0 ? (
                        <option value={backtestComparisonMonth}>{formatMonthLabel(backtestComparisonMonth)}</option>
                      ) : (
                        backtestComparisonMonths.map((month) => (
                          <option key={month} value={month}>{formatMonthLabel(month)}</option>
                        ))
                      )}
                    </select>
                  </label>
                </div>

                <div className={`comparison-status ${monthlyBacktestComparison.monthEnded ? "is-closed" : "is-open"}`}>
                  <CalendarDays size={18} />
                  <div>
                    <strong>{monthlyBacktestComparison.monthEnded ? "Month closed · ready for review" : "Month still in progress"}</strong>
                    <span>
                      {monthlyBacktestComparison.monthEnded
                        ? "Add your replay trades, then use the gaps below to review execution."
                        : "You can add samples now; the final comparison is most useful after month-end."}
                    </span>
                  </div>
                </div>

                {!monthlyBacktestComparison.hasActual || !monthlyBacktestComparison.hasBacktest ? (
                  <div className="comparison-empty-note">
                    <Info size={18} />
                    <span>
                      {!monthlyBacktestComparison.hasActual && !monthlyBacktestComparison.hasBacktest
                        ? "No actual or backtest trades are logged for this month yet."
                        : !monthlyBacktestComparison.hasBacktest
                          ? "Actual trades are ready. Add backtest trades for this month to complete the comparison."
                          : "Backtest trades are ready. Add your actual trades for this month to complete the comparison."}
                    </span>
                  </div>
                ) : null}

                <div className="comparison-scorecards">
                  <article className="comparison-scorecard is-backtest">
                    <span>Backtest</span>
                    <strong>{formatNumber(monthlyBacktestComparison.tested.totalR)}R</strong>
                    <small>{monthlyBacktestComparison.tested.samples} trades · {monthlyBacktestComparison.tested.winRate}% win rate</small>
                  </article>
                  <article className="comparison-scorecard is-gap">
                    <span>Actual minus backtest</span>
                    <strong className={monthlyBacktestComparison.rGap >= 0 ? "positive-r" : "negative-r"}>
                      {monthlyBacktestComparison.rGap >= 0 ? "+" : ""}{formatNumber(monthlyBacktestComparison.rGap)}R
                    </strong>
                    <small>
                      {monthlyBacktestComparison.winRateGap >= 0 ? "+" : ""}{monthlyBacktestComparison.winRateGap}% win-rate gap
                    </small>
                  </article>
                  <article className="comparison-scorecard is-actual">
                    <span>Actual</span>
                    <strong>{formatNumber(monthlyBacktestComparison.actual.totalR)}R</strong>
                    <small>{monthlyBacktestComparison.actual.samples} trades · {monthlyBacktestComparison.actual.winRate}% win rate</small>
                  </article>
                </div>

                <div className="comparison-metric-table" role="table" aria-label="Backtest and actual monthly metrics">
                  <div className="comparison-metric-row is-head" role="row">
                    <span role="columnheader">Metric</span>
                    <span role="columnheader">Backtest</span>
                    <span role="columnheader">Actual</span>
                    <span role="columnheader">Gap</span>
                  </div>
                  {[
                    { label: "Trades", tested: String(monthlyBacktestComparison.tested.samples), actual: String(monthlyBacktestComparison.actual.samples), gap: `${monthlyBacktestComparison.actual.samples - monthlyBacktestComparison.tested.samples}` },
                    { label: "Total R", tested: `${formatNumber(monthlyBacktestComparison.tested.totalR)}R`, actual: `${formatNumber(monthlyBacktestComparison.actual.totalR)}R`, gap: `${monthlyBacktestComparison.rGap >= 0 ? "+" : ""}${formatNumber(monthlyBacktestComparison.rGap)}R` },
                    { label: "Win rate", tested: `${monthlyBacktestComparison.tested.winRate}%`, actual: `${monthlyBacktestComparison.actual.winRate}%`, gap: `${monthlyBacktestComparison.winRateGap >= 0 ? "+" : ""}${monthlyBacktestComparison.winRateGap}%` },
                    { label: "Expectancy", tested: `${formatNumber(monthlyBacktestComparison.tested.expectancy)}R`, actual: `${formatNumber(monthlyBacktestComparison.actual.expectancy)}R`, gap: `${monthlyBacktestComparison.expectancyGap >= 0 ? "+" : ""}${formatNumber(monthlyBacktestComparison.expectancyGap)}R` },
                    { label: "Profit factor", tested: formatNumber(monthlyBacktestComparison.tested.profitFactor), actual: formatNumber(monthlyBacktestComparison.actual.profitFactor), gap: `${formatNumber(monthlyBacktestComparison.actual.profitFactor - monthlyBacktestComparison.tested.profitFactor)}` },
                    { label: "Max drawdown", tested: `${formatNumber(monthlyBacktestComparison.tested.maxDrawdown)}R`, actual: `${formatNumber(monthlyBacktestComparison.actual.maxDrawdown)}R`, gap: `${formatNumber(monthlyBacktestComparison.actual.maxDrawdown - monthlyBacktestComparison.tested.maxDrawdown)}R` },
                    { label: "Average win", tested: `${formatNumber(monthlyBacktestComparison.tested.averageWin)}R`, actual: `${formatNumber(monthlyBacktestComparison.actual.averageWin)}R`, gap: `${formatNumber(monthlyBacktestComparison.actual.averageWin - monthlyBacktestComparison.tested.averageWin)}R` },
                    { label: "Average loss", tested: `${formatNumber(monthlyBacktestComparison.tested.averageLoss)}R`, actual: `${formatNumber(monthlyBacktestComparison.actual.averageLoss)}R`, gap: `${formatNumber(monthlyBacktestComparison.actual.averageLoss - monthlyBacktestComparison.tested.averageLoss)}R` },
                  ].map((metric) => (
                    <div className="comparison-metric-row" role="row" key={metric.label}>
                      <strong role="cell">{metric.label}</strong>
                      <span role="cell">{metric.tested}</span>
                      <span role="cell">{metric.actual}</span>
                      <span role="cell">{metric.gap}</span>
                    </div>
                  ))}
                </div>

                {monthlyBacktestComparison.pairRows.length > 0 ? (
                  <div className="comparison-pairs">
                    <div className="comparison-subheading">
                      <div>
                        <p className="eyebrow">Where the gap came from</p>
                        <h3>Pair breakdown</h3>
                      </div>
                      <span>{monthlyBacktestComparison.pairRows.length} pairs reviewed</span>
                    </div>
                    <div className="comparison-pair-list">
                      {monthlyBacktestComparison.pairRows.map((row) => (
                        <div className="comparison-pair-row" key={row.pair}>
                          <strong>{row.pair}</strong>
                          <span><small>Backtest</small>{formatNumber(row.testedR)}R · {row.testedSamples}</span>
                          <span><small>Actual</small>{formatNumber(row.actualR)}R · {row.actualSamples}</span>
                          <span className={row.gap >= 0 ? "positive-r" : "negative-r"}>
                            <small>Gap</small>{row.gap >= 0 ? "+" : ""}{formatNumber(row.gap)}R
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {activeView === "backtesting-analytics" ? (
            <section className="market-panel backtest-panel" aria-label="Backtesting analytics">
              <div className="panel-header">
                <span>Backtest analytics</span>
                <strong>
                  <span className="status-dot" aria-hidden="true" />
                  {backtestStats.total} samples
                </strong>
              </div>
              <div className="analytics-filter-row">
                <SelectField
                  label="Year"
                  value={backtestAnalyticsYearFilter}
                  options={backtestYears}
                  onChange={setBacktestAnalyticsYearFilter}
                />
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
                <Stat
                  label="Direction distribution"
                  value={`Long: ${backtestStats.directionDistribution.longPercent}% / Short: ${backtestStats.directionDistribution.shortPercent}%`}
                />
                <Stat label="Longest long streak" value={String(backtestStats.directionStreaks.longestLong)} />
                <Stat label="Longest short streak" value={String(backtestStats.directionStreaks.longestShort)} />
              </div>
            </section>
            ) : null}

            {activeView === "add-backtest" ? (
            <form
              className="trade-form backtest-form"
              onSubmit={handleBacktestSubmit}
              aria-busy={isSavingBacktest}
            >
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
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  onChange={(event) =>
                    setBacktestForm({ ...backtestForm, durationMinutes: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Stop loss pips</span>
                <input
                  value={backtestForm.stopLossPips}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  onChange={(event) =>
                    setBacktestForm({ ...backtestForm, stopLossPips: event.target.value })
                  }
                />
              </label>
              <label>
                <span>MAE pips</span>
                <input
                  value={backtestForm.maePips}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  onChange={(event) => setBacktestForm({ ...backtestForm, maePips: event.target.value })}
                />
              </label>
              <label>
                <span>PnL R</span>
                <input
                  value={backtestForm.pnl}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  required
                  onChange={(event) => {
                    const pnl = Number(event.target.value);
                    setBacktestForm({
                      ...backtestForm,
                      pnl: event.target.value,
                      result: event.target.value && Number.isFinite(pnl) ? resultFromPnl(pnl) : backtestForm.result,
                    });
                  }}
                />
              </label>
              <label>
                <span>Result (automatic)</span>
                <input value={backtestForm.result} type="text" readOnly aria-readonly="true" />
              </label>
              <label>
                <span>Scale in</span>
                <input
                  value={backtestForm.scaleIn}
                  type="text"
                  onChange={(event) => setBacktestForm({ ...backtestForm, scaleIn: event.target.value })}
                />
              </label>
              <label className="file-field">
                <span>Screenshot (optional)</span>
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
                <button className="primary-action" type="submit" disabled={isSavingBacktest}>
                  <CalendarClock size={18} />
                  {isSavingBacktest
                    ? "Saving..."
                    : backtestForm.id
                      ? "Update backtest"
                      : "Save backtest"}
                </button>
                <button
                  className="ghost-action"
                  type="button"
                  disabled={isSavingBacktest}
                  onClick={() => {
                    setBacktestForm(backtestDefaults());
                    setBacktestFormError("");
                  }}
                >
                  <RefreshCcw size={18} />
                  Clear
                </button>
                {backtestFormError ? (
                  <p className="backtest-form-error" role="alert">
                    <TriangleAlert size={17} />
                    {backtestFormError}
                  </p>
                ) : null}
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
            </div>

            <div className="trade-list" aria-live="polite">
              {isSyncing ? <DataLoadingRow label="Loading backtests" /> : null}
              {filteredBacktests.length === 0 && !isSyncing ? (
                <div className="empty-state">
                  <strong>No backtests yet</strong>
                  <p>Log a fresh backtest sample to start building your review data.</p>
                </div>
              ) : (
                filteredBacktests.map((backtest) => (
                  <BacktestCard
                    key={backtest.id}
                    backtest={backtest}
                    onEdit={() => editBacktest(backtest)}
                    onDelete={() => deleteBacktest(backtest.id)}
                    onViewImage={() => {
                      const imageIndex = filteredBacktestImages.findIndex((item) => item.id === backtest.id);
                      if (imageIndex >= 0) openImageViewer(filteredBacktestImages, imageIndex);
                    }}
                  />
                ))
              )}
            </div>
            </>
            ) : null}
          </section>
        ) : null}
        </>
        ) : (
          <DayTradeJournal userId={currentUser.id} activeView={dayTradeView} onViewChange={setDayTradeView} />
        )}

        {imageViewer ? (
          <div className="image-viewer" role="dialog" aria-modal="true" aria-label="Screenshot viewer">
            <button className="image-viewer-backdrop" type="button" onClick={() => setImageViewer(null)} />
            <div className="image-viewer-panel">
              <div className="image-viewer-info">
                <strong>{imageViewer.items[imageViewer.index]?.title}</strong>
                <span>
                  {imageViewer.items[imageViewer.index]?.meta}
                  {imageViewer.items.length > 1 ? ` / ${imageViewer.index + 1} of ${imageViewer.items.length}` : ""}
                </span>
              </div>
              {imageViewer.items.length > 1 ? (
                <>
                  <button
                    className="icon-button square image-viewer-nav image-viewer-prev"
                    type="button"
                    aria-label="Previous screenshot"
                    onClick={() => moveImageViewer(-1)}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    className="icon-button square image-viewer-nav image-viewer-next"
                    type="button"
                    aria-label="Next screenshot"
                    onClick={() => moveImageViewer(1)}
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              ) : null}
              <button
                className="icon-button square image-viewer-close"
                type="button"
                aria-label="Close screenshot viewer"
                onClick={() => setImageViewer(null)}
              >
                <X size={18} />
              </button>
              <img src={imageViewer.items[imageViewer.index]?.src} alt={imageViewer.items[imageViewer.index]?.alt} />
            </div>
          </div>
        ) : null}

        {pendingTradeLock ? (
          <ConfirmDialog
            title={pendingTradeLock.id ? "Finalize this trade?" : "Lock in this trade?"}
            message={`${pendingTradeLock.pair} ${pendingTradeLock.direction.toLowerCase()} at ${formatTime12(
              pendingTradeLock.time,
            )}, ${pendingTradeLock.result.toLowerCase()}, ${pendingTradeLock.pnl || 0}R, SL ${
              pendingTradeLock.stopLossPips || "-"
            } pips. ${
              pendingTradeLock.id
                ? "This is the only allowed outcome update. After this, the trade becomes read-only."
                : "Entry details become locked after saving. You can finalize outcome once later."
            }`}
            confirmLabel={pendingTradeLock.id ? "Finalize trade" : "Lock in trade"}
            tone="primary"
            onCancel={() => setPendingTradeLock(null)}
            onConfirm={() => saveLockedTrade(pendingTradeLock)}
          />
        ) : null}

        {pendingDeleteTrade ? (
          <ConfirmDialog
            title="Delete this trade?"
            message={`${pendingDeleteTrade.pair} from ${formatMonthDayYear(
              pendingDeleteTrade.date,
            )} will be removed from your journal.`}
            confirmLabel="Delete trade"
            tone="danger"
            onCancel={() => setPendingDeleteTrade(null)}
            onConfirm={() => deleteTrade(pendingDeleteTrade)}
          />
        ) : null}

        {isProfileOpen ? (
          <AccountProfileDialog
            email={currentUser.email}
            profile={accountProfile}
            passwordForm={passwordForm}
            message={profileMessage}
            licenseState={licenseState}
            licenseToken={licenseTokenInput}
            licenseMessage={licenseMessage}
            onClose={() => {
              setIsProfileOpen(false);
              setProfileMessage("");
            }}
            onProfileChange={updateAccountProfile}
            onAvatarChange={updateProfileAvatar}
            onPasswordFormChange={setPasswordForm}
            onPasswordUpdate={handlePasswordUpdate}
            onLicenseTokenChange={setLicenseTokenInput}
            onActivateLicense={() => activateLicense()}
          />
        ) : null}
        </main>
      </div>
      {tradingMode === "swing" ? <DaraMiniChatbar context={daraContext} onOpenCoach={() => setActiveView("ai-coach")} /> : null}
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
  const [coachHistory, setCoachHistory] = useState<AICoachHistoryItem[]>(readAICoachHistory);
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

      const answer = payload.answer || "";
      setCoachAnswer(answer);
      if (answer) {
        const nextHistory = [
          {
            id: crypto.randomUUID(),
            question: cleanQuestion,
            answer,
            createdAt: new Date().toISOString(),
          },
          ...coachHistory,
        ].slice(0, 30);
        setCoachHistory(nextHistory);
        localStorage.setItem(AI_COACH_HISTORY_KEY, JSON.stringify(nextHistory));
      }
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

  function openHistoryItem(item: AICoachHistoryItem) {
    setCoachQuestion(item.question);
    setCoachAnswer(item.answer);
    setCoachError("");
  }

  function clearCoachHistory() {
    setCoachHistory([]);
    localStorage.setItem(AI_COACH_HISTORY_KEY, JSON.stringify([]));
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

      <section className="coach-panel coach-history-panel">
        <div className="panel-header">
          <span>Coach history</span>
          <strong>{coachHistory.length} saved</strong>
        </div>
        {coachHistory.length === 0 ? (
          <p className="recent-empty">No AI Coach questions yet. Ask something and the answer will be saved here.</p>
        ) : (
          <>
            <div className="coach-history-list">
              {coachHistory.map((item) => (
                <button type="button" key={item.id} onClick={() => openHistoryItem(item)}>
                  <span>{formatOrdinalDate(item.createdAt.slice(0, 10))}</span>
                  <strong>{item.question}</strong>
                  <small>{item.answer}</small>
                </button>
              ))}
            </div>
            <button className="ghost-action coach-history-clear" type="button" onClick={clearCoachHistory}>
              <Trash2 size={16} />
              Clear history
            </button>
          </>
        )}
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
      style={
        windowState.isOpen
          ? {
              left: windowState.x,
              top: windowState.y,
              width: windowState.width,
              height: windowState.height,
            }
          : undefined
      }
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
        <button className="dara-mini-tab" type="button" onClick={openDara} aria-label="Open Dara mini coach">
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

function DataLoadingOverlay({ label }: { label: string }) {
  return (
    <div className="data-loading-overlay" role="status">
      <RefreshCcw size={16} />
      <span>{label}</span>
    </div>
  );
}

function DataLoadingRow({ label }: { label: string }) {
  return (
    <div className="data-loading-row" role="status">
      <RefreshCcw size={16} />
      <span>{label}</span>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  tone = "danger",
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <button className="confirm-backdrop" type="button" aria-label="Cancel confirmation" onClick={onCancel} />
      <section className="confirm-panel">
        <div className="confirm-icon">
          {tone === "danger" ? <TriangleAlert size={22} /> : <ClipboardCheck size={22} />}
        </div>
        <div>
          <h2 id="confirm-title">{title}</h2>
          <p>{message}</p>
        </div>
        <div className="confirm-actions">
          <button className="secondary-action" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className={`primary-action ${tone === "danger" ? "danger-action" : ""}`} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function AccountProfileDialog({
  email,
  profile,
  passwordForm,
  message,
  licenseState,
  licenseToken,
  licenseMessage,
  onClose,
  onProfileChange,
  onAvatarChange,
  onPasswordFormChange,
  onPasswordUpdate,
  onLicenseTokenChange,
  onActivateLicense,
}: {
  email: string;
  profile: AccountProfile;
  passwordForm: { password: string; confirmPassword: string };
  message: string;
  licenseState: ReturnType<typeof getLicenseState>;
  licenseToken: string;
  licenseMessage: string;
  onClose: () => void;
  onProfileChange: (profile: AccountProfile) => void;
  onAvatarChange: (file: File | null) => void;
  onPasswordFormChange: (form: { password: string; confirmPassword: string }) => void;
  onPasswordUpdate: () => void;
  onLicenseTokenChange: (token: string) => void;
  onActivateLicense: () => void;
}) {
  return (
    <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <button className="confirm-backdrop" type="button" aria-label="Close profile settings" onClick={onClose} />
      <section className="profile-panel">
        <div className="profile-panel-header">
          <div>
            <p className="eyebrow">Account</p>
            <h2 id="profile-title">Profile settings</h2>
          </div>
          <button className="icon-button square" type="button" aria-label="Close profile settings" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="profile-editor">
          <div className="avatar-editor">
            <div className="avatar-preview">
              {profile.avatar ? <img src={profile.avatar} alt="" /> : <span>{profile.displayName.slice(0, 1)}</span>}
            </div>
            <label className="secondary-action avatar-upload">
              <ImagePlus size={16} />
              Add profile pic
              <input type="file" accept="image/*" onChange={(event) => onAvatarChange(event.target.files?.[0] || null)} />
            </label>
          </div>

          <div className="profile-fields">
            <label>
              <span>Exact name</span>
              <input value={profile.displayName} onChange={(event) => onProfileChange({ ...profile, displayName: event.target.value })} />
            </label>
            <label>
              <span>Email</span>
              <input value={email} disabled />
            </label>
            <label className="wide-field">
              <span>Bio</span>
              <textarea value={profile.bio} rows={4} onChange={(event) => onProfileChange({ ...profile, bio: event.target.value })} />
            </label>
            <label className="profile-toggle wide-field">
              <input
                type="checkbox"
                checked={profile.publicViewing}
                onChange={(event) => onProfileChange({ ...profile, publicViewing: event.target.checked })}
              />
              <span>Allow public trader viewing</span>
            </label>
          </div>
        </div>

        <section className="license-panel">
          <div className="panel-header">
            <span>Access</span>
            <strong>
              {licenseState.isActivated
                ? `${licenseState.tier}${licenseState.expiresAt ? ` / expires ${formatOrdinalDate(licenseState.expiresAt.slice(0, 10))}` : ""}`
                : `${licenseState.daysLeft} day grace`}
            </strong>
          </div>
          <div className="license-form">
            <label>
              <span>Activation token</span>
              <input value={licenseToken} placeholder="Paste token" onChange={(event) => onLicenseTokenChange(event.target.value)} />
            </label>
            <button className="primary-action" type="button" onClick={onActivateLicense}>
              Activate
            </button>
          </div>
          {licenseMessage ? <p className="profile-message">{licenseMessage}</p> : null}
        </section>

        <details className="password-panel">
          <summary className="panel-header">
            <span>Security</span>
            <strong>Change password only if needed</strong>
          </summary>
          <div className="password-grid">
            <label>
              <span>New password</span>
              <input
                value={passwordForm.password}
                type="password"
                minLength={6}
                onChange={(event) => onPasswordFormChange({ ...passwordForm, password: event.target.value })}
              />
            </label>
            <label>
              <span>Confirm password</span>
              <input
                value={passwordForm.confirmPassword}
                type="password"
                minLength={6}
                onChange={(event) => onPasswordFormChange({ ...passwordForm, confirmPassword: event.target.value })}
              />
            </label>
            <button className="primary-action" type="button" onClick={onPasswordUpdate}>
              Update password
            </button>
          </div>
          {message ? <p className="profile-message">{message}</p> : null}
        </details>
      </section>
    </div>
  );
}

function LicenseActivationScreen({
  email,
  token,
  message,
  onTokenChange,
  onActivate,
  onLogout,
}: {
  email: string;
  token: string;
  message: string;
  onTokenChange: (token: string) => void;
  onActivate: () => void;
  onLogout: () => void;
}) {
  return (
    <section className="auth-screen">
      <Brand className="auth-brand" />
      <div className="auth-layout activation-layout">
        <div className="auth-copy">
          <p className="eyebrow">Activation required</p>
          <h1>Your Journaly OS access needs a token.</h1>
          <p>
            This account is past the 30-day grace period or its license has expired. Enter an activation token to
            continue, or message journalyos@gmail.com to avail access.
          </p>
        </div>

        <article className="auth-card">
          <div className="auth-card-header">
            <p className="eyebrow">Account locked</p>
            <h2>Activate access</h2>
          </div>
          <p className="auth-message" role="status">
            {message}
          </p>
          <label>
            <span>Email</span>
            <input value={email} disabled />
          </label>
          <label>
            <span>Activation token</span>
            <input value={token} autoComplete="off" placeholder="Paste your token" onChange={(event) => onTokenChange(event.target.value)} />
          </label>
          <button className="primary-action" type="button" onClick={onActivate}>
            Activate Journaly OS
          </button>
          <button className="text-action" type="button" onClick={onLogout}>
            Log out
          </button>
        </article>
      </div>
    </section>
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
      <img src={logoUrl} alt="" />
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

function TradeTimeClock({
  trades,
  backtests,
  period,
  source,
  onPeriodChange,
  onSourceChange,
}: {
  trades: Trade[];
  backtests: Backtest[];
  period: ClockPeriod;
  source: ClockSource;
  onPeriodChange: (period: ClockPeriod) => void;
  onSourceChange: (source: ClockSource) => void;
}) {
  const hours = Array.from({ length: 12 }, (_, index) => index);
  const periodStart = period === "AM" ? 0 : 12;
  const clockItems = source === "live" ? trades : backtests;
  const sourceLabel = source === "live" ? "Live trades" : "Backtests";
  const periodTrades = clockItems
    .filter((trade) => {
      const hour = Number(trade.time.slice(0, 2));
      return hour >= periodStart && hour < periodStart + 12;
    })
    .sort((a, b) => `${a.time}-${a.id}`.localeCompare(`${b.time}-${b.id}`));

  const hourlyStats = hours.map((hourIndex) => {
    const absoluteHour = periodStart + hourIndex;
    const hourTrades = periodTrades.filter((trade) => Number(trade.time.slice(0, 2)) === absoluteHour);
    const wins = hourTrades.filter((trade) => trade.pnl > 0).length;
    const losses = hourTrades.filter((trade) => trade.pnl < 0).length;

    return {
      label: formatClockHour(absoluteHour),
      wins,
      losses,
      totalR: hourTrades.reduce((sum, trade) => sum + trade.pnl, 0),
      trades: hourTrades.length,
    };
  });

  const bestHour = hourlyStats
    .filter((hour) => hour.trades > 0)
    .sort((a, b) => b.totalR - a.totalR)[0];
  const worstHour = hourlyStats
    .filter((hour) => hour.trades > 0)
    .sort((a, b) => a.totalR - b.totalR)[0];

  return (
    <section className="trade-clock-panel" aria-label="Trade time clock">
      <div className="trade-clock-copy">
        <div className="panel-header">
          <span>Trade timing</span>
          <strong>{sourceLabel} / {period}</strong>
        </div>
        <h3>Winning and losing hours</h3>
        <p>Each dot marks a trade by entry time. Green is win, red is loss, and neutral trades stay muted.</p>
        <div className="clock-toggle source-toggle" aria-label="Clock data source">
          {([
            ["live", "Live"],
            ["backtest", "Backtest"],
          ] as Array<[ClockSource, string]>).map(([value, label]) => (
            <button
              className={source === value ? "is-active" : ""}
              key={value}
              type="button"
              onClick={() => onSourceChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="clock-toggle" aria-label="Clock period">
          {(["AM", "PM"] as ClockPeriod[]).map((item) => (
            <button
              className={period === item ? "is-active" : ""}
              key={item}
              type="button"
              onClick={() => onPeriodChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="clock-insights">
          <Meta label="Best hour" value={bestHour ? `${bestHour.label} / ${formatNumber(bestHour.totalR)}R` : "-"} />
          <Meta label="Weak hour" value={worstHour ? `${worstHour.label} / ${formatNumber(worstHour.totalR)}R` : "-"} />
        </div>
      </div>

      <div className="trade-clock-wrap">
        <div className="trade-clock" aria-label={`${period} trade timing clock`}>
          {hours.map((hourIndex) => {
            const angle = hourIndex * 30;
            const label = hourIndex === 0 ? "12" : String(hourIndex);

            return (
              <span
                className="clock-hour"
                key={label}
                style={{ "--angle": `${angle}deg` } as React.CSSProperties}
              >
                {label}
              </span>
            );
          })}
          {periodTrades.map((trade, index) => {
            const [hour, minute = 0] = trade.time.split(":").map(Number);
            const hourInPeriod = hour - periodStart;
            const angle = hourInPeriod * 30 + minute * 0.5;
            const sameMinuteIndex = periodTrades
              .slice(0, index)
              .filter((item) => item.time === trade.time).length;
            const radius = 82 + (sameMinuteIndex % 4) * 10;

            return (
              <span
                className={`clock-trade-dot ${trade.pnl > 0 ? "is-win" : trade.pnl < 0 ? "is-loss" : "is-flat"}`}
                key={`${source}-${trade.id}`}
                style={
                  {
                    "--angle": `${angle}deg`,
                    "--radius": `${radius}px`,
                  } as React.CSSProperties
                }
                title={`${trade.time} / ${trade.pair} / ${formatNumber(trade.pnl)}R`}
                aria-label={`${trade.time} ${trade.pair} ${trade.result} ${formatNumber(trade.pnl)}R`}
              />
            );
          })}
          <div className="clock-center">
            <strong>{periodTrades.length}</strong>
            <span>trades</span>
          </div>
        </div>
      </div>

      <div className="hour-strip" aria-label={`${period} hourly trade results`}>
        {hourlyStats.map((hour) => (
          <div className="hour-cell" key={hour.label}>
            <strong>{hour.label}</strong>
            <span>
              <i className="dot-win" aria-hidden="true" />
              {hour.wins}
            </span>
            <span>
              <i className="dot-loss" aria-hidden="true" />
              {hour.losses}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatClockHour(hour: number) {
  const normalized = hour % 12 || 12;
  return `${normalized}:00`;
}

function SessionEdge({
  trades,
  backtests,
  source,
  onSourceChange,
}: {
  trades: Trade[];
  backtests: Backtest[];
  source: ClockSource;
  onSourceChange: (source: ClockSource) => void;
}) {
  const items = toJournalItems(source === "live" ? trades : [], source === "backtest" ? backtests : []);
  const summary = buildSessionEdgeSummary(items);
  const maxGroupR = Math.max(
    1,
    ...[...summary.bySession, ...summary.byPair, ...summary.bySetup, ...summary.byCombo].map((row) =>
      Math.abs(row.totalR),
    ),
  );

  return (
    <section className="session-edge-panel" aria-label="Session Edge analytics">
      <div className="session-edge-hero">
        <div>
          <div className="panel-header">
            <span>Session Edge</span>
            <strong>{source === "live" ? "Live trades" : "Backtests"}</strong>
          </div>
          <h3>Where your edge actually shows up</h3>
          <p>
            Compare sessions, pairs, setups, and pair/setup combinations so Dara can help you lean into strengths and
            avoid weak conditions.
          </p>
        </div>

        <div className="clock-toggle source-toggle" aria-label="Session Edge data source">
          {([
            ["live", "Live"],
            ["backtest", "Backtest"],
          ] as Array<[ClockSource, string]>).map(([value, label]) => (
            <button
              className={source === value ? "is-active" : ""}
              key={value}
              type="button"
              onClick={() => onSourceChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="edge-insight-grid">
        <EdgeInsight label="Best session" row={summary.bestSession} />
        <EdgeInsight label="Weakest session" row={summary.weakestSession} danger />
        <EdgeInsight label="Best pair" row={summary.bestPair} />
        <EdgeInsight label="Best setup" row={summary.bestSetup} />
        <EdgeInsight label="Best combo" row={summary.bestCombo} />
        <EdgeInsight label="Weakest combo" row={summary.weakestCombo} danger />
      </div>

      <article className="session-time-guide">
        <div className="panel-header">
          <span>Time indication</span>
          <strong>Local session map</strong>
        </div>
        <div className="session-window-grid">
          {edgeSessionWindows.map((window) => (
            <div className="session-window" key={window.time}>
              <strong>{window.time}</strong>
              <span>{window.session}</span>
            </div>
          ))}
        </div>
      </article>

      <div className="session-card-grid">
        {edgeSessions.map((session) => {
          const row = summary.bySession.find((item) => item.label === session.name) || summarizeEdgeItems(session.name, []);

          return (
            <article className="session-edge-card" key={session.name}>
              <div className="session-card-header">
                <div>
                  <span>{session.name}</span>
                  <strong className={row.totalR >= 0 ? "positive-r" : "negative-r"}>{formatNumber(row.totalR)}R</strong>
                  <small>{formatSessionRange(session)}</small>
                </div>
                <EdgeSparkline values={row.trend} />
              </div>
              <div className="session-card-metrics">
                <Meta label="Trades" value={String(row.trades)} />
                <Meta label="Win rate" value={`${row.winRate}%`} />
                <Meta label="Expectancy" value={`${formatNumber(row.expectancy)}R`} />
              </div>
            </article>
          );
        })}
      </div>

      <div className="edge-grid">
        <EdgeRankPanel title="Pair edge" rows={summary.byPair} maxAbs={maxGroupR} />
        <EdgeRankPanel title="Setup edge" rows={summary.bySetup} maxAbs={maxGroupR} />
        <EdgeRankPanel title="Pair + setup combinations" rows={summary.byCombo} maxAbs={maxGroupR} wide />
        <EdgeSessionMatrix rows={summary.bySessionPair} />
      </div>
    </section>
  );
}

function EdgeInsight({
  label,
  row,
  danger,
}: {
  label: string;
  row?: ReturnType<typeof summarizeEdgeItems>;
  danger?: boolean;
}) {
  return (
    <article className={`edge-insight ${danger ? "is-danger" : ""}`}>
      <span>{label}</span>
      <strong>{row ? row.label : "-"}</strong>
      <small>
        {row ? `${formatNumber(row.totalR)}R / ${row.winRate}% WR / ${row.trades} trades` : "No data yet"}
      </small>
    </article>
  );
}

function EdgeRankPanel({
  title,
  rows,
  maxAbs,
  wide,
}: {
  title: string;
  rows: ReturnType<typeof summarizeEdgeItems>[];
  maxAbs: number;
  wide?: boolean;
}) {
  return (
    <article className={`edge-rank-panel ${wide ? "is-wide" : ""}`}>
      <div className="panel-header">
        <span>{title}</span>
        <strong>{rows.length} groups</strong>
      </div>
      {rows.length === 0 ? (
        <p className="recent-empty">No edge data yet.</p>
      ) : (
        <div className="edge-rank-list">
          {rows.slice(0, wide ? 8 : 6).map((row) => (
            <div className="edge-rank-row" key={row.label}>
              <div>
                <strong>{row.label}</strong>
                <span>
                  {row.trades} trades / {row.winRate}% WR / {formatNumber(row.expectancy)}R exp.
                </span>
              </div>
              <div className="edge-bar-track" aria-hidden="true">
                <span
                  className={row.totalR >= 0 ? "is-positive" : "is-negative"}
                  style={{ width: `${Math.max(8, (Math.abs(row.totalR) / maxAbs) * 100)}%` }}
                />
              </div>
              <strong className={row.totalR >= 0 ? "positive-r" : "negative-r"}>{formatNumber(row.totalR)}R</strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function EdgeSessionMatrix({ rows }: { rows: ReturnType<typeof summarizeEdgeItems>[] }) {
  const pairs = Array.from(new Set(rows.map((row) => row.label.split(" / ")[1]).filter(Boolean))).sort();
  const maxAbs = Math.max(1, ...rows.map((row) => Math.abs(row.totalR)));

  return (
    <article className="edge-rank-panel is-wide">
      <div className="panel-header">
        <span>Session x pair heatmap</span>
        <strong>{rows.length} intersections</strong>
      </div>
      {pairs.length === 0 ? (
        <p className="recent-empty">No session-pair data yet.</p>
      ) : (
        <div className="edge-matrix" style={{ gridTemplateColumns: `130px repeat(${pairs.length}, minmax(90px, 1fr))` }}>
          <span />
          {pairs.map((pair) => (
            <strong key={pair}>{pair}</strong>
          ))}
          {edgeSessions.map((session) => (
            <Fragment key={session.name}>
              <strong>{session.name}</strong>
              {pairs.map((pair) => {
                const row = rows.find((item) => item.label === `${session.name} / ${pair}`);
                const heat = row ? Math.abs(row.totalR) / maxAbs : 0;

                return (
                  <div
                    className={`edge-matrix-cell ${row && row.totalR < 0 ? "is-negative" : "is-positive"}`}
                    key={`${session.name}-${pair}`}
                    style={{ "--heat": heat } as React.CSSProperties}
                  >
                    <strong>{row ? `${formatNumber(row.totalR)}R` : "-"}</strong>
                    <span>{row ? `${row.winRate}% / ${row.trades}` : "0 trades"}</span>
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      )}
    </article>
  );
}

function EdgeSparkline({ values }: { values: number[] }) {
  const width = 118;
  const height = 42;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const points =
    values.length === 0
      ? ""
      : values
          .map((value, index) => {
            const x = values.length === 1 ? width - 6 : 6 + (index / (values.length - 1)) * (width - 12);
            const y = height - 6 - ((value - min) / range) * (height - 12);
            return `${x},${y}`;
          })
          .join(" ");

  return (
    <svg className="edge-sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <line x1="6" x2={width - 6} y1={height - 6 - ((0 - min) / range) * (height - 12)} y2={height - 6 - ((0 - min) / range) * (height - 12)} />
      {points ? <polyline points={points} /> : null}
    </svg>
  );
}

function EquityCurve({ points }: { points: Array<{ label: string; value: number }> }) {
  const chartId = useId().replace(/:/g, "");
  const lineGradientId = `equityLineGradient-${chartId}`;
  const areaGradientId = `equityAreaGradient-${chartId}`;
  const width = 900;
  const height = 360;
  const padding = 46;
  const chartPoints = points.length > 0 ? [{ label: "Start", value: 0 }, ...points] : [];
  const values = chartPoints.length > 0 ? chartPoints.map((point) => point.value) : [0];
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const xStep = chartPoints.length <= 1 ? 0 : (width - padding * 2) / (chartPoints.length - 1);
  const toY = (value: number) => height - padding - ((value - min) / range) * (height - padding * 2);
  const finalValue = values[values.length - 1] || 0;
  const high = max;
  const low = min;
  const highIndex = chartPoints.findIndex((point) => point.value === high);
  const lowIndex = chartPoints.findIndex((point) => point.value === low);
  let runningPeak = 0;
  let largestDrawdown = 0;
  let drawdownStartIndex = 0;
  let drawdownEndIndex = 0;
  let peakIndex = 0;

  chartPoints.forEach((point, index) => {
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
    chartPoints.length === 0
      ? ""
      : chartPoints
          .map((point, index) => {
            const x = padding + xStep * index;
            const y = toY(point.value);
            return `${index === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ");
  const zeroY = toY(0);
  const areaPath = chartPoints.length
    ? `${path} L ${padding + xStep * (chartPoints.length - 1)} ${zeroY} L ${padding} ${zeroY} Z`
    : "";
  const gridValues = Array.from({ length: 5 }, (_, index) => max - (range / 4) * index);
  const drawdownX = padding + xStep * drawdownStartIndex;
  const drawdownWidth = Math.max(0, xStep * (drawdownEndIndex - drawdownStartIndex));
  const finalX = padding + xStep * Math.max(0, chartPoints.length - 1);
  const highX = padding + xStep * Math.max(0, highIndex);
  const lowX = padding + xStep * Math.max(0, lowIndex);
  const slope = points.length <= 1 ? 0 : finalValue / points.length;

  return (
    <section className="equity-card" aria-label="Equity curve">
      <div className="equity-hero">
        <div>
          <p className="eyebrow">Cumulative R</p>
          <h3>Equity curve</h3>
        </div>
        <strong className={finalValue >= 0 ? "positive-r" : "negative-r"}>{formatNumber(finalValue)}R</strong>
      </div>

      {points.length === 0 ? (
        <p className="recent-empty">No trades available for equity curve.</p>
      ) : (
        <>
          <div className="equity-metrics">
            <span>High {formatNumber(high)}R</span>
            <span>Low {formatNumber(low)}R</span>
            <span>Max DD {formatNumber(largestDrawdown)}R</span>
            <span>Avg slope {formatNumber(slope)}R/trade</span>
            <span>{points.length} trades</span>
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Cumulative R equity curve">
            <defs>
              <linearGradient id={lineGradientId} x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="55%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#5eead4" />
              </linearGradient>
              <linearGradient id={areaGradientId} x1="0%" x2="0%" y1="0%" y2="100%">
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
            <path className="equity-area" d={areaPath} fill={`url(#${areaGradientId})`} />
            <path className="equity-line" d={path} stroke={`url(#${lineGradientId})`} />
            {chartPoints.map((point, index) => {
              const isEndpoint = index === 0 || index === chartPoints.length - 1;
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
            <text className="equity-x-label" x={padding} y={height - 10}>
              Start
            </text>
            <text className="equity-x-label" x={finalX} y={height - 10} textAnchor="end">
              Latest
            </text>
            <text className="equity-callout" x={Math.min(width - 150, highX + 10)} y={Math.max(20, toY(high) - 10)}>
              High {formatNumber(high)}R
            </text>
            <text className="equity-callout" x={Math.min(width - 150, lowX + 10)} y={Math.min(height - 30, toY(low) + 22)}>
              Low {formatNumber(low)}R
            </text>
          </svg>
        </>
      )}
    </section>
  );
}

function TradeImageGallery({
  items,
  stats,
  pairFilter,
  setupFilter,
  resultFilter,
  directionFilter,
  onPairFilterChange,
  onSetupFilterChange,
  onResultFilterChange,
  onDirectionFilterChange,
  onReset,
  onOpenImage,
}: {
  items: ImageViewerItem[];
  stats: { totalImages: number; visibleImages: number; setupsCovered: number; pairsCovered: number; filteredR: number };
  pairFilter: string;
  setupFilter: string;
  resultFilter: "All" | Result;
  directionFilter: "All" | Direction;
  onPairFilterChange: (value: string) => void;
  onSetupFilterChange: (value: string) => void;
  onResultFilterChange: (value: string) => void;
  onDirectionFilterChange: (value: string) => void;
  onReset: () => void;
  onOpenImage: (index: number) => void;
}) {
  return (
    <section className="image-gallery-panel">
      <div className="gallery-toolbar">
        <SelectField label="Pair" value={pairFilter} options={["All", ...pairs]} onChange={onPairFilterChange} />
        <SelectField label="Setup" value={setupFilter} options={["All", ...setups]} onChange={onSetupFilterChange} />
        <SelectField
          label="Result"
          value={resultFilter}
          options={["All", ...results]}
          onChange={onResultFilterChange}
        />
        <SelectField
          label="Direction"
          value={directionFilter}
          options={["All", "Long", "Short"]}
          onChange={onDirectionFilterChange}
        />
        <button className="ghost-action gallery-reset" type="button" onClick={onReset}>
          <RefreshCcw size={18} />
          Reset
        </button>
      </div>

      <div className="gallery-stats">
        <Stat label="Visible images" value={`${stats.visibleImages} / ${stats.totalImages}`} />
        <Stat label="Filtered R" value={`${formatNumber(stats.filteredR)}R`} />
        <Stat label="Setups covered" value={String(stats.setupsCovered)} />
        <Stat label="Pairs covered" value={String(stats.pairsCovered)} />
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <strong>No screenshots match these filters</strong>
          <p>Add trade screenshots or loosen the filters to review your setup images.</p>
        </div>
      ) : (
        <div className="image-gallery-grid" aria-live="polite">
          {items.map((item, index) => (
            <button className="gallery-card" key={item.id} type="button" onClick={() => onOpenImage(index)}>
              <img src={item.src} alt={item.alt} />
              <span>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function TradeCalendar({
  days,
  month,
  monthOptions,
  quality,
  onMonthChange,
  onViewImage,
}: {
  days: Array<null | { date: string; day: number; trades: Trade[]; totalR: number }>;
  month: string;
  monthOptions: string[];
  quality: TradeQualityAnalytics;
  onMonthChange: (month: string) => void;
  onViewImage: (trade: Trade) => void;
}) {
  return (
    <section className="calendar-panel">
      <div className="calendar-header">
        <div>
          <p className="eyebrow">Daily performance</p>
          <div className="calendar-title-row">
            <button
              className="icon-button square"
              type="button"
              aria-label="Previous month"
              title="Previous month"
              onClick={() => onMonthChange(shiftMonth(month, -1))}
            >
              <ChevronLeft size={18} />
            </button>
            <h3>
              {formatMonthLabel(month)}
              {isCurrentMonth(month) ? <span className="current-month-badge">Current month</span> : null}
            </h3>
            <button
              className="icon-button square"
              type="button"
              aria-label="Next month"
              title="Next month"
              onClick={() => onMonthChange(shiftMonth(month, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <MonthlyQualityRing data={quality} month={month} />
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

function MonthlyQualityRing({ data, month }: { data: TradeQualityAnalytics; month: string }) {
  const total = data.reviewed;
  const segments = data.rows.map((row) => ({
    label: row.label as TradeQuality,
    count: row.trades,
    percentage: total ? Math.round((row.trades / total) * 100) : 0,
  }));
  let offset = 0;

  return (
    <section className="monthly-quality-ring" aria-label={`${formatMonthLabel(month)} trade quality distribution`} key={month}>
      <div className="monthly-quality-chart">
        <svg viewBox="0 0 42 42" role="img" aria-label={`${data.coverage}% of trades reviewed`}>
          <circle className="monthly-quality-track" cx="21" cy="21" r="15.9155" pathLength="100" />
          {segments.map((segment) => {
            const dashOffset = -offset;
            offset += segment.percentage;
            return segment.percentage > 0 ? (
              <circle
                className={`monthly-quality-segment is-${segment.label.toLowerCase()}`}
                cx="21"
                cy="21"
                r="15.9155"
                pathLength="100"
                strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`}
                strokeDashoffset={dashOffset}
                key={segment.label}
              />
            ) : null;
          })}
        </svg>
        <div className="monthly-quality-center">
          <strong>{data.coverage}%</strong>
          <span>reviewed</span>
        </div>
      </div>
      <div className="monthly-quality-copy">
        <span>Monthly quality</span>
        <div className="monthly-quality-legend">
          {segments.map((segment) => (
            <div className={`is-${segment.label.toLowerCase()}`} key={segment.label}>
              <i aria-hidden="true" />
              <span>{segment.label}</span>
              <strong>{segment.percentage}%</strong>
              <small>{segment.count}</small>
            </div>
          ))}
        </div>
        {data.unrated > 0 ? <small>{data.unrated} unrated trade{data.unrated === 1 ? "" : "s"}</small> : null}
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

function WeekEdge({
  data,
  month,
  monthOptions,
  onMonthChange,
}: {
  data: {
    days: WeekEdgeDay[];
    label: string;
    successfulDays: number;
    bestDay?: WeekEdgeDay;
    mostActiveDay?: WeekEdgeDay;
  };
  month: string;
  monthOptions: string[];
  onMonthChange: (month: string) => void;
}) {
  const maxTrades = Math.max(1, ...data.days.map((day) => day.trades));
  const maxAbsR = Math.max(1, ...data.days.map((day) => Math.abs(day.totalR)));

  return (
    <section className="week-edge-panel">
      <div className="week-edge-header">
        <div>
          <p className="eyebrow">Week Edge</p>
          <h3>{data.label}</h3>
        </div>
        <label>
          <span>Month</span>
          <select value={month} onChange={(event) => onMonthChange(event.target.value)}>
            {monthOptions.map((option) => (
              <option key={option} value={option}>
                {option === "All" ? "All live trades" : formatMonthWithCurrent(option)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="week-edge-summary" aria-label="Week Edge summary">
        <span>{data.successfulDays}/5 green weekdays</span>
        <span>Best: {data.bestDay ? `${data.bestDay.label} ${formatNumber(data.bestDay.totalR)}R` : "-"}</span>
        <span>Most trades: {data.mostActiveDay ? `${data.mostActiveDay.label} (${data.mostActiveDay.trades})` : "-"}</span>
      </div>

      <div className="week-edge-grid">
        {data.days.map((day) => {
          const tradeWidth = `${Math.max(day.trades > 0 ? 8 : 0, (day.trades / maxTrades) * 100)}%`;
          const rWidth = `${Math.max(day.trades > 0 ? 8 : 0, (Math.abs(day.totalR) / maxAbsR) * 100)}%`;
          const outcomeLabel = day.trades === 0 ? "No trades" : day.totalR > 0 ? "Green day" : day.totalR < 0 ? "Red day" : "Flat day";
          const visibleTimes = day.tradeTimes.slice(0, 8);
          const hiddenTimes = Math.max(0, day.tradeTimes.length - visibleTimes.length);

          return (
            <article
              className={`week-edge-day ${day.totalR > 0 ? "is-positive" : day.totalR < 0 ? "is-negative" : ""}`}
              key={day.label}
            >
              <div className="week-edge-day-top">
                <div>
                  <strong>{day.label}</strong>
                  <span>{outcomeLabel}</span>
                </div>
                <strong className={day.totalR >= 0 ? "positive-r" : "negative-r"}>{formatNumber(day.totalR)}R</strong>
              </div>

              <div className="week-edge-score">
                <span>{day.trades}</span>
                <small>trades</small>
              </div>

              <div className="week-edge-bars">
                <div>
                  <span>Volume</span>
                  <div className="performance-bar-track">
                    <span className="performance-bar is-neutral" style={{ width: tradeWidth }} />
                  </div>
                </div>
                <div>
                  <span>Edge strength</span>
                  <div className="performance-bar-track">
                    <span className={`performance-bar ${day.totalR >= 0 ? "is-positive" : "is-negative"}`} style={{ width: rWidth }} />
                  </div>
                </div>
              </div>

              <div className="week-edge-meta">
                <span>{day.winRate}% WR</span>
                <span>
                  {day.wins}W {day.losses}L {day.breakevens}BE
                </span>
                <span>{formatNumber(day.averageR)} avg R</span>
              </div>

              <div className="week-edge-times">
                <span>Times taken</span>
                <div>
                  {visibleTimes.length === 0 ? (
                    <small>No entries</small>
                  ) : (
                    visibleTimes.map((item) => (
                      <small
                        className={item.totalR > 0 ? "is-positive" : item.totalR < 0 ? "is-negative" : ""}
                        key={item.time}
                        title={`${formatTime12(item.time)} / ${item.count} trade${item.count === 1 ? "" : "s"} / ${formatNumber(item.totalR)}R`}
                      >
                        {formatTime12(item.time)}
                        {item.count > 1 ? ` x${item.count}` : ""}
                      </small>
                    ))
                  )}
                  {hiddenTimes > 0 ? <small>+{hiddenTimes} more</small> : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PerformanceBreakdown({
  data,
  qualityData,
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
  qualityData: TradeQualityAnalytics;
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
        <PerformanceTable title="Execution quality" rows={qualityData.rows} />
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

function TradeAnalysisPanel({
  ownerId,
  pair,
  trades,
  setup,
  setupVariables,
  screenshotFile,
  workingFile,
  existingScreenshot,
  startedAt,
  checkedVariables,
  zonePins,
  zones,
  decision,
  onSetupChange,
  onVariablesChange,
  onChecksChange,
  onZonePinsChange,
  onZonesChange,
  onDecisionChange,
  onImageUpload,
  onWorkingImageChange,
  onAnnotatedImageChange,
}: {
  ownerId: string;
  pair: string;
  trades: Trade[];
  setup: string;
  setupVariables: SetupVariables;
  screenshotFile: File | null;
  workingFile: File | null;
  existingScreenshot: string;
  startedAt: number | null;
  checkedVariables: string[];
  zonePins: Record<string, number[]>;
  zones: AnalysisZone[];
  decision: AnalysisDecision;
  onSetupChange: (setup: string) => void;
  onVariablesChange: (variables: string[]) => void;
  onChecksChange: (variables: string[]) => void;
  onZonePinsChange: (pins: Record<string, number[]>) => void;
  onZonesChange: (zones: AnalysisZone[]) => void;
  onDecisionChange: (decision: AnalysisDecision) => void;
  onImageUpload: (file: File) => void;
  onWorkingImageChange: (file: File) => void;
  onAnnotatedImageChange: (file: File) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasStageRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const baseImageRef = useRef("");
  const zoneStartRef = useRef<{ x: number; y: number } | null>(null);
  const zoneEndRef = useRef<{ x: number; y: number } | null>(null);
  const zonePointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const zoneSnapshotRef = useRef<ImageData | null>(null);
  const zoneVariableRef = useRef("");
  const nextPinNumberRef = useRef(1);
  const labelDragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const draggedZonesRef = useRef<AnalysisZone[] | null>(null);
  const previousStartedAtRef = useRef<number | null>(null);
  const [tool, setTool] = useState<"draw" | "text" | "zone-square" | "zone-draw">("draw");
  const [color, setColor] = useState("#ef4444");
  const [lineWidth, setLineWidth] = useState(4);
  const [annotationText, setAnnotationText] = useState("");
  const [selectedZoneVariable, setSelectedZoneVariable] = useState("");
  const [history, setHistory] = useState<Array<{
    image: string;
    zonePins: Record<string, number[]>;
    zones: AnalysisZone[];
  }>>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 16, height: 9 });
  const [newVariable, setNewVariable] = useState("");
  const [now, setNow] = useState(Date.now());
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [savedDrawings, setSavedDrawings] = useState<SavedAnalysisDrawing[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedDrawingId, setSelectedDrawingId] = useState("");
  const [linkedTradeId, setLinkedTradeId] = useState("");
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);
  const [historyMessage, setHistoryMessage] = useState("");
  const variables = setupVariables[setup] || [];
  const activeZoneVariable = variables.includes(selectedZoneVariable) ? selectedZoneVariable : variables[0] || "";
  const activeZoneColor = variableColor(variables.indexOf(activeZoneVariable));
  const hasImage = Boolean(screenshotFile || existingScreenshot);
  const elapsedSeconds = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const remainingSeconds = Math.max(0, 240 - elapsedSeconds);
  const timerProgress = startedAt ? Math.min(1, elapsedSeconds / 240) : 0;
  const allPresent = variables.length > 0 && variables.every((variable) => checkedVariables.includes(variable));
  const qualityScore = variables.length ? Math.round((checkedVariables.length / variables.length) * 100) : 0;
  const selectedDrawing = savedDrawings.find((drawing) => drawing.id === selectedDrawingId) || null;

  useEffect(() => {
    nextPinNumberRef.current = Math.max(0, ...Object.values(zonePins).flat()) + 1;
  }, [zonePins]);

  useEffect(() => {
    if (startedAt && startedAt !== previousStartedAtRef.current) setIsFocusMode(true);
    previousStartedAtRef.current = startedAt;
  }, [startedAt]);

  useEffect(() => {
    if (!isFocusMode) return;

    function exitFocusMode(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (isHistoryOpen) {
        setIsHistoryOpen(false);
        return;
      }
      setIsFocusMode(false);
    }

    document.body.classList.add("analysis-focus-open");
    window.addEventListener("keydown", exitFocusMode);

    return () => {
      document.body.classList.remove("analysis-focus-open");
      window.removeEventListener("keydown", exitFocusMode);
    };
  }, [isFocusMode, isHistoryOpen]);

  useEffect(() => {
    if (!startedAt || remainingSeconds === 0) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [remainingSeconds, startedAt]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const sourceFile = workingFile || screenshotFile;
    const source = sourceFile ? URL.createObjectURL(sourceFile) : existingScreenshot;
    if (!canvas || !source) return;

    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      setCanvasSize({ width: canvas.width, height: canvas.height });
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      baseImageRef.current = canvas.toDataURL("image/webp", 0.9);
      setHistory([]);
      if (sourceFile) URL.revokeObjectURL(source);
    };
    image.src = source;

    return () => {
      image.onload = null;
      if (sourceFile) URL.revokeObjectURL(source);
    };
    // startedAt identifies a new upload; screenshotFile also changes when annotations are committed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, existingScreenshot]);

  function pointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function pushHistory() {
    const canvas = canvasRef.current;
    if (canvas) {
      const pinSnapshot = Object.fromEntries(Object.entries(zonePins).map(([variable, pins]) => [variable, [...pins]]));
      setHistory((current) => [
        ...current.slice(-9),
        { image: canvas.toDataURL("image/webp", 0.9), zonePins: pinSnapshot, zones: zones.map(cloneAnalysisZone) },
      ]);
    }
  }

  function commitCanvas(nextZones: AnalysisZone[] = zones, updateWorkingImage = true) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (updateWorkingImage) {
      canvas.toBlob((blob) => {
        if (blob) onWorkingImageChange(new File([blob], "trade-analysis-working.webp", { type: "image/webp" }));
      }, "image/webp", 0.9);
    }

    const composite = document.createElement("canvas");
    composite.width = canvas.width;
    composite.height = canvas.height;
    const context = composite.getContext("2d");
    if (!context) return;
    context.drawImage(canvas, 0, 0);
    nextZones.forEach((zone) => drawZoneLabel(context, zone, composite.width, composite.height));
    composite.toBlob((blob) => {
      if (blob) onAnnotatedImageChange(new File([blob], "trade-analysis.webp", { type: "image/webp" }));
    }, "image/webp", 0.9);
  }

  function startAnnotation(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const point = pointFromEvent(event);

    if (tool === "text") {
      const text = annotationText.trim();
      if (!text) return;
      pushHistory();
      context.fillStyle = color;
      context.font = `700 ${Math.max(22, lineWidth * 7)}px Inter, sans-serif`;
      context.strokeStyle = "rgba(0, 0, 0, 0.7)";
      context.lineWidth = Math.max(2, lineWidth / 2);
      context.strokeText(text, point.x, point.y);
      context.fillText(text, point.x, point.y);
      setAnnotationText("");
      commitCanvas();
      return;
    }

    if (tool === "zone-square" || tool === "zone-draw") {
      if (!activeZoneVariable) return;
      pushHistory();
      drawingRef.current = true;
      zoneStartRef.current = point;
      zoneEndRef.current = point;
      zonePointsRef.current = [point];
      zoneVariableRef.current = activeZoneVariable;
      zoneSnapshotRef.current = context.getImageData(0, 0, canvas.width, canvas.height);
      canvas.setPointerCapture(event.pointerId);
      return;
    }

    pushHistory();
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function drawAnnotation(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const point = pointFromEvent(event);

    if (tool === "zone-square" || tool === "zone-draw") {
      const start = zoneStartRef.current;
      const snapshot = zoneSnapshotRef.current;
      if (!start || !snapshot) return;
      zoneEndRef.current = point;
      context.putImageData(snapshot, 0, 0);
      if (tool === "zone-square") {
        drawSquareZone(context, start, point, nextPinNumberRef.current, activeZoneColor);
      } else {
        const points = zonePointsRef.current;
        const previous = points.at(-1);
        if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= 4) points.push(point);
        drawFreeformZone(context, points, nextPinNumberRef.current, activeZoneColor);
      }
      return;
    }

    if (tool !== "draw") return;
    context.lineTo(point.x, point.y);
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
  }

  function finishAnnotation() {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    if (tool === "zone-square" || tool === "zone-draw") {
      const context = canvasRef.current?.getContext("2d");
      const canvas = canvasRef.current;
      const start = zoneStartRef.current;
      const end = zoneEndRef.current;
      const snapshot = zoneSnapshotRef.current;
      const variable = zoneVariableRef.current;
      const drawnPoints = zonePointsRef.current;
      if (!context || !canvas || !start || !end || !snapshot || !variable) return;

      context.putImageData(snapshot, 0, 0);
      zoneStartRef.current = null;
      zoneEndRef.current = null;
      zoneSnapshotRef.current = null;
      zonePointsRef.current = [];

      const squareIsTooSmall = tool === "zone-square" && (Math.abs(end.x - start.x) < 8 || Math.abs(end.y - start.y) < 8);
      const drawingIsTooSmall = tool === "zone-draw" && drawnPoints.length < 3;
      if (squareIsTooSmall || drawingIsTooSmall) {
        setHistory((current) => current.slice(0, -1));
        return;
      }

      const pinNumber = nextPinNumberRef.current;
      const zoneColor = variableColor(variables.indexOf(variable));
      const rawPoints = tool === "zone-square" ? [start, end] : drawnPoints;
      if (tool === "zone-square") drawSquareZone(context, start, end, pinNumber, zoneColor);
      else drawFreeformZone(context, drawnPoints, pinNumber, zoneColor);

      const anchorInPixels = zoneAnchor(tool === "zone-square" ? "square" : "draw", rawPoints);
      const anchor = normalizeAnalysisPoint(anchorInPixels, canvas.width, canvas.height);
      const label = {
        x: clampNumber(anchor.x + (anchor.x > 0.7 ? -0.22 : 0.05), 0.02, 0.78),
        y: clampNumber(anchor.y + (anchor.y > 0.75 ? -0.1 : 0.05), 0.02, 0.9),
      };
      const nextZone: AnalysisZone = {
        id: crypto.randomUUID(),
        pin: pinNumber,
        variable,
        color: zoneColor,
        kind: tool === "zone-square" ? "square" : "draw",
        points: rawPoints.map((point) => normalizeAnalysisPoint(point, canvas.width, canvas.height)),
        anchor,
        label,
      };
      const nextZones = [...zones, nextZone];
      nextPinNumberRef.current += 1;
      onZonePinsChange({ ...zonePins, [variable]: [...(zonePins[variable] || []), pinNumber] });
      onZonesChange(nextZones);
      if (!checkedVariables.includes(variable)) onChecksChange([...checkedVariables, variable]);
      commitCanvas(nextZones);
      return;
    }

    commitCanvas();
  }

  function restoreCanvas(source: string, nextZones: AnalysisZone[] = zones) {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;
    const image = new Image();
    image.onload = () => {
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      commitCanvas(nextZones);
    };
    image.src = source;
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((current) => current.slice(0, -1));
    onZonePinsChange(previous.zonePins);
    onZonesChange(previous.zones);
    nextPinNumberRef.current = Math.max(0, ...Object.values(previous.zonePins).flat()) + 1;
    restoreCanvas(previous.image, previous.zones);
  }

  function exportCurrentDrawing() {
    const source = screenshotFile ? URL.createObjectURL(screenshotFile) : existingScreenshot;
    if (!source) return;
    const link = document.createElement("a");
    link.href = source;
    link.download = `journaly-analysis-${pair}-${new Date().toISOString().slice(0, 10)}.webp`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (screenshotFile) window.setTimeout(() => URL.revokeObjectURL(source), 1000);
  }

  async function openDrawingHistory() {
    setHistoryMessage("");
    setIsHistoryOpen(true);
    try {
      setSavedDrawings(await readAnalysisHistory(ownerId));
    } catch (error) {
      setHistoryMessage(error instanceof Error ? error.message : "Could not load analysis history.");
    }
  }

  async function saveCurrentDrawing() {
    if (!screenshotFile && !existingScreenshot) return;
    setIsSavingAnalysis(true);
    setHistoryMessage("");
    try {
      const image = screenshotFile ? await fileToDataUrl(screenshotFile) : existingScreenshot;
      const drawing: SavedAnalysisDrawing = {
        id: crypto.randomUUID(),
        ownerId,
        savedAt: new Date().toISOString(),
        pair,
        setup,
        image,
        tradeId: "",
      };
      await writeAnalysisDrawing(drawing);
      setSavedDrawings((current) => [drawing, ...current]);
      setHistoryMessage("Drawing saved to analysis history.");
    } catch (error) {
      setHistoryMessage(error instanceof Error ? error.message : "Could not save this drawing.");
    } finally {
      setIsSavingAnalysis(false);
    }
  }

  async function linkSelectedDrawing() {
    if (!selectedDrawing || !linkedTradeId) return;
    const nextDrawing = { ...selectedDrawing, tradeId: linkedTradeId };
    try {
      await writeAnalysisDrawing(nextDrawing);
      setSavedDrawings((current) => current.map((drawing) => drawing.id === nextDrawing.id ? nextDrawing : drawing));
      setHistoryMessage("Drawing linked to the selected trade.");
    } catch (error) {
      setHistoryMessage(error instanceof Error ? error.message : "Could not link this drawing.");
    }
  }

  function addVariable() {
    const value = newVariable.trim();
    if (!value || variables.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    onVariablesChange([...variables, value]);
    setNewVariable("");
  }

  function startZoneLabelDrag(event: ReactPointerEvent<HTMLButtonElement>, zone: AnalysisZone) {
    const stage = canvasStageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    labelDragRef.current = {
      id: zone.id,
      offsetX: (event.clientX - rect.left) / rect.width - zone.label.x,
      offsetY: (event.clientY - rect.top) / rect.height - zone.label.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveZoneLabel(event: ReactPointerEvent<HTMLButtonElement>) {
    const stage = canvasStageRef.current;
    const drag = labelDragRef.current;
    if (!stage || !drag) return;
    const rect = stage.getBoundingClientRect();
    const label = {
      x: clampNumber((event.clientX - rect.left) / rect.width - drag.offsetX, 0.01, 0.79),
      y: clampNumber((event.clientY - rect.top) / rect.height - drag.offsetY, 0.01, 0.92),
    };
    const nextZones = zones.map((zone) => zone.id === drag.id ? { ...zone, label } : zone);
    draggedZonesRef.current = nextZones;
    onZonesChange(nextZones);
  }

  function finishZoneLabelDrag() {
    const nextZones = draggedZonesRef.current;
    labelDragRef.current = null;
    draggedZonesRef.current = null;
    if (nextZones) commitCanvas(nextZones, false);
  }

  return (
    <section
      className={`trade-analysis-panel ${isFocusMode ? "is-focus-mode" : ""}`}
      role={isFocusMode ? "dialog" : undefined}
      aria-modal={isFocusMode ? "true" : undefined}
      aria-label={isFocusMode ? "Fullscreen trade analysis" : undefined}
    >
      {decision === "take" ? (
        <div className="locked-in-banner" role="status" aria-live="assertive">
          <span className="flame flame-one" aria-hidden="true">🔥</span>
          <span className="flame flame-two" aria-hidden="true">🔥</span>
          <span className="flame flame-three" aria-hidden="true">🔥</span>
          <strong>LOCKED IN</strong>
          <b>PULL THE FUCKING TRIGGER</b>
          <span className="flame flame-four" aria-hidden="true">🔥</span>
          <span className="flame flame-five" aria-hidden="true">🔥</span>
        </div>
      ) : null}
      <header className="analysis-header">
        <div>
          <p className="eyebrow">Pre-trade focus</p>
          <h3>Read the chart before you risk</h3>
          <p>Your four-minute analysis starts only after a chart is uploaded.</p>
        </div>
        <div className="analysis-header-actions">
          {hasImage && !isFocusMode ? (
            <button className="focus-mode-button" type="button" onClick={() => setIsFocusMode(true)}>
              <Maximize2 size={16} /> Focus chart
            </button>
          ) : null}
          {isFocusMode ? <span className="escape-hint"><kbd>ESC</kbd> Exit fullscreen</span> : null}
          {startedAt && remainingSeconds === 0 ? (
            <div className={`analysis-decision ${decision ? `is-${decision}` : ""}`} role="group" aria-label="Trade decision">
              <div className="analysis-decision-copy" aria-live="polite">
                <span>Analysis complete</span>
                <strong>{decision === "take" ? "Trade approved" : decision === "skip" ? "No trade" : "Take the trade?"}</strong>
              </div>
              <div className="analysis-decision-actions">
                <button
                  className="decision-take"
                  type="button"
                  aria-pressed={decision === "take"}
                  aria-label="Take the trade"
                  onClick={() => onDecisionChange("take")}
                >
                  <CheckCircle2 size={20} />
                  <span>Take</span>
                </button>
                <button
                  className="decision-skip"
                  type="button"
                  aria-pressed={decision === "skip"}
                  aria-label="Do not take the trade"
                  onClick={() => onDecisionChange("skip")}
                >
                  <X size={21} />
                  <span>No trade</span>
                </button>
              </div>
            </div>
          ) : (
            <div className={`analysis-timer ${startedAt ? "is-running" : ""}`} aria-live="polite">
              <div
                className="timer-ring"
                style={{ background: `conic-gradient(var(--brand) ${timerProgress * 360}deg, var(--line) 0deg)` }}
              >
                <Clock3 size={18} />
              </div>
              <div>
                <span>{startedAt ? "Time remaining" : "Timer waiting"}</span>
                <strong>{String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")}</strong>
              </div>
            </div>
          )}
        </div>
      </header>

      {!hasImage ? (
        <label className="analysis-upload">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImageUpload(file);
            }}
          />
          <span className="analysis-upload-icon"><ImagePlus size={28} /></span>
          <strong>Upload your full chart screenshot</strong>
          <span>PNG, JPG or WebP · the timer begins immediately</span>
        </label>
      ) : (
        <div className="analysis-workspace">
          <div className="chart-editor">
            <div className="annotation-toolbar" aria-label="Chart annotation tools">
              <button className={tool === "draw" ? "is-active" : ""} type="button" onClick={() => setTool("draw")}>
                <Pencil size={16} /> Draw
              </button>
              <button
                className={tool === "zone-square" ? "is-active" : ""}
                type="button"
                disabled={!variables.length}
                onClick={() => setTool("zone-square")}
              >
                <Target size={16} /> Zone square
              </button>
              <button
                className={tool === "zone-draw" ? "is-active" : ""}
                type="button"
                disabled={!variables.length}
                onClick={() => setTool("zone-draw")}
              >
                <Pencil size={16} /> Zone draw
              </button>
              <button className={tool === "text" ? "is-active" : ""} type="button" onClick={() => setTool("text")}>
                <NotebookPen size={16} /> Text
              </button>
              {tool === "zone-square" || tool === "zone-draw" ? (
                <label className="zone-variable-tool">
                  <i style={{ background: activeZoneColor }} aria-hidden="true" />
                  <span>Pin zone to</span>
                  <select
                    value={activeZoneVariable}
                    aria-label="Variable for new zone"
                    onChange={(event) => setSelectedZoneVariable(event.target.value)}
                  >
                    {variables.map((variable) => <option key={variable} value={variable}>{variable}</option>)}
                  </select>
                </label>
              ) : null}
              {tool === "text" ? (
                <input
                  className="annotation-text-input"
                  value={annotationText}
                  placeholder="Type, then click chart"
                  aria-label="Annotation text"
                  onChange={(event) => setAnnotationText(event.target.value)}
                />
              ) : null}
              {tool === "draw" || tool === "text" ? (
                <label className="color-tool" title="Annotation color">
                  <span>Color</span>
                  <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
                </label>
              ) : null}
              <label className="width-tool">
                <span>Size</span>
                <input type="range" min="2" max="12" value={lineWidth} onChange={(event) => setLineWidth(Number(event.target.value))} />
              </label>
              <button type="button" disabled={!history.length} onClick={undo}>Undo</button>
              <button
                type="button"
                onClick={() => {
                  setHistory([]);
                  onZonePinsChange({});
                  onZonesChange([]);
                  nextPinNumberRef.current = 1;
                  restoreCanvas(baseImageRef.current, []);
                }}
              >
                Clear
              </button>
              <button type="button" onClick={exportCurrentDrawing}>
                <ImagePlus size={15} /> Export
              </button>
              <button type="button" disabled={isSavingAnalysis} onClick={() => void saveCurrentDrawing()}>
                <CheckCircle2 size={15} /> {isSavingAnalysis ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => void openDrawingHistory()}>
                <BookOpen size={15} /> History
                {savedDrawings.length ? <small className="history-count">{savedDrawings.length}</small> : null}
              </button>
              {historyMessage && !isHistoryOpen ? <span className="analysis-save-status" role="status">{historyMessage}</span> : null}
              <label className="replace-image-button">
                Replace
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onImageUpload(file);
                  }}
                />
              </label>
            </div>
            <div className={`canvas-shell tool-${tool}`}>
              <div
                ref={canvasStageRef}
                className="canvas-stage"
                style={{ "--canvas-ratio": String(canvasSize.width / canvasSize.height) } as CSSProperties}
              >
                <canvas
                  ref={canvasRef}
                  aria-label="Uploaded chart annotation canvas"
                  onPointerDown={startAnnotation}
                  onPointerMove={drawAnnotation}
                  onPointerUp={finishAnnotation}
                  onPointerCancel={finishAnnotation}
                  onPointerLeave={finishAnnotation}
                />
                <svg className="zone-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {zones.map((zone) => {
                    const xs = zone.points.map((point) => point.x * 100);
                    const ys = zone.points.map((point) => point.y * 100);
                    return (
                      <Fragment key={zone.id}>
                        {zone.kind === "square" ? (
                          <rect
                            className="zone-glow-border"
                            pathLength={100}
                            x={Math.min(...xs)}
                            y={Math.min(...ys)}
                            width={Math.max(...xs) - Math.min(...xs)}
                            height={Math.max(...ys) - Math.min(...ys)}
                            style={{ stroke: zone.color, color: zone.color }}
                          />
                        ) : (
                          <polygon
                            className="zone-glow-border"
                            pathLength={100}
                            points={zone.points.map((point) => `${point.x * 100},${point.y * 100}`).join(" ")}
                            style={{ stroke: zone.color, color: zone.color }}
                          />
                        )}
                        <line
                          className="zone-connector"
                          x1={zone.anchor.x * 100}
                          y1={zone.anchor.y * 100}
                          x2={zone.label.x * 100}
                          y2={zone.label.y * 100}
                          style={{ stroke: zone.color, color: zone.color }}
                        />
                      </Fragment>
                    );
                  })}
                </svg>
                {zones.map((zone) => (
                  <button
                    className="zone-floating-label"
                    key={zone.id}
                    type="button"
                    style={{ left: `${zone.label.x * 100}%`, top: `${zone.label.y * 100}%`, borderColor: zone.color }}
                    aria-label={`Move pin ${zone.pin}, ${zone.variable}`}
                    onPointerDown={(event) => startZoneLabelDrag(event, zone)}
                    onPointerMove={moveZoneLabel}
                    onPointerUp={finishZoneLabelDrag}
                    onPointerCancel={finishZoneLabelDrag}
                  >
                    <b style={{ background: zone.color }}>{zone.pin}</b>
                    <span>{zone.variable}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <aside className="setup-quality-panel">
            <SelectField label="Setup" value={setup} options={setups} onChange={onSetupChange} />
            <div className={`quality-card ${allPresent ? "is-high" : "is-low"}`}>
              <div>
                {allPresent ? <CheckCircle2 size={20} /> : <TriangleAlert size={20} />}
                <span>{allPresent ? "High quality trade" : "Low quality trade"}</span>
              </div>
              <strong>{qualityScore}%</strong>
              <p>{allPresent ? "Every setup variable is present." : "Confirm every variable before taking the trade."}</p>
            </div>

            <div className="variable-list">
              <header>
                <span>Setup variables</span>
                <small>{checkedVariables.length}/{variables.length} present</small>
              </header>
              {variables.length ? variables.map((variable) => (
                <div className={`variable-row ${checkedVariables.includes(variable) ? "is-checked" : ""}`} key={variable}>
                  <label>
                    <input
                      type="checkbox"
                      checked={checkedVariables.includes(variable)}
                      onChange={(event) =>
                        onChecksChange(
                          event.target.checked
                            ? [...checkedVariables, variable]
                            : checkedVariables.filter((item) => item !== variable),
                        )
                      }
                    />
                    <i
                      className="variable-color-dot"
                      style={{
                        background: variableColor(variables.indexOf(variable)),
                        color: variableColor(variables.indexOf(variable)),
                      }}
                      aria-hidden="true"
                    />
                    <span>{variable}</span>
                    {zonePins[variable]?.length ? (
                      <span className="variable-pin-list" aria-label={`Chart pins ${zonePins[variable].join(", ")}`}>
                        {zonePins[variable].map((pin) => (
                          <b key={pin} style={{ background: variableColor(variables.indexOf(variable)) }}>{pin}</b>
                        ))}
                      </span>
                    ) : null}
                  </label>
                  <button
                    type="button"
                    aria-label={`Remove ${variable}`}
                    onClick={() => onVariablesChange(variables.filter((item) => item !== variable))}
                  >
                    <X size={14} />
                  </button>
                </div>
              )) : <p className="empty-variables">Add the rules that make this setup valid.</p>}
            </div>

            <div className="add-variable-row">
              <input
                value={newVariable}
                placeholder="Add a setup variable"
                onChange={(event) => setNewVariable(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addVariable();
                  }
                }}
              />
              <button type="button" aria-label="Add setup variable" onClick={addVariable}><Plus size={17} /></button>
            </div>
          </aside>
        </div>
      )}
      {isHistoryOpen ? (
        <div className="analysis-history-overlay" role="dialog" aria-modal="true" aria-labelledby="analysis-history-title">
          <button className="analysis-history-backdrop" type="button" aria-label="Close analysis history" onClick={() => setIsHistoryOpen(false)} />
          <section className="analysis-history-dialog">
            <header>
              <div>
                <p className="eyebrow">Chart library</p>
                <h3 id="analysis-history-title">Analysis history</h3>
              </div>
              <button type="button" aria-label="Close analysis history" onClick={() => setIsHistoryOpen(false)}><X size={18} /></button>
            </header>
            {historyMessage ? <p className="analysis-history-message" role="status">{historyMessage}</p> : null}
            <div className="analysis-history-content">
              <div className="analysis-history-grid">
                {savedDrawings.length ? savedDrawings.map((drawing) => {
                  const linkedTrade = trades.find((trade) => trade.id === drawing.tradeId);
                  return (
                    <button
                      className={drawing.id === selectedDrawingId ? "is-selected" : ""}
                      type="button"
                      key={drawing.id}
                      onClick={() => {
                        setSelectedDrawingId(drawing.id);
                        setLinkedTradeId(drawing.tradeId);
                      }}
                    >
                      <img src={drawing.image} alt={`${drawing.pair} ${drawing.setup} saved analysis`} />
                      <span><strong>{drawing.pair}</strong><small>{drawing.setup}</small></span>
                      <time dateTime={drawing.savedAt}>{new Date(drawing.savedAt).toLocaleString()}</time>
                      {linkedTrade ? <em>Linked · {linkedTrade.pair} {formatMonthDayYear(linkedTrade.date)}</em> : null}
                    </button>
                  );
                }) : (
                  <div className="analysis-history-empty">
                    <BookOpen size={26} />
                    <strong>No saved drawings yet</strong>
                    <span>Use Save in the chart toolbar to build your library.</span>
                  </div>
                )}
              </div>
              {selectedDrawing ? (
                <aside className="analysis-history-detail">
                  <img src={selectedDrawing.image} alt={`${selectedDrawing.pair} selected analysis`} />
                  <div>
                    <span>Link this analysis</span>
                    <strong>{selectedDrawing.pair} · {selectedDrawing.setup}</strong>
                  </div>
                  {trades.length ? (
                    <>
                      <label>
                        <span>Journal trade</span>
                        <select value={linkedTradeId} onChange={(event) => setLinkedTradeId(event.target.value)}>
                          <option value="">Choose a trade</option>
                          {trades.map((trade) => (
                            <option key={trade.id} value={trade.id}>
                              {formatMonthDayYear(trade.date)} · {trade.pair} · {trade.setup} · {formatNumber(trade.pnl)}R
                            </option>
                          ))}
                        </select>
                      </label>
                      <button className="primary-action" type="button" disabled={!linkedTradeId} onClick={() => void linkSelectedDrawing()}>
                        <CheckCircle2 size={17} /> Link to trade
                      </button>
                    </>
                  ) : <p>Save a journal trade first, then return here to link this drawing.</p>}
                </aside>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function variableColor(index: number) {
  const safeIndex = Math.max(0, index);
  return `hsl(${Math.round((safeIndex * 137.508 + 198) % 360)} 82% 54%)`;
}

function cloneAnalysisZone(zone: AnalysisZone): AnalysisZone {
  return {
    ...zone,
    points: zone.points.map((point) => ({ ...point })),
    anchor: { ...zone.anchor },
    label: { ...zone.label },
  };
}

function normalizeAnalysisPoint(point: AnalysisPoint, width: number, height: number): AnalysisPoint {
  return { x: point.x / width, y: point.y / height };
}

function zoneAnchor(kind: AnalysisZone["kind"], points: AnalysisPoint[]): AnalysisPoint {
  if (kind === "square") {
    return {
      x: Math.min(points[0].x, points[1].x) + 24,
      y: Math.min(points[0].y, points[1].y) + 24,
    };
  }

  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function drawZonePin(context: CanvasRenderingContext2D, point: AnalysisPoint, pinNumber: number, color: string) {
  const pinRadius = 17;
  context.beginPath();
  context.arc(point.x, point.y, pinRadius, 0, Math.PI * 2);
  context.fillStyle = color;
  context.globalAlpha = 1;
  context.fill();
  context.strokeStyle = "#ffffff";
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = "#ffffff";
  context.font = "800 18px Inter, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(pinNumber), point.x, point.y + 1);
}

function drawSquareZone(
  context: CanvasRenderingContext2D,
  start: AnalysisPoint,
  end: AnalysisPoint,
  pinNumber: number,
  color: string,
) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  context.save();
  context.globalAlpha = 0.08;
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
  context.globalAlpha = 0.7;
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.strokeRect(x, y, width, height);
  context.globalAlpha = 1;
  drawZonePin(context, zoneAnchor("square", [start, end]), pinNumber, color);
  context.restore();
}

function drawFreeformZone(
  context: CanvasRenderingContext2D,
  points: AnalysisPoint[],
  pinNumber: number,
  color: string,
) {
  if (points.length < 2) return;
  context.save();
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
  context.closePath();
  context.globalAlpha = 0.08;
  context.fillStyle = color;
  context.fill();
  context.globalAlpha = 0.7;
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.stroke();
  context.globalAlpha = 1;
  drawZonePin(context, zoneAnchor("draw", points), pinNumber, color);
  context.restore();
}

function drawZoneLabel(
  context: CanvasRenderingContext2D,
  zone: AnalysisZone,
  width: number,
  height: number,
) {
  const anchor = { x: zone.anchor.x * width, y: zone.anchor.y * height };
  const label = { x: zone.label.x * width, y: zone.label.y * height };
  context.save();
  context.strokeStyle = zone.color;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(anchor.x, anchor.y);
  context.lineTo(label.x, label.y + 18);
  context.stroke();

  context.font = "700 17px Inter, sans-serif";
  const labelWidth = Math.min(340, context.measureText(zone.variable).width + 64);
  context.fillStyle = "rgba(15, 23, 42, 0.88)";
  context.fillRect(label.x, label.y, labelWidth, 38);
  context.strokeStyle = zone.color;
  context.lineWidth = 2;
  context.strokeRect(label.x, label.y, labelWidth, 38);
  drawZonePin(context, { x: label.x + 20, y: label.y + 19 }, zone.pin, zone.color);
  context.fillStyle = "#ffffff";
  context.font = "700 17px Inter, sans-serif";
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillText(zone.variable, label.x + 44, label.y + 20);
  context.restore();
}

function SelectField({
  label,
  value,
  options,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} required disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "All" && label === "Filter pair" ? "All pairs" : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SpreadNotice({ pair, time }: { pair: string; time: string }) {
  const notice = getSpreadNotice(pair, time);
  const Icon = notice.tone === "normal" ? CheckCircle2 : TriangleAlert;

  return (
    <article className={`spread-notice wide-field is-${notice.tone}`}>
      <div className="spread-notice-icon">
        <Icon size={18} />
      </div>
      <div>
        <span>{notice.label}</span>
        <strong>{notice.title}</strong>
        <p>{notice.detail}</p>
        <small>{notice.tip}</small>
      </div>
    </article>
  );
}

function PropRuleTradeNotice({ trades, direction }: { trades: Trade[]; direction: Direction }) {
  const currentStreak = getDirectionStreak(trades);
  const projectedStreak = getProjectedDirectionStreak(trades, direction);
  const shouldWarn = projectedStreak >= 5;
  const Icon = shouldWarn ? ShieldAlert : CheckCircle2;
  const normalizedDirection = normalizeDirection(direction);
  const currentLabel =
    currentStreak.direction && currentStreak.count > 0
      ? `Current streak: ${currentStreak.count} ${currentStreak.direction.toLowerCase()}${currentStreak.count === 1 ? "" : "s"}`
      : "No live trades loaded yet";

  return (
    <article className={`spread-notice prop-rule-inline ${shouldWarn ? "is-warning" : "is-normal"}`}>
      <div className="spread-notice-icon">
        <Icon size={18} />
      </div>
      <div>
        <span>Prop rule guard</span>
        <strong>
          {shouldWarn
            ? `${projectedStreak} ${normalizedDirection.toLowerCase()} trades in a row`
            : `Next ${normalizedDirection.toLowerCase()} keeps you under the 5-trade warning`}
        </strong>
        <p>
          {shouldWarn
            ? "This can look like one-sided betting. Pause and confirm the setup is market-led, not just a repeated bias."
            : "This guard watches live trades only and warns when the selected direction would reach five in a row."}
        </p>
        <small>{currentLabel}</small>
      </div>
    </article>
  );
}

function PropRuleGuardPanel({ trades }: { trades: Trade[] }) {
  const recentTrades = [...trades].sort(
    (a, b) => parseDatedItemDate(b).getTime() - parseDatedItemDate(a).getTime(),
  );
  const latestTrade = recentTrades[0];
  const inactiveDays = getDaysSinceTrade(latestTrade);
  const daysUntilInactive = inactiveDays === null ? 30 : Math.max(0, 30 - inactiveDays);
  const directionStreak = getDirectionStreak(trades);
  const inactivityTone =
    inactiveDays === null || inactiveDays >= 30 ? "danger" : inactiveDays >= 15 ? "warning" : "normal";
  const directionTone = directionStreak.count >= 5 ? "warning" : "normal";
  const inactivityLabel =
    inactiveDays === null
      ? "No live trades logged"
      : inactiveDays >= 30
        ? "Inactive risk active"
        : inactiveDays >= 15
          ? "Maintenance trade due"
          : "Active";
  const directionLabel =
    directionStreak.count >= 5 && directionStreak.direction
      ? `${directionStreak.count} ${directionStreak.direction.toLowerCase()}s in a row`
      : directionStreak.direction
        ? `${directionStreak.count} ${directionStreak.direction.toLowerCase()} streak`
        : "No direction streak";

  return (
    <section className="prop-rule-guard" aria-label="Prop rule guard">
      <div className="panel-header">
        <span>Prop rule guard</span>
        <strong>30-day inactivity / one-sided bets</strong>
      </div>

      <div className="prop-rule-grid">
        <article className={`prop-rule-card is-${inactivityTone}`}>
          <Clock3 size={18} />
          <div>
            <span>Inactivity</span>
            <strong>{inactivityLabel}</strong>
            <p>
              {inactiveDays === null
                ? "Log a live trade before the 30-day clock becomes a problem."
                : inactiveDays >= 30
                  ? `${inactiveDays} days since the last live trade. Check your account status before trading.`
                  : inactiveDays >= 15
                    ? `${inactiveDays} days since the last live trade. Open and close a tiny maintenance trade if your prop firm allows it.`
                    : `${daysUntilInactive} days left before the 30-day inactivity limit.`}
            </p>
          </div>
        </article>

        <article className={`prop-rule-card is-${directionTone}`}>
          <ShieldAlert size={18} />
          <div>
            <span>One-sided bets</span>
            <strong>{directionLabel}</strong>
            <p>
              {directionStreak.count >= 5 && directionStreak.direction
                ? "Your last five or more live trades point one way. Review whether this is a valid setup sequence or directional bias."
                : "You will be warned when live trades reach five longs or five shorts in a row."}
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

function PropFirmsModule({
  accounts,
  payouts,
  trades,
  onAccountsChange,
  onPayoutsChange,
}: {
  accounts: PropFirmAccount[];
  payouts: PropFirmPayout[];
  trades: Trade[];
  onAccountsChange: (accounts: PropFirmAccount[]) => void;
  onPayoutsChange: (payouts: PropFirmPayout[]) => void;
}) {
  const [activePropTab, setActivePropTab] = useState<"accounts" | "payouts">("accounts");
  const payoutStatuses: readonly PropFirmPayoutStatus[] = ["Requested", "Processing", "Paid"];
  const today = new Date().toISOString().slice(0, 10);
  const [payoutForm, setPayoutForm] = useState({
    firmName: "",
    accountName: accounts[0]?.name || "",
    amount: "",
    status: "Paid" as PropFirmPayoutStatus,
    requestedDate: today,
    paidDate: today,
    method: "",
    notes: "",
  });
  const rows = accounts.map((account) => {
    const capital = Number(account.capital || 0);
    const riskPercent = Number(account.riskPercent || 0);
    const traderSplit = Number(account.traderSplit || 0);
    const grossRisk = capital * (riskPercent / 100);
    const potentialProfit = grossRisk * (traderSplit / 100);

    return {
      account,
      capital,
      grossRisk,
      potentialProfit,
    };
  });
  const totalCapital = rows.reduce((sum, row) => sum + row.capital, 0);
  const totalPotential = rows.reduce((sum, row) => sum + row.potentialProfit, 0);
  const orderedPayouts = [...payouts].sort((a, b) => {
    const aDate = a.paidDate || a.requestedDate || a.createdAt;
    const bDate = b.paidDate || b.requestedDate || b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
  const paidPayouts = payouts.filter((payout) => payout.status === "Paid");
  const pendingPayouts = payouts.filter((payout) => payout.status !== "Paid");
  const totalPaid = paidPayouts.reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
  const pendingAmount = pendingPayouts.reduce((sum, payout) => sum + Number(payout.amount || 0), 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyPaid = paidPayouts
    .filter((payout) => (payout.paidDate || payout.requestedDate).slice(0, 7) === currentMonth)
    .reduce((sum, payout) => sum + Number(payout.amount || 0), 0);

  function updateAccount(id: string, patch: Partial<PropFirmAccount>) {
    onAccountsChange(accounts.map((account) => (account.id === id ? { ...account, ...patch } : account)));
  }

  function addPayout() {
    const amount = Number(payoutForm.amount || 0);
    if (!payoutForm.firmName.trim() || !amount) return;

    onPayoutsChange([
      {
        id: crypto.randomUUID(),
        firmName: payoutForm.firmName.trim(),
        accountName: payoutForm.accountName.trim(),
        amount: payoutForm.amount,
        status: payoutForm.status,
        requestedDate: payoutForm.requestedDate,
        paidDate: payoutForm.status === "Paid" ? payoutForm.paidDate : "",
        method: payoutForm.method.trim(),
        notes: payoutForm.notes.trim(),
        createdAt: new Date().toISOString(),
      },
      ...payouts,
    ]);
    setPayoutForm({
      firmName: "",
      accountName: payoutForm.accountName,
      amount: "",
      status: "Paid",
      requestedDate: today,
      paidDate: today,
      method: "",
      notes: "",
    });
  }

  return (
    <section className="prop-firm-panel">
      <PropRuleGuardPanel trades={trades} />

      <div className="module-tabs prop-tabs" aria-label="Prop firm sections">
        <button
          className={activePropTab === "accounts" ? "is-active" : ""}
          type="button"
          onClick={() => setActivePropTab("accounts")}
        >
          Accounts
        </button>
        <button
          className={activePropTab === "payouts" ? "is-active" : ""}
          type="button"
          onClick={() => setActivePropTab("payouts")}
        >
          Payouts
        </button>
      </div>

      {activePropTab === "accounts" ? (
        <section className="prop-tab-panel">
          <div className="prop-summary-grid">
            <Stat label="Funded capital" value={`$${formatCurrency(totalCapital)}`} />
            <Stat label="Potential per trade" value={`$${formatCurrency(totalPotential)}`} />
            <Stat label="Accounts passed" value={String(accounts.length)} />
          </div>

          <div className="prop-account-list">
            {rows.map(({ account, grossRisk, potentialProfit }) => (
              <article className="prop-account-card" key={account.id}>
                <div className="prop-account-fields">
                  <label>
                    <span>Account name</span>
                    <input value={account.name} onChange={(event) => updateAccount(account.id, { name: event.target.value })} />
                  </label>
                  <label>
                    <span>Capital</span>
                    <input
                      value={account.capital}
                      inputMode="decimal"
                      onChange={(event) => updateAccount(account.id, { capital: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Risk %</span>
                    <input
                      value={account.riskPercent}
                      inputMode="decimal"
                      onChange={(event) => updateAccount(account.id, { riskPercent: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Your split %</span>
                    <input
                      value={account.traderSplit}
                      inputMode="decimal"
                      onChange={(event) => updateAccount(account.id, { traderSplit: event.target.value })}
                    />
                  </label>
                </div>

                <div className="prop-account-result">
                  <div>
                    <span>1R gross</span>
                    <strong>${formatCurrency(grossRisk)}</strong>
                  </div>
                  <div>
                    <span>After split</span>
                    <strong>${formatCurrency(potentialProfit)}</strong>
                  </div>
                  <button className="icon-button danger" type="button" onClick={() => onAccountsChange(accounts.filter((item) => item.id !== account.id))}>
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="form-actions">
            <button
              className="primary-action"
              type="button"
              onClick={() =>
                onAccountsChange([
                  ...accounts,
                  { id: crypto.randomUUID(), name: "New account", capital: "5000", riskPercent: "1", traderSplit: "80" },
                ])
              }
            >
              <Plus size={18} />
              Add account
            </button>
            <button className="ghost-action" type="button" onClick={() => onAccountsChange(defaultPropFirmAccounts())}>
              <RefreshCcw size={18} />
              Reset defaults
            </button>
          </div>
        </section>
      ) : null}

      {activePropTab === "payouts" ? (
      <article className="prop-payout-panel prop-tab-panel">
        <div className="panel-header">
          <span>Payout records</span>
          <strong>{payouts.length} logged</strong>
        </div>

        <div className="prop-summary-grid payout-summary-grid">
          <Stat label="Total paid" value={`$${formatCurrency(totalPaid)}`} />
          <Stat label="This month" value={`$${formatCurrency(monthlyPaid)}`} />
          <Stat label="Pending" value={`$${formatCurrency(pendingAmount)}`} />
        </div>

        <div className="payout-form-grid">
          <label>
            <span>Prop firm</span>
            <input
              value={payoutForm.firmName}
              placeholder="Choose or type prop firm"
              list="prop-firm-options"
              onChange={(event) => setPayoutForm({ ...payoutForm, firmName: event.target.value })}
            />
            <datalist id="prop-firm-options">
              {propFirmChoices.map((firm) => (
                <option key={firm} value={firm} />
              ))}
            </datalist>
          </label>
          <label>
            <span>Account</span>
            <input
              value={payoutForm.accountName}
              placeholder="100K challenge, 10K swing..."
              list="prop-account-options"
              onChange={(event) => setPayoutForm({ ...payoutForm, accountName: event.target.value })}
            />
            <datalist id="prop-account-options">
              {accounts.map((account) => (
                <option key={account.id} value={account.name} />
              ))}
            </datalist>
          </label>
          <label>
            <span>Amount</span>
            <input
              value={payoutForm.amount}
              inputMode="decimal"
              placeholder="0.00"
              onChange={(event) => setPayoutForm({ ...payoutForm, amount: event.target.value })}
            />
          </label>
          <SelectField
            label="Status"
            value={payoutForm.status}
            options={payoutStatuses}
            onChange={(value) =>
              setPayoutForm({
                ...payoutForm,
                status: value as PropFirmPayoutStatus,
                paidDate: value === "Paid" ? payoutForm.paidDate || today : "",
              })
            }
          />
          <label>
            <span>Requested</span>
            <input
              value={payoutForm.requestedDate}
              type="date"
              onChange={(event) => setPayoutForm({ ...payoutForm, requestedDate: event.target.value })}
            />
          </label>
          <label>
            <span>Paid date</span>
            <input
              value={payoutForm.paidDate}
              type="date"
              disabled={payoutForm.status !== "Paid"}
              onChange={(event) => setPayoutForm({ ...payoutForm, paidDate: event.target.value })}
            />
          </label>
          <label>
            <span>Method</span>
            <input
              value={payoutForm.method}
              placeholder="Crypto, Deel, bank..."
              onChange={(event) => setPayoutForm({ ...payoutForm, method: event.target.value })}
            />
          </label>
          <label className="wide-field payout-notes-field">
            <span>Notes</span>
            <textarea
              value={payoutForm.notes}
              rows={3}
              placeholder="Invoice ID, rules, fee notes, or anything you want to remember."
              onChange={(event) => setPayoutForm({ ...payoutForm, notes: event.target.value })}
            />
          </label>
          <button className="primary-action payout-add-button" type="button" onClick={addPayout}>
            <Plus size={18} />
            Add payout
          </button>
        </div>

        <div className="payout-record-list">
          {orderedPayouts.length === 0 ? (
            <div className="empty-state">
              <strong>No payouts recorded yet</strong>
              <p>Add each requested or paid payout here so your prop firm income has its own ledger.</p>
            </div>
          ) : (
            orderedPayouts.map((payout) => (
              <article className="payout-record" key={payout.id}>
                <div>
                  <span className={`chip payout-${payout.status.toLowerCase()}`}>{payout.status}</span>
                  <strong>{payout.firmName}</strong>
                  <small>{payout.accountName || "No account label"}</small>
                </div>
                <div>
                  <span>Amount</span>
                  <strong>${formatCurrency(Number(payout.amount || 0))}</strong>
                </div>
                <div>
                  <span>Requested</span>
                  <strong>{payout.requestedDate ? formatOrdinalDate(payout.requestedDate) : "-"}</strong>
                </div>
                <div>
                  <span>Paid</span>
                  <strong>{payout.paidDate ? formatOrdinalDate(payout.paidDate) : "-"}</strong>
                </div>
                <div>
                  <span>Method</span>
                  <strong>{payout.method || "-"}</strong>
                </div>
                {payout.notes ? <p>{payout.notes}</p> : null}
                <button
                  className="icon-button danger"
                  type="button"
                  onClick={() => onPayoutsChange(payouts.filter((item) => item.id !== payout.id))}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))
          )}
        </div>
      </article>
      ) : null}
    </section>
  );
}

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function GoalsModule({
  goals,
  form,
  onFormChange,
  onAddGoal,
  onToggleGoal,
  onDeleteGoal,
}: {
  goals: GoalItem[];
  form: { title: string; category: GoalCategory; targetDate: string; notes: string };
  onFormChange: (form: { title: string; category: GoalCategory; targetDate: string; notes: string }) => void;
  onAddGoal: () => void;
  onToggleGoal: (goalId: string) => void;
  onDeleteGoal: (goalId: string) => void;
}) {
  const completed = goals.filter((goal) => goal.isDone).length;
  const open = goals.length - completed;

  return (
    <section className="goals-panel">
      <div className="stat-grid goals-summary">
        <Stat label="Open goals" value={String(open)} />
        <Stat label="Completed" value={String(completed)} />
        <Stat label="Total goals" value={String(goals.length)} />
      </div>

      <article className="goal-form-card">
        <div className="panel-header">
          <span>New goal</span>
          <strong>{form.category}</strong>
        </div>
        <div className="goal-form-grid">
          <label>
            <span>Goal</span>
            <input value={form.title} placeholder="Pass 100K prop firm or visit Tokyo" onChange={(event) => onFormChange({ ...form, title: event.target.value })} />
          </label>
          <SelectField
            label="Category"
            value={form.category}
            options={["Prop firm", "Travel", "Trading", "Personal"]}
            onChange={(value) => onFormChange({ ...form, category: value as GoalCategory })}
          />
          <label>
            <span>Target date</span>
            <input value={form.targetDate} type="date" onChange={(event) => onFormChange({ ...form, targetDate: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Notes</span>
            <textarea value={form.notes} rows={3} placeholder="Why this matters or what needs to happen." onChange={(event) => onFormChange({ ...form, notes: event.target.value })} />
          </label>
          <button className="primary-action" type="button" onClick={onAddGoal}>
            <Plus size={18} />
            Add goal
          </button>
        </div>
      </article>

      <div className="goal-list">
        {goals.length === 0 ? (
          <div className="empty-state">
            <strong>No goals yet</strong>
            <p>Add a prop firm target, travel goal, or milestone you want to finish.</p>
          </div>
        ) : (
          goals.map((goal) => (
            <article className={goal.isDone ? "goal-card is-done" : "goal-card"} key={goal.id}>
              <button className="goal-check" type="button" onClick={() => onToggleGoal(goal.id)} aria-label={goal.isDone ? "Mark goal open" : "Mark goal complete"}>
                {goal.isDone ? <CheckCircle2 size={19} /> : <CircleSlash2 size={19} />}
              </button>
              <div>
                <span>{goal.category}{goal.targetDate ? ` / ${formatOrdinalDate(goal.targetDate)}` : ""}</span>
                <strong>{goal.title}</strong>
                {goal.notes ? <p>{goal.notes}</p> : null}
              </div>
              <button className="icon-button danger" type="button" onClick={() => onDeleteGoal(goal.id)} aria-label="Delete goal">
                <Trash2 size={16} />
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function ResearchModule({
  ideas,
  activeIdeaId,
  onActiveIdeaChange,
  onChange,
  onOpenImage,
}: {
  ideas: ResearchIdea[];
  activeIdeaId: string;
  onActiveIdeaChange: (id: string) => void;
  onChange: (ideas: ResearchIdea[]) => void;
  onOpenImage: (items: ImageViewerItem[], index: number) => void;
}) {
  const activeIdea = ideas.find((idea) => idea.id === activeIdeaId) || ideas[0];
  const [sampleForm, setSampleForm] = useState<ResearchSample>({
    id: "",
    date: new Date().toISOString().slice(0, 10),
    pair: pairs[0],
    setup: setups[0],
    result: "Win",
    pnl: "1",
    notes: "",
    image: "",
  });

  if (!activeIdea) {
    return null;
  }

  const analytics = summarizeResearchIdea(activeIdea);

  function updateIdea(id: string, patch: Partial<ResearchIdea>) {
    onChange(ideas.map((idea) => (idea.id === id ? { ...idea, ...patch } : idea)));
  }

  function addIdea() {
    const nextIdea: ResearchIdea = {
      id: crypto.randomUUID(),
      title: "New research idea",
      hypothesis: "",
      createdAt: new Date().toISOString(),
      samples: [],
    };
    onChange([nextIdea, ...ideas]);
    onActiveIdeaChange(nextIdea.id);
  }

  async function handleResearchImage(file: File | null) {
    if (!file) return;
    setSampleForm({ ...sampleForm, image: await blobToDataUrl(file) });
  }

  function addSample() {
    const nextSample = {
      ...sampleForm,
      id: crypto.randomUUID(),
    };
    updateIdea(activeIdea.id, { samples: [nextSample, ...activeIdea.samples] });
    setSampleForm({ ...sampleForm, pnl: sampleForm.result === "Loss" ? "-1" : "1", notes: "", image: "" });
  }

  function deleteSample(sampleId: string) {
    updateIdea(activeIdea.id, { samples: activeIdea.samples.filter((sample) => sample.id !== sampleId) });
  }

  return (
    <section className="research-layout">
      <aside className="research-sidebar">
        <div className="panel-header">
          <span>Ideas</span>
          <strong>{ideas.length}</strong>
        </div>
        <button className="primary-action research-new-button" type="button" onClick={addIdea}>
          <Plus size={18} />
          New idea
        </button>
        <div className="research-idea-list">
          {ideas.map((idea) => {
            const ideaStats = summarizeResearchIdea(idea);

            return (
              <button
                className={idea.id === activeIdea.id ? "is-active" : ""}
                key={idea.id}
                type="button"
                onClick={() => onActiveIdeaChange(idea.id)}
              >
                <strong>{idea.title || "Untitled idea"}</strong>
                <span>
                  {idea.samples.length} samples / {formatNumber(ideaStats.totalR)}R
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="research-main">
        <article className="research-card">
          <div className="research-title-grid">
            <label>
              <span>Idea name</span>
              <input value={activeIdea.title} onChange={(event) => updateIdea(activeIdea.id, { title: event.target.value })} />
            </label>
            <button className="icon-button danger" type="button" onClick={() => onChange(ideas.filter((idea) => idea.id !== activeIdea.id))}>
              <Trash2 size={16} />
              Delete idea
            </button>
          </div>
          <label>
            <span>Hypothesis</span>
            <textarea
              value={activeIdea.hypothesis}
              rows={4}
              placeholder="Example: London sweep into break-and-retest has positive expectancy on EUR pairs."
              onChange={(event) => updateIdea(activeIdea.id, { hypothesis: event.target.value })}
            />
          </label>
        </article>

        <div className="stat-grid analytics-grid">
          <Stat label="Samples" value={String(analytics.samples)} />
          <Stat label="Total R" value={`${formatNumber(analytics.totalR)}R`} />
          <Stat label="Win rate" value={`${analytics.winRate}%`} />
          <Stat label="Expectancy" value={`${formatNumber(analytics.expectancy)}R`} />
        </div>

        <EquityCurve points={analytics.equityPoints} />

        <article className="research-card">
          <div className="panel-header">
            <span>Mini backtest</span>
            <strong>{activeIdea.samples.length} samples</strong>
          </div>
          <div className="research-sample-form">
            <label>
              <span>Date</span>
              <input value={sampleForm.date} type="date" onChange={(event) => setSampleForm({ ...sampleForm, date: event.target.value })} />
            </label>
            <SelectField label="Pair" value={sampleForm.pair} options={pairs} onChange={(value) => setSampleForm({ ...sampleForm, pair: value })} />
            <SelectField label="Setup" value={sampleForm.setup} options={setups} onChange={(value) => setSampleForm({ ...sampleForm, setup: value })} />
            <SelectField
              label="Result"
              value={sampleForm.result}
              options={results}
              onChange={(value) => setSampleForm({ ...sampleForm, result: value as Result, pnl: value === "Loss" ? "-1" : value === "Breakeven" ? "0" : "1" })}
            />
            <label>
              <span>PnL R</span>
              <input value={sampleForm.pnl} inputMode="decimal" onChange={(event) => setSampleForm({ ...sampleForm, pnl: event.target.value })} />
            </label>
            <label className="wide-field">
              <span>Observation</span>
              <textarea value={sampleForm.notes} rows={3} onChange={(event) => setSampleForm({ ...sampleForm, notes: event.target.value })} />
            </label>
            <label className="file-field research-file-field">
              <span>Sample image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  handleResearchImage(event.target.files?.[0] || null);
                  event.target.value = "";
                }}
              />
              <ImagePlus size={18} />
            </label>
            <button className="primary-action" type="button" onClick={addSample}>
              <Plus size={18} />
              Add sample
            </button>
          </div>
        </article>

        <div className="research-grid">
          <ResearchRankCard title="Best pairs" rows={analytics.byPair} />
          <ResearchRankCard title="Best setups" rows={analytics.bySetup} />
        </div>

        <article className="research-card">
          <div className="panel-header">
            <span>Samples</span>
            <strong>{formatNumber(analytics.totalR)}R</strong>
          </div>
          <div className="research-sample-list">
            {activeIdea.samples.length === 0 ? (
              <p className="recent-empty">No samples yet. Add your first mini backtest result.</p>
            ) : (
              activeIdea.samples.map((sample, index) => {
                const imageItems = activeIdea.samples
                  .filter((item) => item.image)
                  .map((item) => ({
                    id: item.id,
                    src: item.image,
                    alt: `${item.pair} ${item.setup} research sample`,
                    title: `${item.pair} ${item.setup}`,
                    meta: `${formatOrdinalDate(item.date)} / ${formatNumber(Number(item.pnl))}R`,
                  }));
                const imageIndex = imageItems.findIndex((item) => item.id === sample.id);

                return (
                  <div className="research-sample-row" key={sample.id}>
                    <div>
                      <strong>{sample.pair}</strong>
                      <span>{sample.setup} / {formatOrdinalDate(sample.date)}</span>
                      {sample.notes ? <p>{sample.notes}</p> : null}
                    </div>
                    {sample.image ? (
                      <button className="research-sample-image" type="button" onClick={() => onOpenImage(imageItems, imageIndex)}>
                        <img src={sample.image} alt={`${sample.pair} research sample`} />
                      </button>
                    ) : null}
                    <strong className={Number(sample.pnl) >= 0 ? "positive-r" : "negative-r"}>{formatNumber(Number(sample.pnl))}R</strong>
                    <button className="icon-button danger" type="button" onClick={() => deleteSample(sample.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function summarizeResearchIdea(idea: ResearchIdea) {
  const wins = idea.samples.filter((sample) => Number(sample.pnl) > 0);
  const totalR = idea.samples.reduce((sum, sample) => sum + Number(sample.pnl || 0), 0);
  let equity = 0;
  const equityPoints = [...idea.samples]
    .reverse()
    .map((sample) => {
      equity += Number(sample.pnl || 0);
      return {
        label: `${sample.date} ${sample.pair}`,
        value: equity,
      };
    });

  function groupBy(key: "pair" | "setup") {
    const grouped = idea.samples.reduce<Record<string, ResearchSample[]>>((groups, sample) => {
      groups[sample[key]] = [...(groups[sample[key]] || []), sample];
      return groups;
    }, {});

    return Object.entries(grouped)
      .map(([label, samples]) => ({
        label,
        samples: samples.length,
        totalR: samples.reduce((sum, sample) => sum + Number(sample.pnl || 0), 0),
      }))
      .sort((a, b) => b.totalR - a.totalR);
  }

  return {
    samples: idea.samples.length,
    totalR,
    winRate: idea.samples.length === 0 ? 0 : Math.round((wins.length / idea.samples.length) * 100),
    expectancy: idea.samples.length === 0 ? 0 : totalR / idea.samples.length,
    equityPoints,
    byPair: groupBy("pair"),
    bySetup: groupBy("setup"),
  };
}

function ResearchRankCard({ title, rows }: { title: string; rows: Array<{ label: string; samples: number; totalR: number }> }) {
  const maxAbs = Math.max(1, ...rows.map((row) => Math.abs(row.totalR)));

  return (
    <article className="research-card">
      <div className="panel-header">
        <span>{title}</span>
        <strong>{rows.length} groups</strong>
      </div>
      {rows.length === 0 ? (
        <p className="recent-empty">No ranking data yet.</p>
      ) : (
        <div className="edge-rank-list">
          {rows.map((row) => (
            <div className="edge-rank-row" key={row.label}>
              <div>
                <strong>{row.label}</strong>
                <span>{row.samples} samples</span>
              </div>
              <div className="edge-bar-track" aria-hidden="true">
                <span
                  className={row.totalR >= 0 ? "is-positive" : "is-negative"}
                  style={{ width: `${Math.max(8, (Math.abs(row.totalR) / maxAbs) * 100)}%` }}
                />
              </div>
              <strong className={row.totalR >= 0 ? "positive-r" : "negative-r"}>{formatNumber(row.totalR)}R</strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function TradersModule({
  currentUserId,
  friends,
  friendTrades,
  messages,
  traderIdInput,
  onTraderIdInputChange,
  onAddTrader,
  onLoadTrader,
  onRemoveTrader,
}: {
  currentUserId: string;
  friends: TraderFriend[];
  friendTrades: Record<string, Trade[]>;
  messages: Record<string, string>;
  traderIdInput: string;
  onTraderIdInputChange: (id: string) => void;
  onAddTrader: () => void;
  onLoadTrader: (id: string) => void;
  onRemoveTrader: (id: string) => void;
}) {
  const [copiedTraderId, setCopiedTraderId] = useState(false);

  async function copyTraderId() {
    await navigator.clipboard.writeText(currentUserId);
    setCopiedTraderId(true);
    window.setTimeout(() => setCopiedTraderId(false), 1600);
  }

  return (
    <section className="traders-layout">
      <article className="trader-add-card">
        <div className="panel-header">
          <span>Add trader</span>
          <div className="trader-id-copy">
            <strong>Your ID: {currentUserId.slice(0, 8)}...</strong>
            <button className="icon-button" type="button" onClick={copyTraderId} aria-label="Copy your Journaly ID">
              <ClipboardCheck size={16} />
              {copiedTraderId ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <div className="trader-add-form">
          <label>
            <span>Journaly ID</span>
            <input value={traderIdInput} placeholder="Paste trader user ID" onChange={(event) => onTraderIdInputChange(event.target.value)} />
          </label>
          <button className="primary-action" type="button" onClick={onAddTrader}>
            <Plus size={18} />
            Add friend
          </button>
        </div>
      </article>

      <div className="trader-coming-grid">
        <article className="coming-card">
          <strong>Top traders</strong>
          <span>Coming Soon</span>
        </article>
        <article className="coming-card">
          <strong>Message trader</strong>
          <span>Coming Soon</span>
        </article>
      </div>

      <div className="trader-friend-list">
        {friends.length === 0 ? (
          <div className="empty-state">
            <strong>No traders added yet</strong>
            <p>Add a friend with their Journaly ID to view public performance.</p>
          </div>
        ) : (
          friends.map((friend) => {
            const trades = friendTrades[friend.id] || [];
            const summary = summarizeTraderPreview(trades);

            return (
              <article className="trader-card" key={friend.id}>
                <div className="trader-card-header">
                  <div>
                    <span>Journaly ID</span>
                    <h3>{friend.label}</h3>
                    <strong>{friend.id}</strong>
                  </div>
                  <div className="trader-card-actions">
                    <button className="secondary-action" type="button" onClick={() => onLoadTrader(friend.id)}>
                      Refresh
                    </button>
                    <button className="icon-button danger" type="button" onClick={() => onRemoveTrader(friend.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {messages[friend.id] ? (
                  <p className="trader-private-message">{messages[friend.id]}</p>
                ) : null}

                {trades.length > 0 ? (
                  <>
                    <div className="stat-grid analytics-grid">
                      <Stat label="Total R" value={`${formatNumber(summary.totalR)}R`} />
                      <Stat label="Win rate" value={`${summary.winRate}%`} />
                      <Stat label="Trades" value={String(trades.length)} />
                      <Stat label="Expectancy" value={`${formatNumber(summary.expectancy)}R`} />
                    </div>
                    <EquityCurve points={summary.equityPoints} />
                    <div className="recent-trades">
                      <div className="recent-trades-header">
                        <span>Last 5 trades</span>
                      </div>
                      <div className="recent-trade-list">
                        {trades.slice(0, 5).map((trade) => (
                          <article className="recent-trade" key={trade.id}>
                            <div>
                              <strong>{trade.pair}</strong>
                              <span>{trade.setup} / {formatOrdinalDate(trade.date)}</span>
                            </div>
                            <div>
                              <strong className={trade.pnl >= 0 ? "positive-r" : "negative-r"}>{formatNumber(trade.pnl)}R</strong>
                              <span>{formatTime12(trade.time)}</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function summarizeTraderPreview(trades: Trade[]) {
  const ordered = [...trades].sort((a, b) => parseDatedItemDate(a).getTime() - parseDatedItemDate(b).getTime());
  const totalR = ordered.reduce((sum, trade) => sum + trade.pnl, 0);
  const wins = ordered.filter((trade) => trade.pnl > 0);
  let equity = 0;

  return {
    totalR,
    winRate: ordered.length === 0 ? 0 : Math.round((wins.length / ordered.length) * 100),
    expectancy: ordered.length === 0 ? 0 : totalR / ordered.length,
    equityPoints: ordered.map((trade) => {
      equity += trade.pnl;
      return {
        label: `${trade.date} ${trade.pair}`,
        value: equity,
      };
    }),
  };
}

function DisciplineLog({
  entries,
  form,
  isSyncing,
  onFormChange,
  onSubmit,
  onEdit,
  onDelete,
  onPostImageChange,
  onOpenImage,
  onClear,
}: {
  entries: TradeDecision[];
  form: TradeDecisionFormState;
  isSyncing: boolean;
  onFormChange: (form: TradeDecisionFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEdit: (entry: TradeDecision) => void;
  onDelete: (entry: TradeDecision) => void;
  onPostImageChange: (entry: TradeDecision, file: File) => Promise<void>;
  onOpenImage: (items: ImageViewerItem[], index: number) => void;
  onClear: () => void;
}) {
  const [activeDisciplineTab, setActiveDisciplineTab] = useState<"add" | "records">("add");
  const opportunityCost = entries.filter((entry) => entry.resultR > 0).reduce((sum, entry) => sum + entry.resultR, 0);
  const lossesAvoided = Math.abs(entries.filter((entry) => entry.resultR < 0).reduce((sum, entry) => sum + entry.resultR, 0));
  const editingEntry = form.id ? entries.find((entry) => entry.id === form.id) : undefined;

  return (
    <section className="decision-log-view">
      <div className="discipline-tabs" role="tablist" aria-label="Discipline sections">
        <button
          className={activeDisciplineTab === "add" ? "is-active" : ""}
          type="button"
          role="tab"
          aria-selected={activeDisciplineTab === "add"}
          onClick={() => setActiveDisciplineTab("add")}
        >
          <Plus size={17} />
          Add entry
        </button>
        <button
          className={activeDisciplineTab === "records" ? "is-active" : ""}
          type="button"
          role="tab"
          aria-selected={activeDisciplineTab === "records"}
          onClick={() => setActiveDisciplineTab("records")}
        >
          <ListChecks size={17} />
          Records
          <span>{entries.length}</span>
        </button>
      </div>

      {activeDisciplineTab === "records" ? <div className="decision-insight-panel market-panel">
        <div className="panel-header">
          <span>Cost of discipline</span>
          <strong>{entries.length} skipped trades</strong>
        </div>
        <p>Record the trade you chose not to take, why you skipped it, and what the setup eventually returned.</p>
        <div className="stat-grid analytics-grid discipline-stats">
          <Stat label="Opportunity cost" value={`${formatNumber(opportunityCost)}R`} />
          <Stat label="Losses avoided" value={`${formatNumber(lossesAvoided)}R`} />
          <Stat label="Net skipped result" value={`${formatNumber(entries.reduce((sum, entry) => sum + entry.resultR, 0))}R`} />
        </div>
      </div> : null}

      {activeDisciplineTab === "add" ? <form className="trade-form decision-form" onSubmit={onSubmit}>
        <section className="trade-form-section">
          <div className="trade-form-section-title">
            <span>{form.id ? "Edit skipped trade" : "Log skipped trade"}</span>
            <strong>I didn&apos;t take this trade because...</strong>
          </div>
          <div className="trade-entry-grid">
            <label>
              <span>Date</span>
              <input type="date" required value={form.date} onChange={(event) => onFormChange({ ...form, date: event.target.value })} />
            </label>
            <label>
              <span>Time</span>
              <input type="time" required value={form.time} onChange={(event) => onFormChange({ ...form, time: event.target.value })} />
            </label>
            <SelectField label="Pair" value={form.pair} options={pairs} onChange={(pair) => onFormChange({ ...form, pair })} />
            <SelectField label="Setup" value={form.setup} options={setups} onChange={(setup) => onFormChange({ ...form, setup })} />
            <SelectField label="Direction" value={form.direction} options={["Long", "Short"]} onChange={(direction) => onFormChange({ ...form, direction: direction as Direction })} />
            <label>
              <span>Result in R</span>
              <input
                type="text"
                inputMode="decimal"
                pattern="-?[0-9]*[.]?[0-9]*"
                required
                value={form.resultR}
                placeholder="-1 or 2.5"
                onChange={(event) => onFormChange({ ...form, resultR: event.target.value })}
              />
            </label>
            <label className="wide-field">
              <span>I didn&apos;t take this trade because...</span>
              <input
                list="discipline-reasons"
                required
                value={form.reasonCancelled}
                placeholder="Rule not met, news risk, hesitation..."
                onChange={(event) => onFormChange({ ...form, reasonCancelled: event.target.value })}
              />
              <datalist id="discipline-reasons">
                {cancellationReasons.filter((reason) => reason !== "None").map((reason) => <option key={reason} value={reason} />)}
              </datalist>
            </label>
          </div>
        </section>

        <section className="trade-form-section trade-journal-section">
          <div className="discipline-upload-grid">
            <label className="file-field">
              <span>Pre image {editingEntry?.screenshot ? "(saved — choose only to replace)" : ""}</span>
              <input type="file" accept="image/*" onChange={(event) => onFormChange({ ...form, screenshotFile: event.target.files?.[0] || null })} />
              <ImagePlus size={18} />
            </label>
            <label className="file-field">
              <span>Post image {editingEntry?.postImage ? "(saved — choose only to replace)" : ""}</span>
              <input type="file" accept="image/*" onChange={(event) => onFormChange({ ...form, postImageFile: event.target.files?.[0] || null })} />
              <ImagePlus size={18} />
            </label>
          </div>
          <label>
            <span>Notes</span>
            <textarea rows={4} value={form.notes} placeholder="What rule protected you—or what made you hesitate?" onChange={(event) => onFormChange({ ...form, notes: event.target.value })} />
          </label>
          <div className="form-actions">
            <button className="primary-action" type="submit" disabled={isSyncing}>
              <ShieldCheck size={18} />
              {form.id ? "Update entry" : "Save discipline entry"}
            </button>
            <button className="ghost-action" type="button" onClick={onClear}><RefreshCcw size={18} />Clear</button>
          </div>
        </section>
      </form> : null}

      {activeDisciplineTab === "records" ? <div className="trade-list decision-list" aria-live="polite">
        {isSyncing ? <DataLoadingRow label="Loading discipline entries" /> : null}
        {!isSyncing && entries.length === 0 ? (
          <div className="empty-state"><strong>No skipped trades logged yet</strong><p>Your next disciplined pass can become useful review data here.</p></div>
        ) : entries.map((entry) => {
          const images: ImageViewerItem[] = [
            entry.screenshot ? { id: `${entry.id}-pre`, src: entry.screenshot, alt: `${entry.pair} pre-trade chart`, title: `${entry.pair} pre image`, meta: `${entry.setup} / ${formatOrdinalDate(entry.date)}` } : null,
            entry.postImage ? { id: `${entry.id}-post`, src: entry.postImage, alt: `${entry.pair} post-trade chart`, title: `${entry.pair} post image`, meta: `${formatNumber(entry.resultR)}R result` } : null,
          ].filter((item): item is ImageViewerItem => Boolean(item));

          return (
            <article className={`decision-card ${entry.resultR < 0 ? "is-taken" : entry.resultR > 0 ? "is-missed" : "is-waiting"}`} key={entry.id}>
              <div className="decision-card-main">
                <header><span className="chip">{entry.pair}</span><span className="chip">{entry.direction}</span><span className="chip">{entry.setup}</span></header>
                <div className="trade-card-title">
                  <div><strong>{entry.pair}</strong><span>Skipped because: {entry.reasonCancelled}</span></div>
                  <strong className={`decision-risk ${entry.resultR > 0 ? "negative-r" : entry.resultR < 0 ? "positive-r" : ""}`}>{formatNumber(entry.resultR)}R</strong>
                </div>
                <div className="trade-meta decision-meta">
                  <Meta label="Date" value={formatOrdinalDate(entry.date)} />
                  <Meta label="Time" value={formatTime12(entry.time)} />
                  <Meta label="Outcome" value={entry.resultR > 0 ? "Missed winner" : entry.resultR < 0 ? "Loss avoided" : "Breakeven"} />
                  <Meta label="Reason" value={entry.reasonCancelled} />
                </div>
                {entry.notes ? <p className="trade-notes">{entry.notes}</p> : null}
                <div className="trade-actions">
                  <button className="icon-button" type="button" onClick={() => { onEdit(entry); setActiveDisciplineTab("add"); }}><Pencil size={16} />Edit</button>
                  <label className={`icon-button discipline-quick-upload${isSyncing ? " is-disabled" : ""}`} aria-disabled={isSyncing}>
                    <ImagePlus size={16} />
                    {entry.postImage ? "Replace post image" : "Add post image"}
                    <input
                      className="discipline-quick-upload-input"
                      type="file"
                      accept="image/*"
                      disabled={isSyncing}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void onPostImageChange(entry, file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <button className="icon-button danger" type="button" onClick={() => onDelete(entry)}><Trash2 size={16} />Delete</button>
                </div>
              </div>
              <div className="decision-media-grid">
                {entry.screenshot ? <button className="shot-button" type="button" title="Open full-size pre image" onClick={() => onOpenImage(images, 0)}><span>Pre</span><img className="trade-shot" src={entry.screenshot} alt={`${entry.pair} pre-trade chart`} /></button> : <div className="discipline-image-empty">Pre image</div>}
                {entry.postImage ? <button className="shot-button" type="button" title="Open full-size post image" onClick={() => onOpenImage(images, entry.screenshot ? 1 : 0)}><span>Post</span><img className="trade-shot" src={entry.postImage} alt={`${entry.pair} post-trade chart`} /></button> : <div className="discipline-image-empty">Post image</div>}
              </div>
            </article>
          );
        })}
      </div> : null}
    </section>
  );
}

function TradeCard({
  trade,
  onEdit,
  onDelete,
  onViewImage,
  onQualityChange,
  isSavingQuality,
}: {
  trade: Trade;
  onEdit: () => void;
  onDelete: () => void;
  onViewImage: () => void;
  onQualityChange: (quality: TradeQuality) => void;
  isSavingQuality: boolean;
}) {
  return (
    <article className={`trade-card ${trade.pnl >= 0 ? "is-positive" : "is-negative"}`}>
      <div className="trade-card-main">
        <header>
          <span className="chip">{trade.pair}</span>
          <span className="chip">{trade.direction}</span>
          <span className={`chip ${trade.result.toLowerCase()}`}>{trade.result}</span>
          <span className="chip">{trade.setup}</span>
          <span className="chip">{trade.finalizedAt ? "Locked" : "Pending final"}</span>
        </header>

        <div className="trade-card-title">
          <div>
            <strong>{trade.pair}</strong>
            <span>{trade.setup} / {trade.direction}</span>
          </div>
          <strong className={`trade-pnl ${trade.pnl >= 0 ? "positive-r" : "negative-r"}`}>
            {formatNumber(trade.pnl)}R
          </strong>
        </div>

        <div className="trade-meta">
          <Meta label="Date" value={formatOrdinalDate(trade.date)} />
          <Meta label="Time" value={formatTime12(trade.time)} />
          <Meta label="SL" value={trade.stopLossPips === null ? "-" : `${formatNumber(trade.stopLossPips)} pips`} />
          <Meta label="MAE" value={`${formatNumber(trade.mae)}R`} />
          <Meta label="PnL" value={`${formatNumber(trade.pnl)}R`} />
          <Meta label="Logged" value={formatOrdinalDate(trade.createdAt.slice(0, 10))} />
        </div>

        {trade.notes ? <p className="trade-notes">{trade.notes}</p> : null}

        <fieldset className="trade-quality-review" disabled={isSavingQuality}>
          <legend>How was the trade quality?</legend>
          <span>Rate your execution, not the result.</span>
          <div className="trade-quality-options">
            {(["Good", "Mid", "Bad"] as TradeQuality[]).map((quality) => (
              <button
                className={`quality-option is-${quality.toLowerCase()} ${trade.quality === quality ? "is-selected" : ""}`}
                type="button"
                aria-pressed={trade.quality === quality}
                onClick={() => onQualityChange(quality)}
                key={quality}
              >
                {quality}
              </button>
            ))}
          </div>
          {isSavingQuality ? <small>Saving review…</small> : null}
        </fieldset>

        <div className="trade-actions">
          {trade.finalizedAt ? (
            <span className="integrity-lock">
              <ShieldCheck size={15} />
              Finalized
            </span>
          ) : (
            <button className="icon-button" type="button" onClick={onEdit}>
              <Pencil size={16} />
              Finalize
            </button>
          )}
          {!trade.finalizedAt ? (
            <button className="icon-button danger" type="button" onClick={onDelete}>
              <Trash2 size={16} />
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <div className="trade-card-media">
        {trade.screenshot ? (
          <button className="shot-button" type="button" onClick={onViewImage}>
            <img className="trade-shot" src={trade.screenshot} alt={`${trade.pair} trade screenshot`} />
          </button>
        ) : (
          <div className="trade-shot" aria-label="No screenshot" />
        )}
      </div>
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
    <article className="trade-card backtest-record-card">
      <div className="backtest-record-main">
        <header>
          <span className="chip">{backtest.pair}</span>
          <span className="chip">{backtest.direction}</span>
          <span className={`chip ${backtest.result.toLowerCase()}`}>{backtest.result}</span>
          <span className="chip">{backtest.setup}</span>
          <span className="chip">Scale: {backtest.scaleIn}</span>
        </header>

        <div className="trade-meta backtest-meta">
          <Meta label="Date" value={formatOrdinalDate(backtest.date)} />
          <Meta label="Time" value={formatTime12(backtest.time)} />
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
          {backtest.screenshot ? (
            <button
              className="icon-button backtest-chart-button"
              type="button"
              title="Open chart"
              aria-label={`Open ${backtest.pair} backtest chart`}
              onClick={onViewImage}
            >
              <BarChart3 size={15} />
              Chart
            </button>
          ) : null}
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
    </article>
  );
}

type TradeQualityAnalytics = {
  rows: PerformanceRow[];
  reviewed: number;
  unrated: number;
  coverage: number;
  goodRate: number;
  processOutcomeMismatches: number;
  goodLosses: number;
  badWins: number;
  qualityEdge: number | null;
  bestQuality: PerformanceRow | null;
};

function calculateTradeQualityAnalytics(sourceTrades: Trade[]): TradeQualityAnalytics {
  const ratings: TradeQuality[] = ["Good", "Mid", "Bad"];
  const reviewed = sourceTrades.filter((trade) => trade.quality);
  const rows = ratings.map((rating) => {
    const ratedTrades = reviewed.filter((trade) => trade.quality === rating);
    const wins = ratedTrades.filter((trade) => trade.pnl > 0);
    const losses = ratedTrades.filter((trade) => trade.pnl < 0);
    const totalR = ratedTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossWin = wins.reduce((sum, trade) => sum + trade.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));

    return {
      label: rating,
      trades: ratedTrades.length,
      totalR,
      averageR: ratedTrades.length ? totalR / ratedTrades.length : 0,
      winRate: ratedTrades.length ? Math.round((wins.length / ratedTrades.length) * 100) : 0,
      profitFactor: grossLoss === 0 ? grossWin : grossWin / grossLoss,
      averageMae: ratedTrades.length
        ? ratedTrades.reduce((sum, trade) => sum + trade.mae, 0) / ratedTrades.length
        : 0,
    };
  });
  const good = rows[0];
  const bad = rows[2];
  const ratedRows = rows.filter((row) => row.trades > 0);
  const goodLosses = reviewed.filter((trade) => trade.quality === "Good" && trade.pnl < 0).length;
  const badWins = reviewed.filter((trade) => trade.quality === "Bad" && trade.pnl > 0).length;

  return {
    rows,
    reviewed: reviewed.length,
    unrated: sourceTrades.length - reviewed.length,
    coverage: sourceTrades.length ? Math.round((reviewed.length / sourceTrades.length) * 100) : 0,
    goodRate: reviewed.length ? Math.round((good.trades / reviewed.length) * 100) : 0,
    processOutcomeMismatches: goodLosses + badWins,
    goodLosses,
    badWins,
    qualityEdge: good.trades && bad.trades ? good.averageR - bad.averageR : null,
    bestQuality: ratedRows.length
      ? [...ratedRows].sort((a, b) => b.averageR - a.averageR)[0]
      : null,
  };
}

function TradeQualityAdvancedAnalytics({ data, periodLabel }: { data: TradeQualityAnalytics; periodLabel: string }) {
  return (
    <section className="quality-advanced-panel" aria-label="Advanced execution-quality analytics">
      <div className="panel-header">
        <span>Execution quality analytics</span>
        <strong>{periodLabel}</strong>
      </div>

      <div className="stat-grid analytics-grid quality-analytics-stats">
        <Stat label="Review coverage" value={`${data.coverage}% · ${data.reviewed} reviewed`} />
        <Stat label="Unrated trades" value={String(data.unrated)} />
        <Stat label="Good execution rate" value={`${data.goodRate}%`} />
        <Stat
          label="Good vs Bad expectancy gap"
          value={data.qualityEdge === null ? "Need both ratings" : `${formatNumber(data.qualityEdge)}R`}
        />
        <Stat
          label="Best quality expectancy"
          value={data.bestQuality ? `${data.bestQuality.label} · ${formatNumber(data.bestQuality.averageR)}R` : "-"}
        />
        <Stat label="Process/outcome mismatches" value={String(data.processOutcomeMismatches)} />
      </div>

      <div className="quality-advanced-grid">
        <PerformanceTable title="Good / Mid / Bad comparison" rows={data.rows} />
        <article className="performance-card quality-outcome-card">
          <div className="panel-header">
            <span>Process vs outcome</span>
            <strong>{data.processOutcomeMismatches} mismatches</strong>
          </div>
          <p>A disciplined execution can lose, while a poor execution can still win. These are the trades worth reviewing first.</p>
          <div className="quality-outcome-list">
            <div className="is-good">
              <span>Good trades that lost</span>
              <strong>{data.goodLosses}</strong>
              <small>Correct process, unfavorable outcome</small>
            </div>
            <div className="is-bad">
              <span>Bad trades that won</span>
              <strong>{data.badWins}</strong>
              <small>Favorable outcome, risky process</small>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function TradeQualitySummary({ data }: { data: TradeQualityAnalytics }) {
  return (
    <section className="quality-summary" aria-label="Post-trade quality analytics">
      <div className="quality-summary-copy">
        <div>
          <p className="eyebrow">Process over outcome</p>
          <h3>Post-trade quality</h3>
        </div>
        <p>Judge how well you executed the plan, independently from whether the trade won or lost.</p>
      </div>
      <div className="quality-summary-stats">
        <Meta label="Reviewed" value={`${data.reviewed} · ${data.coverage}% coverage`} />
        <Meta label="Good quality" value={`${data.goodRate}% of reviews`} />
        <Meta
          label="Good vs Bad edge"
          value={data.qualityEdge === null ? "Need both ratings" : `${formatNumber(data.qualityEdge)}R avg gap`}
        />
        <Meta label="Process ≠ outcome" value={`${data.processOutcomeMismatches} trades`} />
      </div>
      <div className="quality-breakdown">
        {data.rows.map((row) => (
          <article className={`quality-breakdown-card is-${row.label.toLowerCase()}`} key={row.label}>
            <strong>{row.label}</strong>
            <span>{row.trades} trade{row.trades === 1 ? "" : "s"}</span>
            <small>{formatNumber(row.averageR)}R avg · {row.winRate}% win rate</small>
          </article>
        ))}
      </div>
    </section>
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


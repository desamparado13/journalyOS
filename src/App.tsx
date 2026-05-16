import {
  BarChart3,
  CalendarClock,
  ImagePlus,
  LogOut,
  Moon,
  Pencil,
  Plus,
  RefreshCcw,
  Sun,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

const AUTH_USERS_KEY = "journaly-os-users";
const AUTH_SESSION_KEY = "journaly-os-session";
const TRADES_KEY_PREFIX = "journaly-os-trades";
const THEME_KEY = "journaly-os-theme";

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
type AppView = "dashboard" | "add-trade" | "journal";

type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
};

type SessionUser = Pick<UserRecord, "id" | "email">;

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
  createdAt: string;
  updatedAt: string;
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

type AuthFormState = {
  email: string;
  password: string;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "") || fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
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

function formatNumber(value: number) {
  return Number(value || 0).toFixed(2);
}

function getPreferredTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authForm, setAuthForm] = useState<AuthFormState>({ email: "", password: "" });
  const [authMessage, setAuthMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(() =>
    readJson<SessionUser | null>(AUTH_SESSION_KEY, null),
  );
  const [theme, setTheme] = useState<Theme>(getPreferredTheme);
  const [tradeForm, setTradeForm] = useState<TradeFormState>(todayDefaults);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [resultFilter, setResultFilter] = useState<"All" | Result>("All");
  const [pairFilter, setPairFilter] = useState("All");
  const [activeView, setActiveView] = useState<AppView>("dashboard");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!currentUser) {
      setTrades([]);
      return;
    }

    setTrades(readJson<Trade[]>(`${TRADES_KEY_PREFIX}:${currentUser.id}`, []));
    setTradeForm(todayDefaults());
  }, [currentUser]);

  const filteredTrades = useMemo(() => {
    return trades
      .filter((trade) => resultFilter === "All" || trade.result === resultFilter)
      .filter((trade) => pairFilter === "All" || trade.pair === pairFilter)
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }, [pairFilter, resultFilter, trades]);

  const stats = useMemo(() => {
    const wins = trades.filter((trade) => trade.result === "Win").length;
    const totalR = trades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
    const avgMae =
      trades.length === 0
        ? 0
        : trades.reduce((sum, trade) => sum + Number(trade.mae || 0), 0) / trades.length;

    return {
      totalTrades: trades.length,
      winRate: trades.length === 0 ? 0 : Math.round((wins / trades.length) * 100),
      totalR,
      avgMae,
      healthLabel: trades.length === 0 ? "Ready" : totalR >= 0 ? "Profitable" : "Review needed",
    };
  }, [trades]);

  function persistTrades(nextTrades: Trade[]) {
    if (!currentUser) return;
    setTrades(nextTrades);
    writeJson(`${TRADES_KEY_PREFIX}:${currentUser.id}`, nextTrades);
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = normalizeEmail(authForm.email);
    const users = readJson<UserRecord[]>(AUTH_USERS_KEY, []);
    const existingUser = users.find((user) => user.email === email);

    if (authMode === "signup") {
      if (existingUser) {
        setAuthMessage("That email already has a Journaly OS account.");
        return;
      }

      const salt = crypto.randomUUID();
      const user: UserRecord = {
        id: crypto.randomUUID(),
        email,
        passwordHash: await hashPassword(authForm.password, salt),
        salt,
        createdAt: new Date().toISOString(),
      };
      const session = { id: user.id, email: user.email };

      writeJson(AUTH_USERS_KEY, [...users, user]);
      writeJson(AUTH_SESSION_KEY, session);
      setCurrentUser(session);
      setAuthMessage("");
      return;
    }

    if (!existingUser) {
      setAuthMessage("No account found for that email.");
      return;
    }

    const passwordHash = await hashPassword(authForm.password, existingUser.salt);
    if (passwordHash !== existingUser.passwordHash) {
      setAuthMessage("Password is incorrect.");
      return;
    }

    const session = { id: existingUser.id, email: existingUser.email };
    writeJson(AUTH_SESSION_KEY, session);
    setCurrentUser(session);
    setAuthMessage("");
  }

  async function handleTradeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) return;

    const existing = trades.find((trade) => trade.id === tradeForm.id);
    const uploadedShot = await fileToDataUrl(tradeForm.screenshotFile);
    const trade: Trade = {
      id: tradeForm.id || crypto.randomUUID(),
      userId: currentUser.id,
      date: tradeForm.date,
      time: tradeForm.time,
      pair: tradeForm.pair,
      setup: tradeForm.setup,
      direction: tradeForm.direction,
      mae: Number(tradeForm.mae || 0),
      pnl: Number(tradeForm.pnl || 0),
      result: tradeForm.result,
      notes: tradeForm.notes.trim(),
      screenshot: uploadedShot || existing?.screenshot || "",
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    persistTrades(existing ? trades.map((item) => (item.id === trade.id ? trade : item)) : [trade, ...trades]);
    setTradeForm(todayDefaults());
    setActiveView("journal");
  }

  function logout() {
    localStorage.removeItem(AUTH_SESSION_KEY);
    setCurrentUser(null);
    setAuthForm({ email: "", password: "" });
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
  }

  function deleteTrade(id: string) {
    persistTrades(trades.filter((trade) => trade.id !== id));
  }

  if (!currentUser) {
    const isSignup = authMode === "signup";

    return (
      <section className="auth-screen">
        <Brand className="auth-brand" />

        <div className="auth-layout">
          <div className="auth-copy">
            <p className="eyebrow">Secure trade workspace</p>
            <h1>Sign in before the market teaches the lesson twice.</h1>
            <p>
              Keep every setup, screenshot, and review note tied to your own session today, then
              move the same account flow to Supabase Auth when you are ready to scale.
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
            className={activeView === "add-trade" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("add-trade")}
          >
            Add trade
          </button>
          <button
            className={activeView === "journal" ? "is-active" : ""}
            type="button"
            onClick={() => setActiveView("journal")}
          >
            View trades
          </button>
        </nav>

        <div className="top-actions">
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

      <main>
        {activeView === "dashboard" ? (
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Execution intelligence for FX traders</p>
            <h1>Journal every trade like it belongs in a serious operating system.</h1>
            <p>
              Log screenshots, setups, direction, R-multiple, MAE, and review notes in one calm
              workspace built for disciplined trading.
            </p>
            <div className="hero-actions">
              <button className="primary-action" type="button" onClick={() => setActiveView("add-trade")}>
                <Plus size={18} />
                Add trade
              </button>
              <button className="secondary-action" type="button" onClick={() => setActiveView("journal")}>
                <BarChart3 size={18} />
                View trades
              </button>
            </div>
          </div>

          <section className="market-panel" aria-label="Performance summary">
            <div className="panel-header">
              <span>Journal health</span>
              <strong>{stats.healthLabel}</strong>
            </div>
            <div className="stat-grid">
              <Stat label="Total trades" value={String(stats.totalTrades)} />
              <Stat label="Win rate" value={`${stats.winRate}%`} />
              <Stat label="Total R" value={`${formatNumber(stats.totalR)}R`} />
              <Stat label="Avg MAE" value={`${formatNumber(stats.avgMae)}R`} />
            </div>
          </section>
        </section>
        ) : null}

        {activeView === "add-trade" ? (
        <section className="workspace-band">
          <div className="section-heading">
            <p className="eyebrow">Trade capture</p>
            <h2>{tradeForm.id ? "Edit trade" : "Add a trade"}</h2>
          </div>

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
              <button className="primary-action" type="submit">
                <CalendarClock size={18} />
                {tradeForm.id ? "Update trade" : "Save trade"}
              </button>
              <button className="ghost-action" type="button" onClick={() => setTradeForm(todayDefaults())}>
                <RefreshCcw size={18} />
                Clear
              </button>
            </div>
          </form>
        </section>
        ) : null}

        {activeView === "journal" ? (
        <section className="journal-band">
          <div className="section-heading">
            <p className="eyebrow">Trade archive</p>
            <h2>View trades</h2>
          </div>

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
          </div>

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
                  onDelete={() => deleteTrade(trade.id)}
                />
              ))
            )}
          </div>
        </section>
        ) : null}
      </main>
    </div>
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
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
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
}: {
  trade: Trade;
  onEdit: () => void;
  onDelete: () => void;
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
        <img className="trade-shot" src={trade.screenshot} alt={`${trade.pair} trade screenshot`} />
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

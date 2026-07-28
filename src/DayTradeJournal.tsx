import {
  BarChart3,
  ClipboardCheck,
  FlaskConical,
  ImagePlus,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

export type DayTradeView = "daytrade-dashboard" | "daytrade-add" | "daytrade-backtest";

type Direction = "Buy" | "Sell";
type Grade = "A+" | "A" | "B" | "C";
type Outcome = "Win" | "Loss" | "Breakeven";
type TradingDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
type YesNo = "Yes" | "No";
type PreviousImbalance = "None" | "Prev" | "1" | "2" | "3";
type LiquidityContext = "None" | "Order block" | "Liquidity area" | "Both";
type EntryRetracement = "0.618" | "0.786";
type DurationUnit = "Minutes" | "Hours";

type DayTradeRecord = {
  id: string;
  date: string;
  tradingDay: TradingDay;
  pair: "GBPUSD";
  session: string;
  direction: Direction;
  accumulationQuality: string;
  imbalanceQuality: string;
  entryRetracement: EntryRetracement;
  durationHours: number;
  hasNews: YesNo;
  newsEvents: string[];
  previousImbalance: PreviousImbalance;
  liquidityContext: LiquidityContext;
  mae: number;
  mfe: number;
  resultR: number;
  outcome: Outcome;
  grade: Grade;
  accumulationImage: string;
  imbalanceImage: string;
  beforeImage: string;
  afterImage: string;
  notes: string;
  createdAt: string;
};

type DayTradeForm = Omit<
  DayTradeRecord,
  "id" | "createdAt" | "accumulationImage" | "imbalanceImage" | "beforeImage" | "afterImage"
> & {
  durationUnit: DurationUnit;
  accumulationFile: File | null;
  imbalanceFile: File | null;
  beforeFile: File | null;
  afterFile: File | null;
};

const tradingDays: TradingDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function tradingDayFromDate(date: string): TradingDay {
  const day = new Date(`${date}T12:00:00`).getDay();
  if (day === 1) return "Monday";
  if (day === 2) return "Tuesday";
  if (day === 3) return "Wednesday";
  if (day === 4) return "Thursday";
  if (day === 5) return "Friday";
  return "Monday";
}

function isWeekday(date: string) {
  const day = new Date(`${date}T12:00:00`).getDay();
  return day >= 1 && day <= 5;
}

function newsHistoryUrl(date: string) {
  const selected = new Date(`${date}T12:00:00`);
  const month = selected.toLocaleString("en-US", { month: "short" }).toLowerCase();
  return `https://www.forexfactory.com/calendar?day=${month}${selected.getDate()}.${selected.getFullYear()}`;
}

function blankForm(): DayTradeForm {
  const today = new Date().toISOString().slice(0, 10);
  return {
    date: today,
    tradingDay: tradingDayFromDate(today),
    pair: "GBPUSD",
    session: "London",
    direction: "Buy",
    accumulationQuality: "Clear",
    imbalanceQuality: "Strong",
    entryRetracement: "0.618",
    durationHours: 2,
    durationUnit: "Hours",
    hasNews: "No",
    newsEvents: [],
    previousImbalance: "None",
    liquidityContext: "None",
    mae: 0,
    mfe: 0,
    resultR: 0,
    outcome: "Breakeven",
    grade: "A",
    notes: "",
    accumulationFile: null,
    imbalanceFile: null,
    beforeFile: null,
    afterFile: null,
  };
}

function fileToDataUrl(file: File | null) {
  if (!file) return Promise.resolve("");
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function fromRow(row: any): DayTradeRecord {
  return {
    id: row.id,
    date: row.trade_date,
    tradingDay: row.trading_day || tradingDayFromDate(row.trade_date),
    pair: "GBPUSD",
    session: row.session || "London",
    direction: row.direction,
    accumulationQuality: row.accumulation_quality,
    imbalanceQuality: row.imbalance_quality,
    entryRetracement: row.retracement_depth || "0.618",
    durationHours: Number(row.trade_duration_hours || 0),
    hasNews: row.has_news ? "Yes" : "No",
    newsEvents: Array.isArray(row.news_events) && row.news_events.length
      ? row.news_events.filter((event: unknown) => typeof event === "string" && event.trim())
      : String(row.news_details || "").split(",").map((event) => event.trim()).filter(Boolean),
    previousImbalance: row.previous_imbalance_sessions || "None",
    liquidityContext: row.liquidity_context || "None",
    mae: Number(row.mae_r || 0),
    mfe: Number(row.mfe_r || 0),
    resultR: Number(row.result_r || 0),
    outcome: row.outcome,
    grade: row.trade_grade,
    accumulationImage: row.accumulation_image_url || "",
    imbalanceImage: row.imbalance_image_url || "",
    beforeImage: row.before_image_url || "",
    afterImage: row.after_image_url || "",
    notes: row.notes || "",
    createdAt: row.created_at,
  };
}

function calculateMetrics(records: DayTradeRecord[]) {
  const ordered = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const wins = ordered.filter((trade) => trade.resultR > 0);
  const losses = ordered.filter((trade) => trade.resultR < 0);
  const grossProfit = wins.reduce((sum, trade) => sum + trade.resultR, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.resultR, 0));
  let equity = 0;
  let peak = 0;
  let drawdown = 0;
  let winRun = 0;
  let lossRun = 0;
  let bestWinRun = 0;
  let worstLossRun = 0;
  ordered.forEach((trade) => {
    equity += trade.resultR;
    peak = Math.max(peak, equity);
    drawdown = Math.max(drawdown, peak - equity);
    winRun = trade.resultR > 0 ? winRun + 1 : 0;
    lossRun = trade.resultR < 0 ? lossRun + 1 : 0;
    bestWinRun = Math.max(bestWinRun, winRun);
    worstLossRun = Math.max(worstLossRun, lossRun);
  });
  return {
    count: ordered.length,
    winRate: ordered.length ? (wins.length / ordered.length) * 100 : 0,
    averageR: ordered.length ? ordered.reduce((sum, trade) => sum + trade.resultR, 0) / ordered.length : 0,
    profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit,
    mae: ordered.length ? ordered.reduce((sum, trade) => sum + trade.mae, 0) / ordered.length : 0,
    mfe: ordered.length ? ordered.reduce((sum, trade) => sum + trade.mfe, 0) / ordered.length : 0,
    duration: ordered.length ? ordered.reduce((sum, trade) => sum + trade.durationHours, 0) / ordered.length : 0,
    drawdown,
    bestWinRun,
    worstLossRun,
  };
}

function formatDuration(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  const rounded = Number(hours.toFixed(1));
  return `${rounded}h`;
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="daytrade-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "daytrade-wide" : ""}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function DayTradeJournal({
  userId,
  activeView,
  onViewChange,
}: {
  userId: string;
  activeView: DayTradeView;
  onViewChange: (view: DayTradeView) => void;
}) {
  const [records, setRecords] = useState<DayTradeRecord[]>([]);
  const [form, setForm] = useState<DayTradeForm>(blankForm);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [dayFilter, setDayFilter] = useState("All");
  const [newsFilter, setNewsFilter] = useState("All");
  const [gradeFilter, setGradeFilter] = useState("All");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) {
        setMessage("Connect Supabase to use the DayTrade journal.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const backtest = await supabase
        .from("daytrade_backtests")
        .select("*")
        .eq("user_id", userId)
        .eq("pair", "GBPUSD")
        .order("trade_date", { ascending: false });
      if (!active) return;
      if (backtest.error) {
        setMessage("DayTrade fields are not ready yet. Apply supabase-daytrade-strategy.sql to your Supabase project.");
      } else {
        setRecords((backtest.data || []).map(fromRow));
      }
      setIsLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  const filtered = useMemo(
    () =>
      records.filter(
        (trade) =>
          (dayFilter === "All" || trade.tradingDay === dayFilter) &&
          (newsFilter === "All" || trade.hasNews === newsFilter) &&
          (gradeFilter === "All" || trade.grade === gradeFilter),
      ),
    [dayFilter, gradeFilter, newsFilter, records],
  );

  const metrics = useMemo(() => calculateMetrics(filtered), [filtered]);
  const dayRows = useMemo(
    () => tradingDays.map((day) => ({ label: day, ...calculateMetrics(filtered.filter((trade) => trade.tradingDay === day)) })),
    [filtered],
  );

  async function saveTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    if (!isWeekday(form.date)) {
      setMessage("DayTrade backtests can only be logged from Monday through Friday.");
      return;
    }
    if (!form.accumulationFile || !form.imbalanceFile || !form.beforeFile || !form.afterFile) {
      setMessage("Accumulation, imbalance, before-entry, and after-entry images are required.");
      return;
    }
    setIsLoading(true);
    setMessage("");
    try {
      const [accumulationImage, imbalanceImage, beforeImage, afterImage] = await Promise.all([
        fileToDataUrl(form.accumulationFile),
        fileToDataUrl(form.imbalanceFile),
        fileToDataUrl(form.beforeFile),
        fileToDataUrl(form.afterFile),
      ]);
      const payload = {
        user_id: userId,
        trade_date: form.date,
        trading_day: form.tradingDay,
        pair: "GBPUSD",
        session: "London",
        timeframe: "15M",
        direction: form.direction,
        accumulation_quality: form.accumulationQuality,
        imbalance_quality: form.imbalanceQuality,
        retracement_depth: form.entryRetracement,
        trade_duration_hours: form.durationUnit === "Minutes" ? form.durationHours / 60 : form.durationHours,
        has_news: form.hasNews === "Yes",
        news_events: form.hasNews === "Yes" ? form.newsEvents.map((event) => event.trim()).filter(Boolean) : [],
        news_details: form.hasNews === "Yes" ? form.newsEvents.map((event) => event.trim()).filter(Boolean).join(", ") : "",
        previous_imbalance_sessions: form.previousImbalance,
        liquidity_context: form.liquidityContext,
        mae_r: form.mae,
        mfe_r: form.mfe,
        result_r: form.resultR,
        outcome: form.outcome,
        trade_grade: form.grade,
        accumulation_image_url: accumulationImage,
        imbalance_image_url: imbalanceImage,
        before_image_url: beforeImage,
        after_image_url: afterImage,
        notes: form.notes.trim(),
      };
      const { data, error } = await supabase.from("daytrade_backtests").insert(payload).select("*").single();
      if (error) throw error;
      setRecords((current) => [fromRow(data), ...current]);
      setForm(blankForm());
      onViewChange("daytrade-backtest");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this backtest.");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteTrade(trade: DayTradeRecord) {
    if (!supabase || !window.confirm(`Delete this GBPUSD backtest from ${trade.date}?`)) return;
    const { error } = await supabase.from("daytrade_backtests").delete().eq("id", trade.id).eq("user_id", userId);
    if (error) {
      setMessage(error.message);
      return;
    }
    setRecords((current) => current.filter((item) => item.id !== trade.id));
  }

  return (
    <section className="daytrade-app">
      <header className="daytrade-hero">
        <div>
          <p className="eyebrow">GBPUSD · 15M · London session</p>
          <h1>DayTrade Backtesting</h1>
          <p>Build evidence on one pair before enabling live execution. Compare accumulation, imbalance, session context, and outcome across every sample.</p>
        </div>
        <div className="daytrade-rule-score">
          <span>Current mode</span>
          <strong>Backtest only</strong>
          <small>Live trading is disabled</small>
        </div>
      </header>

      {message ? <div className="daytrade-message">{message}</div> : null}

      {activeView !== "daytrade-add" ? (
        <div className="daytrade-filters" aria-label="DayTrade filters">
          <Field label="Pair"><input readOnly value="GBPUSD" /></Field>
          <Field label="Day"><select value={dayFilter} onChange={(event) => setDayFilter(event.target.value)}><option>All</option>{tradingDays.map((day) => <option key={day}>{day}</option>)}</select></Field>
          <Field label="News"><select value={newsFilter} onChange={(event) => setNewsFilter(event.target.value)}><option>All</option><option>Yes</option><option>No</option></select></Field>
          <Field label="Trade grade"><select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}><option>All</option>{(["A+", "A", "B", "C"] as Grade[]).map((grade) => <option key={grade}>{grade}</option>)}</select></Field>
        </div>
      ) : null}

      {activeView === "daytrade-dashboard" ? (
        <>
          <div className="daytrade-metric-grid">
            <Metric label="Win rate" value={`${metrics.winRate.toFixed(0)}%`} detail={`${metrics.count} filtered samples`} />
            <Metric label="Average R" value={`${metrics.averageR.toFixed(2)}R`} detail="Expectancy per backtest" />
            <Metric label="Profit factor" value={metrics.profitFactor.toFixed(2)} />
            <Metric label="Average duration" value={formatDuration(metrics.duration)} />
            <Metric label="Average MAE" value={`${metrics.mae.toFixed(2)}R`} />
            <Metric label="Average MFE" value={`${metrics.mfe.toFixed(2)}R`} />
            <Metric label="Max drawdown" value={`${metrics.drawdown.toFixed(2)}R`} />
            <Metric label="Best / worst streak" value={`${metrics.bestWinRun}W · ${metrics.worstLossRun}L`} />
          </div>

          <div className="daytrade-dashboard-grid">
            <article className="daytrade-panel">
              <div className="daytrade-panel-heading"><div><span>GBPUSD research</span><h2>Backtest database</h2></div><BarChart3 size={22} /></div>
              <div className="daytrade-compare">
                <div><span>Total samples</span><strong>{metrics.count}</strong><small>{metrics.winRate.toFixed(0)}% win rate</small></div>
                <div><span>With news</span><strong>{filtered.filter((trade) => trade.hasNews === "Yes").length}</strong><small>Historical news marked on trade day</small></div>
              </div>
            </article>
            <article className="daytrade-panel">
              <div className="daytrade-panel-heading"><div><span>Day comparison</span><h2>Expectancy by trading day</h2></div><Target size={22} /></div>
              <div className="daytrade-edge-table">
                {dayRows.map((row) => (
                  <div key={row.label}><strong>{row.label}</strong><span>{row.count} trades</span><b className={row.averageR >= 0 ? "positive-r" : "negative-r"}>{row.averageR.toFixed(2)}R avg</b><span>{row.winRate.toFixed(0)}% win</span></div>
                ))}
              </div>
            </article>
          </div>
        </>
      ) : null}

      {activeView === "daytrade-add" ? (
        <form className="daytrade-form" onSubmit={saveTrade}>
          <div className="daytrade-form-heading">
            <div><span>New GBPUSD sample</span><h2>Log a backtest</h2><p>Record the structure and session context so you can compare like-for-like setups later.</p></div>
          </div>

          <section className="daytrade-form-section">
            <h3>Market context</h3>
            <div className="daytrade-field-grid">
              <Field label="Database"><input readOnly value="Backtest" /></Field>
              <Field label="Date"><input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value, tradingDay: tradingDayFromDate(event.target.value) })} /></Field>
              <Field label="Trading day"><select value={form.tradingDay} onChange={(event) => setForm({ ...form, tradingDay: event.target.value as TradingDay })}>{tradingDays.map((day) => <option key={day}>{day}</option>)}</select></Field>
              <Field label="Pair"><input readOnly value="GBPUSD" /></Field>
              <Field label="Session"><input readOnly value="London" /></Field>
              <Field label="Timeframe"><input readOnly value="15M" /></Field>
              <Field label="Direction"><select value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value as Direction })}><option>Buy</option><option>Sell</option></select></Field>
              <Field label="Trade grade"><select value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value as Grade })}>{(["A+", "A", "B", "C"] as Grade[]).map((grade) => <option key={grade}>{grade}</option>)}</select></Field>
              <Field label="News on this day?"><select value={form.hasNews} onChange={(event) => setForm({ ...form, hasNews: event.target.value as YesNo, newsEvents: event.target.value === "Yes" ? (form.newsEvents.length ? form.newsEvents : [""]) : [] })}><option>No</option><option>Yes</option></select></Field>
              <a className="daytrade-news-check" href={newsHistoryUrl(form.date)} target="_blank" rel="noreferrer">Check {form.date} news history ↗</a>
              {form.hasNews === "Yes" ? (
                <div className="daytrade-news-events daytrade-wide">
                  <span>News events</span>
                  {form.newsEvents.map((newsEvent, index) => (
                    <div key={index}>
                      <input required value={newsEvent} placeholder={index === 0 ? "e.g. ISM Services PMI" : "e.g. JOLTS Job Openings"} onChange={(event) => setForm({ ...form, newsEvents: form.newsEvents.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} />
                      {form.newsEvents.length > 1 ? <button type="button" aria-label={`Remove news event ${index + 1}`} onClick={() => setForm({ ...form, newsEvents: form.newsEvents.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={16} /></button> : null}
                    </div>
                  ))}
                  <button className="daytrade-add-news" type="button" onClick={() => setForm({ ...form, newsEvents: [...form.newsEvents, ""] })}><Plus size={16} />Add another news event</button>
                </div>
              ) : null}
              <Field label="Previous-session imbalance taken out?"><select value={form.previousImbalance === "None" ? "No" : "Yes"} onChange={(event) => setForm({ ...form, previousImbalance: event.target.value === "Yes" ? "Prev" : "None" })}><option>No</option><option>Yes</option></select></Field>
              {form.previousImbalance !== "None" ? (
                <Field label="How far back?"><select value={form.previousImbalance} onChange={(event) => setForm({ ...form, previousImbalance: event.target.value as PreviousImbalance })}><option>Prev</option><option>1</option><option>2</option><option>3</option></select></Field>
              ) : null}
              <Field label="OB or liquidity area?"><select value={form.liquidityContext} onChange={(event) => setForm({ ...form, liquidityContext: event.target.value as LiquidityContext })}><option>None</option><option>Order block</option><option>Liquidity area</option><option>Both</option></select></Field>
            </div>
          </section>

          <section className="daytrade-form-section">
            <h3>Setup quality</h3>
            <div className="daytrade-field-grid">
              <Field label="Accumulation quality"><select value={form.accumulationQuality} onChange={(event) => setForm({ ...form, accumulationQuality: event.target.value })}><option>Clear</option><option>Acceptable</option><option>Weak</option></select></Field>
              <Field label="Imbalance quality"><select value={form.imbalanceQuality} onChange={(event) => setForm({ ...form, imbalanceQuality: event.target.value })}><option>Strong</option><option>Clean</option><option>Partial</option><option>Weak</option></select></Field>
              <Field label="Entry retracement"><select value={form.entryRetracement} onChange={(event) => setForm({ ...form, entryRetracement: event.target.value as EntryRetracement })}><option value="0.618">61%</option><option value="0.786">78%</option></select></Field>
            </div>
            <div className="daytrade-upload-grid">
              <label className="daytrade-upload"><ImagePlus size={24} /><strong>Accumulation structure</strong><span>{form.accumulationFile?.name || "Upload accumulation reference"}</span><input required type="file" accept="image/*" onChange={(event) => setForm({ ...form, accumulationFile: event.target.files?.[0] || null })} /></label>
              <label className="daytrade-upload"><ImagePlus size={24} /><strong>Imbalance structure</strong><span>{form.imbalanceFile?.name || "Upload imbalance reference"}</span><input required type="file" accept="image/*" onChange={(event) => setForm({ ...form, imbalanceFile: event.target.files?.[0] || null })} /></label>
            </div>
          </section>

          <section className="daytrade-form-section">
            <h3>Excursion & outcome</h3>
            <div className="daytrade-field-grid">
              <Field label="Trade duration"><input required min={form.durationUnit === "Minutes" ? "1" : "0.1"} type="number" step={form.durationUnit === "Minutes" ? "1" : "0.1"} value={form.durationHours || ""} onChange={(event) => setForm({ ...form, durationHours: Number(event.target.value) })} /></Field>
              <Field label="Duration unit"><select value={form.durationUnit} onChange={(event) => setForm({ ...form, durationUnit: event.target.value as DurationUnit })}><option>Minutes</option><option>Hours</option></select></Field>
              {[
                ["MAE (R)", "mae"],
                ["MFE (R)", "mfe"],
                ["Result (R)", "resultR"],
              ].map(([label, key]) => (
                <Field key={key} label={label}><input required type="number" step="any" value={(form as any)[key] || ""} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} /></Field>
              ))}
              <Field label="Outcome"><select value={form.outcome} onChange={(event) => setForm({ ...form, outcome: event.target.value as Outcome })}><option>Win</option><option>Loss</option><option>Breakeven</option></select></Field>
            </div>
          </section>

          <section className="daytrade-form-section">
            <h3>Chart evidence</h3>
            <div className="daytrade-upload-grid">
              <label className="daytrade-upload"><ImagePlus size={24} /><strong>Before entry</strong><span>{form.beforeFile?.name || "Upload marked-up 15M setup"}</span><input required type="file" accept="image/*" onChange={(event) => setForm({ ...form, beforeFile: event.target.files?.[0] || null })} /></label>
              <label className="daytrade-upload"><ImagePlus size={24} /><strong>After entry</strong><span>{form.afterFile?.name || "Upload completed trade chart"}</span><input required type="file" accept="image/*" onChange={(event) => setForm({ ...form, afterFile: event.target.files?.[0] || null })} /></label>
            </div>
            <Field label="Review notes" wide><textarea rows={5} value={form.notes} placeholder="What created or reduced expectancy in this sample?" onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
          </section>

          <button className="daytrade-save" type="submit" disabled={isLoading}><ClipboardCheck size={19} />Save to Backtest database</button>
        </form>
      ) : null}

      {activeView === "daytrade-backtest" ? (
        <div className="daytrade-records">
          <div className="daytrade-records-heading"><div><span>GBPUSD research database</span><h2>Backtest records</h2></div><strong>{filtered.length} samples</strong></div>
          {isLoading ? <div className="daytrade-empty">Loading strategy records…</div> : null}
          {!isLoading && filtered.length === 0 ? <div className="daytrade-empty"><TrendingUp size={28} /><strong>No matching samples yet</strong><span>Log a GBPUSD London backtest to start measuring the edge.</span></div> : null}
          {filtered.map((trade) => (
            <article className="daytrade-record" key={trade.id}>
              <div className="daytrade-record-main">
                <header><span>GBPUSD</span><span>{trade.direction}</span><span>{trade.tradingDay}</span><span>{trade.entryRetracement === "0.618" ? "61% entry" : "78% entry"}</span><span>{trade.grade}</span></header>
                <div className="daytrade-record-title"><div><strong>GBPUSD · {trade.date}</strong><span>{trade.accumulationQuality} accumulation · {trade.imbalanceQuality} imbalance</span></div><b className={trade.resultR >= 0 ? "positive-r" : "negative-r"}>{trade.resultR.toFixed(2)}R</b></div>
                <div className="daytrade-record-stats">
                  <span>Duration <strong>{formatDuration(trade.durationHours)}</strong></span>
                  <span>MAE <strong>{trade.mae.toFixed(2)}R</strong></span>
                  <span>MFE <strong>{trade.mfe.toFixed(2)}R</strong></span>
                  <span>News <strong>{trade.hasNews}</strong></span>
                  <span>Prev imbalance taken <strong>{trade.previousImbalance === "None" ? "No" : `Yes · ${trade.previousImbalance}`}</strong></span>
                  <span>OB / liquidity <strong>{trade.liquidityContext}</strong></span>
                </div>
                {trade.hasNews === "Yes" && trade.newsEvents.length ? (
                  <div className="daytrade-news-list"><strong>News events</strong>{trade.newsEvents.map((newsEvent, index) => <span key={`${newsEvent}-${index}`}>{newsEvent}</span>)}</div>
                ) : null}
                {trade.notes ? <p>{trade.notes}</p> : null}
                <button className="icon-button danger" type="button" onClick={() => deleteTrade(trade)}><Trash2 size={15} />Delete</button>
              </div>
              <div className="daytrade-record-images">
                {[
                  ["Accumulation", trade.accumulationImage],
                  ["Imbalance", trade.imbalanceImage],
                  ["Before", trade.beforeImage],
                  ["After", trade.afterImage],
                ].filter(([, image]) => image).map(([label, image]) => (
                  <figure key={label}><img src={image} alt={`GBPUSD ${label.toLowerCase()}`} /><figcaption>{label}</figcaption></figure>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export const dayTradeNavigation: Array<{ view: DayTradeView; label: string; icon: typeof BarChart3 }> = [
  { view: "daytrade-dashboard", label: "Strategy dashboard", icon: BarChart3 },
  { view: "daytrade-add", label: "Log backtest", icon: Plus },
  { view: "daytrade-backtest", label: "Backtest", icon: FlaskConical },
];

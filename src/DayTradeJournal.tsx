import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
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

export type DayTradeView = "daytrade-dashboard" | "daytrade-add" | "daytrade-live" | "daytrade-backtest";

type TradeKind = "live" | "backtest";
type Direction = "Buy" | "Sell";
type Grade = "A+" | "A" | "B" | "C";
type Outcome = "Win" | "Loss" | "Breakeven";

type DayTradeRecord = {
  id: string;
  kind: TradeKind;
  date: string;
  pair: string;
  session: string;
  direction: Direction;
  accumulationQuality: string;
  imbalanceQuality: string;
  fibLow: number;
  fibHigh: number;
  retracementDepth: string;
  entry: number;
  stop: number;
  target: number;
  rr: number;
  mae: number;
  mfe: number;
  resultR: number;
  outcome: Outcome;
  grade: Grade;
  beforeImage: string;
  afterImage: string;
  notes: string;
  checklist: boolean[];
  executionQuality: string;
  emotions: string;
  confidence: number;
  patience: number;
  fomo: number;
  discipline: number;
  ruleViolations: string;
  createdAt: string;
};

type DayTradeForm = Omit<DayTradeRecord, "id" | "createdAt" | "beforeImage" | "afterImage"> & {
  beforeFile: File | null;
  afterFile: File | null;
};

const strategyRules = [
  "Clear accumulation or consolidation formed before the move",
  "Strong displacement broke the range and created a Fair Value Gap",
  "Fibonacci was drawn on the displacement leg in the correct direction",
  "Entry retraced into the 0.618–0.786 golden zone inside the imbalance",
  "Stop loss was placed beyond the relevant swing low or high",
  "Take profit targeted liquidity, a previous swing, or the planned R multiple",
] as const;

const dayTradePairs = ["EURUSD", "GBPUSD", "EURGBP", "GBPJPY", "EURJPY", "XAUUSD", "US30", "NAS100"] as const;

function blankForm(): DayTradeForm {
  const today = new Date().toISOString().slice(0, 10);
  return {
    kind: "live",
    date: today,
    pair: "EURUSD",
    session: "London",
    direction: "Buy",
    accumulationQuality: "Clear",
    imbalanceQuality: "Strong",
    fibLow: 0,
    fibHigh: 0,
    retracementDepth: "0.618",
    entry: 0,
    stop: 0,
    target: 0,
    rr: 0,
    mae: 0,
    mfe: 0,
    resultR: 0,
    outcome: "Breakeven",
    grade: "A",
    notes: "",
    checklist: strategyRules.map(() => false),
    executionQuality: "Good",
    emotions: "",
    confidence: 5,
    patience: 5,
    fomo: 1,
    discipline: 5,
    ruleViolations: "",
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

function fromRow(row: any, kind: TradeKind): DayTradeRecord {
  return {
    id: row.id,
    kind,
    date: row.trade_date,
    pair: row.pair,
    session: row.session,
    direction: row.direction,
    accumulationQuality: row.accumulation_quality,
    imbalanceQuality: row.imbalance_quality,
    fibLow: Number(row.fib_low || 0),
    fibHigh: Number(row.fib_high || 0),
    retracementDepth: row.retracement_depth,
    entry: Number(row.entry_price || 0),
    stop: Number(row.stop_price || 0),
    target: Number(row.target_price || 0),
    rr: Number(row.planned_rr || 0),
    mae: Number(row.mae_r || 0),
    mfe: Number(row.mfe_r || 0),
    resultR: Number(row.result_r || 0),
    outcome: row.outcome,
    grade: row.trade_grade,
    beforeImage: row.before_image_url || "",
    afterImage: row.after_image_url || "",
    notes: row.notes || "",
    checklist: Array.isArray(row.rule_checklist) ? row.rule_checklist.map(Boolean) : strategyRules.map(() => false),
    executionQuality: row.execution_quality || "",
    emotions: row.emotions || "",
    confidence: Number(row.confidence || 0),
    patience: Number(row.patience || 0),
    fomo: Number(row.fomo || 0),
    discipline: Number(row.discipline || 0),
    ruleViolations: row.rule_violations || "",
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
    drawdown,
    bestWinRun,
    worstLossRun,
    compliance: ordered.length
      ? (ordered.reduce((sum, trade) => sum + trade.checklist.filter(Boolean).length, 0) / (ordered.length * strategyRules.length)) * 100
      : 0,
  };
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
  const [pairFilter, setPairFilter] = useState("All");
  const [sessionFilter, setSessionFilter] = useState("All");
  const [depthFilter, setDepthFilter] = useState("All");
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
      const [live, backtest] = await Promise.all([
        supabase.from("daytrade_live_trades").select("*").eq("user_id", userId).order("trade_date", { ascending: false }),
        supabase.from("daytrade_backtests").select("*").eq("user_id", userId).order("trade_date", { ascending: false }),
      ]);
      if (!active) return;
      const error = live.error || backtest.error;
      if (error) {
        setMessage("DayTrade tables are not ready yet. Apply supabase-daytrade-strategy.sql to your Supabase project.");
      } else {
        setRecords([
          ...((live.data || []).map((row) => fromRow(row, "live"))),
          ...((backtest.data || []).map((row) => fromRow(row, "backtest"))),
        ]);
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
          (pairFilter === "All" || trade.pair === pairFilter) &&
          (sessionFilter === "All" || trade.session === sessionFilter) &&
          (depthFilter === "All" || trade.retracementDepth === depthFilter) &&
          (gradeFilter === "All" || trade.grade === gradeFilter),
      ),
    [depthFilter, gradeFilter, pairFilter, records, sessionFilter],
  );

  const metrics = useMemo(() => calculateMetrics(filtered), [filtered]);
  const liveMetrics = useMemo(() => calculateMetrics(filtered.filter((trade) => trade.kind === "live")), [filtered]);
  const backtestMetrics = useMemo(() => calculateMetrics(filtered.filter((trade) => trade.kind === "backtest")), [filtered]);
  const complianceCount = form.checklist.filter(Boolean).length;

  const edgeRows = useMemo(() => {
    const keys = ["0.618", "0.786"] as const;
    return keys.map((depth) => {
      const samples = filtered.filter((trade) => trade.retracementDepth === depth);
      return { depth, ...calculateMetrics(samples) };
    });
  }, [filtered]);

  async function saveTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    if (!form.checklist.every(Boolean)) {
      setMessage("A valid setup requires all six strategy rules to be confirmed.");
      return;
    }
    if (!form.beforeFile || !form.afterFile) {
      setMessage("Both before-entry and after-entry screenshots are required.");
      return;
    }
    setIsLoading(true);
    setMessage("");
    try {
      const [beforeImage, afterImage] = await Promise.all([fileToDataUrl(form.beforeFile), fileToDataUrl(form.afterFile)]);
      const payload = {
        user_id: userId,
        trade_date: form.date,
        pair: form.pair,
        session: form.session,
        timeframe: "15M",
        direction: form.direction,
        accumulation_quality: form.accumulationQuality,
        imbalance_quality: form.imbalanceQuality,
        fib_low: form.fibLow,
        fib_high: form.fibHigh,
        retracement_depth: form.retracementDepth,
        entry_price: form.entry,
        stop_price: form.stop,
        target_price: form.target,
        planned_rr: form.rr,
        mae_r: form.mae,
        mfe_r: form.mfe,
        result_r: form.resultR,
        outcome: form.outcome,
        trade_grade: form.grade,
        before_image_url: beforeImage,
        after_image_url: afterImage,
        notes: form.notes.trim(),
        rule_checklist: form.checklist,
        ...(form.kind === "live"
          ? {
              execution_quality: form.executionQuality,
              emotions: form.emotions.trim(),
              confidence: form.confidence,
              patience: form.patience,
              fomo: form.fomo,
              discipline: form.discipline,
              rule_violations: form.ruleViolations.trim(),
            }
          : {}),
      };
      const table = form.kind === "live" ? "daytrade_live_trades" : "daytrade_backtests";
      const { data, error } = await supabase.from(table).insert(payload).select("*").single();
      if (error) throw error;
      const saved = fromRow(data, form.kind);
      setRecords((current) => [saved, ...current]);
      setForm(blankForm());
      onViewChange(form.kind === "live" ? "daytrade-live" : "daytrade-backtest");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this trade.");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteTrade(trade: DayTradeRecord) {
    if (!supabase || !window.confirm(`Delete this ${trade.pair} ${trade.kind} record?`)) return;
    const table = trade.kind === "live" ? "daytrade_live_trades" : "daytrade_backtests";
    const { error } = await supabase.from(table).delete().eq("id", trade.id).eq("user_id", userId);
    if (error) {
      setMessage(error.message);
      return;
    }
    setRecords((current) => current.filter((item) => item.id !== trade.id));
  }

  const visibleRecords =
    activeView === "daytrade-live"
      ? filtered.filter((trade) => trade.kind === "live")
      : filtered.filter((trade) => trade.kind === "backtest");

  return (
    <section className="daytrade-app">
      <header className="daytrade-hero">
        <div>
          <p className="eyebrow">15M · London session only</p>
          <h1>Imbalance + Fibonacci Strategy</h1>
          <p>Turn one repeatable setup into measurable evidence. Every sample follows the same displacement, imbalance, golden-zone and liquidity logic.</p>
        </div>
        <div className="daytrade-rule-score">
          <span>Strategy protocol</span>
          <strong>6 / 6</strong>
          <small>Rules required per entry</small>
        </div>
      </header>

      {message ? <div className="daytrade-message">{message}</div> : null}

      {(activeView === "daytrade-dashboard" || activeView === "daytrade-live" || activeView === "daytrade-backtest") ? (
        <div className="daytrade-filters" aria-label="DayTrade filters">
          <Field label="Pair"><select value={pairFilter} onChange={(event) => setPairFilter(event.target.value)}><option>All</option>{dayTradePairs.map((pair) => <option key={pair}>{pair}</option>)}</select></Field>
          <Field label="Session"><select value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value)}><option>All</option><option>London</option></select></Field>
          <Field label="Retracement"><select value={depthFilter} onChange={(event) => setDepthFilter(event.target.value)}><option>All</option><option>0.618</option><option>0.786</option></select></Field>
          <Field label="Trade grade"><select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}><option>All</option>{(["A+", "A", "B", "C"] as Grade[]).map((grade) => <option key={grade}>{grade}</option>)}</select></Field>
        </div>
      ) : null}

      {activeView === "daytrade-dashboard" ? (
        <>
          <div className="daytrade-metric-grid">
            <Metric label="Win rate" value={`${metrics.winRate.toFixed(0)}%`} detail={`${metrics.count} filtered samples`} />
            <Metric label="Average R" value={`${metrics.averageR.toFixed(2)}R`} detail="Expectancy per trade" />
            <Metric label="Profit factor" value={metrics.profitFactor.toFixed(2)} />
            <Metric label="Rule compliance" value={`${metrics.compliance.toFixed(0)}%`} detail="Across all six rules" />
            <Metric label="Average MAE" value={`${metrics.mae.toFixed(2)}R`} />
            <Metric label="Average MFE" value={`${metrics.mfe.toFixed(2)}R`} />
            <Metric label="Max drawdown" value={`${metrics.drawdown.toFixed(2)}R`} />
            <Metric label="Best / worst streak" value={`${metrics.bestWinRun}W · ${metrics.worstLossRun}L`} />
          </div>

          <div className="daytrade-dashboard-grid">
            <article className="daytrade-panel">
              <div className="daytrade-panel-heading"><div><span>Database comparison</span><h2>Tested edge vs executed edge</h2></div><BarChart3 size={22} /></div>
              <div className="daytrade-compare">
                <div><span>Backtest</span><strong>{backtestMetrics.averageR.toFixed(2)}R</strong><small>{backtestMetrics.winRate.toFixed(0)}% win rate · {backtestMetrics.count} samples</small></div>
                <ChevronRight size={22} />
                <div><span>Live</span><strong>{liveMetrics.averageR.toFixed(2)}R</strong><small>{liveMetrics.winRate.toFixed(0)}% win rate · {liveMetrics.count} trades</small></div>
              </div>
            </article>
            <article className="daytrade-panel">
              <div className="daytrade-panel-heading"><div><span>Continuous refinement</span><h2>Golden-zone expectancy</h2></div><Target size={22} /></div>
              <div className="daytrade-edge-table">
                {edgeRows.map((row) => (
                  <div key={row.depth}><strong>{row.depth}</strong><span>{row.count} trades</span><b className={row.averageR >= 0 ? "positive-r" : "negative-r"}>{row.averageR.toFixed(2)}R avg</b><span>{row.winRate.toFixed(0)}% win</span></div>
                ))}
              </div>
            </article>
          </div>
        </>
      ) : null}

      {activeView === "daytrade-add" ? (
        <form className="daytrade-form" onSubmit={saveTrade}>
          <div className="daytrade-form-heading">
            <div><span>New strategy sample</span><h2>Log the complete trade</h2><p>Every field keeps the research comparable. Live mode adds execution and psychology review.</p></div>
            <div className={`daytrade-compliance ${complianceCount === strategyRules.length ? "is-complete" : ""}`}><CheckCircle2 size={18} /><strong>{complianceCount}/{strategyRules.length} rules</strong></div>
          </div>

          <section className="daytrade-form-section">
            <h3>Database & market context</h3>
            <div className="daytrade-field-grid">
              <Field label="Database"><select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as TradeKind })}><option value="live">Live Trading</option><option value="backtest">Backtest</option></select></Field>
              <Field label="Date"><input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
              <Field label="Pair"><select value={form.pair} onChange={(event) => setForm({ ...form, pair: event.target.value })}>{dayTradePairs.map((pair) => <option key={pair}>{pair}</option>)}</select></Field>
              <Field label="Session"><input readOnly value="London" /></Field>
              <Field label="Timeframe"><input readOnly value="15M" /></Field>
              <Field label="Direction"><select value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value as Direction })}><option>Buy</option><option>Sell</option></select></Field>
              <Field label="Trade grade"><select value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value as Grade })}>{(["A+", "A", "B", "C"] as Grade[]).map((grade) => <option key={grade}>{grade}</option>)}</select></Field>
            </div>
          </section>

          <section className="daytrade-form-section">
            <h3>Setup quality & Fibonacci</h3>
            <div className="daytrade-field-grid">
              <Field label="Accumulation quality"><select value={form.accumulationQuality} onChange={(event) => setForm({ ...form, accumulationQuality: event.target.value })}><option>Clear</option><option>Acceptable</option><option>Weak</option></select></Field>
              <Field label="Imbalance quality"><select value={form.imbalanceQuality} onChange={(event) => setForm({ ...form, imbalanceQuality: event.target.value })}><option>Strong</option><option>Clean</option><option>Partial</option><option>Weak</option></select></Field>
              <Field label="Fib leg low"><input required type="number" step="any" value={form.fibLow || ""} onChange={(event) => setForm({ ...form, fibLow: Number(event.target.value) })} /></Field>
              <Field label="Fib leg high"><input required type="number" step="any" value={form.fibHigh || ""} onChange={(event) => setForm({ ...form, fibHigh: Number(event.target.value) })} /></Field>
              <Field label="Entry depth"><select value={form.retracementDepth} onChange={(event) => setForm({ ...form, retracementDepth: event.target.value })}><option>0.618</option><option>0.786</option></select></Field>
            </div>
          </section>

          <section className="daytrade-form-section">
            <h3>Risk, excursion & outcome</h3>
            <div className="daytrade-field-grid">
              {[
                ["Entry", "entry"],
                ["Stop loss", "stop"],
                ["Target", "target"],
                ["Planned RR", "rr"],
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
          </section>

          {form.kind === "live" ? (
            <section className="daytrade-form-section">
              <h3>Live execution & psychology</h3>
              <div className="daytrade-field-grid">
                <Field label="Execution quality"><select value={form.executionQuality} onChange={(event) => setForm({ ...form, executionQuality: event.target.value })}><option>Excellent</option><option>Good</option><option>Average</option><option>Poor</option></select></Field>
                {(["confidence", "patience", "fomo", "discipline"] as const).map((key) => <Field key={key} label={`${key[0].toUpperCase()}${key.slice(1)} · ${(form as any)[key]}/10`}><input type="range" min="1" max="10" value={(form as any)[key]} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })} /></Field>)}
                <Field label="Emotions" wide><textarea rows={3} value={form.emotions} placeholder="What did you feel before, during, and after execution?" onChange={(event) => setForm({ ...form, emotions: event.target.value })} /></Field>
                <Field label="Rule violations" wide><textarea rows={3} value={form.ruleViolations} placeholder="Leave blank if none. Be specific if a rule was bent or broken." onChange={(event) => setForm({ ...form, ruleViolations: event.target.value })} /></Field>
              </div>
            </section>
          ) : null}

          <section className="daytrade-form-section">
            <h3>Strategy checklist</h3>
            <div className="daytrade-checklist">
              {strategyRules.map((rule, index) => (
                <label key={rule}><input type="checkbox" checked={form.checklist[index]} onChange={(event) => setForm({ ...form, checklist: form.checklist.map((item, itemIndex) => itemIndex === index ? event.target.checked : item) })} /><span>{index + 1}</span><strong>{rule}</strong></label>
              ))}
            </div>
            <Field label="Review notes" wide><textarea rows={5} value={form.notes} placeholder="What created or reduced expectancy in this sample?" onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
          </section>

          <button className="daytrade-save" type="submit" disabled={isLoading}><ClipboardCheck size={19} />Save to {form.kind === "live" ? "Live Trading" : "Backtest"} database</button>
        </form>
      ) : null}

      {(activeView === "daytrade-live" || activeView === "daytrade-backtest") ? (
        <div className="daytrade-records">
          <div className="daytrade-records-heading"><div><span>{activeView === "daytrade-live" ? "Execution database" : "Research database"}</span><h2>{activeView === "daytrade-live" ? "Live Trading" : "Backtest"} records</h2></div><strong>{visibleRecords.length} samples</strong></div>
          {isLoading ? <div className="daytrade-empty">Loading strategy records…</div> : null}
          {!isLoading && visibleRecords.length === 0 ? <div className="daytrade-empty"><TrendingUp size={28} /><strong>No matching samples yet</strong><span>Log a complete 15M London setup to start measuring the edge.</span></div> : null}
          {visibleRecords.map((trade) => (
            <article className="daytrade-record" key={trade.id}>
              <div className="daytrade-record-main">
                <header><span>{trade.pair}</span><span>{trade.direction}</span><span>{trade.retracementDepth}</span><span>{trade.grade}</span></header>
                <div className="daytrade-record-title"><div><strong>{trade.pair} · {trade.date}</strong><span>{trade.accumulationQuality} accumulation · {trade.imbalanceQuality} imbalance</span></div><b className={trade.resultR >= 0 ? "positive-r" : "negative-r"}>{trade.resultR.toFixed(2)}R</b></div>
                <div className="daytrade-record-stats"><span>RR <strong>{trade.rr.toFixed(2)}</strong></span><span>MAE <strong>{trade.mae.toFixed(2)}R</strong></span><span>MFE <strong>{trade.mfe.toFixed(2)}R</strong></span><span>Rules <strong>{trade.checklist.filter(Boolean).length}/6</strong></span></div>
                {trade.kind === "live" ? <p className="daytrade-psychology">Execution: {trade.executionQuality} · Confidence {trade.confidence}/10 · Patience {trade.patience}/10 · FOMO {trade.fomo}/10 · Discipline {trade.discipline}/10</p> : null}
                {trade.notes ? <p>{trade.notes}</p> : null}
                <button className="icon-button danger" type="button" onClick={() => deleteTrade(trade)}><Trash2 size={15} />Delete</button>
              </div>
              <div className="daytrade-record-images"><figure><img src={trade.beforeImage} alt={`${trade.pair} before entry`} /><figcaption>Before</figcaption></figure><figure><img src={trade.afterImage} alt={`${trade.pair} after entry`} /><figcaption>After</figcaption></figure></div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export const dayTradeNavigation: Array<{ view: DayTradeView; label: string; icon: typeof BarChart3 }> = [
  { view: "daytrade-dashboard", label: "Strategy dashboard", icon: BarChart3 },
  { view: "daytrade-add", label: "Log setup", icon: Plus },
  { view: "daytrade-live", label: "Live Trading", icon: TrendingUp },
  { view: "daytrade-backtest", label: "Backtest", icon: FlaskConical },
];

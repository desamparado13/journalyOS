import { BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardCheck, FlaskConical, ImagePlus, Pencil, Plus, Target, Trash2, TrendingUp, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

export type DayTradeView = "daytrade-dashboard" | "daytrade-add" | "daytrade-backtest";

type Pair = "GBPUSD" | "EURUSD" | "EURGBP";
type EntryType = "Golden entry" | "Order Block Entry" | "Liquidity Sweep" | "3 Kings" | "Break Entry" | "FVG Hunt";
type Outcome = "Win" | "Loss" | "Breakeven";

const pairOptions: Pair[] = ["GBPUSD", "EURUSD", "EURGBP"];
const entryTypeOptions: Exclude<EntryType, "FVG Hunt" | "Break Entry">[] = [
  "Golden entry",
  "Order Block Entry",
  "Liquidity Sweep",
  "3 Kings",
];
const PAIR_MIGRATION_CUTOFF = "2026-07-29T23:15:00Z";

const monthOptions = [
  ["01", "January"],
  ["02", "February"],
  ["03", "March"],
  ["04", "April"],
  ["05", "May"],
  ["06", "June"],
  ["07", "July"],
  ["08", "August"],
  ["09", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"],
] as const;

type DayTradeRecord = {
  id: string;
  date: string;
  pair: Pair;
  entryType: EntryType;
  resultR: number;
  outcome: Outcome;
  image: string;
  createdAt: string;
};

type DayTradeForm = {
  date: string;
  pair: Pair;
  entryType: EntryType;
  resultR: string;
  imageFile: File | null;
};

type DayTradeEditForm = {
  date: string;
  pair: Pair;
  entryType: EntryType;
  resultR: string;
  imageFile: File | null;
};

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return localDateString(new Date(year, month - 1, day + 1, 12));
}

function shiftMonth(monthValue: string, amount: number) {
  const [year, month] = monthValue.split("-").map(Number);
  const shifted = new Date(year, month - 1 + amount, 1, 12);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}

function blankForm(date = localDateString(new Date())): DayTradeForm {
  return {
    date,
    pair: "GBPUSD",
    entryType: "Golden entry",
    resultR: "",
    imageFile: null,
  };
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function outcomeFromR(resultR: number): Outcome {
  if (resultR > 0) return "Win";
  if (resultR < 0) return "Loss";
  return "Breakeven";
}

function fromRow(row: any): DayTradeRecord {
  const resultR = Number(row.result_r || 0);
  return {
    id: row.id,
    date: row.trade_date,
    pair: pairOptions.includes(row.pair) ? row.pair : "GBPUSD",
    entryType: entryTypeOptions.includes(row.entry_type)
      ? row.entry_type
      : row.entry_type === "FVG Hunt" || row.entry_type === "Break Entry"
        ? row.entry_type
        : "Golden entry",
    resultR,
    outcome: outcomeFromR(resultR),
    image: row.before_image_url || "",
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
    totalR: ordered.reduce((sum, trade) => sum + trade.resultR, 0),
    winRate: ordered.length ? (wins.length / ordered.length) * 100 : 0,
    averageR: ordered.length ? ordered.reduce((sum, trade) => sum + trade.resultR, 0) / ordered.length : 0,
    profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit,
    drawdown,
    bestWinRun,
    worstLossRun,
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
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
  const [entryFilter, setEntryFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [calendarMonth, setCalendarMonth] = useState(localDateString(new Date()).slice(0, 7));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DayTradeEditForm | null>(null);
  const [loadingImageId, setLoadingImageId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) {
        setMessage("Connect Supabase to use the DayTrade journal.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const pairMigration = await supabase
        .from("daytrade_backtests")
        .update({ pair: "GBPUSD" })
        .eq("user_id", userId)
        .lt("created_at", PAIR_MIGRATION_CUTOFF)
        .neq("pair", "GBPUSD");
      const backtest = await supabase
        .from("daytrade_backtests")
        .select("id,trade_date,pair,entry_type,result_r,outcome,created_at")
        .eq("user_id", userId)
        .order("trade_date", { ascending: false });
      if (!active) return;
      if (backtest.error) {
        setMessage("DayTrade fields are not ready yet. Apply supabase-daytrade-strategy.sql to your Supabase project.");
      } else {
        const loadedRecords = (backtest.data || []).map(fromRow);
        setRecords(loadedRecords);
        if (pairMigration.error) {
          setMessage(`Existing pair labels could not be updated: ${pairMigration.error.message}`);
        }
        if (loadedRecords.length) {
          setForm(blankForm(nextDate(loadedRecords[0].date)));
          setCalendarMonth(loadedRecords[0].date.slice(0, 7));
        }
      }
      setIsLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  const availableYears = useMemo(
    () => [...new Set(records.map((trade) => trade.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a)),
    [records],
  );
  const filtered = useMemo(
    () => records.filter(
      (trade) =>
        (pairFilter === "All" || trade.pair === pairFilter) &&
        (entryFilter === "All" || trade.entryType === entryFilter) &&
        (monthFilter === "All" || trade.date.slice(5, 7) === monthFilter) &&
        (yearFilter === "All" || trade.date.slice(0, 4) === yearFilter),
    ),
    [entryFilter, monthFilter, pairFilter, records, yearFilter],
  );
  const metrics = useMemo(() => calculateMetrics(filtered), [filtered]);
  const entryRows = useMemo(
    () => entryTypeOptions.map((entryType) => ({
      entryType,
      ...calculateMetrics(filtered.filter((trade) => trade.entryType === entryType)),
    })),
    [filtered],
  );
  const calendarCells = useMemo(() => {
    const [year, month] = calendarMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const leadingBlanks = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const byDate = new Map<string, DayTradeRecord[]>();
    filtered.forEach((trade) => byDate.set(trade.date, [...(byDate.get(trade.date) || []), trade]));
    return [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const date = `${calendarMonth}-${String(index + 1).padStart(2, "0")}`;
        const trades = byDate.get(date) || [];
        return {
          date,
          day: index + 1,
          count: trades.length,
          totalR: trades.reduce((sum, trade) => sum + trade.resultR, 0),
        };
      }),
    ];
  }, [calendarMonth, filtered]);
  const calendarMonthLabel = useMemo(() => {
    const [year, month] = calendarMonth.split("-").map(Number);
    return new Date(year, month - 1, 1, 12).toLocaleString("en-US", { month: "long", year: "numeric" });
  }, [calendarMonth]);
  const parsedResultR = Number(form.resultR);
  const hasValidResultR = form.resultR.trim() !== "" && Number.isFinite(parsedResultR);
  const automaticOutcome = hasValidResultR ? outcomeFromR(parsedResultR) : null;

  async function saveTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    if (!hasValidResultR || !automaticOutcome) {
      setMessage("Enter a valid RR, such as 3, 0, or -1.");
      return;
    }
    setIsLoading(true);
    setMessage("");
    try {
      const image = form.imageFile ? await fileToDataUrl(form.imageFile) : "";
      const payload = {
        user_id: userId,
        trade_date: form.date,
        pair: form.pair,
        entry_type: form.entryType,
        result_r: parsedResultR,
        outcome: automaticOutcome,
        before_image_url: image,
      };
      const { data, error } = await supabase
        .from("daytrade_backtests")
        .insert(payload)
        .select("id,trade_date,pair,entry_type,result_r,outcome,created_at")
        .single();
      if (error) throw error;
      const saved = fromRow(data);
      setRecords((current) => [saved, ...current]);
      setForm(blankForm(nextDate(form.date)));
      setMessage(`Saved. Next date selected: ${nextDate(form.date)}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this backtest.");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteTrade(trade: DayTradeRecord) {
    if (!supabase || !window.confirm(`Delete the ${trade.pair} backtest from ${trade.date}?`)) return;
    const { error } = await supabase.from("daytrade_backtests").delete().eq("id", trade.id).eq("user_id", userId);
    if (error) {
      setMessage(error.message);
      return;
    }
    setRecords((current) => current.filter((item) => item.id !== trade.id));
  }

  async function deleteAllTrades() {
    if (!supabase || records.length === 0 || isLoading) return;

    const confirmation = window.prompt(
      `This permanently deletes all ${records.length} DayTrade backtest record${records.length === 1 ? "" : "s"} in your account. Type DELETE ALL to confirm.`,
    );
    if (confirmation !== "DELETE ALL") {
      if (confirmation !== null) setMessage("Delete all cancelled. The confirmation text did not match.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    try {
      const { error } = await supabase
        .from("daytrade_backtests")
        .delete()
        .eq("user_id", userId);
      if (error) throw error;

      setRecords([]);
      setEditingId(null);
      setEditForm(null);
      setForm(blankForm());
      setMessage(`Deleted all ${records.length} DayTrade backtest records.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete all backtest records.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTradeImage(trade: DayTradeRecord) {
    if (!supabase || trade.image || loadingImageId) return;
    setLoadingImageId(trade.id);
    setMessage("");
    try {
      const { data, error } = await supabase
        .from("daytrade_backtests")
        .select("before_image_url")
        .eq("id", trade.id)
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      setRecords((current) =>
        current.map((item) => item.id === trade.id ? { ...item, image: data.before_image_url || "" } : item),
      );
      if (!data.before_image_url) setMessage("This backtest has no chart image.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load this chart image.");
    } finally {
      setLoadingImageId(null);
    }
  }

  function startEditing(trade: DayTradeRecord) {
    setEditingId(trade.id);
    setEditForm({
      date: trade.date,
      pair: trade.pair,
      entryType: trade.entryType,
      resultR: String(trade.resultR),
      imageFile: null,
    });
    setMessage("");
  }

  async function saveEdit(trade: DayTradeRecord) {
    if (!supabase || !editForm) return;
    const resultR = Number(editForm.resultR);
    if (!editForm.resultR.trim() || !Number.isFinite(resultR)) {
      setMessage("Enter a valid RR, such as 3, 0, or -1.");
      return;
    }
    setIsLoading(true);
    setMessage("");
    try {
      let replacementImage = "";
      const payload: Record<string, unknown> = {
        trade_date: editForm.date,
        pair: editForm.pair,
        entry_type: editForm.entryType,
        result_r: resultR,
        outcome: outcomeFromR(resultR),
      };
      if (editForm.imageFile) {
        replacementImage = await fileToDataUrl(editForm.imageFile);
        payload.before_image_url = replacementImage;
      }
      const { data, error } = await supabase
        .from("daytrade_backtests")
        .update(payload)
        .eq("id", trade.id)
        .eq("user_id", userId)
        .select("id,trade_date,pair,entry_type,result_r,outcome,created_at")
        .single();
      if (error) throw error;
      const updated = { ...fromRow(data), image: replacementImage || trade.image };
      setRecords((current) =>
        current.map((item) => item.id === updated.id ? updated : item).sort((a, b) => b.date.localeCompare(a.date)),
      );
      setEditingId(null);
      setEditForm(null);
      setMessage(`Updated backtest from ${updated.date}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update this backtest.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="daytrade-app">
      <header className="daytrade-hero">
        <div>
          <p className="eyebrow">GBPUSD / EURUSD / EURGBP · Fast backtesting</p>
          <h1>Quick Backtest Logger</h1>
          <p>Log only the entry model and final R result. The outcome and next date are handled automatically.</p>
        </div>
        <div className="daytrade-rule-score">
          <span>Required inputs</span>
          <strong>5 fields</strong>
          <small>Date · Pair · Entry · RR · Image</small>
        </div>
      </header>

      {message ? <div className="daytrade-message">{message}</div> : null}

      {activeView !== "daytrade-add" ? (
        <div className="daytrade-filters" aria-label="DayTrade filters">
          <Field label="Pair"><select value={pairFilter} onChange={(event) => setPairFilter(event.target.value)}><option>All</option>{pairOptions.map((pair) => <option key={pair}>{pair}</option>)}</select></Field>
          <Field label="Entry"><select value={entryFilter} onChange={(event) => setEntryFilter(event.target.value)}><option>All</option>{entryTypeOptions.map((entryType) => <option key={entryType}>{entryType}</option>)}</select></Field>
          <Field label="Month"><select value={monthFilter} onChange={(event) => {
            const month = event.target.value;
            setMonthFilter(month);
            if (month !== "All") setCalendarMonth(`${yearFilter !== "All" ? yearFilter : calendarMonth.slice(0, 4)}-${month}`);
          }}><option value="All">All months</option>{monthOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
          <Field label="Year"><select value={yearFilter} onChange={(event) => {
            const year = event.target.value;
            setYearFilter(year);
            if (year !== "All") setCalendarMonth(`${year}-${monthFilter !== "All" ? monthFilter : calendarMonth.slice(5, 7)}`);
          }}><option value="All">All years</option>{availableYears.map((year) => <option value={year} key={year}>{year}</option>)}</select></Field>
        </div>
      ) : null}

      {activeView === "daytrade-dashboard" ? (
        <>
          <div className="daytrade-metric-grid">
            <Metric label="Total R" value={`${metrics.totalR > 0 ? "+" : ""}${metrics.totalR.toFixed(2)}R`} detail={`${metrics.count} filtered samples`} />
            <Metric label="Win rate" value={`${metrics.winRate.toFixed(0)}%`} detail={`${metrics.count} filtered samples`} />
            <Metric label="Average R" value={`${metrics.averageR.toFixed(2)}R`} />
            <Metric label="Profit factor" value={metrics.profitFactor.toFixed(2)} />
            <Metric label="Max drawdown" value={`${metrics.drawdown.toFixed(2)}R`} />
            <Metric label="Best win streak" value={`${metrics.bestWinRun}`} />
            <Metric label="Worst loss streak" value={`${metrics.worstLossRun}`} />
          </div>
          <div className="daytrade-dashboard-grid">
            <article className="daytrade-panel">
              <div className="daytrade-panel-heading"><div><span>Entry comparison</span><h2>Performance by model</h2></div><Target size={22} /></div>
              <div className="daytrade-edge-table">
                {entryRows.map((row) => (
                  <div key={row.entryType}><strong>{row.entryType}</strong><span>{row.count} trades</span><b className={row.averageR >= 0 ? "positive-r" : "negative-r"}>{row.averageR.toFixed(2)}R avg</b><span>{row.winRate.toFixed(0)}% win</span></div>
                ))}
              </div>
            </article>
            <article className="daytrade-panel daytrade-calendar-panel">
              <div className="daytrade-panel-heading">
                <div><span>Trading heatmap</span><h2>{calendarMonthLabel}</h2></div>
                <div className="daytrade-calendar-controls">
                  <button type="button" aria-label="Previous month" onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}><ChevronLeft size={18} /></button>
                  <CalendarDays size={22} />
                  <button type="button" aria-label="Next month" onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}><ChevronRight size={18} /></button>
                </div>
              </div>
              <div className="daytrade-calendar-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}</div>
              <div className="daytrade-calendar-grid">
                {calendarCells.map((cell, index) => cell ? (
                  <div
                    className={`daytrade-calendar-day ${cell.count ? (cell.totalR > 0 ? "is-positive" : cell.totalR < 0 ? "is-negative" : "is-flat") : ""}`}
                    key={cell.date}
                    title={cell.count ? `${cell.count} trade${cell.count === 1 ? "" : "s"} · ${cell.totalR.toFixed(2)}R` : "No trades"}
                  >
                    <span>{cell.day}</span>
                    {cell.count ? <><strong>{cell.totalR > 0 ? "+" : ""}{cell.totalR.toFixed(1)}R</strong><small>{cell.count} trade{cell.count === 1 ? "" : "s"}</small></> : null}
                  </div>
                ) : <div className="daytrade-calendar-day is-empty" key={`empty-${index}`} />)}
              </div>
              <div className="daytrade-calendar-legend"><span><i className="is-positive" />Profit</span><span><i className="is-flat" />Breakeven</span><span><i className="is-negative" />Loss</span></div>
            </article>
          </div>
        </>
      ) : null}

      {activeView === "daytrade-add" ? (
        <form className="daytrade-form daytrade-quick-form" onSubmit={saveTrade}>
          <div className="daytrade-form-heading">
            <div><span>Quick entry</span><h2>Log backtest</h2><p>Submit this trade and the date automatically moves forward by one day.</p></div>
          </div>
          <section className="daytrade-form-section">
            <div className="daytrade-field-grid">
              <Field label="Date"><input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
              <Field label="Pair"><select value={form.pair} onChange={(event) => setForm({ ...form, pair: event.target.value as Pair })}>{pairOptions.map((pair) => <option key={pair}>{pair}</option>)}</select></Field>
              <Field label="Entry"><select value={form.entryType} onChange={(event) => setForm({ ...form, entryType: event.target.value as EntryType })}>{entryTypeOptions.map((entryType) => <option key={entryType}>{entryType}</option>)}</select></Field>
              <Field label="RR"><input required type="number" step="any" value={form.resultR} placeholder="e.g. 3, 4, 5, or -1" onChange={(event) => setForm({ ...form, resultR: event.target.value })} /></Field>
              <Field label="Result"><input readOnly className={automaticOutcome ? `daytrade-result-${automaticOutcome.toLowerCase()}` : ""} value={automaticOutcome || "Enter RR"} /></Field>
            </div>
            <label className="daytrade-upload daytrade-quick-upload"><ImagePlus size={24} /><strong>Chart image (optional)</strong><span>{form.imageFile?.name || "Upload trade chart if available"}</span><input type="file" accept="image/*" onChange={(event) => setForm({ ...form, imageFile: event.target.files?.[0] || null })} /></label>
          </section>
          <button className="daytrade-save" type="submit" disabled={isLoading}><ClipboardCheck size={19} />Save and move to next date</button>
        </form>
      ) : null}

      {activeView === "daytrade-backtest" ? (
        <div className="daytrade-records">
          <div className="daytrade-records-heading">
            <div><span>GBPUSD / EURUSD / EURGBP research database</span><h2>Backtest records</h2></div>
            <div className="daytrade-records-heading-actions">
              <strong>{filtered.length} shown · {records.length} total</strong>
              <button
                className="daytrade-delete-all"
                type="button"
                disabled={isLoading || records.length === 0}
                onClick={() => void deleteAllTrades()}
              >
                <Trash2 size={16} />
                Delete all
              </button>
            </div>
          </div>
          {isLoading ? <div className="daytrade-empty">Loading backtests…</div> : null}
          {!isLoading && filtered.length === 0 ? <div className="daytrade-empty"><TrendingUp size={28} /><strong>No matching samples yet</strong><span>Use the quick logger to add your first result.</span></div> : null}
          {filtered.map((trade) => (
            <article className="daytrade-record daytrade-quick-record" key={trade.id}>
              <div className="daytrade-record-main">
                {editingId === trade.id && editForm ? (
                  <div className="daytrade-inline-edit">
                    <Field label="Date"><input required type="date" value={editForm.date} onChange={(event) => setEditForm({ ...editForm, date: event.target.value })} /></Field>
                    <Field label="Pair"><select value={editForm.pair} onChange={(event) => setEditForm({ ...editForm, pair: event.target.value as Pair })}>{pairOptions.map((pair) => <option key={pair}>{pair}</option>)}</select></Field>
                    <Field label="Entry"><select value={editForm.entryType} onChange={(event) => setEditForm({ ...editForm, entryType: event.target.value as EntryType })}>{editForm.entryType === "FVG Hunt" || editForm.entryType === "Break Entry" ? <option value={editForm.entryType}>{editForm.entryType} (legacy)</option> : null}{entryTypeOptions.map((entryType) => <option key={entryType}>{entryType}</option>)}</select></Field>
                    <Field label="RR"><input required type="number" step="any" value={editForm.resultR} onChange={(event) => setEditForm({ ...editForm, resultR: event.target.value })} /></Field>
                    <Field label="Result"><input readOnly value={editForm.resultR.trim() && Number.isFinite(Number(editForm.resultR)) ? outcomeFromR(Number(editForm.resultR)) : "Enter RR"} /></Field>
                    <label className="daytrade-edit-image"><ImagePlus size={18} /><span>{editForm.imageFile?.name || "Replace chart image (optional)"}</span><input type="file" accept="image/*" onChange={(event) => setEditForm({ ...editForm, imageFile: event.target.files?.[0] || null })} /></label>
                    <div className="daytrade-edit-actions">
                      <button className="icon-button" type="button" disabled={isLoading} onClick={() => void saveEdit(trade)}><Check size={15} />Save changes</button>
                      <button className="icon-button" type="button" onClick={() => { setEditingId(null); setEditForm(null); }}><X size={15} />Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <header><span>{trade.pair}</span><span>{trade.entryType}</span><span>{trade.outcome}</span></header>
                    <div className="daytrade-record-title"><div><strong>{trade.date}</strong><span>{trade.entryType}</span></div><b className={trade.resultR >= 0 ? "positive-r" : "negative-r"}>{trade.resultR.toFixed(2)}R</b></div>
                    <div className="daytrade-edit-actions">
                      <button className="icon-button" type="button" onClick={() => startEditing(trade)}><Pencil size={15} />Edit</button>
                      <button className="icon-button danger" type="button" onClick={() => deleteTrade(trade)}><Trash2 size={15} />Delete</button>
                    </div>
                  </>
                )}
              </div>
              {trade.image ? (
                <div className="daytrade-record-images daytrade-quick-image"><figure><img loading="lazy" decoding="async" src={trade.image} alt={`${trade.entryType} trade from ${trade.date}`} /><figcaption>Chart</figcaption></figure></div>
              ) : (
                <button className="daytrade-load-image" type="button" disabled={loadingImageId !== null} onClick={() => void loadTradeImage(trade)}>
                  <ImagePlus size={20} />{loadingImageId === trade.id ? "Loading chart…" : "View chart"}
                </button>
              )}
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

import { Check, Clipboard, KeyRound, Radio, RefreshCw, ShieldCheck, Trash2, Webhook } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

type WebhookToken = { id: string; label: string; token_prefix: string; is_active: boolean; last_used_at: string | null; created_at: string };
type TradingViewEvent = { id: string; ticker: string; timeframe: string; event: string; event_timestamp: string; price: number | null; mrh: number | null; mrl: number | null; bullish_break_count: number; bearish_break_count: number; candle: Record<string, number | null> | null; processing_status: string; received_at: string };
type PairState = { id: string; ticker: string; timeframe: string; status: string; bullish_break_count: number; bearish_break_count: number; price: number | null; updated_at: string };
type JarvisNotification = { id: string; message: string; created_at: string; read_at: string | null };

const TRADINGVIEW_EXAMPLE = JSON.stringify({ webhook_token: "YOUR_TOKEN", ticker: "AUDJPY", timeframe: "15", event: "structure_break", timestamp: "{{time}}", price: "{{close}}", MRH: 102.45, MRL: 101.92, bullish_break_count: 3, bearish_break_count: 0, open: "{{open}}", high: "{{high}}", low: "{{low}}", close: "{{close}}" }, null, 2);

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function compactDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function TradingViewEventLog({ userId, displayName }: { userId: string; displayName: string }) {
  const [tokens, setTokens] = useState<WebhookToken[]>([]);
  const [events, setEvents] = useState<TradingViewEvent[]>([]);
  const [pairStates, setPairStates] = useState<PairState[]>([]);
  const [notifications, setNotifications] = useState<JarvisNotification[]>([]);
  const [newToken, setNewToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const endpoint = `${window.location.origin}/api/jarvis/tradingview`;

  async function load() {
    if (!supabase) return;
    setLoading(true);
    const [tokenResult, eventResult, stateResult, notificationResult] = await Promise.all([
      supabase.from("jarvis_webhook_tokens").select("id,label,token_prefix,is_active,last_used_at,created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("jarvis_tradingview_events").select("id,ticker,timeframe,event,event_timestamp,price,mrh,mrl,bullish_break_count,bearish_break_count,candle,processing_status,received_at").eq("user_id", userId).order("received_at", { ascending: false }).limit(100),
      supabase.from("jarvis_pair_state").select("id,ticker,timeframe,status,bullish_break_count,bearish_break_count,price,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }),
      supabase.from("jarvis_notifications").select("id,message,created_at,read_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    ]);
    const firstError = tokenResult.error || eventResult.error || stateResult.error || notificationResult.error;
    if (firstError) setMessage(`TradingView tables are not ready: ${firstError.message}`);
    else {
      setTokens((tokenResult.data || []) as WebhookToken[]);
      setEvents((eventResult.data || []) as TradingViewEvent[]);
      setPairStates((stateResult.data || []) as PairState[]);
      setNotifications((notificationResult.data || []) as JarvisNotification[]);
      setMessage("");
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [userId]);

  async function createToken() {
    if (!supabase) return;
    const random = new Uint8Array(32);
    crypto.getRandomValues(random);
    const token = `jtv_${base64Url(random)}`;
    const tokenHash = await sha256(token);
    const { error } = await supabase.from("jarvis_webhook_tokens").insert({ user_id: userId, label: "TradingView", display_name: displayName || "Pot", token_hash: tokenHash, token_prefix: token.slice(0, 12) });
    if (error) { setMessage(error.message); return; }
    setNewToken(token);
    await load();
    setMessage("Token created. Copy it now - Journaly stores only its secure hash and cannot show it again.");
  }

  async function revokeToken(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from("jarvis_webhook_tokens").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
    if (error) setMessage(error.message);
    else await load();
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setMessage(`${label} copied.`);
  }

  return (
    <section className="tv-event-page">
      <header className="tv-event-hero">
        <div><p className="eyebrow">Jarvis market intake</p><h2>TradingView event log</h2><p>Receive raw structural events without calling AI on every candle. Three bullish or bearish breaks move the pair to WATCH.</p></div>
        <button className="secondary-action" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> {loading ? "Refreshing" : "Refresh"}</button>
      </header>

      {message ? <p className="tv-event-message" role="status">{message}</p> : null}

      <div className="tv-setup-grid">
        <article className="tv-setup-card">
          <header><Webhook size={18} /><div><span>Webhook endpoint</span><strong>POST / application/json</strong></div></header>
          <div className="tv-copy-field"><code>{endpoint}</code><button type="button" onClick={() => void copy(endpoint, "Endpoint")}><Clipboard size={15} /> Copy</button></div>
          <small>In TradingView, replace <code>YOUR_TOKEN</code> in the JSON example below. API clients may instead use a Bearer or <code>x-jarvis-webhook-token</code> header.</small>
        </article>
        <article className="tv-setup-card">
          <header><KeyRound size={18} /><div><span>Webhook token</span><strong>Stored as SHA-256 only</strong></div></header>
          {newToken ? <div className="tv-secret"><code>{newToken}</code><button type="button" onClick={() => void copy(newToken, "Webhook token")}><Clipboard size={15} /> Copy once</button></div> : <button className="primary-action" type="button" onClick={() => void createToken()}><KeyRound size={16} /> Generate token</button>}
          <div className="tv-token-list">{tokens.map((token) => <div key={token.id}><span><i className={token.is_active ? "is-live" : ""} /> {token.token_prefix}...</span><small>Last used {compactDate(token.last_used_at)}</small>{token.is_active ? <button type="button" aria-label={`Revoke token ${token.token_prefix}`} title="Revoke token" onClick={() => void revokeToken(token.id)}><Trash2 size={14} /></button> : <b>Revoked</b>}</div>)}</div>
        </article>
      </div>

      <details className="tv-payload-example"><summary>TradingView JSON example</summary><pre>{TRADINGVIEW_EXAMPLE}</pre></details>

      <div className="tv-state-grid">
        <article className="tv-log-panel"><header><Radio size={17} /><span>Jarvis WATCH state</span><b>{pairStates.length}</b></header>{pairStates.length ? <div className="tv-state-list">{pairStates.map((state) => <div key={state.id}><strong>{state.ticker} / {state.timeframe}</strong><span>{state.status}</span><small>Bull {state.bullish_break_count} / Bear {state.bearish_break_count} / {compactDate(state.updated_at)}</small></div>)}</div> : <p>No pair has reached three raw structural breaks.</p>}</article>
        <article className="tv-log-panel"><header><ShieldCheck size={17} /><span>Jarvis notifications</span><b>{notifications.length}</b></header>{notifications.length ? <div className="tv-notification-list">{notifications.map((notification) => <div key={notification.id}><Check size={14} /><p>{notification.message}<small>{compactDate(notification.created_at)}</small></p></div>)}</div> : <p>Threshold notifications will appear here once, per candle and break count.</p>}</article>
      </div>

      <article className="tv-log-panel tv-events-table"><header><Webhook size={17} /><span>Latest events</span><b>{events.length}</b></header>{events.length ? <div className="tv-event-rows"><div className="is-heading"><span>Received</span><span>Market</span><span>Event</span><span>Structure</span><span>Levels</span><span>Status</span></div>{events.map((item) => <div key={item.id}><span>{compactDate(item.received_at)}</span><strong>{item.ticker}<small>{item.timeframe}</small></strong><span>{item.event}</span><span>B {item.bullish_break_count} / S {item.bearish_break_count}</span><span>MRH {item.mrh ?? "-"}<small>MRL {item.mrl ?? "-"}</small></span><b className={`is-${item.processing_status}`}>{item.processing_status}</b></div>)}</div> : <p>No TradingView events received yet.</p>}</article>
    </section>
  );
}

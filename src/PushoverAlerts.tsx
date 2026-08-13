import { BellRing, CheckCircle2, Clipboard, KeyRound, RefreshCw, Send, ShieldCheck, Siren, Trash2, Webhook, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

type WebhookToken = { id: string; token_prefix: string; is_active: boolean; last_used_at: string | null; created_at: string };
type Delivery = { id: string; ticker: string; timeframe: string; event: string; event_timestamp: string; pushover_status: string; pushover_sent_at: string | null; pushover_error: string | null };
type Diagnostics = { enabled: boolean; available: boolean; appTokenConfigured: boolean; userKeyConfigured: boolean; lastSuccessfulSendAt: string | null; lastError: string | null };

const ALERT_EVENTS = ["MRH_BREAK", "MRL_BREAK", "STRUCTURE_BREAK", "SETUP_CONFIRMED"];
const QUIET_EVENTS = ["MRH_MOVE", "MRL_MOVE", "WATCH", "HEARTBEAT", "PAIR_STATE_UPDATE"];
const TRADINGVIEW_EXAMPLE = JSON.stringify({ webhook_token: "YOUR_TOKEN", ticker: "AUDJPY", timeframe: "5", event: "STRUCTURE_BREAK", timestamp: "{{time}}", price: "{{close}}", MRH: 102.45, MRL: 101.92 }, null, 2);

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

export default function PushoverAlerts({ userId, displayName }: { userId: string; displayName: string }) {
  const [tokens, setTokens] = useState<WebhookToken[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [newToken, setNewToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<1 | 2 | null>(null);
  const apiOrigin = window.location.hostname.endsWith(".chatgpt.site") ? "https://journaly-os.vercel.app" : window.location.origin;
  const endpoint = `${apiOrigin}/api/jarvis/tradingview`;

  async function authorizedFetch(path: string, init?: RequestInit) {
    const sessionResult = await supabase?.auth.getSession();
    const session = sessionResult?.data.session;
    return fetch(`${apiOrigin}${path}`, { ...init, headers: { "content-type": "application/json", ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}), ...(init?.headers || {}) } });
  }

  async function load() {
    if (!supabase) return;
    setLoading(true);
    const [tokenResult, deliveryResult, healthResponse] = await Promise.all([
      supabase.from("jarvis_webhook_tokens").select("id,token_prefix,is_active,last_used_at,created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("jarvis_tradingview_events").select("id,ticker,timeframe,event,event_timestamp,pushover_status,pushover_sent_at,pushover_error").eq("user_id", userId).neq("pushover_status", "not_required").order("received_at", { ascending: false }).limit(20),
      authorizedFetch(`/api/jarvis/health?userId=${encodeURIComponent(userId)}`).catch(() => null),
    ]);
    setTokens((tokenResult.data || []) as WebhookToken[]);
    setDeliveries((deliveryResult.data || []) as Delivery[]);
    if (healthResponse?.ok) setDiagnostics((await healthResponse.json()).pushover || null);
    const error = tokenResult.error || deliveryResult.error;
    setMessage(error ? `Run the updated TradingView SQL migration first: ${error.message}` : "");
    setLoading(false);
  }

  useEffect(() => { void load(); }, [userId]);

  async function createToken() {
    if (!supabase) return;
    const random = new Uint8Array(32);
    crypto.getRandomValues(random);
    const token = `jtv_${base64Url(random)}`;
    const { error } = await supabase.from("jarvis_webhook_tokens").insert({ user_id: userId, label: "TradingView", display_name: displayName || "Pot", token_hash: await sha256(token), token_prefix: token.slice(0, 12) });
    if (error) return setMessage(error.message);
    setNewToken(token);
    await load();
    setMessage("Token created. Copy it now—Journaly stores only its secure hash.");
  }

  async function revokeToken(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from("jarvis_webhook_tokens").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
    if (error) setMessage(error.message); else await load();
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setMessage(`${label} copied.`);
  }

  async function sendTest(priority: 1 | 2) {
    setTesting(priority);
    setMessage("");
    try {
      const response = await authorizedFetch("/api/jarvis/pushover/test", { method: "POST", body: JSON.stringify({ userId, priority }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Test alert failed.");
      setMessage(`${priority === 2 ? "Emergency" : "High-priority"} test sent from the server.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test alert failed.");
    } finally { setTesting(null); }
  }

  const checks = [
    ["Integration", diagnostics?.enabled],
    ["App token", diagnostics?.appTokenConfigured],
    ["User key", diagnostics?.userKeyConfigured],
    ["Ready", diagnostics?.available],
  ] as const;

  return (
    <section className="tv-event-page pushover-page">
      <header className="tv-event-hero">
        <div><p className="eyebrow">Jarvis alert channel</p><h2>Pushover emergency alerts</h2><p>Server-side TradingView alerts that keep working when your PC is off. Jarvis’s analysis and personality stay exactly as they are.</p></div>
        <button className="secondary-action" type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> {loading ? "Refreshing" : "Refresh"}</button>
      </header>

      {message ? <p className="tv-event-message" role="status">{message}</p> : null}

      <div className="pushover-status-grid">
        {checks.map(([label, ready]) => <article key={label} className={ready ? "is-ready" : "is-missing"}>{ready ? <CheckCircle2 size={17} /> : <XCircle size={17} />}<span>{label}</span><strong>{ready ? "Ready" : "Missing"}</strong></article>)}
      </div>

      <div className="tv-setup-grid">
        <article className="tv-setup-card pushover-test-card">
          <header><Siren size={18} /><div><span>Server test</span><strong>Confirm phone delivery now</strong></div></header>
          <p>High priority plays the siren once. Emergency repeats every 60 seconds for up to 10 minutes until acknowledged.</p>
          <div className="pushover-test-actions"><button className="secondary-action" type="button" disabled={testing !== null} onClick={() => void sendTest(1)}><Send size={15} /> {testing === 1 ? "Sending…" : "High-priority test"}</button><button className="primary-action" type="button" disabled={testing !== null} onClick={() => void sendTest(2)}><Siren size={15} /> {testing === 2 ? "Sending…" : "Emergency test"}</button></div>
          <small>Last successful server send: {compactDate(diagnostics?.lastSuccessfulSendAt || null)}</small>
          {diagnostics?.lastError ? <small className="is-error">Last error: {diagnostics.lastError}</small> : null}
        </article>
        <article className="tv-setup-card">
          <header><ShieldCheck size={18} /><div><span>Alert policy</span><strong>Only actionable confirmations page you</strong></div></header>
          <div className="pushover-event-chips">{ALERT_EVENTS.map((event) => <span key={event}>{event}</span>)}</div>
          <small>Silent by design: {QUIET_EVENTS.join(", ")}. Historical or WATCH events never trigger emergency delivery.</small>
        </article>
      </div>

      <article className="tv-log-panel">
        <header><BellRing size={17} /><span>Recent emergency deliveries</span><b>{deliveries.length}</b></header>
        {deliveries.length ? <div className="pushover-delivery-list">{deliveries.map((item) => <div key={item.id}><i className={`is-${item.pushover_status}`} /><strong>{item.ticker} / {item.timeframe}</strong><span>{item.event}</span><small>{compactDate(item.pushover_sent_at || item.event_timestamp)}</small><b>{item.pushover_status}</b>{item.pushover_error ? <p>{item.pushover_error}</p> : null}</div>)}</div> : <p>No emergency deliveries yet.</p>}
      </article>

      <details className="tv-payload-example"><summary>TradingView setup and webhook token</summary><div className="pushover-webhook-setup"><div className="tv-copy-field"><code>{endpoint}</code><button type="button" onClick={() => void copy(endpoint, "Endpoint")}><Clipboard size={15} /> Copy</button></div>{newToken ? <div className="tv-secret"><code>{newToken}</code><button type="button" onClick={() => void copy(newToken, "Webhook token")}><Clipboard size={15} /> Copy once</button></div> : <button className="primary-action" type="button" onClick={() => void createToken()}><KeyRound size={16} /> Generate token</button>}<div className="tv-token-list">{tokens.map((token) => <div key={token.id}><span><i className={token.is_active ? "is-live" : ""} /> {token.token_prefix}…</span><small>Last used {compactDate(token.last_used_at)}</small>{token.is_active ? <button type="button" aria-label={`Revoke token ${token.token_prefix}`} onClick={() => void revokeToken(token.id)}><Trash2 size={14} /></button> : <b>Revoked</b>}</div>)}</div><div className="pushover-example-label"><Webhook size={15} /> JSON payload</div><pre>{TRADINGVIEW_EXAMPLE}</pre></div></details>
    </section>
  );
}

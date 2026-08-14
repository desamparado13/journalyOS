import { Archive, CheckCircle2, CloudUpload, ExternalLink, HardDrive, Link2, RefreshCw, ShieldCheck, Unplug, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

type DriveStatus = {
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
  rootFolderUrl: string | null;
  backupFolderUrl: string | null;
  archiveFolderUrl: string | null;
  lastBackupAt: string | null;
  lastBackupFileName: string | null;
  lastBackupBytes: number;
  lastError: string | null;
  automaticSchedule: string;
};

function formatBytes(bytes: number) {
  if (!bytes) return "--";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** power).toFixed(power === 0 ? 0 : 2)} ${units[power]}`;
}

function collectJournalyLocalState() {
  const values: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("journaly-")) continue;
    const value = localStorage.getItem(key);
    if (value !== null) values[key] = value;
  }
  return { capturedAt: new Date().toISOString(), browserStorage: values };
}

export default function GoogleDriveBackup() {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function request(action: string, init: RequestInit = {}) {
    if (!supabase) throw new Error("Journaly authentication is unavailable.");
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) throw new Error("Your Journaly session expired. Sign in again.");
    const response = await fetch(`/api/jarvis/google-drive?action=${encodeURIComponent(action)}`, {
      ...init,
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}`, ...(init.headers || {}) },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || "Google Drive backup request failed.");
    return payload;
  }

  async function loadStatus() {
    setIsLoading(true);
    try {
      setStatus(await request("status"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not check Google Drive.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const driveResult = new URLSearchParams(window.location.search).get("drive") || hashParams.get("drive");
    if (driveResult) {
      setMessage(
        driveResult === "connected"
          ? "Google Drive connected. Your vault is ready."
          : driveResult === "connection-expired"
            ? "The secure Google connection expired during sign-in. Connect again to continue."
            : "Google Drive could not be connected. Try again.",
      );
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete("drive");
      hashParams.delete("drive");
      const nextHash = hashParams.toString();
      window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextHash ? `#${nextHash}` : ""}`);
    }
    void loadStatus();
  }, []);

  async function connect() {
    setIsWorking(true);
    setMessage("");
    try {
      const payload = await request("connect", { method: "POST", body: "{}" });
      window.location.assign(payload.authorizationUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start Google connection.");
      setIsWorking(false);
    }
  }

  async function backupNow() {
    setIsWorking(true);
    setMessage("Building your complete recovery snapshot...");
    try {
      const payload = await request("backup", { method: "POST", body: JSON.stringify({ localState: collectJournalyLocalState() }) });
      setMessage(`Backup complete: ${payload.file} (${formatBytes(payload.bytes)}).`);
      await loadStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Backup failed.");
    } finally {
      setIsWorking(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Google Drive? Existing backup files will remain safely in Drive.")) return;
    setIsWorking(true);
    try {
      await request("disconnect", { method: "POST", body: "{}" });
      setMessage("Google Drive disconnected. Existing Drive files were not deleted.");
      await loadStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not disconnect Drive.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="workspace-band drive-vault">
      <div className="section-heading drive-vault-heading">
        <div>
          <p className="eyebrow">Disaster recovery</p>
          <h2>Google Drive Vault</h2>
          <p>Independent copies of Journaly that remain in your Drive even if Supabase or Journaly hosting goes offline.</p>
        </div>
        <div className={`drive-connection-pill ${status?.connected ? "is-connected" : ""}`}>
          {status?.connected ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
          {isLoading ? "Checking..." : status?.connected ? `Connected${status.googleEmail ? ` · ${status.googleEmail}` : ""}` : "Not connected"}
        </div>
      </div>

      {!status?.configured ? (
        <article className="drive-vault-callout is-warning">
          <ShieldCheck size={23} />
          <div><strong>Google setup is still needed</strong><p>Add the Google OAuth credentials to Journaly’s private hosting settings. No Google secret is ever sent to the browser.</p></div>
        </article>
      ) : !status.connected ? (
        <article className="drive-vault-connect">
          <div className="drive-vault-icon"><HardDrive size={34} /></div>
          <div><h3>Connect your Google Drive</h3><p>Journaly requests permission only for files it creates. It cannot browse the rest of your Drive.</p></div>
          <button className="primary-action" type="button" disabled={isWorking} onClick={connect}><Link2 size={18} /> {isWorking ? "Opening Google..." : "Connect Drive"}</button>
        </article>
      ) : (
        <>
          <div className="drive-vault-grid">
            <article>
              <CloudUpload size={23} />
              <span>Last full backup</span>
              <strong>{status.lastBackupAt ? new Date(status.lastBackupAt).toLocaleString() : "Not created yet"}</strong>
              <small>{status.lastBackupFileName || "Run your first complete snapshot"}</small>
            </article>
            <article>
              <HardDrive size={23} />
              <span>Snapshot size</span>
              <strong>{formatBytes(status.lastBackupBytes)}</strong>
              <small>Compressed JSON with images and recovery metadata</small>
            </article>
            <article>
              <RefreshCw size={23} />
              <span>Automatic backup</span>
              <strong>Daily</strong>
              <small>{status.automaticSchedule}</small>
            </article>
          </div>

          <div className="drive-vault-actions">
            <button className="primary-action" type="button" disabled={isWorking} onClick={backupNow}><CloudUpload size={18} /> {isWorking ? "Backing up..." : "Back up everything now"}</button>
            {status.backupFolderUrl ? <a className="secondary-action" href={status.backupFolderUrl} target="_blank" rel="noreferrer"><ExternalLink size={17} /> Open full backups</a> : null}
            {status.archiveFolderUrl ? <a className="secondary-action" href={status.archiveFolderUrl} target="_blank" rel="noreferrer"><Archive size={17} /> Open private archive</a> : null}
            <button className="secondary-action drive-disconnect" type="button" disabled={isWorking} onClick={disconnect}><Unplug size={17} /> Disconnect</button>
          </div>

          <div className="drive-vault-columns">
            <article><ShieldCheck size={22} /><div><h3>Full Backups</h3><p>Trades, screenshots, backtests, forecasts, journals, Jarvis memory, day trades, alerts, profile metadata, and Journaly browser settings. Jarvis does not read from Drive during normal conversations.</p></div></article>
            <article><Archive size={22} /><div><h3>Archive — Jarvis does not read</h3><p>Drop old screenshots, documents, exports, videos, or anything you want to retain without adding it to Jarvis’s working memory. These files stay separate from automatic snapshots.</p></div></article>
          </div>
        </>
      )}

      {message ? <p className="drive-vault-message" role="status">{message}</p> : null}
      {status?.lastError ? <p className="drive-vault-message is-error" role="alert">Last automatic backup: {status.lastError}</p> : null}
    </section>
  );
}

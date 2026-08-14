const OWNER_EMAIL = "christian.angelo.desamparado@gmail.com";
const CONNECTION_PREFIX = "[[JARVIS_GOOGLE_DRIVE_V1]]";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const ROOT_FOLDER_NAME = "Journaly Vault";
const BACKUP_FOLDER_NAME = "Full Backups";
const ARCHIVE_FOLDER_NAME = "Archive — Jarvis does not read";
const BACKUP_TABLES = [
  { name: "trades", critical: true },
  { name: "backtests", critical: true },
  { name: "trade_decisions", critical: true },
  { name: "journal_entries", critical: true },
  { name: "daytrade_live_trades", critical: false },
  { name: "daytrade_backtests", critical: false },
  { name: "jarvis_tradingview_events", critical: false },
  { name: "jarvis_pair_state", critical: false },
  { name: "jarvis_notifications", critical: false },
  { name: "jarvis_webhook_tokens", critical: false },
];

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

function configured(env) {
  return Boolean(env.GOOGLE_DRIVE_CLIENT_ID && env.GOOGLE_DRIVE_CLIENT_SECRET && env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY && (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL) && env.SUPABASE_SERVICE_ROLE_KEY);
}

function base64Url(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(String(value).length / 4) * 4, "=");
  return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0));
}

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", await sha256(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function signedState(userId, env) {
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({ userId, expiresAt: Date.now() + 10 * 60 * 1000, nonce: crypto.randomUUID() })));
  return `${payload}.${base64Url(await hmac(payload, env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY))}`;
}

async function verifiedState(state, env) {
  const [payload, signature] = String(state || "").split(".");
  if (!payload || !signature) return null;
  const expected = await hmac(payload, env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY);
  const received = fromBase64Url(signature);
  if (expected.length !== received.length) return null;
  let mismatch = 0;
  expected.forEach((byte, index) => { mismatch |= byte ^ received[index]; });
  if (mismatch) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    return parsed.userId && Number(parsed.expiresAt) > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

async function encryptToken(token, env) {
  const key = await crypto.subtle.importKey("raw", await sha256(env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY), "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token)));
  return `${base64Url(iv)}.${base64Url(ciphertext)}`;
}

async function decryptToken(value, env) {
  const [iv, ciphertext] = String(value || "").split(".");
  if (!iv || !ciphertext) throw new Error("Google Drive connection is invalid. Reconnect Drive.");
  const key = await crypto.subtle.importKey("raw", await sha256(env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY), "AES-GCM", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64Url(iv) }, key, fromBase64Url(ciphertext));
  return new TextDecoder().decode(plaintext);
}

function supabaseSettings(env) {
  return { url: String(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, ""), key: env.SUPABASE_SERVICE_ROLE_KEY };
}

function serviceHeaders(env, extra = {}) {
  const { key } = supabaseSettings(env);
  return { apikey: key, authorization: `Bearer ${key}`, ...extra };
}

async function authenticateOwner(request, env) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const url = String(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  const response = await fetch(`${url}/auth/v1/user`, { headers: { authorization, apikey: publishableKey } });
  if (!response.ok) return null;
  const user = await response.json();
  return String(user.email || "").trim().toLowerCase() === OWNER_EMAIL ? user : null;
}

function decodeConnectionContent(content) {
  if (!String(content || "").startsWith(CONNECTION_PREFIX)) return null;
  try { return JSON.parse(String(content).slice(CONNECTION_PREFIX.length).trim()); } catch { return null; }
}

async function loadConnection(userId, env) {
  const { url } = supabaseSettings(env);
  const params = new URLSearchParams({ select: "id,content,updated_at", user_id: `eq.${userId}`, content: `like.${CONNECTION_PREFIX}*`, order: "updated_at.desc", limit: "1" });
  const response = await fetch(`${url}/rest/v1/journal_entries?${params}`, { headers: serviceHeaders(env) });
  if (!response.ok) throw new Error("Could not read the Google Drive connection.");
  const row = (await response.json())[0];
  const data = row ? decodeConnectionContent(row.content) : null;
  return data ? { rowId: row.id, ...data } : null;
}

async function connectedOwnerId(env) {
  const { url } = supabaseSettings(env);
  const params = new URLSearchParams({ select: "user_id", content: `like.${CONNECTION_PREFIX}*`, order: "updated_at.desc", limit: "1" });
  const response = await fetch(`${url}/rest/v1/journal_entries?${params}`, { headers: serviceHeaders(env) });
  if (!response.ok) return null;
  return (await response.json())[0]?.user_id || null;
}

async function saveConnection(userId, connection, env) {
  const { url } = supabaseSettings(env);
  const existing = await loadConnection(userId, env);
  const now = new Date().toISOString();
  const payload = { user_id: userId, entry_date: now.slice(0, 10), content: `${CONNECTION_PREFIX}\n${JSON.stringify(connection)}`, advice: "Encrypted Google Drive disaster-recovery connection.", image_url: "", pair: null, related_trade_id: null, related_discipline_id: null, updated_at: now };
  const endpoint = existing ? `${url}/rest/v1/journal_entries?id=eq.${encodeURIComponent(existing.rowId)}&user_id=eq.${encodeURIComponent(userId)}` : `${url}/rest/v1/journal_entries`;
  const response = await fetch(endpoint, { method: existing ? "PATCH" : "POST", headers: serviceHeaders(env, { "content-type": "application/json", prefer: "return=minimal" }), body: JSON.stringify(payload) });
  if (!response.ok) throw new Error("Could not save the Google Drive connection.");
}

async function removeConnection(userId, env) {
  const existing = await loadConnection(userId, env);
  if (!existing) return;
  const { url } = supabaseSettings(env);
  await fetch(`${url}/rest/v1/journal_entries?id=eq.${encodeURIComponent(existing.rowId)}&user_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE", headers: serviceHeaders(env) });
}

function redirectUri(request, env) {
  const configuredUrl = String(env.JOURNALY_APP_URL || "").replace(/\/$/, "");
  return `${configuredUrl || new URL(request.url).origin}/api/jarvis/google-drive-callback`;
}

async function exchangeCode(code, request, env) {
  const body = new URLSearchParams({ code, client_id: env.GOOGLE_DRIVE_CLIENT_ID, client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET, redirect_uri: redirectUri(request, env), grant_type: "authorization_code" });
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  const payload = await response.json();
  if (!response.ok || !payload.refresh_token) throw new Error(payload.error_description || "Google did not return offline backup access. Remove Journaly from Google permissions and reconnect.");
  return payload;
}

async function accessToken(connection, env) {
  const refreshToken = await decryptToken(connection.encryptedRefreshToken, env);
  const body = new URLSearchParams({ client_id: env.GOOGLE_DRIVE_CLIENT_ID, client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET, refresh_token: refreshToken, grant_type: "refresh_token" });
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || "Google Drive access expired. Reconnect Drive.");
  return payload.access_token;
}

async function driveRequest(token, path, init = {}) {
  const response = await fetch(`https://www.googleapis.com${path}`, { ...init, headers: { authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error?.message || `Google Drive request failed (${response.status}).`);
  }
  return response;
}

async function createFolder(token, name, parentId = null) {
  const metadata = { name, mimeType: FOLDER_MIME, ...(parentId ? { parents: [parentId] } : {}) };
  const response = await driveRequest(token, "/drive/v3/files?fields=id,name,webViewLink", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(metadata) });
  return response.json();
}

async function createRestoreGuide(token, parentId) {
  const metadata = { name: "Journaly Restore Guide.txt", parents: [parentId], mimeType: "text/plain", description: "Human-readable disaster recovery instructions for Journaly backups." };
  const guide = [
    "JOURNALY DISASTER RECOVERY",
    "",
    "The Full Backups folder contains timestamped .json.gz snapshots. Download the newest file and decompress it to obtain self-describing JSON.",
    "The JSON includes the table restore order, record coverage, screenshots stored with records, profile metadata, and the latest browser-only Journaly state captured by a manual backup.",
    "Create a new Supabase project, apply Journaly's SQL schema files, recreate the owner login, then import each table in the restoreOrder listed inside the snapshot.",
    "Passwords, Google OAuth tokens, Supabase service keys, Vercel secrets, OpenAI keys, and Pushover credentials are intentionally excluded. Restore those from their provider dashboards or an offline password manager.",
    "Files in 'Archive — Jarvis does not read' are independent personal storage. They are not included in snapshots and Jarvis cannot read them.",
    "",
    "Keep at least one downloaded copy offline for protection against losing access to the Google account itself.",
  ].join("\n");
  const boundary = `journaly_${crypto.randomUUID().replace(/-/g, "")}`;
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${guide}\r\n--${boundary}--`;
  const response = await driveRequest(token, "/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", { method: "POST", headers: { "content-type": `multipart/related; boundary=${boundary}` }, body });
  return response.json();
}

async function ensureFolders(token, connection) {
  if (connection.rootFolderId && connection.backupFolderId && connection.archiveFolderId) return connection;
  const root = await createFolder(token, ROOT_FOLDER_NAME);
  const backup = await createFolder(token, BACKUP_FOLDER_NAME, root.id);
  const archive = await createFolder(token, ARCHIVE_FOLDER_NAME, root.id);
  const guide = await createRestoreGuide(token, root.id);
  return { ...connection, rootFolderId: root.id, backupFolderId: backup.id, archiveFolderId: archive.id, restoreGuideFileId: guide.id };
}

async function readAllRows(table, userId, env) {
  const { url } = supabaseSettings(env);
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const params = new URLSearchParams({ select: "*", user_id: `eq.${userId}`, order: "created_at.asc.nullsfirst", offset: String(offset), limit: "1000" });
    let response = await fetch(`${url}/rest/v1/${table}?${params}`, { headers: serviceHeaders(env) });
    if (!response.ok && response.status === 400) {
      params.delete("order");
      response = await fetch(`${url}/rest/v1/${table}?${params}`, { headers: serviceHeaders(env) });
    }
    if (!response.ok) throw new Error(`${table}: ${response.status}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function userProfile(userId, env) {
  const { url } = supabaseSettings(env);
  const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { headers: serviceHeaders(env) });
  if (!response.ok) return null;
  const user = await response.json();
  return { id: user.id, email: user.email, created_at: user.created_at, updated_at: user.updated_at, user_metadata: user.user_metadata || {} };
}

async function createSnapshot(userId, localState, env) {
  const results = await Promise.all(BACKUP_TABLES.map(async (table) => {
    try {
      const rows = await readAllRows(table.name, userId, env);
      if (table.name === "journal_entries") return { ...table, rows: rows.filter((row) => !String(row.content || "").startsWith(CONNECTION_PREFIX)) };
      return { ...table, rows };
    } catch (error) {
      return { ...table, rows: [], error: error instanceof Error ? error.message : String(error) };
    }
  }));
  const criticalErrors = results.filter((result) => result.critical && result.error);
  if (criticalErrors.length) throw new Error(`Backup stopped because ${criticalErrors.map((item) => item.name).join(", ")} could not be read.`);
  const createdAt = new Date().toISOString();
  return {
    schema: "journaly.full_backup",
    schemaVersion: 1,
    createdAt,
    ownerUserId: userId,
    restorableWithoutVercel: true,
    profile: await userProfile(userId, env),
    tables: Object.fromEntries(results.map((result) => [result.name, result.rows])),
    coverage: Object.fromEntries(results.map((result) => [result.name, { rows: result.rows.length, available: !result.error, error: result.error || null }])),
    deviceLocalState: localState && typeof localState === "object" ? localState : {},
    notes: {
      restoreOrder: ["profile", "trades", "backtests", "trade_decisions", "journal_entries", "daytrade_live_trades", "daytrade_backtests", "jarvis_tradingview_events", "jarvis_pair_state", "jarvis_notifications", "jarvis_webhook_tokens"],
      archiveFolder: "Files placed in the sibling Archive folder are deliberately outside Jarvis memory and are not included in this snapshot.",
      secretsExcluded: ["passwords", "Google OAuth tokens", "Supabase service role key", "Vercel secrets", "OpenAI keys", "Pushover credentials"],
    },
  };
}

async function gzipJson(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function uploadBackup(token, folderId, bytes, snapshot) {
  const safeTime = snapshot.createdAt.replace(/[:.]/g, "-");
  const name = `journaly-full-backup-${safeTime}.json.gz`;
  const checksum = base64Url(await crypto.subtle.digest("SHA-256", bytes));
  const metadata = { name, parents: [folderId], mimeType: "application/gzip", description: "Complete Journaly disaster-recovery snapshot. Download and decompress to inspect the self-describing JSON archive.", appProperties: { journalySchema: snapshot.schema, schemaVersion: String(snapshot.schemaVersion), createdAt: snapshot.createdAt, checksumSha256Base64Url: checksum } };
  const start = await driveRequest(token, "/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,createdTime,webViewLink", { method: "POST", headers: { "content-type": "application/json; charset=UTF-8", "x-upload-content-type": "application/gzip", "x-upload-content-length": String(bytes.byteLength) }, body: JSON.stringify(metadata) });
  const location = start.headers.get("location");
  if (!location) throw new Error("Google Drive did not create an upload session.");
  const uploaded = await fetch(location, { method: "PUT", headers: { "content-type": "application/gzip", "content-length": String(bytes.byteLength) }, body: bytes });
  if (!uploaded.ok) throw new Error(`Google Drive upload failed (${uploaded.status}).`);
  return { ...(await uploaded.json()), checksum };
}

async function runBackup(userId, localState, env) {
  let connection = await loadConnection(userId, env);
  if (!connection) throw new Error("Google Drive is not connected.");
  const suppliedLocalState = localState && typeof localState === "object" && Object.keys(localState).length ? localState : null;
  let retainedLocalState = {};
  if (!suppliedLocalState && connection.encryptedDeviceLocalState) {
    try { retainedLocalState = JSON.parse(await decryptToken(connection.encryptedDeviceLocalState, env)); } catch { retainedLocalState = {}; }
  }
  const effectiveLocalState = suppliedLocalState || retainedLocalState;
  if (JSON.stringify(effectiveLocalState).length > 6_000_000) throw new Error("Browser-only Journaly data is too large for one snapshot. Clear old local AI chat history and try again.");
  const token = await accessToken(connection, env);
  connection = await ensureFolders(token, connection);
  const snapshot = await createSnapshot(userId, effectiveLocalState, env);
  const bytes = await gzipJson(snapshot);
  const file = await uploadBackup(token, connection.backupFolderId, bytes, snapshot);
  const next = { ...connection, encryptedDeviceLocalState: await encryptToken(JSON.stringify(effectiveLocalState), env), lastBackupAt: snapshot.createdAt, lastBackupFileId: file.id, lastBackupFileName: file.name, lastBackupBytes: bytes.byteLength, lastBackupChecksum: file.checksum, lastError: null };
  await saveConnection(userId, next, env);
  return { snapshot, file, connection: next };
}

function publicStatus(connection, env) {
  return {
    configured: configured(env),
    connected: Boolean(connection?.encryptedRefreshToken),
    googleEmail: connection?.googleEmail || null,
    rootFolderUrl: connection?.rootFolderId ? `https://drive.google.com/drive/folders/${connection.rootFolderId}` : null,
    backupFolderUrl: connection?.backupFolderId ? `https://drive.google.com/drive/folders/${connection.backupFolderId}` : null,
    archiveFolderUrl: connection?.archiveFolderId ? `https://drive.google.com/drive/folders/${connection.archiveFolderId}` : null,
    lastBackupAt: connection?.lastBackupAt || null,
    lastBackupFileName: connection?.lastBackupFileName || null,
    lastBackupBytes: Number(connection?.lastBackupBytes || 0),
    lastError: connection?.lastError || null,
    automaticSchedule: "Daily at 7:15 PM Manila time",
  };
}

function appRedirect(request, env, result) {
  const origin = String(env.JOURNALY_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  return Response.redirect(`${origin}/?drive=${encodeURIComponent(result)}`, 302);
}

export async function handleGoogleDriveBackup(request, env) {
  const requestUrl = new URL(request.url);
  const action = requestUrl.pathname.endsWith("/drive-backup-routine") ? "routine" : requestUrl.pathname.endsWith("/google-drive-callback") ? "callback" : requestUrl.searchParams.get("action") || "status";
  if (action === "callback") {
    if (!configured(env)) return appRedirect(request, env, "not-configured");
    const url = new URL(request.url);
    const state = await verifiedState(url.searchParams.get("state"), env);
    if (!state || !url.searchParams.get("code")) return appRedirect(request, env, "connection-failed");
    try {
      const tokens = await exchangeCode(url.searchParams.get("code"), request, env);
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { authorization: `Bearer ${tokens.access_token}` } });
      const userInfo = userInfoResponse.ok ? await userInfoResponse.json() : {};
      let connection = { encryptedRefreshToken: await encryptToken(tokens.refresh_token, env), googleEmail: userInfo.email || null, connectedAt: new Date().toISOString(), lastBackupAt: null, lastBackupFileId: null, lastBackupFileName: null, lastBackupBytes: 0, lastBackupChecksum: null, lastError: null };
      connection = await ensureFolders(tokens.access_token, connection);
      await saveConnection(state.userId, connection, env);
      return appRedirect(request, env, "connected");
    } catch (error) {
      console.error("[Google Drive callback]", error instanceof Error ? error.message : error);
      return appRedirect(request, env, "connection-failed");
    }
  }

  if (action === "routine") {
    if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) return json({ error: "Unauthorized" }, 401);
    const userId = env.JARVIS_ROUTINE_USER_ID || await connectedOwnerId(env);
    if (!userId) return json({ error: "No connected Google Drive owner was found." }, 503);
    try {
      const result = await runBackup(userId, {}, env);
      return json({ ok: true, file: result.file.name, bytes: result.connection.lastBackupBytes });
    } catch (error) {
      console.error("[Google Drive backup routine]", error instanceof Error ? error.message : error);
      return json({ error: error instanceof Error ? error.message : "Automatic backup failed." }, 503);
    }
  }

  const user = await authenticateOwner(request, env);
  if (!user) return json({ error: "Your Journaly session has expired." }, 401);
  if (action === "status") {
    const connection = configured(env) ? await loadConnection(user.id, env).catch(() => null) : null;
    return json(publicStatus(connection, env));
  }
  if (!configured(env)) return json({ error: "Google Drive backup is not configured yet." }, 503);
  if (action === "connect") {
    const state = await signedState(user.id, env);
    const params = new URLSearchParams({ client_id: env.GOOGLE_DRIVE_CLIENT_ID, redirect_uri: redirectUri(request, env), response_type: "code", scope: `openid email ${DRIVE_SCOPE}`, access_type: "offline", prompt: "consent", include_granted_scopes: "true", state, login_hint: user.email || "" });
    return json({ authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  }
  if (action === "disconnect") {
    await removeConnection(user.id, env);
    return json({ ok: true });
  }
  if (action === "backup") {
    try {
      const body = await request.json().catch(() => ({}));
      const result = await runBackup(user.id, body.localState, env);
      return json({ ok: true, file: result.file.name, bytes: result.connection.lastBackupBytes, lastBackupAt: result.connection.lastBackupAt, folderUrl: `https://drive.google.com/drive/folders/${result.connection.backupFolderId}` });
    } catch (error) {
      console.error("[Google Drive manual backup]", error instanceof Error ? error.message : error);
      return json({ error: error instanceof Error ? error.message : "Backup failed." }, 503);
    }
  }
  return json({ error: "Unknown Google Drive action." }, 404);
}

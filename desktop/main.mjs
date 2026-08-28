import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell } from "electron";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer, request } from "node:http";
import { request as secureRequest } from "node:https";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CTraderBrokerService } from "../broker/ctrader-service.mjs";

const OWNER_EMAIL = "christian.angelo.desamparado@gmail.com";
const smokeTest = process.argv.includes("--smoke-test");
let mainWindow = null;
let statusWindow = null;
let bridgeServer = null;
let bridgeOwned = false;
let journalyUiServer = null;
let loginProcess = null;
let wakeWordProcess = null;
let config = null;
let ctraderService = null;
const desktopBridgeToken = randomBytes(32).toString("hex");
let runtimeStatus = {
  launchId: randomBytes(12).toString("hex"),
  bridgeReady: false,
  bridgeMessage: "Starting the private bridge…",
  codexChecked: false,
  codexLoggedIn: false,
  codexMessage: "Checking your local Codex session…",
  wakeWordReady: false,
  wakeWordMessage: "Starting the Windows wake-word listener…",
  ctrader: { enabled: false, configured: false, authenticated: false, environment: "demo", scope: "trading", redirectUri: "", endpoint: "", demoTradingEnabled: false, liveTradingEnabled: false, lastError: "" },
};

function readDesktopConfig() {
  const configPath = path.join(app.getAppPath(), "desktop", "generated-config.json");
  if (!existsSync(configPath)) throw new Error("Desktop configuration is missing. Run npm run desktop:prepare first.");
  return JSON.parse(readFileSync(configPath, "utf8"));
}

function loadLocalVoiceEnvironment() {
  const environmentPath = path.join(String(config?.localProjectRoot || ""), ".env.local");
  if (!config?.localProjectRoot || !existsSync(environmentPath)) return;
  const allowedKeys = new Set(["OPENAI_API_KEY", "OPENAI_JARVIS_VOICE_MODEL", "OPENAI_JARVIS_VALE_VOICE", "OPENAI_JARVIS_VOICE"]);
  for (const rawLine of readFileSync(environmentPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    if (!allowedKeys.has(key) || process.env[key]) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

function publishStatus(patch = {}) {
  runtimeStatus = { ...runtimeStatus, ...patch };
  statusWindow?.webContents.send("desktop:status", runtimeStatus);
  return runtimeStatus;
}

function publishCTraderStatus() {
  const status = ctraderService?.status() || runtimeStatus.ctrader;
  return publishStatus({ ctrader: status });
}

function sendWakeWord(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("desktop:wake-word", payload);
}

function startWakeWordListener() {
  if (wakeWordProcess && wakeWordProcess.exitCode === null) return;
  const powershell = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  if (!existsSync(powershell)) {
    publishStatus({ wakeWordReady: false, wakeWordMessage: "Windows Speech Recognition is unavailable." });
    sendWakeWord({ type: "error", message: "Windows Speech Recognition is unavailable." });
    return;
  }
  const script = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$recognizer = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers() | Where-Object { $_.Culture.Name -eq 'en-US' } | Select-Object -First 1
if (-not $recognizer) { $recognizer = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers() | Select-Object -First 1 }
if (-not $recognizer) { throw 'No Windows speech recognizer is installed.' }
$engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine($recognizer)
$choices = New-Object System.Speech.Recognition.Choices
$choices.Add([string[]]@('Jarvis', 'Hey Jarvis'))
$builder = New-Object System.Speech.Recognition.GrammarBuilder
$builder.Culture = $recognizer.Culture
$builder.Append($choices)
$engine.LoadGrammar((New-Object System.Speech.Recognition.Grammar($builder)))
$engine.SetInputToDefaultAudioDevice()
[Console]::Out.WriteLine((@{ type = 'ready'; culture = $recognizer.Culture.Name } | ConvertTo-Json -Compress))
[Console]::Out.Flush()
while ($true) {
  try {
    $result = $engine.Recognize([TimeSpan]::FromSeconds(2))
    if ($null -ne $result) {
      $text = $result.Text
      if ($text -match '(?i)^(?:hey\s+)?jarvis$' -and $result.Confidence -ge 0.65) {
        [Console]::Out.WriteLine((@{ type = 'recognized'; text = $text; confidence = $result.Confidence } | ConvertTo-Json -Compress))
        [Console]::Out.Flush()
      }
    }
  } catch { Start-Sleep -Milliseconds 250 }
}
`;
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  const child = spawn(powershell, ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  wakeWordProcess = child;
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += String(chunk);
    const lines = output.split(/\r?\n/);
    output = lines.pop() || "";
    for (const line of lines) {
      try {
        const payload = JSON.parse(line);
        if (payload.type === "ready") publishStatus({ wakeWordReady: true, wakeWordMessage: `Listening for “Hey Jarvis” (${payload.culture || "Windows Speech"}).` });
        sendWakeWord(payload);
      } catch { /* Ignore PowerShell host noise. */ }
    }
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr = `${stderr}${String(chunk)}`.slice(-3000); });
  child.on("error", (error) => {
    publishStatus({ wakeWordReady: false, wakeWordMessage: error.message });
    sendWakeWord({ type: "error", message: error.message });
  });
  child.on("close", () => {
    if (wakeWordProcess !== child) return;
    wakeWordProcess = null;
    const message = stderr.trim() || "Windows wake-word listener stopped.";
    publishStatus({ wakeWordReady: false, wakeWordMessage: message });
    sendWakeWord({ type: "error", message });
  });
}

function stopWakeWordListener() {
  const child = wakeWordProcess;
  wakeWordProcess = null;
  if (child && child.exitCode === null) child.kill();
  publishStatus({ wakeWordReady: false, wakeWordMessage: "Wake-word listener paused while Jarvis is active." });
  sendWakeWord({ type: "paused" });
}

function bridgeHealth(port) {
  return new Promise((resolve) => {
    const healthRequest = request({ hostname: "127.0.0.1", port, path: "/health", method: "GET", headers: { "X-Journaly-Desktop-Token": desktopBridgeToken }, timeout: 2000 }, (response) => {
      let body = "";
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        try { const payload = JSON.parse(body); resolve(response.statusCode === 200 && payload.service === "journaly-codex-bridge" && payload.owner === OWNER_EMAIL && payload.privateDesktopChat === true); }
        catch { resolve(false); }
      });
    });
    healthRequest.on("timeout", () => { healthRequest.destroy(); resolve(false); });
    healthRequest.on("error", () => resolve(false));
    healthRequest.end();
  });
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return ({ ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" })[extension] || "application/octet-stream";
}

async function startJournalyUi() {
  if (journalyUiServer?.listening) return;
  const distRoot = path.resolve(app.getAppPath(), "dist");
  const indexPath = path.join(distRoot, "index.html");
  if (!existsSync(indexPath)) throw new Error("The bundled Journaly interface is missing. Rebuild the desktop app.");
  journalyUiServer = createServer((incoming, outgoing) => {
    if ((incoming.url || "").startsWith("/api/")) {
      const headers = { ...incoming.headers, host: config.apiHost, origin: `https://${config.apiHost}` };
      const proxy = secureRequest({ hostname: config.apiHost, port: 443, path: incoming.url, method: incoming.method, headers }, (proxyResponse) => {
        outgoing.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
        proxyResponse.pipe(outgoing);
      });
      proxy.on("error", (error) => { outgoing.writeHead(502, { "Content-Type": "application/json" }); outgoing.end(JSON.stringify({ error: `Journaly API proxy failed: ${error.message}` })); });
      incoming.pipe(proxy);
      return;
    }
    let relativePath = "index.html";
    try { relativePath = decodeURIComponent(new URL(incoming.url || "/", config.appUrl).pathname).replace(/^\/+/, "") || "index.html"; }
    catch { outgoing.writeHead(400); outgoing.end("Bad request"); return; }
    let filePath = path.resolve(distRoot, relativePath);
    if (!filePath.startsWith(`${distRoot}${path.sep}`) && filePath !== indexPath) { outgoing.writeHead(403); outgoing.end("Forbidden"); return; }
    if (!existsSync(filePath) || !statSync(filePath).isFile()) filePath = indexPath;
    outgoing.writeHead(200, { "Content-Type": contentType(filePath), "Cache-Control": filePath === indexPath ? "no-store" : "public, max-age=31536000, immutable" });
    createReadStream(filePath).pipe(outgoing);
  });
  await new Promise((resolve, reject) => {
    const onError = (error) => { journalyUiServer?.off("listening", onListening); reject(error); };
    const onListening = () => { journalyUiServer?.off("error", onError); resolve(); };
    journalyUiServer.once("error", onError);
    journalyUiServer.once("listening", onListening);
    journalyUiServer.listen(config.uiPort, "127.0.0.1");
  });
}

async function startBridge() {
  if (config?.codexChatEnabled !== true) {
    return publishStatus({ bridgeReady: false, bridgeMessage: "Private Codex integration is paused for Jarvis desktop." });
  }
  if (bridgeServer?.listening || await bridgeHealth(config.bridgePort)) {
    bridgeOwned = Boolean(bridgeServer?.listening);
    return publishStatus({ bridgeReady: true, bridgeMessage: bridgeOwned ? `Private bridge listening on 127.0.0.1:${config.bridgePort}.` : `Connected to an existing Journaly bridge on port ${config.bridgePort}.` });
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL = config.supabaseUrl;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = config.supabasePublishableKey;
  process.env.JOURNALY_CODEX_BRIDGE_PORT = String(config.bridgePort);
  process.env.JOURNALY_DESKTOP_BRIDGE_TOKEN = desktopBridgeToken;
  const bridgeModuleUrl = pathToFileURL(path.join(app.getAppPath(), "bridge", "jarvis-codex-bridge.mjs")).href;
  const { createBridgeServer } = await import(bridgeModuleUrl);
  bridgeServer = createBridgeServer();
  await new Promise((resolve, reject) => {
    const onError = (error) => { bridgeServer?.off("listening", onListening); reject(error); };
    const onListening = () => { bridgeServer?.off("error", onError); resolve(); };
    bridgeServer.once("error", onError);
    bridgeServer.once("listening", onListening);
    bridgeServer.listen(config.bridgePort, "127.0.0.1");
  });
  bridgeOwned = true;
  return publishStatus({ bridgeReady: true, bridgeMessage: `Private bridge listening on 127.0.0.1:${config.bridgePort}.` });
}

async function stopBridge() {
  if (!bridgeOwned || !bridgeServer?.listening) return;
  await new Promise((resolve) => bridgeServer.close(resolve));
  bridgeServer = null;
  bridgeOwned = false;
}

function codexCommand(args, onOutput) {
  const codexBin = path.join(app.getAppPath(), "node_modules", "@openai", "codex", "bin", "codex.js");
  if (!existsSync(codexBin)) return Promise.reject(new Error("The bundled Codex runtime is missing."));
  return new Promise((resolve, reject) => {
    const environment = { ...process.env, ELECTRON_RUN_AS_NODE: "1" };
    const child = spawn(process.execPath, [codexBin, ...args], { cwd: app.getPath("userData"), env: environment, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const collect = (chunk) => { const text = String(chunk); output = `${output}${text}`.slice(-12000); onOutput?.(text); };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output: output.trim() }));
    if (args.includes("--device-auth")) loginProcess = child;
  });
}

async function checkCodex() {
  if (config?.codexChatEnabled !== true) {
    return publishStatus({ codexChecked: true, codexLoggedIn: false, codexMessage: "Codex integration is paused for Jarvis desktop." });
  }
  const result = await codexCommand(["login", "status"]);
  const loggedIn = result.code === 0 && /logged in/i.test(result.output);
  return publishStatus({
    codexChecked: true,
    codexLoggedIn: loggedIn,
    codexMessage: loggedIn ? result.output || "Authenticated with ChatGPT." : result.output || "Use Sign in to Codex to connect your ChatGPT account.",
  });
}

async function loginCodex() {
  if (loginProcess) return runtimeStatus;
  statusWindow?.webContents.send("desktop:codex-output", "Starting secure Codex device sign-in…");
  const result = await codexCommand(["login", "--device-auth"], (output) => statusWindow?.webContents.send("desktop:codex-output", output));
  loginProcess = null;
  if (result.code !== 0) throw new Error(result.output || "Codex sign-in did not complete.");
  return checkCodex();
}

function createStatusWindow(show = true) {
  if (statusWindow && !statusWindow.isDestroyed()) { if (show) statusWindow.show(); statusWindow.focus(); return statusWindow; }
  statusWindow = new BrowserWindow({
    width: 760, height: 570, minWidth: 680, minHeight: 500, show: false,
    title: "Journaly Codex Bridge Center", backgroundColor: "#020912", autoHideMenuBar: true,
    icon: existsSync(path.join(app.getAppPath(), "assets", "journaly-os-logo-512.png")) ? path.join(app.getAppPath(), "assets", "journaly-os-logo-512.png") : undefined,
    webPreferences: { preload: path.join(app.getAppPath(), "desktop", "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  statusWindow.loadFile(path.join(app.getAppPath(), "desktop", "status.html"));
  statusWindow.once("ready-to-show", () => { if (show) statusWindow?.show(); });
  statusWindow.on("closed", () => { statusWindow = null; });
  return statusWindow;
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); return; }
  const appOrigin = new URL(config.appUrl).origin;
  mainWindow = new BrowserWindow({
    width: 1480, height: 960, minWidth: 1040, minHeight: 720, show: true,
    title: "Journaly Codex Desktop", backgroundColor: "#06111c",
    icon: existsSync(path.join(app.getAppPath(), "assets", "journaly-os-logo-512.png")) ? path.join(app.getAppPath(), "assets", "journaly-os-logo-512.png") : undefined,
    webPreferences: { preload: path.join(app.getAppPath(), "desktop", "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith("https://")) void shell.openExternal(url); return { action: "deny" }; });
  mainWindow.webContents.on("will-navigate", (event, url) => { if (new URL(url).origin !== appOrigin) { event.preventDefault(); if (url.startsWith("https://")) void shell.openExternal(url); } });
  mainWindow.webContents.on("did-fail-load", (_event, code, description) => {
    publishStatus({ bridgeMessage: `Journaly could not load (${code}: ${description}). The bridge remains local and safe.` });
    createStatusWindow(true);
  });
  mainWindow.on("closed", () => { mainWindow = null; });
  void mainWindow.loadURL(config.appUrl);
}

function installMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "Journaly", submenu: [
      { label: "Open Journaly", accelerator: "Ctrl+1", click: createMainWindow },
      { label: "Codex Bridge Center", accelerator: "Ctrl+2", click: () => createStatusWindow(true) },
      { type: "separator" },
      { label: "Reload Journaly", accelerator: "Ctrl+R", click: () => mainWindow?.reload() },
      { type: "separator" },
      { role: "quit" },
    ] },
    { label: "Codex", submenu: [
      { label: "Check Codex Sign-In", click: () => void checkCodex() },
      { label: "Sign in to Codex", click: () => { createStatusWindow(true); void loginCodex(); } },
      { label: "Restart Private Bridge", click: async () => { await stopBridge(); await startBridge(); } },
    ] },
    { label: "View", submenu: [{ role: "togglefullscreen" }, { role: "toggleDevTools" }] },
  ]));
}

ipcMain.handle("desktop:get-status", () => runtimeStatus);
ipcMain.handle("desktop:open-journaly", () => { createMainWindow(); return true; });
ipcMain.handle("desktop:check-codex", checkCodex);
ipcMain.handle("desktop:ctrader-status", () => publishCTraderStatus().ctrader);
ipcMain.handle("desktop:ctrader-connect", async () => {
  if (!ctraderService) throw new Error("cTrader service is not ready.");
  const result = await ctraderService.beginOAuth();
  await shell.openExternal(result.authorizationUrl);
  return publishCTraderStatus().ctrader;
});
ipcMain.handle("desktop:ctrader-stop", () => { ctraderService?.stop(); return publishCTraderStatus().ctrader; });
ipcMain.handle("desktop:ctrader-preview-order", (_event, intent) => ctraderService?.previewOrder(intent));
ipcMain.handle("desktop:ctrader-execute-order", (_event, confirmation) => ctraderService?.executeOrder(confirmation));
ipcMain.handle("desktop:login-codex", loginCodex);
ipcMain.handle("desktop:restart-bridge", async () => { await stopBridge(); return startBridge(); });
ipcMain.handle("desktop:set-wake-word-active", (_event, active) => {
  if (active === true) startWakeWordListener();
  else stopWakeWordListener();
  return true;
});

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => createMainWindow());
  app.whenReady().then(async () => {
    config = readDesktopConfig();
    ctraderService = new CTraderBrokerService({ projectRoot: config.localProjectRoot, onStatus: publishCTraderStatus });
    publishCTraderStatus();
    loadLocalVoiceEnvironment();
    app.setAppUserModelId("com.journalyos.codexdesktop");
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      const allowedOrigin = new URL(config.appUrl).origin;
      let requestingOrigin = "";
      try { requestingOrigin = new URL(details.requestingUrl || webContents.getURL()).origin; } catch { requestingOrigin = ""; }
      callback(requestingOrigin === allowedOrigin && ["media", "notifications"].includes(permission));
    });
    session.defaultSession.webRequest.onBeforeSendHeaders({ urls: [`http://127.0.0.1:${config.bridgePort}/*`] }, (details, callback) => {
      const requestHeaders = { ...details.requestHeaders };
      if (mainWindow && details.webContentsId === mainWindow.webContents.id) requestHeaders["X-Journaly-Desktop-Token"] = desktopBridgeToken;
      callback({ requestHeaders });
    });
    await startJournalyUi();
    try { await startBridge(); }
    catch (error) { publishStatus({ bridgeReady: false, bridgeMessage: error instanceof Error ? error.message : "The bridge could not start." }); }
    await checkCodex().catch((error) => publishStatus({ codexChecked: true, codexLoggedIn: false, codexMessage: error instanceof Error ? error.message : "Codex status check failed." }));

    if (smokeTest) {
      const uiResponse = await fetch(config.appUrl);
      const uiHtml = await uiResponse.text();
      const scriptPath = uiHtml.match(/<script[^>]+src="([^"]+)"/)?.[1];
      if (!uiResponse.ok || !scriptPath) throw new Error("Bundled Journaly interface did not serve its application bundle.");
      const applicationBundle = await (await fetch(new URL(scriptPath, config.appUrl))).text();
      if (!applicationBundle.includes("Pure Codex conversation")) throw new Error("Bundled Journaly interface does not contain the private Codex chat route.");
      const smokeWindow = createStatusWindow(false);
      if (smokeWindow.webContents.isLoading()) await new Promise((resolve, reject) => {
        smokeWindow.webContents.once("did-finish-load", resolve);
        smokeWindow.webContents.once("did-fail-load", (_event, code, description) => reject(new Error(`Bridge Center failed to load (${code}: ${description}).`)));
      });
      const bridgeCenterReady = await smokeWindow.webContents.executeJavaScript("Boolean(window.journalyDesktop?.isPrivateDesktop && window.journalyDesktop?.getStatus && document.querySelector('#bridge-title'))");
      if (!bridgeCenterReady) throw new Error("Bridge Center preload or interface did not initialize.");
      console.log(JSON.stringify({ ...runtimeStatus, journalyUiReady: true, deepAnalysisReady: true, bridgeCenterReady }));
      smokeWindow.destroy();
      await stopBridge();
      app.exit(0);
      return;
    }
    installMenu();
    createMainWindow();
    startWakeWordListener();
    if (!runtimeStatus.bridgeReady || !runtimeStatus.codexLoggedIn || !runtimeStatus.ctrader?.authenticated) createStatusWindow(true);
  }).catch((error) => {
    if (smokeTest) {
      console.error(error instanceof Error ? error.stack || error.message : String(error));
      app.exit(1);
      return;
    }
    dialog.showErrorBox("Journaly Codex Desktop", error instanceof Error ? error.message : String(error));
    app.quit();
  });
}

app.on("before-quit", () => { loginProcess?.kill(); stopWakeWordListener(); journalyUiServer?.close(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", createMainWindow);

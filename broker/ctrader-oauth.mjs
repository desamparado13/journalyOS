import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { loadCTraderConfig, getCTraderConfigStatus } from "./ctrader-config.mjs";

const AUTH_BASE = "https://id.ctrader.com/my/settings/openapi/grantingaccess/";
const TOKEN_URL = "https://openapi.ctrader.com/apps/token";

function sameString(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export class CTraderOAuthController {
  constructor({ projectRoot = process.cwd(), onStatus, onToken } = {}) {
    this.config = loadCTraderConfig(projectRoot);
    this.onStatus = onStatus;
    this.onToken = onToken;
    this.server = null;
    this.state = "";
    this.token = null;
    this.lastError = "";
  }

  status() {
    return { ...getCTraderConfigStatus(this.config), authenticated: Boolean(this.token?.accessToken), lastError: this.lastError };
  }

  authorizationUrl() {
    if (!this.config.clientId || !this.config.clientSecret) throw new Error("cTrader credentials are not configured in the local desktop environment.");
    this.state = randomBytes(24).toString("hex");
    const url = new URL(AUTH_BASE);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("scope", this.config.scope);
    url.searchParams.set("product", "web");
    url.searchParams.set("state", this.state);
    return url.toString();
  }

  async begin() {
    if (this.server) throw new Error("cTrader authorization is already waiting for a callback.");
    const callback = new URL(this.config.redirectUri);
    if (!/^https?:$/.test(callback.protocol) || !["localhost", "127.0.0.1"].includes(callback.hostname)) throw new Error("cTrader desktop OAuth must use a localhost redirect URI.");
    const authorizationUrl = this.authorizationUrl();
    this.server = createServer((request, response) => { void this.#handleCallback(request, response); });
    await new Promise((resolve, reject) => {
      const onError = (error) => { this.server?.off("listening", onListening); reject(error); };
      const onListening = () => { this.server?.off("error", onError); resolve(); };
      this.server.once("error", onError);
      this.server.once("listening", onListening);
      this.server.listen(Number(callback.port || 80), callback.hostname);
    });
    this.onStatus?.(this.status());
    return { authorizationUrl, redirectUri: this.config.redirectUri, status: this.status() };
  }

  async #handleCallback(request, response) {
    try {
      const requestUrl = new URL(request.url || "/", this.config.redirectUri);
      if (requestUrl.pathname !== new URL(this.config.redirectUri).pathname) { response.writeHead(404); response.end("Not found"); return; }
      const error = requestUrl.searchParams.get("error");
      if (error) throw new Error(`cTrader authorization failed: ${error}`);
      if (!sameString(requestUrl.searchParams.get("state") || "", this.state)) throw new Error("cTrader OAuth state validation failed.");
      const code = requestUrl.searchParams.get("code");
      if (!code) throw new Error("cTrader did not return an authorization code.");
      const tokenUrl = new URL(TOKEN_URL);
      tokenUrl.searchParams.set("grant_type", "authorization_code");
      tokenUrl.searchParams.set("code", code);
      tokenUrl.searchParams.set("redirect_uri", this.config.redirectUri);
      tokenUrl.searchParams.set("client_id", this.config.clientId);
      tokenUrl.searchParams.set("client_secret", this.config.clientSecret);
      const tokenResponse = await fetch(tokenUrl, { headers: { Accept: "application/json" } });
      const payload = await tokenResponse.json();
      if (!tokenResponse.ok || !payload.accessToken || !payload.refreshToken) throw new Error(payload.description || "cTrader token exchange failed.");
      this.token = { accessToken: payload.accessToken, refreshToken: payload.refreshToken, expiresAt: Date.now() + Number(payload.expiresIn || 0) * 1000 };
      await this.onToken?.(this.token);
      this.lastError = "";
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end("<h2>Journaly cTrader authorization complete.</h2><p>You can close this window and return to Journaly.</p>");
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(this.lastError);
    } finally {
      this.server?.close();
      this.server = null;
      this.state = "";
      this.onStatus?.(this.status());
    }
  }

  getAccessToken() { return this.token?.accessToken || ""; }

  stop() { this.server?.close(); this.server = null; this.state = ""; }
}

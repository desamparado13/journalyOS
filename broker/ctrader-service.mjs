import { loadCTraderConfig, getCTraderConfigStatus } from "./ctrader-config.mjs";
import { CTraderJsonClient } from "./ctrader-json-client.mjs";
import { CTraderOAuthController } from "./ctrader-oauth.mjs";
import { createHash, timingSafeEqual } from "node:crypto";

const PAYLOAD = Object.freeze({ applicationAuth: 2100, accountAuth: 2102, symbols: 2114, trader: 2121, reconcile: 2124, accountsByToken: 2149, newOrder: 2106 });

export class CTraderBrokerService {
  constructor({ projectRoot = process.cwd(), onStatus } = {}) {
    this.config = loadCTraderConfig(projectRoot);
    this.onStatus = onStatus;
    this.accounts = [];
    this.selectedAccount = null;
    this.authorized = false;
    this.lastError = "";
    this.oauth = new CTraderOAuthController({ projectRoot, onStatus: () => this.#publish(), onToken: () => this.authorizeAfterOAuth() });
    this.client = null;
  }

  status() {
    return { ...getCTraderConfigStatus(this.config), authenticated: Boolean(this.oauth.getAccessToken()) && this.authorized, accounts: this.accounts.map(({ ctidTraderAccountId, isLive, traderLogin, brokerTitleShort }) => ({ ctidTraderAccountId, isLive, traderLogin, brokerTitleShort })), selectedAccount: this.selectedAccount ? { ...this.selectedAccount } : null, connected: Boolean(this.client?.connected), lastError: this.lastError };
  }

  async beginOAuth() { return this.oauth.begin(); }

  async authorizeAfterOAuth() {
    try {
      this.client = new CTraderJsonClient({ endpoint: this.config.endpoint, port: this.config.port, onEvent: (event) => this.onStatus?.({ type: "event", eventType: event.payloadType }) });
      await this.client.connect();
      await this.client.request(PAYLOAD.applicationAuth, { clientId: this.config.clientId, clientSecret: this.config.clientSecret });
      const accountPayload = await this.client.request(PAYLOAD.accountsByToken, { accessToken: this.oauth.getAccessToken() });
      this.accounts = accountPayload.ctidTraderAccount || accountPayload.ctidTraderAccounts || [];
      const desired = this.accounts.find((account) => Boolean(account.isLive) === (this.config.environment === "live")) || this.accounts[0];
      if (!desired?.ctidTraderAccountId) throw new Error("cTrader returned no authorized account for the selected environment.");
      this.selectedAccount = { ctidTraderAccountId: Number(desired.ctidTraderAccountId), isLive: Boolean(desired.isLive), traderLogin: desired.traderLogin, brokerTitleShort: desired.brokerTitleShort };
      await this.client.request(PAYLOAD.accountAuth, { ctidTraderAccountId: this.selectedAccount.ctidTraderAccountId, accessToken: this.oauth.getAccessToken() });
      this.authorized = true;
      this.lastError = "";
      this.#publish();
      return this.status();
    } catch (error) {
      this.authorized = false;
      this.lastError = error instanceof Error ? error.message : String(error);
      this.#publish();
      throw error;
    }
  }

  async getTrader() { this.#requireAuthorized(); return this.client.request(PAYLOAD.trader, { ctidTraderAccountId: this.selectedAccount.ctidTraderAccountId }); }
  async getSymbols() { this.#requireAuthorized(); return this.client.request(PAYLOAD.symbols, { ctidTraderAccountId: this.selectedAccount.ctidTraderAccountId }); }
  async reconcile() { this.#requireAuthorized(); return this.client.request(PAYLOAD.reconcile, { ctidTraderAccountId: this.selectedAccount.ctidTraderAccountId }); }
  async previewOrder({ symbolId, tradeSide, volume, relativeStopLoss = 0, relativeTakeProfit = 0, label = "Journaly" } = {}) {
    this.#requireAuthorized();
    const isLive = this.config.environment === "live";
    if ((isLive && !this.config.liveTradingEnabled) || (!isLive && !this.config.demoTradingEnabled)) throw new Error("Trading is disabled by the local safety configuration.");
    const numericSymbolId = Number(symbolId);
    const numericVolume = Number(volume);
    if (!Number.isSafeInteger(numericSymbolId) || numericSymbolId <= 0) throw new Error("A valid cTrader symbolId is required.");
    if (!Number.isSafeInteger(numericVolume) || numericVolume <= 0) throw new Error("Volume must be a positive integer in cTrader cent-units (0.01 units).");
    const symbolPayload = await this.getSymbols();
    const symbol = (symbolPayload.symbol || []).find((candidate) => Number(candidate.symbolId) === numericSymbolId);
    if (!symbol) throw new Error("The selected symbol is not available on the authorized cTrader account.");
    const minVolume = Number(symbol.minVolume || 0);
    const maxVolume = Number(symbol.maxVolume || Number.MAX_SAFE_INTEGER);
    const stepVolume = Number(symbol.stepVolume || 1);
    if (numericVolume < minVolume || numericVolume > maxVolume || (numericVolume - minVolume) % stepVolume !== 0) throw new Error(`Volume violates broker limits (min ${minVolume}, max ${maxVolume}, step ${stepVolume}).`);
    const payload = { ctidTraderAccountId: this.selectedAccount.ctidTraderAccountId, symbolId: numericSymbolId, orderType: 1, tradeSide: String(tradeSide).toUpperCase() === "SELL" ? 2 : 1, volume: numericVolume, relativeStopLoss: Math.max(0, Math.trunc(Number(relativeStopLoss) || 0)), relativeTakeProfit: Math.max(0, Math.trunc(Number(relativeTakeProfit) || 0)), label: String(label).slice(0, 100) };
    const expiresAt = Date.now() + 30_000;
    const confirmationToken = createHash("sha256").update(`${JSON.stringify(payload)}:${expiresAt}`).digest("hex");
    return { previewId: createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16), expiresAt, confirmationToken, payload, symbol: { symbolId: symbol.symbolId, symbolName: symbol.symbolName || symbol.name, minVolume, maxVolume, stepVolume } };
  }
  async executeOrder({ preview, confirmationToken } = {}) {
    this.#requireAuthorized();
    if (!preview?.payload || !preview.expiresAt || Date.now() > Number(preview.expiresAt)) throw new Error("The trade preview has expired. Generate a new preview.");
    const expected = createHash("sha256").update(`${JSON.stringify(preview.payload)}:${preview.expiresAt}`).digest("hex");
    const provided = Buffer.from(String(confirmationToken || ""));
    const expectedBuffer = Buffer.from(expected);
    if (provided.length !== expectedBuffer.length || !timingSafeEqual(provided, expectedBuffer)) throw new Error("Explicit trade confirmation did not match this preview.");
    const isLive = this.config.environment === "live";
    if ((isLive && !this.config.liveTradingEnabled) || (!isLive && !this.config.demoTradingEnabled)) throw new Error("Trading is disabled by the local safety configuration.");
    return this.client.request(PAYLOAD.newOrder, preview.payload, 30000);
  }
  stop() { this.oauth.stop(); this.client?.close(); this.client = null; this.authorized = false; this.#publish(); }
  #requireAuthorized() { if (!this.authorized || !this.client?.connected || !this.selectedAccount) throw new Error("cTrader account is not authorized."); }
  #publish() { this.onStatus?.(this.status()); }
}

export { PAYLOAD };

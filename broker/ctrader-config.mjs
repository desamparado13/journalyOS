import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_REDIRECT_URI = "http://localhost:8000/auth/ctrader/callback";

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  return Object.fromEntries(readFileSync(filePath, "utf8").split(/\r?\n/).flatMap((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return [];
    const separator = line.indexOf("=");
    if (separator < 1) return [];
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [[key, value]];
  }));
}

export function loadCTraderConfig(projectRoot = process.cwd()) {
  const local = parseEnvFile(path.join(projectRoot, ".env.local"));
  const value = (key, fallback = "") => String(process.env[key] || local[key] || fallback).trim();
  const environment = value("CTRADER_ENVIRONMENT", "demo").toLowerCase() === "live" ? "live" : "demo";
  return Object.freeze({
    enabled: value("CTRADER_ENABLED", "false").toLowerCase() === "true",
    demoTradingEnabled: value("CTRADER_DEMO_TRADING_ENABLED", "false").toLowerCase() === "true",
    liveTradingEnabled: value("CTRADER_LIVE_TRADING_ENABLED", "false").toLowerCase() === "true",
    environment,
    scope: value("CTRADER_SCOPE", "trading") === "accounts" ? "accounts" : "trading",
    clientId: value("CTRADER_CLIENT_ID"),
    clientSecret: value("CTRADER_CLIENT_SECRET"),
    redirectUri: value("CTRADER_REDIRECT_URI", DEFAULT_REDIRECT_URI),
    oauthPort: Number(value("CTRADER_OAUTH_PORT", "8000")) || 8000,
    endpoint: environment === "live" ? "live.ctraderapi.com" : "demo.ctraderapi.com",
    port: 5036,
  });
}

export function getCTraderConfigStatus(config) {
  return {
    enabled: config.enabled,
    environment: config.environment,
    scope: config.scope,
    configured: Boolean(config.clientId && config.clientSecret && config.redirectUri),
    hasClientId: Boolean(config.clientId),
    hasClientSecret: Boolean(config.clientSecret),
    redirectUri: config.redirectUri,
    endpoint: `${config.endpoint}:${config.port}`,
    demoTradingEnabled: config.demoTradingEnabled,
    liveTradingEnabled: config.liveTradingEnabled,
  };
}

export { DEFAULT_REDIRECT_URI };

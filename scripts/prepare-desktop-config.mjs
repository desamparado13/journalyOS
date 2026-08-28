import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseEnvironmentFile(filePath) {
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

const localEnvironment = parseEnvironmentFile(path.join(projectRoot, ".env.local"));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || localEnvironment.NEXT_PUBLIC_SUPABASE_URL || "";
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || localEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Desktop build needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.");
}

const config = {
  appUrl: process.env.JOURNALY_DESKTOP_URL || "http://127.0.0.1:4318",
  apiHost: "journaly-os.vercel.app",
  uiPort: Number(process.env.JOURNALY_DESKTOP_UI_PORT || 4318),
  bridgePort: Number(process.env.JOURNALY_CODEX_BRIDGE_PORT || 4317),
  ctraderOAuthPort: Number(process.env.CTRADER_OAUTH_PORT || localEnvironment.CTRADER_OAUTH_PORT || 8000),
  ctraderRedirectUri: process.env.CTRADER_REDIRECT_URI || localEnvironment.CTRADER_REDIRECT_URI || "http://localhost:8000/auth/ctrader/callback",
  localProjectRoot: projectRoot,
  supabaseUrl,
  supabasePublishableKey,
  // Keep these switches explicit so the desktop build can be paused without
  // removing the integration. They can be re-enabled for a future build.
  codexChatEnabled: String(process.env.JOURNALY_DESKTOP_CODEX_ENABLED || localEnvironment.JOURNALY_DESKTOP_CODEX_ENABLED || "false").toLowerCase() === "true",
  voiceChatEnabled: String(process.env.JOURNALY_DESKTOP_VOICE_ENABLED || localEnvironment.JOURNALY_DESKTOP_VOICE_ENABLED || "false").toLowerCase() === "true",
};
await writeFile(path.join(projectRoot, "desktop", "generated-config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log("Prepared private Journaly desktop configuration.");

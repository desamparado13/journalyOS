import worker from "./index.js";
import { waitUntil } from "@vercel/functions";

function webRequest(request) {
  const protocol = request.headers["x-forwarded-proto"] || "https";
  const host = request.headers.host || "journaly.invalid";
  const headers = new Headers();
  Object.entries(request.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) headers.set(key, value.join(", "));
    else if (value != null) headers.set(key, String(value));
  });
  const init = { method: request.method || "GET", headers };
  if (init.method !== "GET" && init.method !== "HEAD") {
    init.body = typeof request.body === "string" ? request.body : JSON.stringify(request.body || {});
  }
  return new Request(`${protocol}://${host}${request.url}`, init);
}

function runtimeEnvironment() {
  return {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_JARVIS_MODEL: process.env.OPENAI_JARVIS_MODEL,
    OPENAI_JARVIS_VOICE_MODEL: process.env.OPENAI_JARVIS_VOICE_MODEL,
    OPENAI_JARVIS_VOICE: process.env.OPENAI_JARVIS_VOICE,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    VERCEL_OIDC_TOKEN: process.env.VERCEL_OIDC_TOKEN,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    JARVIS_ROUTINE_USER_ID: process.env.JARVIS_ROUTINE_USER_ID,
    JARVIS_AUTH_BYPASS_USER_ID: process.env.JARVIS_AUTH_BYPASS_USER_ID,
    JARVIS_AUTH_BYPASS_EMAIL: process.env.JARVIS_AUTH_BYPASS_EMAIL,
    PUSHOVER_APP_TOKEN: process.env.PUSHOVER_APP_TOKEN,
    PUSHOVER_USER_KEY: process.env.PUSHOVER_USER_KEY,
    PUSHOVER_ENABLED: process.env.PUSHOVER_ENABLED,
    PUSHOVER_OWNER_USER_ID: process.env.PUSHOVER_OWNER_USER_ID,
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  };
}

export async function handleVercelJarvis(request, response) {
  const result = await worker.fetch(webRequest(request), runtimeEnvironment(), { waitUntil });
  response.status(result.status);
  result.headers.forEach((value, key) => response.setHeader(key, value));
  response.send(Buffer.from(await result.arrayBuffer()));
}

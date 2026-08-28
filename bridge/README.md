# Journaly Codex bridge

This private localhost companion makes Christian's Journaly desktop Jarvis fully Codex-backed. Normal Jarvis conversation uses a persistent, ephemeral Codex App Server thread with owner-only local computer tools, so explicitly requested desktop conversations can inspect files, capture and analyze the current screen, inspect or open apps, run commands, and manage scoped computer tasks. Sensitive or difficult-to-reverse effects require a clear confirmation, secrets remain protected, and live broker actions stay prohibited. The Research Center also exposes 14 modes covering complete analysis, deep backtest forensics, targeted investigations, weekly/monthly reviews, trade reconstruction, strategy and behavior research, data quality, experiments, chart vision, decision checklists, approval-only action drafts, and coaching plans.

## First-time setup on Christian's PC

1. Install dependencies with `npm install`.
2. Authenticate Codex with `npm run codex:login` and complete the ChatGPT sign-in.
3. Start the private companion with `npm run codex:bridge`.
4. Open Journaly as `christian.angelo.desamparado@gmail.com`, open **Codex Research**, choose a mode, and run the report.

The service listens only on `http://127.0.0.1:4317`. It re-verifies the current Supabase access token and exact owner email for every request. The `/chat` route additionally requires a random secret injected by Electron at runtime, so an ordinary browser cannot activate pure-Codex Jarvis even when the owner is signed in. The production origin `https://journaly-os.vercel.app` and the two Vite localhost origins are allowed by default for the existing research route.

## Configuration

The bridge reads the existing `.env.local` Supabase variables. If Journaly moves to a different deployed URL, add its exact HTTPS origin before starting the bridge:

```powershell
$env:JOURNALY_CODEX_ALLOWED_ORIGINS="https://your-journaly-domain.example,http://localhost:5173"
npm run codex:bridge
```

Optional variables:

- `JOURNALY_CODEX_BRIDGE_PORT` changes port `4317`.
- `JOURNALY_CODEX_MODEL` pins a Codex CLI model; otherwise the Codex default is used.
- `VITE_JOURNALY_CODEX_BRIDGE_URL` changes the browser-side bridge URL at build time.

Only one report can run at once. Each run is ephemeral, read-only, uses an isolated temporary directory, and deletes that directory and all temporary screenshot files afterward. Images are restricted to PNG, JPEG, or WebP, validated by file signature, capped at 3 MB each, 12 per report, and 20 MB total. Drafted Journaly actions are returned for review and are never applied by the bridge.

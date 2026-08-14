import assert from "node:assert/strict";
import { handleGoogleDriveBackup } from "../server/google-drive-backup.js";

const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  if (String(url).endsWith("/auth/v1/user")) return Response.json({ id: "owner-1", email: "christian.angelo.desamparado@gmail.com" });
  throw new Error(`Unexpected request: ${url}`);
};

const baseEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://journaly-test.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-test",
};

try {
  const statusResponse = await handleGoogleDriveBackup(new Request("https://journaly.test/api/jarvis/google-drive?action=status", { headers: { authorization: "Bearer owner-session" } }), baseEnv);
  assert.equal(statusResponse.status, 200);
  assert.deepEqual(await statusResponse.json(), {
    configured: false,
    connected: false,
    googleEmail: null,
    rootFolderUrl: null,
    backupFolderUrl: null,
    archiveFolderUrl: null,
    lastBackupAt: null,
    lastBackupFileName: null,
    lastBackupBytes: 0,
    lastError: null,
    automaticSchedule: "Daily at 7:15 PM Manila time",
  });

  const connectResponse = await handleGoogleDriveBackup(new Request("https://journaly.test/api/jarvis/google-drive?action=connect", { method: "POST", headers: { authorization: "Bearer owner-session" } }), baseEnv);
  assert.equal(connectResponse.status, 503);

  const unauthenticated = await handleGoogleDriveBackup(new Request("https://journaly.test/api/jarvis/google-drive?action=status"), baseEnv);
  assert.equal(unauthenticated.status, 401);

  const cronResponse = await handleGoogleDriveBackup(new Request("https://journaly.test/api/jarvis/drive-backup-routine"), { ...baseEnv, CRON_SECRET: "cron-secret" });
  assert.equal(cronResponse.status, 401);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Google Drive backup security and configuration: passed");


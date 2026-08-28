import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8"));
const targetPath = path.join(projectRoot, "release", `Journaly-Codex-Desktop-${packageJson.version}-Windows.exe`);
const shortcutPath = path.join(homedir(), "Desktop", "Journaly Codex Desktop.lnk");

if (process.platform !== "win32") {
  console.log("Desktop shortcut refresh skipped: Windows only.");
  process.exit(0);
}

if (!existsSync(targetPath)) throw new Error(`Built Journaly executable was not found: ${targetPath}`);

const powerShell = [
  "$shell = New-Object -ComObject WScript.Shell",
  "$shortcut = $shell.CreateShortcut($env:JOURNALY_SHORTCUT_PATH)",
  "$shortcut.TargetPath = $env:JOURNALY_SHORTCUT_TARGET",
  "$shortcut.WorkingDirectory = $env:JOURNALY_SHORTCUT_WORKDIR",
  "$shortcut.IconLocation = \"$env:JOURNALY_SHORTCUT_TARGET,0\"",
  "$shortcut.Description = 'Launch the latest Journaly Codex Desktop build'",
  "$shortcut.Save()",
].join("; ");

const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", powerShell], {
  encoding: "utf8",
  env: {
    ...process.env,
    JOURNALY_SHORTCUT_PATH: shortcutPath,
    JOURNALY_SHORTCUT_TARGET: targetPath,
    JOURNALY_SHORTCUT_WORKDIR: projectRoot,
  },
});

if (result.status !== 0) throw new Error(result.stderr.trim() || "Windows could not refresh the Journaly desktop shortcut.");
console.log(`Desktop shortcut now opens: ${targetPath}`);

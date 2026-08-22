import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import JSZip from "jszip";

const sourceDir = new URL("../browser-extension/", import.meta.url);
const outputDir = new URL("../public/downloads/", import.meta.url);
const zip = new JSZip();
for (const name of await readdir(sourceDir)) zip.file(name, await readFile(new URL(name, sourceDir)));
await mkdir(outputDir, { recursive: true });
const packageBytes = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
await writeFile(new URL("journaly-local-bridge.zip", outputDir), packageBytes);
// Keep the former download URL safe for cached Journaly builds; its contents are now local-only too.
await writeFile(new URL("journaly-edge-companion.zip", outputDir), packageBytes);
console.log("Journaly Local Bridge package ready.");

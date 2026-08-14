import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import JSZip from "jszip";

const sourceDir = new URL("../browser-extension/", import.meta.url);
const outputDir = new URL("../public/downloads/", import.meta.url);
const zip = new JSZip();
for (const name of await readdir(sourceDir)) zip.file(name, await readFile(new URL(name, sourceDir)));
await mkdir(outputDir, { recursive: true });
await writeFile(new URL("journaly-edge-companion.zip", outputDir), await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } }));
console.log("Journaly Edge Companion package ready.");
